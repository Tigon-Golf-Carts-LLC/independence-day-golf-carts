# Lead forms → TIGON IOT Webhook Flows

Every page on the site sends leads to this website's own TIGON IOT webhook
(TIGON IOT → Webhook Flows → Webhooks → *Independence Day Golf Carts — Contact form*).

> The webhook key and signing secret are credentials. This repository is public,
> so **neither is committed**. The key is injected at build time; the secret only
> ever lives in Cloudflare's encrypted settings.

## Where the forms are

| Where | What | Pre-filled cart fields |
| --- | --- | --- |
| Every page, header | **Get a Quote** button → modal | — |
| Every content page (financing, about, service, trade-in, delivery, guides, FAQ, legal…) | **Send a Message** button next to *Call* → modal | — |
| Bottom call-to-action band (most pages) | **Get a Quote** → modal | — |
| Every listing card (home, inventory, new/used, categories, brands, locations) | ✉ button next to the call button → modal | brand, model, VIN, stock # (read-only) |
| Every vehicle page, buy box | **Check Availability & Get a Quote** and **Request More Photos**, under *Call* and *Apply Now — 0% Financing* → modal | brand, model, VIN, stock # (read-only) |
| `/contact/` | Inline form + **Call Now** button + location picker | from `?cart=<slug>` when linked from a cart |

All of them are the same form (`form_name` = `Contact form`) with every field
TIGON expects: `first_name`, `last_name`, `email`, `phone1`, `phone2`, `address`,
`zip_code`, `brand`, `model`, `vin_number`, `sku_number`, `comments`,
`image_1`–`image_3`, the hidden `url`, `referrer`, `utm_*`, `gclid`, `fbclid`,
`ga_client_id`, and the `website` spam trap. The contact page also sends `location`.

## Files

| File | Role |
| --- | --- |
| `scripts/lib/lead-form.mjs` | Form + modal markup; picks the endpoint at build time |
| `src/js/lead-form.js` | Validation, first-touch UTM storage, GA client id, sending, modal |
| `src/styles/site.css` (end) | Form and modal styles |
| `functions/api/lead.js` | Optional Cloudflare Pages Function that signs each request |
| `data/site.config.mjs` → `leadForm` | Form name, webhook base URL, photo size limit |

## Setup

### 1. Webhook key (required)

The build reads `TIGON_WEBHOOK_KEY`. Without it the forms still render but tell
visitors to call instead.

* **GitHub** → repository → Settings → Secrets and variables → Actions →
  *New repository secret* → name `TIGON_WEBHOOK_KEY`, value = the key at the end
  of the webhook URL. The daily deploy workflow passes it to both builds.
* **Cloudflare Pages** (if it builds from Git itself) → project → Settings →
  Variables and Secrets → add `TIGON_WEBHOOK_KEY` (type *Secret*) for Production.
* Local build: `TIGON_WEBHOOK_KEY=... npm run build`.

With only the key set, browsers post directly to the webhook (signatures are
optional on this webhook, and TIGON only accepts browser posts whose origin is
`https://independencedaygolfcarts.com`).

### 2. Signed requests (recommended on Cloudflare Pages)

1. TIGON IOT → Webhook Flows → Webhooks → this webhook → Setup packet →
   Developers → **Create secret**. Copy it (shown once).
2. Cloudflare Pages project → Settings → Variables and Secrets → Production:
   * `TIGON_WEBHOOK_KEY` (*Secret*): the webhook key
   * `TIGON_WEBHOOK_SECRET` (*Secret*): the signing secret
3. GitHub → Settings → Secrets and variables → Actions → **Variables** →
   `TIGON_LEAD_VIA_PROXY` = `1` (or set the same variable in Cloudflare's build
   settings if Cloudflare builds from Git). The forms then post to `/api/lead`,
   which signs the raw body (`X-Tigon-Signature: sha256=<hex HMAC-SHA256>`) and
   forwards it.
4. Submit a test lead; once it arrives, turn on **Require signature** for the
   webhook in TIGON IOT.

Only do step 3 for a host that runs Pages Functions. GitHub Pages does not, so
the GitHub Pages build keeps posting directly. Before turning on *Require
signature*, make sure the live domain is served by Cloudflare Pages.

## Testing

1. Open https://independencedaygolfcarts.com/contact/?utm_source=test&utm_medium=manual
2. Fill in your own name, email, phone (10+ digits), ZIP, a message, and attach a photo.
3. Send. The button shows *Sending…*, then: *Thank you! We received your request…*
4. TIGON IOT → Webhook Flows → Submissions: the lead shows form *Contact form*,
   every field you typed, the photo, `url`, `utm_source=test`, `utm_medium=manual`.
5. Open any vehicle page, click **Check Availability & Get a Quote**, send again,
   and check that `brand`, `model`, `vin_number` and `sku_number` match that cart.
6. Error paths: leave a required field blank, enter a 7-digit phone, or attach a
   photo over 10 MB. Each shows a red message and nothing is sent.

A preview URL (`*.pages.dev`, localhost) is a different origin, so TIGON will
reject browser posts from it. Test on the live domain.
