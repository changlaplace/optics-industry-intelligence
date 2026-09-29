# OpticSignal

OpticSignal is a public, static MVP for tracking optics and photonics companies, people, hiring signals, technology areas, and source-linked industry reading.

**Live site:** [changlaplace.github.io/optics-industry-intelligence](https://changlaplace.github.io/optics-industry-intelligence/)

## Architecture

- `dist/`: dependency-free static application, deployable to any static host.
- `dist/app.js`: initial structured entity data plus rendering and search.
- `dist/enhancements.js`: remote-source icons, clustered company/people maps, company footprint signals, and the About page.
- `data/sources.json`: versioned source registry and ingestion policy.
- `scripts/import-template.json`: future ingestion payload shape.
- `scripts/validate-data.mjs`: lightweight publish-time dataset check.
- `scripts/ingestion-index.mjs`: canonical URL, record-key, and freshness helpers for future agent ingestion.

The MVP intentionally uses a static data store so it can launch without credentials. The application model maps directly to relational tables: `companies`, `people`, `institutions`, `technologies`, `jobs`, `news`, `relationships`, `sources`, and `entity_sources`.

## Run locally

Open `dist/index.html` in a browser, or serve `site` with any static server. Run `node scripts/validate-data.mjs` before publishing.

## Adding data

1. Capture a public primary source URL and timestamp.
2. Add an entity to the structured dataset with source links.
3. For jobs, record first/last-seen dates and never silently overwrite a disappearance.
4. Run the validator and visually check the relevant page.

Public source suggestions use GitHub Issues through the `Source request` template. They remain link-only requests until reviewed and added to the curated index.

Refresh requests also become public GitHub Issues. They form an agent-review queue; the static website does not claim to run a crawl merely because a request has been submitted.

## Future ingestion

Use company career portals, public ATS feeds, company newsrooms, and public academic/company bios. Store the raw source URL, capture time, and parser version. Do not use aggressive scraping or treat a search result as a lasting fact.

## Automated updates

`.github/workflows/update-content.yml` checks daily at 13:17 UTC (21:17 Beijing time) and performs a scheduled refresh when at least 72 hours have passed since the last scheduled run. Manual runs do not postpone that independent schedule. This falls inside DeepSeek's current weekday off-peak window and leaves a long buffer before the next peak period. It can also be started manually at any time. The updater uses Crawl4AI to fetch fresh pages and create clean Markdown, compares that normalized content with repository-persisted SHA-256 hashes in `data/update-state.json`, and sends only changed content to DeepSeek. It then conservatively merges validated records into `dist/app.js`, commits the result, and deploys changed site data to GitHub Pages in the same workflow run.

Source failures are isolated: a blocked crawl or failed DeepSeek response is logged and skipped while successful sources continue to merge. Long pages are preserved rather than head/tail-truncated, divided into small Markdown segments, and locally screened for optics terms before any API call. Relevant segments are processed sequentially with a compact URL/name memory to prevent duplication. If a response is truncated, only that segment is recursively divided and retried; the source's result count is not reduced. The workflow fails without publishing only when every eligible source fails. `dist/update-status.json` powers the About-page countdown and records the latest successful run plus the next eligible automatic refresh.

Each configured landing page may follow a small, ranked set of same-domain or public ATS job/news links. Crawl results are matched back to their source by URL/domain rather than completion order. Manual runs can set `source_match` to refresh one named source without spending tokens on the full registry. DeepSeek normalizes supplied pages; it is not treated as a general web-search engine, so new domains are added deliberately to `data/sources.json`.

Before the first run, add a repository Actions secret named `DEEPSEEK_API_KEY` under **Settings → Secrets and variables → Actions**. Do not put the key in a file, issue, workflow input, or chat message. Extraction is pinned to the official `deepseek-flash` API model, currently DeepSeek V4.1 Flash.

Manual runs expose two controls: `force_refresh` ignores stored hashes, and `max_sources` limits a test run. A good first check is `max_sources=1`; after reviewing the resulting commit, run the complete source set.

The separate manual **Discover optics sources** workflow expands coverage without force-refreshing existing pages. It scans multiple trusted-directory pages, removes known and irrelevant domains locally, and sends only compact candidate evidence to DeepSeek in batches of 30. A run can promote up to 100 accepted companies. Accepted companies are added to the static directory and their official careers page (when found) is added to `data/sources.json`; reviewed domains are remembered in `data/discovery-state.json` so later discovery runs do not spend tokens reviewing the same candidate again.

The updater is intentionally repository-native:

- `data/sources.json` is the crawl registry.
- `company_meta` in the static dataset stores the editorial 1-5 market-footprint tier and its plain-language basis for every company. It is a browsing signal, not an investment rating.
- `data/update-state.json` stores only content hashes and processing timestamps.
- `scripts/update_content.py` handles crawling, DeepSeek extraction, validation, and conservative merging.
- `scripts/site-data.mjs` safely reads and writes the existing JavaScript dataset.
- Crawl4AI deliberately fetches a fresh page instead of trusting a runner-local cache; unchanged normalized content never reaches DeepSeek.
- Failed extraction never writes data or hash state. Individual blocked crawl sources are reported and left unchanged.

## Deployment

GitHub Pages is the sole production host. `.github/workflows/deploy-pages.yml` publishes `dist/` after any `dist/**` change reaches `main`, including commits created by the automated content updater.

GitHub Pages requires one initial repository setting: open **Settings → Pages → Build and deployment**, then choose **GitHub Actions** as the source. After that, deployments are automatic and can also be started manually from the Actions tab. No deployment secret is required.

## Search discovery

- `dist/robots.txt` permits indexing and points crawlers to `dist/sitemap.xml`.
- The current sitemap intentionally lists the public root URL. Hash-based client routes are not independent indexable documents; add real server paths for company and news records when search discovery becomes a priority.
- Verify the production URL in Google Search Console and submit `https://changlaplace.github.io/optics-industry-intelligence/sitemap.xml` after deployment.
