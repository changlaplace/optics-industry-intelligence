# OpticSignal

OpticSignal is a public, static MVP for tracking optics and photonics companies, people, hiring signals, technology areas, and source-linked industry reading.

**Live site:** [optics-industry-intelligence.yubbie.chatgpt.site](https://optics-industry-intelligence.yubbie.chatgpt.site)

## Architecture

- `dist/`: dependency-free static application, deployable to any static host.
- `dist/app.js`: initial structured entity data plus rendering and search.
- `dist/enhancements.js`: remote-source icons, company map, richer people record shape, and the About page.
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

`.github/workflows/update-content.yml` runs every three days and can also be started manually from GitHub Actions. It uses Crawl4AI to create clean Markdown, skips unchanged source content using SHA-256 hashes in `data/update-state.json`, sends only changed content to DeepSeek, and conservatively merges validated records back into `dist/app.js`.

Before the first run, add a repository Actions secret named `DEEPSEEK_API_KEY` under **Settings → Secrets and variables → Actions**. Do not put the key in a file, issue, workflow input, or chat message. The optional repository variable `DEEPSEEK_MODEL` overrides the default `deepseek-chat` model.

Manual runs expose two controls: `force_refresh` ignores stored hashes, and `max_sources` limits a test run. A good first check is `max_sources=1`; after reviewing the resulting commit, run the complete source set.

The updater is intentionally repository-native:

- `data/sources.json` is the crawl registry.
- `data/update-state.json` stores only content hashes and processing timestamps.
- `scripts/update_content.py` handles crawling, DeepSeek extraction, validation, and conservative merging.
- `scripts/site-data.mjs` safely reads and writes the existing JavaScript dataset.
- Failed extraction never writes data or hash state. Individual blocked crawl sources are reported and left unchanged.

## Deployment

This project is configured as a static Site through `.openai/hosting.json`. It also includes `.github/workflows/deploy-pages.yml`, which publishes `dist/` to GitHub Pages after any `dist/**` change reaches `main`, including commits created by the automated content updater.

GitHub Pages requires one initial repository setting: open **Settings → Pages → Build and deployment**, then choose **GitHub Actions** as the source. After that, deployments are automatic and can also be started manually from the Actions tab. No deployment secret is required.

## Search discovery

- `dist/robots.txt` permits indexing and points crawlers to `dist/sitemap.xml`.
- The current sitemap intentionally lists the public root URL. Hash-based client routes are not independent indexable documents; add real server paths for company and news records when search discovery becomes a priority.
- Verify the production domain in Google Search Console and submit `https://optics-industry-intelligence.yubbie.chatgpt.site/sitemap.xml` after deployment.
