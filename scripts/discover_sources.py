#!/usr/bin/env python3
"""Discover optics companies with directories plus an AI-planned web-search loop."""

from __future__ import annotations

import argparse
import asyncio
import copy
import html as html_lib
import json
import math
import os
import re
import subprocess
import tempfile
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus, urljoin, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
SOURCES_PATH = ROOT / "data" / "sources.json"
STATE_PATH = ROOT / "data" / "discovery-state.json"
BRIDGE_PATH = ROOT / "scripts" / "site-data.mjs"
EXCLUDED_DOMAINS = {
    "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "youtube.com",
    "wikipedia.org", "google.com", "doubleclick.net", "optica.org", "gophotonics.com",
    "photonics.com", "ebomsa.org", "spie.org", "brave.com", "search.brave.com",
}
PROFILE_SIGNALS = ("company", "companies", "member", "members", "directory", "supplier", "vendor", "job")
CAREER_SIGNALS = ("career", "careers", "jobs", "join-us", "work-with-us", "open-roles", "vacancies")
NEWS_SIGNALS = ("news", "newsroom", "press", "media", "announcement", "insights", "updates")
DEFAULT_SEARCH_QUERIES = [
    '"Sunny Optical" 舜宇光学 官网 招聘',
    '"Hesai" 禾赛科技 激光雷达 官网 招聘',
    '"RoboSense" 速腾聚创 激光雷达 官网 招聘',
    '"Accelink" 光迅科技 光通信 官网 招聘',
    '"Everbright Photonics" 长光华芯 激光 官网 招聘',
    '"InnoLight" 中际旭创 光通信 官网 招聘',
    '"Focuslight" 炬光科技 激光 光学 官网 招聘',
    '"Raysolve" 理湃光晶 AR 光学 官网 招聘',
    '"Goertek" 歌尔 光学 AR VR 官网 招聘',
    '"Crystal-Optech" 水晶光电 官网 招聘',
    '"Eoptolink" 新易盛 光通信 官网 招聘',
    '"OFILM" 欧菲光 光学 影像 官网 招聘',
    "China optics photonics companies official website",
    "中国 硅光 芯片 公司 官网 招聘",
    '"学向科技" 光学 公司',
    "global silicon photonics startups official website careers",
    "global metasurface meta optics companies official website",
    "optical metrology semiconductor equipment companies careers",
]


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


def candidate_key(item: dict) -> str:
    path = urlsplit(item["website"]).path.casefold()
    if domain(item["website"]) == "gophotonics.com" and re.search(r"/companies/\d+/", path):
        return canonical_url(item["website"])
    return domain(item["website"])


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
        path = urlsplit(item["url"]).path.casefold()
        signal = f"{path} {item['text']}".casefold()
        hits = sum(term in signal for term in PROFILE_SIGNALS)
        if re.search(r"/companies/\d+/", path):
            hits += 100
        if hits and len(item["text"]) >= 2:
            ranked.append((hits, item["url"]))
    ranked.sort(key=lambda value: (-value[0], value[1]))
    return list(dict.fromkeys(url for _, url in ranked))[: int(seed.get("max_profile_links", 30))]


def candidate_links(result, discovered_from: str) -> list[dict]:
    base_domain = domain(getattr(result, "url", ""))
    path = urlsplit(getattr(result, "url", "")).path.casefold()
    company_profile = base_domain == "gophotonics.com" and bool(re.search(r"/companies/\d+/", path))
    heading = re.search(r"(?m)^#\s+([^#\n]{2,100})$", result_markdown(result))
    profile_name = heading.group(1).strip() if heading else ""
    candidates = []
    for item in result_links(result):
        if domain(item["url"]) == base_domain or excluded(item["url"]):
            continue
        if company_profile and "visit website" not in item["text"].casefold():
            continue
        label = item["text"].strip(" |-:")
        if company_profile and profile_name:
            label = profile_name
        if len(label) < 2 or label.casefold() in {"website", "visit website", "learn more", "read more"}:
            label = domain(item["url"]).split(".")[0].replace("-", " ").title()
        candidates.append({"name_hint": label[:100], "website": item["url"], "discovered_from": discovered_from})
    return candidates


def search_candidates(result, query: str) -> list[dict]:
    """Turn external links from a public search result page into review candidates."""
    candidates = []
    for item in result_links(result):
        if excluded(item["url"]):
            continue
        label = item["text"].strip(" |-:")
        if len(label) < 2:
            label = domain(item["url"]).split(".")[0].replace("-", " ").title()
        candidates.append({
            "name_hint": label[:120],
            "website": item["url"],
            "discovered_from": f"Web search: {query}",
            "search_query": query,
        })
    return candidates


def bing_rss_candidates(result, query: str) -> list[dict]:
    """Extract direct result links from Bing's public RSS response."""
    raw = str(getattr(result, "html", "") or getattr(result, "cleaned_html", "") or "")
    candidates = []
    for block in re.findall(r"<item\b[^>]*>(.*?)</item>", raw, flags=re.IGNORECASE | re.DOTALL):
        title_match = re.search(r"<title>(.*?)</title>", block, flags=re.IGNORECASE | re.DOTALL)
        link_match = re.search(r"<link>(.*?)</link>", block, flags=re.IGNORECASE | re.DOTALL)
        if not link_match:
            continue
        website = html_lib.unescape(re.sub(r"<[^>]+>", "", link_match.group(1))).strip()
        try:
            website = canonical_url(website)
        except ValueError:
            continue
        if excluded(website):
            continue
        title = html_lib.unescape(re.sub(r"<[^>]+>", "", title_match.group(1) if title_match else ""))
        candidates.append({
            "name_hint": re.sub(r"\s+", " ", title).strip()[:120] or domain(website),
            "website": website,
            "discovered_from": f"Web search: {query}",
            "search_query": query,
        })
    return candidates


def deepseek_json(system_prompt: str, value: object, max_tokens: int) -> dict:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")
    payload = {
        "model": os.getenv("DEEPSEEK_MODEL", "deepseek-flash"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(value, ensure_ascii=False)},
        ],
        "response_format": {"type": "json_object"},
        "thinking": {"type": "disabled"},
        "temperature": 0,
        "max_tokens": max_tokens,
    }
    request = urllib.request.Request(
        "https://api.deepseek.com/chat/completions", data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        message = json.loads(response.read().decode())["choices"][0]["message"]["content"]
    parsed = json.loads(message)
    return parsed if isinstance(parsed, dict) else {}


def plan_search_queries(registry: dict, dataset: dict, limit: int) -> list[str]:
    """Ask DeepSeek what to search, while keeping deterministic coverage fallbacks."""
    if limit <= 0:
        return []
    priorities = registry.get("discovery_priorities", {})
    context = {
        "current_companies": [row[0] for row in dataset.get("companies", [])],
        "priorities": priorities,
        "maximum_queries": limit,
    }
    prompt = """Act as the search-planning stage of an optics-industry research agent.
Return JSON only: {"queries":[{"query":"...","region":"...","focus":"..."}]}.
Queries are tool inputs, not database facts. At least two thirds should test a specific plausible company name using
an exact-name query plus terms such as official site, careers, 官网, or 招聘. You may use your industry knowledge to
propose company names as hypotheses, but never invent a URL; every company will be independently crawled and reviewed
before inclusion. Seek commercial organizations substantially active in optics, photonics, imaging, lasers, displays,
LiDAR, optical networking, semiconductor optics, quantum photonics, or optical instrumentation. Avoid companies already
listed. Use both English and local-language queries, allocate at least half to China, and include exact-name queries for
every company lead in the priorities. Spread the rest across regions and technologies. Keep each query concise and
return no more than maximum_queries."""
    planned = []
    try:
        response = deepseek_json(prompt, context, 2500)
        for item in response.get("queries", []):
            query = str(item.get("query", "") if isinstance(item, dict) else item).strip()
            if query:
                planned.append(query[:180])
    except Exception as error:
        print(f"warning: DeepSeek search planning failed; using fallback queries: {error}")
    fallback_slots = min(len(DEFAULT_SEARCH_QUERIES), max(2, limit // 3))
    combined = planned[:max(0, limit - fallback_slots)] + DEFAULT_SEARCH_QUERIES[:fallback_slots]
    return list(dict.fromkeys(query for query in combined if query))[:limit]


async def crawl_discovery(
    seeds: list[dict], leads: list[dict], queries: list[str], max_profiles: int,
    max_candidates: int, max_search_results: int, skip_keys: set[str],
) -> list[dict]:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

    browser = BrowserConfig(headless=True, verbose=False)
    run = CrawlerRunConfig(cache_mode=CacheMode.BYPASS, page_timeout=45000, wait_until="domcontentloaded")
    candidates: list[dict] = []
    for lead in leads:
        try:
            website = canonical_url(lead["url"])
        except (KeyError, ValueError):
            continue
        candidates.append({
            "name_hint": str(lead.get("name", domain(website))).strip()[:120],
            "website": website,
            "discovered_from": "Curated discovery lead",
            "excerpt": str(lead.get("evidence", "Public company lead awaiting source review"))[:700],
        })
    async with AsyncWebCrawler(config=browser) as crawler:
        seed_results = await crawler.arun_many(urls=[item["url"] for item in seeds], config=run)
        profiles: list[tuple[str, str]] = []
        profile_fallbacks: list[dict] = []
        seed_by_url = {canonical_url(item["url"]): item for item in seeds}
        for result in seed_results:
            try:
                result_url = canonical_url(getattr(result, "url", ""))
            except ValueError:
                result_url = ""
            seed = seed_by_url.get(result_url)
            if not seed:
                same_domain = [item for item in seeds if domain(item["url"]) == domain(result_url)]
                seed = same_domain[0] if len(same_domain) == 1 else None
            if not seed or not result.success:
                print(f"warning: discovery seed failed: {getattr(result, 'url', seed and seed['url'])}")
                continue
            candidates.extend(candidate_links(result, seed["name"]))
            selected_profiles = profile_links(result, seed)
            link_names = {item["url"]: item["text"] for item in result_links(result)}
            if seed.get("crawl_profiles", True):
                profiles.extend((url, seed["name"]) for url in selected_profiles)
            profile_fallbacks.extend({
                "name_hint": link_names.get(url, "").strip()[:100], "website": url,
                "discovered_from": seed["name"],
                "excerpt": f"Listed in {seed['name']}, a trusted optics and photonics industry directory.",
                "directory_only": True,
            } for url in selected_profiles if link_names.get(url, "").strip())
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

        if queries:
            per_query_limit = max(1, math.ceil(max_search_results / len(queries)))
            for query in queries:
                found = []
                brave_url = f"https://search.brave.com/search?q={quote_plus(query)}&source=web"
                brave_result = await crawler.arun(url=brave_url, config=run)
                if brave_result.success:
                    found = search_candidates(brave_result, query)
                else:
                    print(f"warning: Brave search failed; trying Bing RSS: {query}")
                if not found:
                    bing_url = f"https://www.bing.com/search?format=rss&q={quote_plus(query)}"
                    bing_result = await crawler.arun(url=bing_url, config=run)
                    if bing_result.success:
                        found = bing_rss_candidates(bing_result, query) or search_candidates(bing_result, query)
                    else:
                        print(f"warning: all search providers failed: {query}")
                candidates.extend(found[:per_query_limit])
                await asyncio.sleep(1.0)

        candidates.extend(profile_fallbacks)
        unique: dict[str, dict] = {}
        for item in candidates:
            key = candidate_key(item)
            if key and key not in skip_keys and key not in unique:
                unique[key] = item
        shortlist = list(unique.values())[:max_candidates]
        if not shortlist:
            return []

        home_targets = [item for item in shortlist if not item.get("directory_only")]
        home_results = await crawler.arun_many(
            urls=[item["website"] for item in home_targets], config=run
        ) if home_targets else []
        by_url = {canonical_url(item["website"]): item for item in home_targets}
        for result in home_results:
            try:
                result_url = canonical_url(getattr(result, "url", ""))
            except ValueError:
                continue
            item = by_url.get(result_url)
            if not item:
                same_domain = [entry for entry in home_targets if domain(entry["website"]) == domain(result_url)]
                item = same_domain[0] if len(same_domain) == 1 else None
            if not item or not result.success:
                continue
            excerpt = re.sub(r"\s+", " ", result_markdown(result)).strip()[:700]
            item["excerpt"] = excerpt
            careers = []
            news_pages = []
            for link in result_links(result):
                signal = f"{urlsplit(link['url']).path} {link['text']}".casefold()
                if any(term in signal for term in CAREER_SIGNALS):
                    careers.append(link["url"])
                if any(term in signal for term in NEWS_SIGNALS):
                    news_pages.append(link["url"])
            if careers:
                item["careers_url"] = careers[0]
            if news_pages:
                item["news_url"] = news_pages[0]
        return shortlist


def deepseek_review(candidates: list[dict]) -> list[dict]:
    compact = [{"id": index, **item} for index, item in enumerate(candidates)]
    prompt = """Review candidate organizations discovered from trusted directories and public web search.
Keep only real commercial companies substantially active in optics, photonics, imaging, lasers, displays,
LiDAR, optical networking, semiconductor optics, quantum photonics, or optical instrumentation.
Diversified technology companies qualify only when the supplied evidence shows a meaningful optics business.
Reject search engines, news articles, universities, associations, publishers, recruiters, generic resellers,
malformed labels, unofficial profile pages, and candidates whose evidence is insufficient. The candidate website
must be an official company-controlled domain or a trusted industry-directory profile. Never invent a URL or fact.
Preserve a well-known English name; a Chinese name may follow it in parentheses. Return JSON only:
{"accepted":[{"id":0,"name":"","location":"","description":"","focus_areas":[""]}]}
Use the supplied id. Keep descriptions under 16 words and at most four focus areas."""
    value = deepseek_json(prompt, compact, 5000)
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
    existing_sites = {candidate_key({"website": row[5]}) for row in dataset["companies"]}
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
        website_key = candidate_key(candidate)
        if not name or name.casefold() in existing_names or website_key in existing_sites:
            continue
        focus = [str(item).strip() for item in record.get("focus_areas", []) if str(item).strip()][:4]
        if not focus:
            continue
        dataset["companies"].append([
            name, str(record.get("location", "")).strip(), str(record.get("description", "")).strip(),
            "|".join(focus), "New source", website,
        ])
        dataset.setdefault("company_meta", {})[name] = {
            "tier": "Emerging specialist", "score": 2,
            "basis": "Focused optics or photonics market presence",
        }
        directory_profile = domain(website) == "gophotonics.com" and bool(
            re.search(r"/companies/\d+/", urlsplit(website).path.casefold())
        )
        if not directory_profile:
            source_url = canonical_url(candidate.get("careers_url") or website)
            if source_url not in tracked_urls:
                registry["tracked_urls"].append({
                    "name": f"{name} Careers", "url": source_url, "type": "company", "company": name,
                    "website": website, "location": str(record.get("location", "")).strip(),
                    "description": str(record.get("description", "")).strip(), "focus_areas": "|".join(focus),
                    "max_follow_links": 6,
                })
                tracked_urls.add(source_url)
            if candidate.get("news_url"):
                news_url = canonical_url(candidate["news_url"])
                if news_url not in tracked_urls:
                    registry["tracked_urls"].append({
                        "name": f"{name} News", "url": news_url, "type": "company_news", "company": name,
                        "website": website, "max_follow_links": 10,
                    })
                    tracked_urls.add(news_url)
        existing_names.add(name.casefold())
        existing_sites.add(website_key)
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
    class SearchResult:
        url = "https://search.brave.com/search?q=optics&source=web"
        links = {"external": [
            {"href": "https://acme-optics.com/about", "text": "Acme Optics"},
            {"href": "https://www.linkedin.com/company/acme", "text": "LinkedIn"},
        ]}
    candidates = search_candidates(SearchResult(), "optics")
    assert len(candidates) == 1 and candidates[0]["website"] == "https://acme-optics.com/about"
    class RssResult:
        html = "<rss><channel><item><title>Acme Optics</title><link>https://acme-optics.com/</link></item></channel></rss>"
    rss_candidates = bing_rss_candidates(RssResult(), "optics")
    assert len(rss_candidates) == 1 and rss_candidates[0]["name_hint"] == "Acme Optics"
    registry = {"tracked_urls": []}
    dataset = {"companies": [], "company_meta": {}, "updated": "2026-01-01"}
    added = merge(
        [{
            "name_hint": "Acme Optics", "website": "https://acme-optics.com/",
            "careers_url": "https://acme-optics.com/careers",
            "news_url": "https://acme-optics.com/news",
        }],
        [{
            "id": 0, "name": "Acme Optics", "location": "Shanghai, China",
            "description": "Develops optical systems.", "focus_areas": ["Photonics"],
        }],
        registry, dataset, 10,
    )
    assert added == 1
    assert {item["type"] for item in registry["tracked_urls"]} == {"company", "company_news"}
    print("Source discovery helper checks passed.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-profiles", type=int, default=320)
    parser.add_argument("--max-candidates", type=int, default=160)
    parser.add_argument("--max-search-queries", type=int, default=18)
    parser.add_argument("--max-search-results", type=int, default=120)
    parser.add_argument("--promote-limit", type=int, default=100)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0

    registry = read_json(SOURCES_PATH, {})
    dataset = read_dataset()
    state = read_json(STATE_PATH, {"version": 1, "reviewed_domains": {}})
    known_keys = {candidate_key({"website": item["url"]}) for item in registry.get("tracked_urls", [])}
    known_keys.update(candidate_key({"website": row[5]}) for row in dataset["companies"])
    reviewed = state.get("reviewed_domains", {})
    skip_keys = known_keys | {
        key for key, value in reviewed.items() if not value.get("accepted")
    }
    queries = plan_search_queries(registry, dataset, args.max_search_queries)
    candidates = asyncio.run(crawl_discovery(
        registry.get("discovery_seeds", []), registry.get("discovery_leads", []), queries,
        args.max_profiles, args.max_candidates, args.max_search_results, skip_keys,
    ))[:args.max_candidates]
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
        reviewed[candidate_key(item)] = {
            "website": item["website"], "name_hint": item["name_hint"],
            "discovered_from": item["discovered_from"], "reviewed_at": now,
            "accepted": index in accepted_ids,
        }
    state["reviewed_domains"] = reviewed
    state["last_run_at"] = now
    state["last_candidate_count"] = len(candidates)
    state["last_added_count"] = added
    state["last_search_queries"] = queries
    if added:
        write_dataset(dataset)
        write_json_atomic(SOURCES_PATH, registry)
    write_json_atomic(STATE_PATH, state)
    print(f"Discovered {len(candidates)} unreviewed domains; DeepSeek accepted {len(accepted)}; added {added} companies.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
