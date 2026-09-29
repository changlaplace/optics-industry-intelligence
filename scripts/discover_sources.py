#!/usr/bin/env python3
"""Discover optics companies from trusted directories and promote a bounded reviewed set."""

from __future__ import annotations

import argparse
import asyncio
import copy
import json
import os
import re
import subprocess
import tempfile
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
SOURCES_PATH = ROOT / "data" / "sources.json"
STATE_PATH = ROOT / "data" / "discovery-state.json"
BRIDGE_PATH = ROOT / "scripts" / "site-data.mjs"
EXCLUDED_DOMAINS = {
    "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "youtube.com",
    "wikipedia.org", "google.com", "doubleclick.net", "optica.org", "gophotonics.com",
    "photonics.com", "ebomsa.org", "spie.org",
}
PROFILE_SIGNALS = ("company", "companies", "member", "members", "directory", "supplier", "vendor", "job")
CAREER_SIGNALS = ("career", "careers", "jobs", "join-us", "work-with-us", "open-roles", "vacancies")


def read_json(path: Path, default: dict) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else copy.deepcopy(default)


def write_json_atomic(path: Path, value: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def canonical_url(value: str) -> str:
    parts = urlsplit(value.strip())
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise ValueError(value)
    path = re.sub(r"/+", "/", parts.path).rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, parts.query, ""))


def domain(value: str) -> str:
    host = (urlsplit(value).hostname or "").casefold().removeprefix("www.")
    parts = host.split(".")
    if len(parts) >= 3 and len(parts[-1]) == 2 and parts[-2] in {"ac", "co", "com", "net", "org"}:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:]) if len(parts) > 1 else host


def excluded(value: str) -> bool:
    host = domain(value)
    return not host or any(host == item or host.endswith("." + item) for item in EXCLUDED_DOMAINS)


def result_markdown(result) -> str:
    markdown = getattr(result, "markdown", "")
    if isinstance(markdown, str):
        return markdown
    return str(getattr(markdown, "fit_markdown", "") or getattr(markdown, "raw_markdown", "") or "")


def result_links(result) -> list[dict]:
    output = []
    base = getattr(result, "url", "")
    for group in (getattr(result, "links", {}) or {}).values():
        for item in group:
            try:
                href = canonical_url(urljoin(base, item.get("href", "")))
            except ValueError:
                continue
            output.append({"url": href, "text": re.sub(r"\s+", " ", item.get("text", "")).strip()})
    return output


def profile_links(result, seed: dict) -> list[str]:
    seed_domain = domain(seed["url"])
    ranked = []
    for item in result_links(result):
        if domain(item["url"]) != seed_domain or item["url"] == canonical_url(seed["url"]):
            continue
        signal = f"{urlsplit(item['url']).path} {item['text']}".casefold()
        hits = sum(term in signal for term in PROFILE_SIGNALS)
        if hits and len(item["text"]) >= 2:
            ranked.append((hits, item["url"]))
    ranked.sort(key=lambda value: (-value[0], value[1]))
    return list(dict.fromkeys(url for _, url in ranked))[: int(seed.get("max_profile_links", 30))]


def candidate_links(result, discovered_from: str) -> list[dict]:
    base_domain = domain(getattr(result, "url", ""))
    candidates = []
    for item in result_links(result):
        if domain(item["url"]) == base_domain or excluded(item["url"]):
            continue
        label = item["text"].strip(" |-:")
        if len(label) < 2 or label.casefold() in {"website", "visit website", "learn more", "read more"}:
            label = domain(item["url"]).split(".")[0].replace("-", " ").title()
        candidates.append({"name_hint": label[:100], "website": item["url"], "discovered_from": discovered_from})
    return candidates


async def crawl_discovery(seeds: list[dict], max_profiles: int, max_candidates: int) -> list[dict]:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

    browser = BrowserConfig(headless=True, verbose=False)
    run = CrawlerRunConfig(cache_mode=CacheMode.BYPASS, page_timeout=45000, wait_until="domcontentloaded")
    candidates: list[dict] = []
    async with AsyncWebCrawler(config=browser) as crawler:
        seed_results = await crawler.arun_many(urls=[item["url"] for item in seeds], config=run)
        profiles: list[tuple[str, str]] = []
        for result in seed_results:
            seed = next((item for item in seeds if domain(item["url"]) == domain(getattr(result, "url", ""))), None)
            if not seed or not result.success:
                print(f"warning: discovery seed failed: {getattr(result, 'url', seed and seed['url'])}")
                continue
            candidates.extend(candidate_links(result, seed["name"]))
            profiles.extend((url, seed["name"]) for url in profile_links(result, seed))
        profiles = list(dict.fromkeys(profiles))[:max_profiles]
        if profiles:
            profile_results = await crawler.arun_many(urls=[url for url, _ in profiles], config=run)
            owner_by_url = {canonical_url(url): owner for url, owner in profiles}
            for result in profile_results:
                if not result.success:
                    continue
                result_url = canonical_url(getattr(result, "url", ""))
                owner = owner_by_url.get(result_url, "Trusted optics directory")
                candidates.extend(candidate_links(result, owner))

        unique: dict[str, dict] = {}
        for item in candidates:
            key = domain(item["website"])
            if key and key not in unique:
                unique[key] = item
        shortlist = list(unique.values())[:max_candidates]
        if not shortlist:
            return []

        home_results = await crawler.arun_many(urls=[item["website"] for item in shortlist], config=run)
        by_domain = {domain(item["website"]): item for item in shortlist}
        for result in home_results:
            item = by_domain.get(domain(getattr(result, "url", "")))
            if not item or not result.success:
                continue
            excerpt = re.sub(r"\s+", " ", result_markdown(result)).strip()[:700]
            item["excerpt"] = excerpt
            careers = []
            for link in result_links(result):
                signal = f"{urlsplit(link['url']).path} {link['text']}".casefold()
                if any(term in signal for term in CAREER_SIGNALS):
                    careers.append(link["url"])
            if careers:
                item["careers_url"] = careers[0]
        return shortlist


def deepseek_review(candidates: list[dict]) -> list[dict]:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")
    compact = [{"id": index, **item} for index, item in enumerate(candidates)]
    prompt = """Review candidate organizations discovered from trusted optics/photonics directories.
Keep only real commercial companies substantially active in optics, photonics, imaging, lasers, displays,
LiDAR, optical networking, semiconductor optics, quantum photonics, or optical instrumentation.
Reject universities, associations, publishers, recruiters, resellers with no optical specialization, malformed
labels, and candidates whose evidence is insufficient. Never invent a URL or fact. Return JSON only:
{"accepted":[{"id":0,"name":"","location":"","description":"","focus_areas":[""]}]}
Use the supplied id. Keep descriptions under 16 words and at most four focus areas."""
    payload = {
        "model": os.getenv("DEEPSEEK_MODEL", "deepseek-flash"),
        "messages": [{"role": "system", "content": prompt}, {"role": "user", "content": json.dumps(compact)}],
        "response_format": {"type": "json_object"}, "thinking": {"type": "disabled"},
        "temperature": 0, "max_tokens": 5000,
    }
    request = urllib.request.Request(
        "https://api.deepseek.com/chat/completions", data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        message = json.loads(response.read().decode())["choices"][0]["message"]["content"]
    value = json.loads(message)
    return value.get("accepted", []) if isinstance(value, dict) else []


def read_dataset() -> dict:
    result = subprocess.run(["node", str(BRIDGE_PATH), "export"], cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def write_dataset(data: dict) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=True)
        path = Path(handle.name)
    try:
        subprocess.run(["node", str(BRIDGE_PATH), "import", str(path)], cwd=ROOT, check=True)
    finally:
        path.unlink(missing_ok=True)


def merge(candidates: list[dict], accepted: list[dict], registry: dict, dataset: dict, limit: int) -> int:
    existing_names = {row[0].casefold() for row in dataset["companies"]}
    existing_domains = {domain(row[5]) for row in dataset["companies"]}
    tracked_urls = {canonical_url(item["url"]) for item in registry["tracked_urls"]}
    added = 0
    for record in accepted:
        if added >= limit or not isinstance(record, dict) or not isinstance(record.get("id"), int):
            continue
        index = record["id"]
        if index < 0 or index >= len(candidates):
            continue
        candidate = candidates[index]
        name = str(record.get("name", "")).strip()
        website = candidate["website"]
        website_domain = domain(website)
        if not name or name.casefold() in existing_names or website_domain in existing_domains:
            continue
        focus = [str(item).strip() for item in record.get("focus_areas", []) if str(item).strip()][:4]
        if not focus:
            continue
        dataset["companies"].append([
            name, str(record.get("location", "")).strip(), str(record.get("description", "")).strip(),
            "|".join(focus), "New source", website,
        ])
        source_url = candidate.get("careers_url") or website
        source_url = canonical_url(source_url)
        if source_url not in tracked_urls:
            registry["tracked_urls"].append({
                "name": f"{name} Careers", "url": source_url, "type": "company", "company": name,
                "website": website, "location": str(record.get("location", "")).strip(),
                "description": str(record.get("description", "")).strip(), "focus_areas": "|".join(focus),
                "max_follow_links": 6,
            })
            tracked_urls.add(source_url)
        existing_names.add(name.casefold())
        existing_domains.add(website_domain)
        added += 1
    if added:
        dataset["companies"].sort(key=lambda row: row[0].casefold())
        dataset["updated"] = date.today().isoformat()
    return added


def self_test() -> None:
    assert domain("https://jobs.example.co.uk/a") == "example.co.uk"
    assert domain("https://careers.example.com/a") == "example.com"
    assert excluded("https://linkedin.com/company/x")
    assert not excluded("https://acme-optics.com/")
    class Result:
        url = "https://directory.example/companies"
        links = {"internal": [{"href": "/company/acme", "text": "Acme Optics"}], "external": []}
    links = profile_links(Result(), {"url": Result.url, "max_profile_links": 5})
    assert links == ["https://directory.example/company/acme"]
    print("Source discovery helper checks passed.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-profiles", type=int, default=80)
    parser.add_argument("--max-candidates", type=int, default=60)
    parser.add_argument("--promote-limit", type=int, default=25)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0

    registry = read_json(SOURCES_PATH, {})
    dataset = read_dataset()
    state = read_json(STATE_PATH, {"version": 1, "reviewed_domains": {}})
    known_domains = {domain(item["url"]) for item in registry.get("tracked_urls", [])}
    known_domains.update(domain(row[5]) for row in dataset["companies"])
    candidates = asyncio.run(crawl_discovery(
        registry.get("discovery_seeds", []), args.max_profiles, args.max_candidates + len(known_domains)
    ))
    candidates = [item for item in candidates if domain(item["website"]) not in known_domains]
    reviewed = state.get("reviewed_domains", {})
    candidates = [item for item in candidates if domain(item["website"]) not in reviewed][:args.max_candidates]
    if not candidates:
        print("No unreviewed source candidates were discovered.")
        return 0

    accepted = []
    for start in range(0, len(candidates), 30):
        reviewed_batch = deepseek_review(candidates[start:start + 30])
        for item in reviewed_batch:
            if isinstance(item.get("id"), int):
                item["id"] += start
        accepted.extend(reviewed_batch)
    added = merge(candidates, accepted, registry, dataset, args.promote_limit)
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    accepted_ids = {item.get("id") for item in accepted}
    for index, item in enumerate(candidates):
        reviewed[domain(item["website"])] = {
            "website": item["website"], "name_hint": item["name_hint"],
            "discovered_from": item["discovered_from"], "reviewed_at": now,
            "accepted": index in accepted_ids,
        }
    state["reviewed_domains"] = reviewed
    state["last_run_at"] = now
    state["last_candidate_count"] = len(candidates)
    state["last_added_count"] = added
    if added:
        write_dataset(dataset)
        write_json_atomic(SOURCES_PATH, registry)
    write_json_atomic(STATE_PATH, state)
    print(f"Discovered {len(candidates)} unreviewed domains; DeepSeek accepted {len(accepted)}; added {added} companies.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
