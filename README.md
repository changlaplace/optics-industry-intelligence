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

## Deployment

This project is configured as a static Site through `.openai/hosting.json`. It can also deploy to GitHub Pages, Vercel, Netlify, or Cloudflare Pages without a build step.
