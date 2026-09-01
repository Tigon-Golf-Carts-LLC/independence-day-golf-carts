#!/usr/bin/env node
/**
 * Static site generator.
 *
 * Reads data/inventory.json (written by scripts/fetch-inventory.mjs) and emits
 * a complete static site into dist/ — every page pre-rendered as HTML, plus the
 * full SEO, AI and feed file suite. The output is deployable as-is to
 * Cloudflare Pages, GitHub Pages, or any static host.
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

import { site, salesEvent } from "../data/site.config.mjs";
import { guides } from "../data/guides.mjs";
import { faq } from "../data/faq.mjs";
import { formatPriceShort } from "./lib/util.mjs";

import { renderHomePage, renderEventPage } from "./pages/home.mjs";
import { renderInventoryPage } from "./pages/inventory.mjs";
import { renderVehiclePage } from "./pages/vehicle.mjs";
import { renderLocationsIndex, renderLocationPage } from "./pages/locations.mjs";
import { renderBrandsIndex, renderBrandPage, brandSlug } from "./pages/brands.mjs";
import {
  renderFinancingPage, renderAboutPage, renderContactPage, renderServicePage,
  renderTradeInPage, renderDeliveryPage, renderFaqPage, renderGuidesIndex,
  renderGuidePage, renderHtmlSitemap, renderLegalPage, renderNotFoundPage,
} from "./pages/content.mjs";

import { buildSitemaps } from "./seo/sitemaps.mjs";
import { buildAiFiles } from "./seo/ai-files.mjs";
import { buildDataFiles } from "./seo/data-files.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(root, "dist");

let fileCount = 0;

/** Write a file into dist/, creating directories as needed. */
function emit(relativePath, contents) {
  const target = resolve(DIST, relativePath.replace(/^\//, ""));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
  fileCount += 1;
}

/** Write an HTML page at a clean URL: "/foo/" becomes dist/foo/index.html. */
function emitPage(path, html) {
  const relative = path === "/" ? "index.html" : path.endsWith(".html") ? path : `${path.replace(/^\/|\/$/g, "")}/index.html`;
  emit(relative, html);
}

function countFiles(directory) {
  let total = 0;
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    total += statSync(full).isDirectory() ? countFiles(full) : 1;
  }
  return total;
}

/* ----------------------------------------------------------------- run --- */

const snapshotPath = resolve(root, "data/inventory.json");
if (!existsSync(snapshotPath)) {
  process.stderr.write(
    "data/inventory.json is missing.\nRun `npm run fetch` for live DMS data, or `npm run fetch:fixture` for offline development.\n",
  );
  process.exit(1);
}
const data = JSON.parse(readFileSync(snapshotPath, "utf8"));

// Production deploys must never publish the development fixture as real stock.
if (process.argv.includes("--require-live") && data.source !== "tigon-dms") {
  process.stderr.write(
    `Refusing to build: data/inventory.json has source "${data.source}", not live DMS data.\n` +
      "Run `npm run fetch` against the Tigon DMS before deploying.\n",
  );
  process.exit(1);
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

process.stdout.write(`Building ${site.domain} — ${data.carts.length} carts, ${data.stores.length} locations\n`);
if (data.source === "fixture") {
  process.stdout.write("  NOTE: building from the development fixture, not live DMS data.\n");
}

/* --- static assets ------------------------------------------------------- */

cpSync(resolve(root, "public"), DIST, { recursive: true });
cpSync(resolve(root, "src/styles"), resolve(DIST, "styles"), { recursive: true });
cpSync(resolve(root, "src/js"), resolve(DIST, "js"), { recursive: true });
mkdirSync(resolve(DIST, "images"), { recursive: true });
for (const [from, to] of [
  ["logo.svg", "images/logo.svg"],
  ["logo-light.svg", "images/logo-light.svg"],
  ["logo-mark.svg", "images/favicon.svg"],
  ["logo-mark.svg", "images/logo-mark.svg"],
  ["og-image.svg", "images/og-image.svg"],
  ["cart-photo-coming-soon.svg", "images/cart-photo-coming-soon.svg"],
]) {
  cpSync(resolve(root, "src/assets", from), resolve(DIST, to));
}
// A PNG copy of the logo for schema.org consumers that reject SVG.
cpSync(resolve(root, "public/icons/icon-512.png"), resolve(DIST, "images/logo.png"));

/* --- primary pages ------------------------------------------------------- */

emitPage("/", renderHomePage(data));
emitPage("/july-4th-golf-cart-sales-event/", renderEventPage(data, "july4"));
emitPage("/independence-day-golf-cart-sales-event/", renderEventPage(data, "independence"));

/* --- inventory and category pages ---------------------------------------- */

const inventoryCrumbs = (path, label) => [
  { href: "/", label: "Home" },
  { href: "/inventory/", label: "Inventory" },
  ...(path === "/inventory/" ? [] : [{ href: path, label }]),
];

const CATEGORIES = [
  {
    path: "/inventory/",
    locked: {},
    h1: "Golf Carts for Sale",
    title: `Golf Carts for Sale — ${data.summary.total} in Stock | ${salesEvent.name}`,
    description: `Browse all ${data.summary.total} golf carts in the ${salesEvent.name} — new and used, electric and gas, lifted and street legal. 0% APR for 48 months. Call ${site.phone}.`,
    intro: `Every cart in stock across all ${data.stores.length} locations, with Independence Day event pricing. Filter by condition, power, brand, colour, passengers and location.`,
    keywords: ["golf carts for sale", "golf cart inventory", "buy a golf cart", "July 4th golf cart sale"],
    copy: `<h2>Shopping the ${salesEvent.name}</h2>
<p>This page lists every cart on every one of our ${data.stores.length} lots — ${data.summary.new} new and ${data.summary.used} used, ${data.summary.electric} electric and ${data.summary.gas} gas${data.summary.priceMin ? `, priced from ${formatPriceShort(data.summary.priceMin)} to ${formatPriceShort(data.summary.priceMax)}` : ""}. Listings are pulled from our dealer management system every morning at 1:30&nbsp;AM Eastern, so what you see here is what is on the floor today.</p>
<p>Use the filters to narrow by condition, powertrain, brand, colour, passenger count, drivetrain and location. Every filter writes to the URL, so you can bookmark or share a search. If nothing here is quite right, call ${site.phone} — we source carts weekly and can often find your configuration before the event ends.</p>`,
  },
  {
    path: "/new/",
    locked: { isNew: true },
    h1: "New Golf Carts for Sale",
    title: `New Golf Carts for Sale — ${data.summary.new} in Stock | ${salesEvent.name}`,
    description: `${data.summary.new} new golf carts with full factory warranty in the ${salesEvent.name}. Independence Day pricing, 0% APR for 48 months, free delivery.`,
    intro: `${data.summary.new} brand-new carts with full factory warranty and current-generation battery packs, all at Independence Day event pricing.`,
    keywords: ["new golf carts for sale", "brand new golf cart", "new golf cart prices"],
    copy: `<h2>Buying new during the Independence Day event</h2>
<p>A new cart carries the full factory warranty and the current battery chemistry, which matters most on electric models — a new lithium pack should give eight to ten years of service before it needs attention. New carts also carry the deepest event discounts, because current model-year stock is what dealers most need to clear before the late-summer changeover.</p>
<p>If you plan to drive the cart daily — neighbourhood errands, the beach, a golf community — a new lithium model bought at event pricing is usually the better long-run value than a used cart with an ageing pack. Read the <a href="/guides/golf-cart-buying-checklist/">buying checklist</a> before you decide.</p>`,
  },
  {
    path: "/used/",
    locked: { isUsed: true },
    h1: "Used Golf Carts for Sale",
    title: `Used Golf Carts for Sale — ${data.summary.used} in Stock | ${salesEvent.name}`,
    description: `${data.summary.used} reconditioned used golf carts in the ${salesEvent.name}. Battery year published on every listing. 0% APR financing available.`,
    intro: `${data.summary.used} reconditioned trade-ins, inspected before they reach the floor, with the battery year published on every listing.`,
    keywords: ["used golf carts for sale", "second hand golf carts", "pre-owned golf cart", "cheap golf carts"],
    copy: `<h2>What to check on a used cart</h2>
<p>Battery age is the single biggest factor in the value of a used electric cart. A lead-acid pack older than four years should be priced as a near-term replacement of $900 to $1,800; a lithium pack of the same age has most of its life ahead of it. We publish the battery year and chemistry on every used listing so you can judge that before you call.</p>
<p>On a test drive, watch for the cart slowing on a hill or after twenty minutes of running — that is voltage sag and it points to a tired pack. Our <a href="/guides/golf-cart-battery-guide/">battery guide</a> covers how to read the numbers on a listing.</p>`,
  },
  {
    path: "/electric-golf-carts/",
    locked: { isElectric: true },
    h1: "Electric Golf Carts for Sale",
    title: `Electric Golf Carts for Sale — ${data.summary.electric} in Stock | ${salesEvent.name}`,
    description: `${data.summary.electric} electric golf carts including lithium models in the ${salesEvent.name}. Quiet, cheap to run, 0% APR for 48 months.`,
    intro: `${data.summary.electric} electric carts, including lithium models that charge in three to five hours and run 45 to 60 miles per charge.`,
    keywords: ["electric golf carts for sale", "lithium golf cart", "battery golf cart", "48v golf cart"],
    copy: `<h2>Why most buyers choose electric</h2>
<p>A full charge costs roughly $0.50 to $1.50 and takes a lead-acid cart 25 to 40 miles, or a lithium cart 45 to 60. There is no fuel to store, no oil to change and no engine to service. Many golf communities, campgrounds and beach towns restrict gas carts outright on noise grounds, so electric is also the safer choice if you are not certain of local rules.</p>
<p>Lithium is worth the premium if the cart will see regular use: 3,000 to 5,000 cycles against 500 to 1,000 for lead-acid, half the weight, no watering, and the cart holds full speed to the end of the charge instead of slowing as the pack drains. See <a href="/guides/electric-vs-gas-golf-carts/">electric vs gas</a> for the full comparison.</p>`,
  },
  {
    path: "/gas-golf-carts/",
    locked: { isGas: true },
    h1: "Gas Golf Carts for Sale",
    title: `Gas Golf Carts for Sale — ${data.summary.gas} in Stock | ${salesEvent.name}`,
    description: `${data.summary.gas} gas golf carts in the ${salesEvent.name}. Long range, instant refuelling, ideal for acreage and hills. 0% APR financing.`,
    intro: `${data.summary.gas} gas carts — the right answer for large acreage, hunting, hilly ground and all-day running with no chance to charge.`,
    keywords: ["gas golf carts for sale", "gas powered golf cart", "EFI golf cart"],
    copy: `<h2>When gas is the right choice</h2>
<p>Gas carts refuel in a minute and run all day, which matters on large properties, hunting leases, farms and steep terrain where an electric cart would need a mid-day charge. A gas cart covers 30 to 40 miles on a gallon and has no pack to replace.</p>
<p>Check local rules first: many golf communities, gated neighbourhoods, campgrounds and beach towns restrict or ban gas carts on noise and emissions grounds. If your cart will live in one of those, look at <a href="/electric-golf-carts/">electric</a> instead.</p>`,
  },
  {
    path: "/street-legal-golf-carts/",
    locked: { isStreetLegal: true },
    h1: "Street Legal Golf Carts & LSVs for Sale",
    title: `Street Legal Golf Carts & LSVs — ${data.summary.streetLegal} in Stock | ${salesEvent.name}`,
    description: `${data.summary.streetLegal} street legal Low Speed Vehicles in the ${salesEvent.name} — lights, mirrors, seat belts, windshield and VIN. 0% APR financing.`,
    intro: `${data.summary.streetLegal} carts equipped as Low Speed Vehicles — headlights, turn signals, mirrors, seat belts, a windshield and a VIN, ready to register.`,
    keywords: ["street legal golf carts", "LSV for sale", "low speed vehicle", "road legal golf cart", "neighborhood electric vehicle"],
    copy: `<h2>What makes a cart street legal</h2>
<p>A street legal cart is a Low Speed Vehicle under Federal Motor Vehicle Safety Standard 500. It must reach 20 to 25 mph and carry headlights, tail and brake lights, front and rear turn signals, reflectors, a driver-side mirror plus an interior or passenger-side mirror, a parking brake, a federal-standard windshield, seat belts at every seating position, and a VIN.</p>
<p>Titling, registration and insurance rules vary by state and municipality — confirm with your state DMV before you buy. Our <a href="/guides/street-legal-golf-carts-lsv-guide/">LSV guide</a> covers the states we serve. If you already own a cart, we can bring it up to LSV specification; call ${site.phone} for a quote.</p>`,
  },
  {
    path: "/lifted-golf-carts/",
    locked: { isLifted: true },
    h1: "Lifted Golf Carts for Sale",
    title: `Lifted Golf Carts for Sale — ${data.summary.lifted} in Stock | ${salesEvent.name}`,
    description: `${data.summary.lifted} lifted golf carts with all-terrain tires in the ${salesEvent.name}. Built for sand, grass and gravel. 0% APR for 48 months.`,
    intro: `${data.summary.lifted} lifted carts riding three to six inches higher on 12 to 14 inch all-terrain tires — the standard configuration for beach and rural buyers.`,
    keywords: ["lifted golf carts", "lifted golf cart for sale", "off road golf cart", "all terrain golf cart"],
    copy: `<h2>What a lift kit adds</h2>
<p>A lift raises the cart three to six inches and clears 12 to 14 inch wheels with all-terrain tires. That extra ground clearance is what lets a cart handle soft sand, wet grass and gravel without dragging, and it noticeably smooths the ride over uneven ground.</p>
<p>Lifted carts are the default choice for beach houses, waterfront communities and rural properties. The trade-offs are a slightly higher step-in, a marginally higher centre of gravity, and a small range penalty from the larger tires.</p>`,
  },
];

for (const category of CATEGORIES) {
  emitPage(
    category.path,
    renderInventoryPage({
      data,
      path: category.path,
      title: category.title,
      h1: category.h1,
      description: category.description,
      intro: category.intro,
      locked: category.locked,
      breadcrumbs: inventoryCrumbs(category.path, category.h1),
      pageKeywords: category.keywords,
      copy: category.copy,
      relatedLinks: [
        ...CATEGORIES.filter((entry) => entry.path !== category.path).map((entry) => ({ href: entry.path, label: entry.h1 })),
        { href: "/brands/", label: "Shop by brand" },
        { href: "/locations/", label: "Shop by location" },
      ],
      faqEntries: faq.filter((entry) => ["buying", "pricing", "event"].includes(entry.topic)).slice(0, 5),
    }),
  );
}

/* --- brands -------------------------------------------------------------- */

emitPage("/brands/", renderBrandsIndex(data));
for (const make of data.facets.makes) {
  emitPage(`/brands/${brandSlug(make.key)}/`, renderBrandPage(make, data));
}

/* --- locations ----------------------------------------------------------- */

emitPage("/locations/", renderLocationsIndex(data));
for (const store of data.stores) {
  emitPage(`/locations/${store.slug}/`, renderLocationPage(store, data));

  if (store.cartCount > 0) {
    const path = `/locations/${store.slug}/inventory/`;
    emitPage(
      path,
      renderInventoryPage({
        data,
        path,
        title: `Golf Carts for Sale in ${store.city}, ${store.stateCode} — ${store.cartCount} in Stock`,
        h1: `Golf Carts in ${store.city}, ${store.stateCode}`,
        description: `${store.cartCount} golf carts in stock in ${store.city}, ${store.state} during the ${salesEvent.name}. 0% APR for 48 months, free local delivery. Call ${site.phone}.`,
        intro: `${store.cartCount} carts on the floor at ${store.name}, all at Independence Day event pricing. Serving ${(store.serviceArea || []).slice(0, 4).join(", ") || store.state}.`,
        locked: { location: store.slug },
        breadcrumbs: [
          { href: "/", label: "Home" },
          { href: "/locations/", label: "Locations" },
          { href: `/locations/${store.slug}/`, label: `${store.city}, ${store.stateCode}` },
          { href: path, label: "Inventory" },
        ],
        pageKeywords: [
          ...(store.keywords || []),
          `golf carts for sale ${store.city} ${store.stateCode}`,
          `golf cart dealer near ${store.city}`,
        ],
        relatedLinks: data.stores
          .filter((entry) => entry.slug !== store.slug && entry.cartCount > 0)
          .slice(0, 10)
          .map((entry) => ({ href: `/locations/${entry.slug}/inventory/`, label: `Golf carts in ${entry.city}, ${entry.stateCode}` })),
      }),
    );
  }
}

/* --- vehicles ------------------------------------------------------------ */

for (const cart of data.carts) {
  // Related: same make first, then anything from the same location.
  const related = [
    ...data.carts.filter((entry) => entry.id !== cart.id && entry.makeKey === cart.makeKey),
    ...data.carts.filter((entry) => entry.id !== cart.id && entry.locationSlug === cart.locationSlug),
    ...data.carts.filter((entry) => entry.id !== cart.id),
  ];
  const seen = new Set();
  const unique = related.filter((entry) => (seen.has(entry.id) ? false : seen.add(entry.id))).slice(0, 4);

  emitPage(`/golfcart/${cart.slug}/`, renderVehiclePage({ cart, data, related: unique }));
}

/* --- content pages ------------------------------------------------------- */

emitPage("/financing/", renderFinancingPage(data));
emitPage("/about/", renderAboutPage(data));
emitPage("/contact/", renderContactPage(data));
emitPage("/service/", renderServicePage(data));
emitPage("/trade-in/", renderTradeInPage(data));
emitPage("/delivery/", renderDeliveryPage(data));
emitPage("/faq/", renderFaqPage(data));
emitPage("/guides/", renderGuidesIndex(data));
for (const guide of guides) {
  emitPage(`/guides/${guide.slug}/`, renderGuidePage(guide, data));
}
emitPage("/sitemap/", renderHtmlSitemap(data));
for (const kind of ["privacy", "terms", "accessibility"]) {
  emitPage(`/${kind}/`, renderLegalPage(kind, data));
}
emit("404.html", renderNotFoundPage(data));

/* --- SEO, AI and data files ---------------------------------------------- */

const { files: sitemapFiles, sitemapNames } = buildSitemaps(data);
for (const [name, contents] of Object.entries(sitemapFiles)) emit(name, contents);

for (const [name, contents] of Object.entries(buildAiFiles(data, sitemapNames))) emit(name, contents);
for (const [name, contents] of Object.entries(buildDataFiles(data))) emit(name, contents);

/* --- host configuration -------------------------------------------------- */

// Cloudflare Pages: security and cache headers.
emit(
  "_headers",
  `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Robots-Tag: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1

/icons/*
  Cache-Control: public, max-age=31536000, immutable
/images/*
  Cache-Control: public, max-age=31536000, immutable
/styles/*
  Cache-Control: public, max-age=86400
/js/*
  Cache-Control: public, max-age=86400
/*.html
  Cache-Control: public, max-age=3600, must-revalidate
/inventory.json
  Cache-Control: public, max-age=3600, must-revalidate
  Access-Control-Allow-Origin: *
/inventory-index.json
  Cache-Control: public, max-age=3600, must-revalidate
  Access-Control-Allow-Origin: *
/*.xml
  Cache-Control: public, max-age=86400
  Content-Type: application/xml; charset=utf-8
/*.txt
  Cache-Control: public, max-age=86400
  Content-Type: text/plain; charset=utf-8
/*.jsonld
  Content-Type: application/ld+json; charset=utf-8
  Access-Control-Allow-Origin: *
/*.geojson
  Content-Type: application/geo+json; charset=utf-8
  Access-Control-Allow-Origin: *
`,
);

// Cloudflare Pages: legacy path redirects and the SPA-free 404.
emit(
  "_redirects",
  `/index.html            /                                   301
/golfcart/*/index.html /golfcart/:splat/                   301
/july-4th              /july-4th-golf-cart-sales-event/    301
/july4                 /july-4th-golf-cart-sales-event/    301
/4th-of-july           /july-4th-golf-cart-sales-event/    301
/independence-day      /independence-day-golf-cart-sales-event/ 301
/sale                  /july-4th-golf-cart-sales-event/    301
/event                 /july-4th-golf-cart-sales-event/    301
/carts                 /inventory/                         301
/golf-carts            /inventory/                         301
/inventory/index.html  /inventory/                         301
/finance               /financing/                         301
/apply                 /financing/                         301
/store                 /locations/                         301
/stores                /locations/                         301
/dealers               /locations/                         301
/blog                  /guides/                            301
/blog/*                /guides/:splat                      301
/news                  /guides/                            301
/questions             /faq/                               301
/help                  /faq/                               301
/parts                 /service/                           301
/repair                /service/                           301
/*                     /404.html                           404
`,
);

// GitHub Pages: serve the site verbatim, no Jekyll processing.
emit(".nojekyll", "");
emit("CNAME", `${site.domain}\n`);

/* ----------------------------------------------------------------- done --- */

const total = countFiles(DIST);
process.stdout.write(
  `\nBuilt dist/ — ${total} files\n` +
    `  ${data.carts.length} vehicle pages\n` +
    `  ${data.stores.length} location pages (+${data.stores.filter((store) => store.cartCount > 0).length} location inventory pages)\n` +
    `  ${data.facets.makes.length} brand pages\n` +
    `  ${CATEGORIES.length} category pages\n` +
    `  ${guides.length} guide articles\n` +
    `  ${sitemapNames.length} sitemaps\n`,
);
