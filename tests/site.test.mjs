/**
 * Build verification. Run `npm run build` first, then `npm test`.
 * These checks are what the CI workflow gates the nightly deploy on.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

import { site } from "../data/site.config.mjs";
import { toStateCode, locations as locationSeed } from "../data/locations.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(root, "dist");

function walk(directory, results = []) {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) walk(full, results);
    else results.push(full);
  }
  return results;
}

const allFiles = existsSync(DIST) ? walk(DIST) : [];
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const read = (relative) => readFileSync(resolve(DIST, relative), "utf8");

/** Resolve a site-relative href to the file that would be served for it. */
function resolveHref(href) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || clean === "/") return existsSync(resolve(DIST, "index.html"));
  const target = resolve(DIST, clean.replace(/^\//, ""));
  if (existsSync(target) && statSync(target).isFile()) return true;
  return existsSync(resolve(target, "index.html"));
}

test("build output exists", () => {
  assert.ok(existsSync(DIST), "dist/ is missing — run `npm run build` first");
  assert.ok(htmlFiles.length > 20, `expected many HTML pages, found ${htmlFiles.length}`);
});

test("every required SEO and AI file is generated", () => {
  const required = [
    "index.html", "404.html", "robots.txt", "sitemap.xml", "sitemap_index.xml",
    "sitemap-pages.xml", "sitemap-inventory.xml", "sitemap-brands.xml",
    "sitemap-locations.xml", "sitemap-images.xml", "image-sitemap.xml",
    "news-sitemap.xml", "geo-sitemap.xml", "mobile-sitemap.xml",
    "hreflang-sitemap.xml", "xhtml-sitemap.xml", "dynamic-sitemap.xml",
    "category-sitemap.xml", "page-sitemap.xml", "post-sitemap.xml",
    "author-sitemap.xml", "tag-sitemap.xml", "events-sitemap.xml", "urllist.xml",
    "rss.xml", "atom.xml", "feed.xml", "podcast.xml",
    "product_feed.xml", "google-shopping-feed.xml", "local-inventory-feed.xml",
    "data.xml", "api-feed.xml", "opensearch.xml", "browserconfig.xml",
    "llms.txt", "llms-full.txt", "ai.txt", "gpt.txt", "claude.txt",
    "training.txt", "nlp.txt", "seo.txt", "crawlers.txt", "bots.txt",
    "geo.txt", "images.txt", "accessibility.txt", "performance.txt",
    "compliance.txt", "humans.txt", "security.txt", "ads.txt", "app-ads.txt",
    ".well-known/security.txt", ".well-known/ai.txt",
    "manifest.json", "site.webmanifest", "schema.json",
    "locations.json", "locations.geojson", "locations.kml",
    "inventory.json", "inventory-index.json",
    "favicon.ico", "logo-icon.ico", "apple-touch-icon.png",
    "images/og-image.png", "images/logo.svg", "images/favicon.svg",
    "styles/site.css", "js/site.js", "js/inventory.js",
    "_headers", "_redirects", ".nojekyll", "CNAME",
  ];
  const missing = required.filter((name) => !existsSync(resolve(DIST, name)));
  assert.deepEqual(missing, [], `missing generated files: ${missing.join(", ")}`);
});

test("every page has a unique canonical URL", () => {
  const seen = new Map();
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    const match = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(match, `${file} has no canonical link`);
    const canonical = match[1];
    assert.ok(canonical.startsWith(site.url), `${file} canonical is not absolute: ${canonical}`);
    // 404.html deliberately carries the same shape as a page but is noindex.
    if (file.endsWith("404.html")) continue;
    assert.ok(!seen.has(canonical), `duplicate canonical ${canonical} in ${file} and ${seen.get(canonical)}`);
    seen.set(canonical, file);
  }
});

test("no internal link is broken", () => {
  const broken = new Set();
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const href = match[1];
      if (href.startsWith("//")) continue;
      if (!resolveHref(href)) broken.add(`${href}  (from ${file.replace(DIST, "dist")})`);
    }
  }
  assert.deepEqual([...broken], [], `broken internal links:\n${[...broken].slice(0, 20).join("\n")}`);
});

test("every sitemap URL resolves to a generated page", () => {
  const sitemapFiles = allFiles.filter((file) => /sitemap.*\.xml$|urllist\.xml$/.test(file));
  assert.ok(sitemapFiles.length >= 15, "expected the full sitemap suite");
  const missing = new Set();
  for (const file of sitemapFiles) {
    const xml = readFileSync(file, "utf8");
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const url = match[1];
      if (!url.startsWith(site.url)) {
        missing.add(`off-domain URL ${url}`);
        continue;
      }
      const path = url.slice(site.url.length) || "/";
      if (!resolveHref(path)) missing.add(`${path} (in ${file.replace(DIST, "dist")})`);
    }
  }
  assert.deepEqual([...missing], [], `sitemap URLs with no page:\n${[...missing].slice(0, 20).join("\n")}`);
});

test("robots.txt allows everything and lists every sitemap", () => {
  const robots = read("robots.txt");
  assert.match(robots, /User-agent: \*\nAllow: \/\n/, "wildcard allow rule missing");
  assert.doesNotMatch(robots, /^Disallow: \/\S/m, "robots.txt disallows a path");
  for (const bot of ["GPTBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "CCBot", "PerplexityBot", "Googlebot", "Bingbot"]) {
    assert.ok(robots.includes(`User-agent: ${bot}\n`), `robots.txt does not name ${bot}`);
  }
  const declared = [...robots.matchAll(/^Sitemap: (.+)$/gm)].map((match) => match[1]);
  assert.ok(declared.length >= 15, `only ${declared.length} sitemaps declared`);
  for (const url of declared) {
    const name = url.slice(site.url.length + 1);
    assert.ok(existsSync(resolve(DIST, name)), `robots.txt points at missing ${name}`);
  }
});

test("structured data parses and covers the key types", () => {
  const types = new Set();
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(blocks.length, 1, `${file} should carry exactly one JSON-LD block`);
    const parsed = JSON.parse(blocks[0][1].replace(/\\u003c/g, "<").replace(/\\u003e/g, ">"));
    assert.equal(parsed["@context"], "https://schema.org");
    for (const node of parsed["@graph"]) {
      for (const type of [].concat(node["@type"])) types.add(type);
    }
  }
  for (const required of [
    "AutoDealer", "Organization", "LocalBusiness", "WebSite", "WebPage",
    "BreadcrumbList", "SaleEvent", "Product", "Vehicle", "FAQPage",
    "ItemList", "CollectionPage", "Article", "BlogPosting",
  ]) {
    assert.ok(types.has(required), `no page emits ${required} structured data`);
  }
});

test("inventory feeds agree with the generated vehicle pages", () => {
  const inventory = JSON.parse(read("inventory.json"));
  const index = JSON.parse(read("inventory-index.json"));
  assert.equal(index.count, inventory.carts.length);
  assert.equal(index.carts.length, inventory.carts.length);

  const slugs = inventory.carts.map((cart) => cart.slug);
  assert.equal(new Set(slugs).size, slugs.length, "vehicle slugs are not unique");

  for (const cart of inventory.carts) {
    assert.ok(/^[a-z0-9-]+$/.test(cart.slug), `slug is not URL-safe: ${cart.slug}`);
    assert.ok(
      existsSync(resolve(DIST, "golfcart", cart.slug, "index.html")),
      `no page generated for ${cart.slug}`,
    );
    for (const url of cart.imageUrls) {
      assert.ok(
        url.startsWith("https://s3.amazonaws.com/prod.docs.s3/carts/") || url.startsWith("/images/"),
        `unexpected image URL on ${cart.slug}: ${url}`,
      );
    }
  }
});

test("vehicle pages carry Product, Offer and Vehicle data", () => {
  const inventory = JSON.parse(read("inventory.json"));
  const sample = inventory.carts.slice(0, 12);
  for (const cart of sample) {
    const html = read(join("golfcart", cart.slug, "index.html"));
    const graph = JSON.parse(
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
        .replace(/\\u003c/g, "<").replace(/\\u003e/g, ">"),
    )["@graph"];
    const product = graph.find((node) => [].concat(node["@type"]).includes("Product"));
    assert.ok(product, `${cart.slug} has no Product node`);
    assert.ok(product.offers, `${cart.slug} has no Offer`);
    assert.equal(product.offers.priceCurrency, "USD");
    assert.ok(Array.isArray(product.image) && product.image.length > 0);
    assert.ok(html.includes("<h1"), `${cart.slug} has no h1`);
  }
});

test("locations data is consistent across every format", () => {
  const inventory = JSON.parse(read("inventory.json"));
  const locations = JSON.parse(read("locations.json"));
  const geo = JSON.parse(read("locations.geojson"));

  assert.equal(locations.count, inventory.stores.length);
  assert.equal(geo.features.length, inventory.stores.filter((store) => store.lat).length);

  for (const store of inventory.stores) {
    assert.ok(
      existsSync(resolve(DIST, "locations", store.slug, "index.html")),
      `no page for location ${store.slug}`,
    );
    assert.ok(
      existsSync(resolve(DIST, "schema", `${store.slug}.jsonld`)),
      `no JSON-LD for location ${store.slug}`,
    );
  }
  for (const feature of geo.features) {
    const [lng, lat] = feature.geometry.coordinates;
    assert.ok(lat > 24 && lat < 50, `latitude out of US range: ${lat}`);
    assert.ok(lng > -125 && lng < -66, `longitude out of US range: ${lng}`);
  }
});

test("AI permission files name the site and grant access", () => {
  for (const name of ["llms.txt", "ai.txt", "gpt.txt", "claude.txt", "training.txt"]) {
    const contents = read(name);
    assert.ok(contents.includes(site.name), `${name} does not name the business`);
    assert.ok(contents.includes(site.phone), `${name} does not carry the phone number`);
    assert.match(contents, /PERMISSION: GRANTED|permitted, unrestricted|ALLOWED/i, `${name} states no grant`);
  }
  const llms = read("llms.txt");
  assert.ok(llms.startsWith(`# ${site.name}`), "llms.txt must open with an H1 title");
  assert.ok(llms.includes("\n> "), "llms.txt must carry a blockquote summary");
});

test("the PWA manifest is complete", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.ok(manifest.name && manifest.short_name && manifest.start_url);
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.length >= 10);
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
  for (const icon of manifest.icons) {
    assert.ok(existsSync(resolve(DIST, icon.src.replace(/^\//, ""))), `manifest icon missing: ${icon.src}`);
  }
});

test("no page leaks a template placeholder", () => {
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const marker of ["undefined", "[object Object]", "${", "NaN"]) {
      assert.ok(!html.includes(marker), `${file.replace(DIST, "dist")} contains "${marker}"`);
    }
  }
});

test("state names resolve to real USPS codes", () => {
  // "New Jersey".slice(0, 2) is "NE", which is Nebraska. Truncation is never
  // a valid way to derive a state code.
  for (const [name, code] of [
    ["New Jersey", "NJ"], ["Texas", "TX"], ["Ohio", "OH"], ["Nebraska", "NE"],
    ["Pennsylvania", "PA"], ["Delaware", "DE"], ["North Carolina", "NC"],
    ["South Carolina", "SC"], ["Vermont", "VT"], ["Indiana", "IN"],
  ]) {
    assert.equal(toStateCode(name), code, `${name} should resolve to ${code}`);
  }
  assert.equal(toStateCode("NJ"), "NJ", "an existing code passes through");
  assert.equal(toStateCode("new jersey"), "NJ", "matching is case-insensitive");
  assert.equal(toStateCode(""), "", "an unknown value yields an empty string");

  for (const location of locationSeed) {
    assert.equal(
      toStateCode(location.state),
      location.stateCode,
      `${location.city}: stateCode ${location.stateCode} does not match state ${location.state}`,
    );
  }
});

test("every generated location page has usable geo data", () => {
  const inventory = JSON.parse(read("inventory.json"));
  for (const store of inventory.stores) {
    assert.ok(store.city && store.state, `store ${store.slug} is missing city or state`);
    assert.match(store.stateCode, /^[A-Z]{2}$/, `store ${store.slug} has a malformed state code: ${store.stateCode}`);
    assert.equal(
      toStateCode(store.state),
      store.stateCode,
      `store ${store.slug} state "${store.state}" does not match code "${store.stateCode}"`,
    );
  }
});
