# Independence Day Golf Carts

The website for **[independencedaygolfcarts.com](https://independencedaygolfcarts.com)** — the
**July 4th Golf Cart Sales Event** / **Independence Day Golf Cart Sales Event** for
Independence Day Golf Carts.

Live dealership inventory is pulled from the DMS every day at **1:30 AM Eastern**,
the whole site is pre-rendered to static HTML, and the result deploys to
**GitHub Pages** and/or **Cloudflare Pages**.

---

## What gets built

| | |
| --- | --- |
| Vehicle detail pages | one per cart in stock, at `/golfcart/{make}-{model}-{color}-{city}-{state}-{country}/` |
| Category pages | `/inventory/`, `/new/`, `/used/`, `/electric-golf-carts/`, `/gas-golf-carts/`, `/street-legal-golf-carts/`, `/lifted-golf-carts/` |
| Event landing pages | `/july-4th-golf-cart-sales-event/` and `/independence-day-golf-cart-sales-event/` |
| Brand pages | one per make in stock, at `/brands/{make}/` |
| Location pages | one per dealership, plus a per-location inventory page |
| Guides | five long-form articles under `/guides/` |
| Utility pages | financing, about, contact, service, trade-in, delivery, FAQ, HTML sitemap, privacy, terms, accessibility, 404 |
| SEO / AI files | 100+ generated files — see [SEO and AI files](#seo-and-ai-files) |

Every page is real HTML on disk. There is no client-side routing, no framework
runtime, and no JavaScript requirement to read any content.

---

## Quick start

```bash
npm install          # only devDependency is playwright, used to render icons

npm run fetch        # pull live inventory from the DMS -> data/inventory.json
npm run build        # render the whole site -> dist/
npm test             # verify the build (links, sitemaps, schema, feeds)

npm run serve        # serve dist/ at http://localhost:5000
```

Working offline, or the DMS is unreachable?

```bash
npm run fetch:fixture   # synthetic development data (never deployable)
npm run build
```

The fixture is clearly marked in the snapshot, and `npm run build:live` — which CI
uses — **refuses to build** unless `data/inventory.json` came from the live DMS.
Fake inventory cannot reach production.

### All scripts

| Script | What it does |
| --- | --- |
| `npm run fetch` | Pull all carts and stores from the DMS, normalise, assign slugs, write `data/inventory.json` |
| `npm run fetch:fixture` | Same, from synthetic offline data (development only) |
| `npm run build` | Render `dist/` from the snapshot |
| `npm run build:live` | As above, but abort if the snapshot is not live DMS data |
| `npm run build:full` | `fetch` + `build` |
| `npm run build:deploy` | `fetch` + `build:live` + `test` — the full production sequence |
| `npm run assets` | Re-render logos, favicons and social cards from `src/assets/*.svg` |
| `npm test` | Build verification suite |
| `npm run dev` | Build and serve on `0.0.0.0:5000` |

---

## Data flow

```
DMS        ──►  scripts/fetch-inventory.mjs  ──►  data/inventory.json  ──►  scripts/build.mjs  ──►  dist/
api.tigondms.com     normalise, slug,              committed snapshot        static site           deploy
/wp-website          merge store geo data          (the fallback)            generation
```

**`scripts/fetch-inventory.mjs`** walks `POST /get-carts` page by page until the
reported total is exhausted, fetches `GET /tigon-stores`, merges the live store
records over the geographic seed in `data/locations.mjs`, flattens every cart into
the shape the templates consume, and assigns each one a stable SEO slug
(`{make}-{model}-{color}-{city}-{state}-{country}`, with `-01`, `-02` suffixes for
duplicates). If the DMS is unreachable it keeps the previous snapshot rather than
blanking the site.

**`data/inventory.json` is committed.** That is deliberate: it means the site can
be rebuilt on any host at any time without the DMS being up, and a failed nightly
fetch degrades to yesterday's data instead of an empty site.

### Images

Cart photography comes from the public S3 bucket
`https://s3.amazonaws.com/prod.docs.s3/carts/`, built from the `imageUrls` array on
each DMS record. The private `internalCartImageUrls` array is never used — it
returns 403. Carts with no public photo get a labelled SVG placeholder, and an
`onerror` handler swaps in the same placeholder if an S3 object 404s at runtime.

---

## Daily 1:30 AM Eastern refresh

`.github/workflows/daily-inventory.yml` is scheduled twice — `30 5 * * *` and
`30 6 * * *` UTC — because 1:30 AM Eastern is 05:30 UTC under EDT and 06:30 UTC
under EST, and GitHub's scheduler only speaks UTC. The first step reads the actual
`America/New_York` clock and exits immediately unless it is inside the 1:30 AM
window, so **exactly one run per day** does the work, year-round, across both DST
transitions.

That run:

1. pulls live inventory from the DMS,
2. builds with `--require-live`,
3. runs the verification suite,
4. commits the refreshed `data/inventory.json`,
5. deploys to GitHub Pages, and to Cloudflare Pages when those secrets are set,
6. pings IndexNow so Bing, Yandex, Seznam and Naver re-crawl.

---

## SEO and AI files

Everything below is generated from live data on every build.

**Sitemaps** — `/sitemap.xml` is a sitemap index that lists all of them, so one
submission in Search Console discovers the whole site:

`sitemap.xml` · `sitemap_index.xml` · `sitemap-pages.xml` · `sitemap-inventory.xml` ·
`sitemap-brands.xml` · `sitemap-locations.xml` · `sitemap-images.xml` ·
`image-sitemap.xml` · `sitemap-blog.xml` · `news-sitemap.xml` · `geo-sitemap.xml` ·
`events-sitemap.xml` · `mobile-sitemap.xml` · `hreflang-sitemap.xml` ·
`xhtml-sitemap.xml` · `dynamic-sitemap.xml` · `category-sitemap.xml` ·
`page-sitemap.xml` · `post-sitemap.xml` · `tag-sitemap.xml` · `author-sitemap.xml` ·
`urllist.xml` · `urllist.txt` — plus `sitemap.xsl` so a human opening any of them
sees a readable table.

**AI and crawler permissions** — `robots.txt` (152 named agents, all allowed,
crawl-delay 0) · `llms.txt` · `llms-full.txt` · `ai.txt` · `gpt.txt` · `claude.txt` ·
`training.txt` · `nlp.txt` · `seo.txt` · `crawlers.txt` · `bots.txt` ·
`.well-known/ai.txt`

**Feeds and product data** — `rss.xml` · `atom.xml` · `feed.xml` · `podcast.xml` ·
`product_feed.xml` · `google-shopping-feed.xml` · `local-inventory-feed.xml` ·
`data.xml` · `api-feed.xml` · `inventory.json` · `inventory-index.json`

**Geographic** — `geo.txt` · `locations.json` · `locations.geojson` ·
`locations.kml` · `schema/all-locations.jsonld` · one `schema/{slug}.jsonld` per
location · one `schema/vehicles/{slug}.jsonld` per cart

**Platform and standards** — `manifest.json` · `site.webmanifest` ·
`browserconfig.xml` · `opensearch.xml` · `humans.txt` · `security.txt` ·
`.well-known/security.txt` · `ads.txt` · `app-ads.txt` · `accessibility.txt` ·
`images.txt` · `performance.txt` · `compliance.txt` · `schema.json`

### Structured data

Every page carries one JSON-LD graph. Across the site that covers `AutoDealer`,
`Organization`, `LocalBusiness`, `WebSite` (with `SearchAction`), `WebPage`,
`BreadcrumbList`, `SaleEvent`, `Product`, `Vehicle`, `Offer`, `AggregateOffer`,
`ItemList`, `CollectionPage`, `FAQPage`, `Question`, `Answer`, `Article`,
`BlogPosting`, `Blog`, `ContactPage`, `Service`, `FinancialProduct`,
`PostalAddress`, `GeoCoordinates`, `GeoCircle`, `OpeningHoursSpecification`,
`ImageObject` and `Brand`.

### Answer-engine optimisation

The site is written to be quoted. Sixteen curated Q&A pairs render as visible
accordions **and** as `FAQPage` schema; every vehicle page generates its own
cart-specific Q&A; every location page answers questions about that store. The
same answer corpus is exported verbatim into `llms.txt`, `gpt.txt`, `claude.txt`
and `nlp.txt`, alongside intent-classification samples, entity-extraction
examples and entity relationship triples.

### Icons and images

`npm run assets` renders `src/assets/*.svg` through headless Chromium into 23 PNG
icon sizes, maskable PWA icons, Apple touch icons, Windows tiles, a
multi-resolution `favicon.ico` (16/32/48/64/128/256), `logo-icon.ico`, and the
1200×630 Open Graph and Twitter cards. Output is committed to `public/`, so an
ordinary build never needs a browser.

---

## Project layout

```
data/
  site.config.mjs      business facts, event, keywords, nav — the single source of truth
  locations.mjs        dealership geography (street addresses come from the DMS)
  faq.mjs              the answer corpus
  guides.mjs           long-form articles
  inventory.json       committed snapshot, refreshed nightly

scripts/
  fetch-inventory.mjs  the nightly DMS pull
  build.mjs            the site generator
  make-assets.mjs      icon and social-card rendering
  lib/                 dms client, utilities, page shell, shared components
  pages/               page templates
  seo/                 sitemaps, AI files, data files, crawler directory

src/
  assets/              logo and graphic sources (SVG)
  styles/site.css      the design system
  js/                  site chrome and the inventory filter

functions/api/         optional Cloudflare Pages Functions (live DMS proxy)
public/                generated icons and social images
tests/                 build verification
```

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for GitHub Pages, Cloudflare Pages, DNS and
search-console setup.

---

## Contact

**844-456-2228** · sales@independencedaygolfcarts.com
