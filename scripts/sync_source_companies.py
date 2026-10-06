#!/usr/bin/env python3
"""Promote complete company source records into the static site dataset."""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
import unicodedata
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
SOURCES_PATH = ROOT / "data" / "sources.json"
BRIDGE_PATH = ROOT / "scripts" / "site-data.mjs"

GLOBAL_LEADERS = {
    "bae systems", "broadcom", "cisco", "general atomics", "intel", "l3harris technologies",
    "leica microsystems", "lockheed martin", "marvell", "nokia", "northrop grumman",
}
ESTABLISHED_LEADERS = {
    "bio-rad laboratories", "bruker", "ciena", "excelitas technologies", "globalfoundries",
    "hamamatsu photonics usa", "idex health & science", "ipg photonics", "keysight technologies",
    "macom", "materion", "mks instruments", "novanta", "thorlabs", "viavi solutions", "zygo",
}
GROWTH_COMPANIES = {
    "aeva", "aeluma", "aeye", "atom computing", "bluehalo", "credo semiconductor", "digilens",
    "infleqtion", "ionq", "lightpath technologies", "lumotive", "metalenz", "openlight", "ouster",
    "quera computing", "quintessent", "silc technologies", "voyant photonics", "xscape photonics",
}


def read_dataset() -> dict:
    result = subprocess.run(
        ["node", str(BRIDGE_PATH), "export"], cwd=ROOT, check=True, capture_output=True,
        text=True, encoding="utf-8",
    )
    return json.loads(result.stdout)


def write_dataset(data: dict) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False) as handle:
        json.dump(data, handle, ensure_ascii=True)
        temporary = Path(handle.name)
    try:
        subprocess.run(["node", str(BRIDGE_PATH), "import", str(temporary)], cwd=ROOT, check=True)
    finally:
        temporary.unlink(missing_ok=True)


def normalized_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    key = re.sub(r"[^a-z0-9]", "", ascii_value.casefold())
    aliases = {
        "aretassociates": "arete",
        "areteassociates": "arete",
        "mksspectraphysics": "mks",
        "mksinstruments": "mks",
    }
    return aliases.get(key, key)


def domain(value: str) -> str:
    return (urlsplit(value).hostname or "").casefold().removeprefix("www.")


def same_company(left: str, right: str) -> bool:
    left_key, right_key = normalized_name(left), normalized_name(right)
    if left_key == right_key:
        return True
    shorter, longer = sorted((left_key, right_key), key=len)
    return len(shorter) >= 5 and longer.startswith(shorter)


def footprint(name: str, source: dict) -> dict:
    override = source.get("market_score")
    if isinstance(override, int) and 1 <= override <= 5:
        score = override
    elif name.casefold() in GLOBAL_LEADERS:
        score = 5
    elif name.casefold() in ESTABLISHED_LEADERS:
        score = 4
    elif name.casefold() in GROWTH_COMPANIES:
        score = 3
    else:
        score = 2
    tiers = {1: "Early-stage", 2: "Emerging specialist", 3: "Growth-stage", 4: "Established", 5: "Global leader"}
    return {
        "tier": source.get("market_tier") or tiers[score],
        "score": score,
        "basis": source.get("market_basis") or "Editorial market-footprint estimate from public company information",
    }


def sync(registry: dict, dataset: dict) -> int:
    added = 0
    companies = dataset["companies"]
    company_meta = dataset.setdefault("company_meta", {})
    for source in registry.get("tracked_urls", []):
        name = str(source.get("company", "")).strip()
        website = str(source.get("website") or source.get("url") or "").strip()
        source_url = str(source.get("url") or website).strip()
        if source.get("type") != "company" or not name or not website or not source_url:
            continue
        if any(same_company(name, row[0]) for row in companies):
            continue
        website_domain = domain(website)
        if website_domain and any(domain(row[5]) == website_domain for row in companies):
            continue
        focus = source.get("focus_areas", "")
        if isinstance(focus, list):
            focus = "|".join(str(item).strip() for item in focus if str(item).strip())
        focus = str(focus).strip() or "Optics|Photonics"
        description = str(source.get("description", "")).strip() or "Public optics or photonics company source."
        companies.append([
            name,
            str(source.get("location", "")).strip(),
            description,
            focus,
            "Source indexed",
            source_url,
        ])
        company_meta[name] = footprint(name, source)
        added += 1
    if added:
        companies.sort(key=lambda row: row[0].casefold())
        dataset["updated"] = date.today().isoformat()
    return added


def self_test() -> None:
    assert same_company("Arete", "Areté Associates")
    assert same_company("Cisco", "Cisco Systems")
    assert not same_company("Meta", "Metalenz")
    sample = {"tracked_urls": [{
        "type": "company", "company": "Acme Optics", "url": "https://jobs.acme.test/",
        "website": "https://acme.test/", "location": "Boston, MA", "description": "Precision optics.",
        "focus_areas": "Precision optics|Metrology",
    }]}
    dataset = {"companies": [], "company_meta": {}, "updated": "2026-01-01"}
    assert sync(sample, dataset) == 1
    assert sync(sample, dataset) == 0
    assert dataset["company_meta"]["Acme Optics"]["score"] == 2
    print("Source-to-company synchronization checks passed.")


def main() -> None:
    if "--self-test" in __import__("sys").argv:
        self_test()
        return
    registry = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    dataset = read_dataset()
    added = sync(registry, dataset)
    if added:
        write_dataset(dataset)
    print(f"Synchronized {added} new companies from the source registry; total is {len(dataset['companies'])}.")


if __name__ == "__main__":
    main()
