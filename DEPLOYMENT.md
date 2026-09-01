# Deployment

The build output in `dist/` is plain static files. It works on any static host.
Below are the two the project is configured for.

---

## Option A — Cloudflare Pages (recommended)

Cloudflare Pages is the better fit: it serves the site from the edge, applies the
generated `_headers` and `_redirects`, and can run the optional API proxy in
`functions/`.

### Connect the repository

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pick `Tigon-Golf-Carts-LLC/independence-day-golf-carts`, production branch `main`.
3. Build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `/` |

4. Environment variables → **Production**: `NODE_VERSION` = `22`.
5. Deploy.

Cloudflare rebuilds on every push to `main`, and the nightly workflow pushes the
refreshed `data/inventory.json` at 1:30 AM Eastern, so the site refreshes itself.

### Custom domain

Pages project → **Custom domains** → add `independencedaygolfcarts.com` and
`www.independencedaygolfcarts.com`. If the domain's nameservers are already on
Cloudflare the records are created automatically; otherwise add the `CNAME` that
the dashboard shows. Leave **Always Use HTTPS** on.

### Deploying from your machine

```bash
npm run build:deploy
npx wrangler pages deploy dist --project-name=independence-day-golf-carts
```

### Pages Functions

`functions/api/*` proxies the Tigon DMS so a Cloudflare deployment can answer live
availability questions between nightly rebuilds, with CORS enabled:

| Endpoint | Proxies |
| --- | --- |
| `GET /api/carts?pageNumber=&pageSize=&makes=&isNew=…` | `POST /get-carts` |
| `GET /api/cart/:id` | `POST /get-cart-by-id` |
| `GET /api/stores` | `GET /tigon-stores` |
| `GET /api/brands` | derived from `POST /get-carts` |
| `GET|POST /api/cart-models?makeKeys=` | `POST /get-cart-models` |
| `GET|POST /api/cart-colors?makeKeys=` | `POST /get-cart-colors` |

Responses cache at the edge until the next 01:30 America/New_York refresh. Nothing
on the site depends on these — the static pages work identically without them,
which is why GitHub Pages remains a complete deployment target.

---

## Option B — GitHub Pages

Already wired up in `.github/workflows/daily-inventory.yml`.

1. Repository → **Settings** → **Pages**.
2. **Source**: *GitHub Actions*.
3. Under **Custom domain** enter `independencedaygolfcarts.com` and tick
   **Enforce HTTPS**. The build emits a `CNAME` file, so this sticks across deploys.

DNS at your registrar:

```
A     @   185.199.108.153
A     @   185.199.109.153
A     @   185.199.110.153
A     @   185.199.111.153
AAAA  @   2606:50c0:8000::153
AAAA  @   2606:50c0:8001::153
AAAA  @   2606:50c0:8002::153
AAAA  @   2606:50c0:8003::153
CNAME www tigon-golf-carts-llc.github.io.
```

`_headers` and `_redirects` are Cloudflare features and are simply ignored by
GitHub Pages. The site is otherwise identical; `dist/404.html` is served for
unknown paths automatically.

---

## Repository secrets

Set these under **Settings → Secrets and variables → Actions**. Every one is
optional — the workflow skips the matching step when it is absent.

| Secret | Needed for |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages deploys from CI. Token needs *Cloudflare Pages: Edit*. |
| `CLOUDFLARE_ACCOUNT_ID` | Same. Found in the Cloudflare dashboard sidebar. |
| `INDEXNOW_KEY` | IndexNow submissions after each nightly deploy. |

### IndexNow

To enable it, generate a key (any 32-character hex string), save it as
`INDEXNOW_KEY`, and put a file at `public/<key>.txt` containing that same key —
the build copies `public/` verbatim, so it will be served at
`https://independencedaygolfcarts.com/<key>.txt` where IndexNow verifies it.

---

## After the first deploy

1. **Google Search Console** — add `independencedaygolfcarts.com` as a Domain
   property, then submit `https://independencedaygolfcarts.com/sitemap.xml`. That
   one index covers every sitemap.
2. **Bing Webmaster Tools** — add the site and import from Search Console; submit
   the same sitemap index.
3. **Google Business Profile** — link each of the 15 location pages to its
   matching profile. The `LocalBusiness` schema and per-location `.jsonld` files
   are already in place for the association.
4. **Google Merchant Center** — if you want Shopping listings, add
   `https://independencedaygolfcarts.com/product_feed.xml` as a scheduled feed and
   `https://independencedaygolfcarts.com/local-inventory-feed.xml` for local
   inventory ads. Schedule both for shortly after 2:00 AM Eastern, once the
   nightly refresh has landed.
5. **Rich Results Test** — spot-check a vehicle page, the event page and the FAQ
   page at <https://search.google.com/test/rich-results>.

---

## Verifying a deploy

```bash
curl -sI https://independencedaygolfcarts.com/                | head -1
curl -s  https://independencedaygolfcarts.com/robots.txt      | head -8
curl -s  https://independencedaygolfcarts.com/sitemap.xml     | head -12
curl -s  https://independencedaygolfcarts.com/llms.txt        | head -12
curl -s  https://independencedaygolfcarts.com/inventory.json  | head -c 400
```

---

## Troubleshooting

**The nightly workflow ran but nothing deployed.** Check the *Decide whether this
run is the 1:30 AM Eastern one* step. Two schedules exist to cover both DST
offsets and one of them is expected to skip every day — that is normal.

**The build failed with "Refusing to build".** `data/inventory.json` was not live
DMS data. The DMS fetch failed and there was no previous snapshot to fall back on.
Check DMS reachability, then re-run the workflow.

**Vehicle photos are missing.** Most carts in the DMS carry only
`internalCartImageUrls`, which is private and returns 403. Only the public
`imageUrls` array is used; carts without it show the labelled placeholder by
design. The fix is to add public photos in the DMS.

**Inventory looks stale.** `data/inventory.json` carries a `generatedAt` timestamp
and the same value is published at `/inventory.json`. Compare it against the
workflow run history.

**A cart's URL changed.** Slugs are built from make, model, colour and location.
If any of those are edited in the DMS the slug moves with them. To keep an old URL
alive, add a line to the `_redirects` block in `scripts/build.mjs`.
