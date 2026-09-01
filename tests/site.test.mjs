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
import { financingPartners, storeDisplayName } from "../data/site.config.mjs";

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
    // A cart the DMS gave photos for must publish those photos, not the placeholder.
    if (cart.hasPhotos) {
      assert.equal(
        cart.imageUrls.length,
        cart.images.length,
        `${cart.slug} has ${cart.images.length} photos but publishes ${cart.imageUrls.length}`,
      );
      for (const url of cart.imageUrls) {
        assert.ok(
          url.startsWith("https://s3.amazonaws.com/prod.docs.s3/carts/"),
          `${cart.slug} has photos but published a placeholder: ${url}`,
        );
      }
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

test("no page makes a claim the business does not offer", () => {
  // These were all asserted site-wide at one point and are not true:
  // there is no free delivery, and no location opens on Sunday.
  const forbidden = [
    /free\s+(local\s+)?deliver/i,
    /deliver(y|ed)\s+free/i,
    /delivery is included/i,
    /same-day delivery/i,
    /open\s+7\s+days/i,
    /seven days a week/i,
    /open on sunday/i,
  ];
  const offenders = [];
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(html)) offenders.push(`${file.replace(DIST, "dist")} matches ${pattern}`);
    }
  }
  // The AI/SEO text files carry the same business facts and must agree.
  for (const name of ["llms.txt", "llms-full.txt", "ai.txt", "gpt.txt", "claude.txt", "geo.txt", "nlp.txt"]) {
    const contents = read(name);
    for (const pattern of [/free\s+(local\s+)?deliver/i, /delivery is included/i]) {
      if (pattern.test(contents)) offenders.push(`${name} matches ${pattern}`);
    }
  }
  assert.deepEqual(offenders.slice(0, 10), [], `unsupported claims found:\n${offenders.slice(0, 10).join("\n")}`);
});

test("published hours are Monday to Saturday, 9 to 5, closed Sunday", () => {
  const spec = site.hours;
  assert.equal(spec.length, 1, "one hours block covers Monday to Saturday");
  assert.deepEqual(spec[0].days, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  assert.equal(spec[0].opens, "09:00");
  assert.equal(spec[0].closes, "17:00");
  assert.ok(!spec.some((entry) => entry.days.includes("Sunday")), "Sunday must be absent so schema reads it as closed");

  // Every location page must publish the same hours in its structured data.
  const inventory = JSON.parse(read("inventory.json"));
  for (const store of inventory.stores.slice(0, 5)) {
    const html = read(join("locations", store.slug, "index.html"));
    const graph = JSON.parse(
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
        .replace(/\\u003c/g, "<").replace(/\\u003e/g, ">"),
    )["@graph"];
    const dealer = graph.find((node) => [].concat(node["@type"]).includes("AutoDealer") && node["@id"].includes("/locations/"));
    assert.ok(dealer, `${store.slug} has no location AutoDealer node`);
    const hours = dealer.openingHoursSpecification;
    assert.equal(hours.length, 1);
    assert.equal(hours[0].closes, "17:00", `${store.slug} publishes the wrong closing time`);
    assert.ok(!hours[0].dayOfWeek.includes("Sunday"), `${store.slug} claims Sunday hours`);
    assert.ok(html.includes("Closed"), `${store.slug} should show Sunday as closed`);
  }
});

test("every financing partner links to its dealer-specific application", () => {
  const html = read(join("financing", "index.html"));
  assert.equal(financingPartners.length, 6);
  for (const partner of financingPartners) {
    assert.match(partner.url, /^https:\/\//, `${partner.name} URL must be absolute https`);
    assert.ok(
      !/^https:\/\/(www\.)?(sheffieldbbt|app\.bfrportal|dfrportal|app\.roadrunnerfinancial|univestcapitalinc|dealerdirect)\.com\/?$/.test(partner.url),
      `${partner.name} still points at a generic homepage: ${partner.url}`,
    );
    // The rendered page must carry the URL, HTML-escaped.
    const escaped = partner.url.replace(/&/g, "&amp;");
    assert.ok(html.includes(`href="${escaped}"`), `${partner.name} link is missing from /financing/`);
    assert.ok(
      html.includes(`>Apply with ${partner.name} `) || html.includes(`Apply with ${partner.name}`),
      `${partner.name} has no apply button`,
    );
  }
  // External applications must open safely in a new tab.
  const externalAnchors = html.match(/<a[^>]+href="https:\/\/(?!fonts|s3)[^"]+"[^>]*>/g) ?? [];
  for (const anchor of externalAnchors.filter((a) => financingPartners.some((p) => a.includes(p.url.replace(/&/g, "&amp;"))))) {
    assert.ok(anchor.includes('target="_blank"'), `external link missing target=_blank: ${anchor}`);
    assert.ok(anchor.includes("noopener"), `external link missing rel=noopener: ${anchor}`);
  }
});

test("locations are named for the sales event, never the DMS parent group", () => {
  const inventory = JSON.parse(read("inventory.json"));
  for (const store of inventory.stores) {
    const expected = storeDisplayName(store.city, store.state);
    assert.equal(store.name, expected, `${store.slug} has the wrong display name`);
    assert.ok(!/tigon/i.test(store.name), `${store.slug} still carries the DMS group name`);
  }
  for (const cart of inventory.carts) {
    if (!cart.storeName) continue;
    assert.ok(!/tigon/i.test(cart.storeName), `cart ${cart.slug} carries a DMS store name`);
  }

  // No location page, and no page that names a store, may render the DMS name.
  // "Tigon" is also a battery brand in the DMS, so only store-name contexts
  // are checked here rather than the raw word.
  for (const store of inventory.stores) {
    const html = read(join("locations", store.slug, "index.html"));
    assert.ok(html.includes(expectedName(store)), `${store.slug} page does not show its display name`);
    assert.ok(!/Tigon\s+(Hatfield|Bayville|Dover|Ocean View|Rio Grande|Waretown|Long Pond|Scranton|Gloucester Point|Raleigh|Orangeburg|Lecanto|South Bend|Swanton|Wichita Falls)/.test(html),
      `${store.slug} page still shows a DMS store name`);
  }

  function expectedName(store) {
    return storeDisplayName(store.city, store.state);
  }
});

test("carts with photos render those photos, not the placeholder", () => {
  const inventory = JSON.parse(read("inventory.json"));
  const withPhotos = inventory.carts.filter((cart) => cart.hasPhotos);
  assert.ok(withPhotos.length > 0, "expected at least one cart with photography");

  // Vehicle pages must use the real S3 file as the gallery hero and the OG image.
  for (const cart of withPhotos.slice(0, 15)) {
    const html = read(join("golfcart", cart.slug, "index.html"));
    const expected = `https://s3.amazonaws.com/prod.docs.s3/carts/${cart.images[0]}`;
    assert.ok(html.includes(`src="${expected}"`), `${cart.slug} gallery does not show its first photo`);
    assert.ok(
      html.includes(`<meta property="og:image" content="${expected}">`),
      `${cart.slug} og:image is not its own photo`,
    );
    assert.ok(
      !html.includes('data-gallery-main src="/images/cart-photo-coming-soon.svg"'),
      `${cart.slug} shows the placeholder despite having photos`,
    );
  }

  // Listing pages that lead with photographed carts must show real images.
  for (const page of ["index.html", join("july-4th-golf-cart-sales-event", "index.html"), join("inventory", "index.html")]) {
    const html = read(page);
    const s3 = (html.match(/src="https:\/\/s3\.amazonaws\.com\/prod\.docs\.s3\/carts\/[^"]+"/g) ?? []).length;
    assert.ok(s3 > 0, `${page} renders no real cart photography`);
  }
});

test("image sitemap and product feed carry real photography", () => {
  const inventory = JSON.parse(read("inventory.json"));
  const withPhotos = inventory.carts.filter((cart) => cart.hasPhotos);
  const totalPhotos = withPhotos.reduce((sum, cart) => sum + cart.images.length, 0);

  for (const name of ["image-sitemap.xml", "sitemap-images.xml"]) {
    const xml = read(name);
    const locs = (xml.match(/<image:loc>https:\/\/s3\.amazonaws\.com[^<]+<\/image:loc>/g) ?? []).length;
    assert.ok(locs > 0, `${name} lists no real images`);
    // The sitemap caps at 20 photos per cart, so it can be fewer but never more.
    assert.ok(locs <= totalPhotos, `${name} lists more images than exist`);
    assert.ok(locs >= withPhotos.length, `${name} lists fewer images than carts with photos`);
    assert.ok(!xml.includes("cart-photo-coming-soon"), `${name} lists the placeholder as content`);
  }

  const feed = read("product_feed.xml");
  const links = (feed.match(/<g:image_link>https:\/\/s3\.amazonaws\.com[^<]+<\/g:image_link>/g) ?? []).length;
  assert.equal(links, withPhotos.length, "product feed image count does not match carts with photos");
});

test("only sellable retail carts are published", () => {
  const inventory = JSON.parse(read("inventory.json"));
  const notForSale = new Set(["boneyard", "permanent_boneyard", "work_in_progress"]);

  for (const cart of inventory.carts) {
    const status = String(cart.status ?? "").toLowerCase();
    assert.ok(
      !notForSale.has(status),
      `${cart.slug} is published with status "${cart.status}" — boneyard and work-in-progress units carry internal figures, not asking prices`,
    );
    if (cart.inventoryState) {
      assert.notEqual(cart.inventoryState.isInBoneyard, true, `${cart.slug} is in the boneyard`);
      assert.notEqual(cart.inventoryState.isService, true, `${cart.slug} is a service unit`);
      assert.notEqual(cart.inventoryState.isInStock, false, `${cart.slug} is not in stock`);
    }
  }
});

test("published prices come from the DMS retail price", () => {
  const inventory = JSON.parse(read("inventory.json"));

  for (const cart of inventory.carts) {
    // A price is either a positive number or absent, never zero or negative.
    assert.ok(
      cart.price === null || (typeof cart.price === "number" && cart.price > 0),
      `${cart.slug} has a nonsensical price: ${cart.price}`,
    );
    // Where the DMS sent a retail price, that is the number published.
    if (cart.rawPricing && typeof cart.rawPricing.retailPrice === "number" && cart.rawPricing.retailPrice > 0) {
      assert.equal(
        cart.price,
        cart.rawPricing.retailPrice,
        `${cart.slug} publishes ${cart.price} but the DMS retailPrice is ${cart.rawPricing.retailPrice}`,
      );
    }
  }

  // The rendered price must be the DMS price exactly — cents included, never
  // rounded. Fractional prices are checked explicitly because rounding them is
  // the failure mode that reads as "the price is wrong".
  const fractional = inventory.carts.filter((cart) => cart.price > 0 && !Number.isInteger(cart.price));
  const whole = inventory.carts.filter((cart) => cart.price > 0 && Number.isInteger(cart.price)).slice(0, 10);

  for (const cart of [...fractional, ...whole]) {
    const html = read(join("golfcart", cart.slug, "index.html"));
    const hasCents = !Number.isInteger(cart.price);
    const expected = "$" + Number(cart.price).toLocaleString("en-US", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    });
    assert.ok(
      html.includes(`>${expected}<`),
      `${cart.slug} should render ${expected} for a DMS price of ${cart.price}`,
    );
    if (hasCents) {
      const rounded = "$" + Math.round(cart.price).toLocaleString("en-US");
      assert.ok(
        !html.includes(`>${rounded}<`),
        `${cart.slug} publishes ${rounded}, rounding away the cents on a DMS price of ${cart.price}`,
      );
    }
  }
});

test("no cart lists the same photograph twice", () => {
  const inventory = JSON.parse(read("inventory.json"));
  for (const cart of inventory.carts) {
    assert.equal(
      new Set(cart.images).size,
      cart.images.length,
      `${cart.slug} lists a duplicate photo, which would repeat in the gallery`,
    );
  }
});

test("the parent group name appears nowhere a visitor can read it", () => {
  // The only permitted occurrences are inside the lender application URLs the
  // dealership supplied: BLI's dealer account path and Univest's campaign
  // tracking. Changing either breaks the application or loses attribution.
  const allowed = [/blirentals\.com\/app\/TIGON_GOLFCARTS_LLC/g, /utm_source=TIGON\+Golf\+Carts/g];

  const checked = allFiles.filter((file) => /\.(html|txt|json|xml|jsonld|geojson|kml|webmanifest|css|js)$/.test(file));
  const offenders = [];
  for (const file of checked) {
    let contents = readFileSync(file, "utf8");
    for (const pattern of allowed) contents = contents.replace(pattern, "");
    // The escaped form of the Univest URL appears in HTML attributes.
    contents = contents.replace(/utm_source=TIGON\+Golf\+Carts/g, "");
    if (/tigon/i.test(contents)) {
      const sample = contents.match(/.{0,40}tigon.{0,40}/i)?.[0] ?? "";
      offenders.push(`${file.replace(DIST, "dist")}: …${sample.trim()}…`);
    }
  }
  assert.deepEqual(offenders.slice(0, 8), [], `parent group name is still published:\n${offenders.slice(0, 8).join("\n")}`);
});

test("one phone number is used everywhere", () => {
  assert.equal(site.phone, "844-456-2228");
  assert.equal(site.phoneE164, "+18444562228");
  assert.equal(site.phoneTel, "tel:+18444562228");

  const stale = [];
  const checked = allFiles.filter((file) => /\.(html|txt|json|xml|jsonld|svg|css|js|webmanifest)$/.test(file));
  for (const file of checked) {
    const contents = readFileSync(file, "utf8");
    // Any 844 number that is not the current one, in any common separator style.
    for (const match of contents.matchAll(/\b(?:1[-. ]?)?\(?8\d{2}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g)) {
      const digits = match[0].replace(/\D/g, "").replace(/^1/, "");
      if (digits !== "8444562228") stale.push(`${file.replace(DIST, "dist")}: ${match[0]}`);
    }
  }
  assert.deepEqual(stale.slice(0, 8), [], `a stale phone number is published:\n${stale.slice(0, 8).join("\n")}`);

  // The number must actually reach the pages, not just the config.
  const home = read("index.html");
  assert.ok(home.includes(site.phone), "home page does not show the phone number");
  assert.ok(home.includes(site.phoneTel), "home page has no click-to-call link");
});

test("listing cards show the same price as the vehicle page", () => {
  const inventory = JSON.parse(read("inventory.json"));
  const byId = new Map(inventory.carts.map((cart) => [cart.id, cart]));

  // Every card the server renders across the listing pages, checked against
  // the record it came from. Card and detail page must agree exactly.
  for (const page of ["index.html", join("inventory", "index.html"), join("new", "index.html"),
                      join("used", "index.html"), join("july-4th-golf-cart-sales-event", "index.html")]) {
    const html = read(page);
    const rendered = [...html.matchAll(/data-testid="text-price-([a-f0-9]{24})">([^<]+)</g)];
    assert.ok(rendered.length > 0, `${page} renders no priced cards`);

    for (const [, id, shown] of rendered) {
      const cart = byId.get(id);
      if (!cart) continue;
      const hasCents = !Number.isInteger(cart.price);
      const expected = cart.price > 0
        ? "$" + Number(cart.price).toLocaleString("en-US", {
            minimumFractionDigits: hasCents ? 2 : 0,
            maximumFractionDigits: 2,
          })
        : "Call for Price";
      assert.equal(shown, expected, `${page} shows ${shown} for ${cart.slug}, DMS price is ${cart.price}`);
    }
  }
});
