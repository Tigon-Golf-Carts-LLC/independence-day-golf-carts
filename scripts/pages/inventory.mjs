/**
 * The inventory browser.
 *
 * One renderer serves /inventory plus every faceted landing page (/new, /used,
 * /electric-golf-carts, brand pages, location pages...). Page 1 is fully
 * pre-rendered so crawlers and no-JS visitors see real listings; src/js/inventory.js
 * hydrates the same markup for filtering, sorting and pagination.
 */

import { site, salesEvent } from "../../data/site.config.mjs";
import { esc, clamp, formatPriceShort, cartImages } from "../lib/util.mjs";
import { renderPage, ICONS, abs } from "../lib/layout.mjs";
import { cartCard, ctaBand } from "../lib/components.mjs";

const PAGE_SIZE = 24;

/** Checkbox row wired to the client filter state. */
function check({ field, value, label, count, testId }) {
  const id = `f-${field}-${value ?? "on"}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return `<label class="check" for="${id}"${testId ? ` data-testid="${esc(testId)}" data-state="unchecked"` : ""}>
      <input type="checkbox" id="${id}" data-filter-field="${esc(field)}"${value ? ` data-filter-value="${esc(value)}"` : ""}>
      <span>${esc(label)}</span>
      ${count !== undefined ? `<span class="count" data-facet-count="${esc(value ?? "")}" data-facet-field="${esc(field)}">${count}</span>` : ""}
    </label>`;
}

function filterGroup(title, inner, { scroll = false } = {}) {
  if (!inner.trim()) return "";
  return `<div class="filter-group">
      <h3>${esc(title)}</h3>
      <div${scroll ? ' class="filter-group__scroll"' : ""}>${inner}</div>
    </div>`;
}

function filtersPanel(data, locked) {
  const { facets, stores } = data;
  const hide = (key) => Boolean(locked[key]);

  const condition = [
    hide("isNew") || hide("isUsed") ? "" : check({ field: "isNew", label: "New", testId: "filter-new" }),
    hide("isNew") || hide("isUsed") ? "" : check({ field: "isUsed", label: "Used", testId: "filter-used" }),
  ].join("");

  const power = [
    hide("isElectric") || hide("isGas") ? "" : check({ field: "isElectric", label: "Electric", testId: "filter-electric" }),
    hide("isElectric") || hide("isGas") ? "" : check({ field: "isGas", label: "Gas", testId: "filter-gas" }),
  ].join("");

  const features = [
    hide("isStreetLegal") ? "" : check({ field: "isStreetLegal", label: "Street Legal / LSV", testId: "filter-street-legal" }),
    hide("isLifted") ? "" : check({ field: "isLifted", label: "Lifted", testId: "filter-lifted" }),
  ].join("");

  const makes = locked.make
    ? ""
    : facets.makes
        .map((make) => check({ field: "makes", value: make.key, label: make.label, count: make.count, testId: `filter-make-${make.key}` }))
        .join("");

  const colors = facets.colors
    .filter((color) => color.label)
    .map((color) => check({ field: "colors", value: color.key, label: color.label, count: color.count, testId: `filter-color-${color.key}` }))
    .join("");

  const seats = facets.passengers
    .filter((seat) => seat.label)
    .map((seat) => check({ field: "seats", value: seat.key, label: seat.label, count: seat.count, testId: `filter-seats-${seat.key}` }))
    .join("");

  const drive = facets.driveTrains
    .filter((drivetrain) => drivetrain.label)
    .map((drivetrain) => check({ field: "driveTrain", value: drivetrain.key, label: drivetrain.label, count: drivetrain.count, testId: `filter-drive-${drivetrain.key}` }))
    .join("");

  const locations = locked.location
    ? ""
    : stores
        .filter((store) => store.cartCount > 0)
        .map((store) => check({ field: "storeIds", value: store.slug, label: `${store.city}, ${store.stateCode}`, count: store.cartCount, testId: `filter-store-${store.slug}` }))
        .join("");

  return `<aside class="filters" id="inventory-filters" data-collapsed="true" aria-label="Filter inventory">
    <div class="filters__head">
      <h2>Filter Inventory</h2>
      <button class="btn btn--outline btn--sm" type="button" data-inventory-reset>Reset</button>
    </div>
    <form role="search" onsubmit="return false">
      <label class="visually-hidden" for="inv-search">Search inventory</label>
      <input class="field" type="search" id="inv-search" name="q" placeholder="Search make, model, color…" data-inventory-search>
    </form>
    ${filterGroup("Condition", condition)}
    ${filterGroup("Power", power)}
    ${filterGroup("Features", features)}
    ${filterGroup("Brand", makes, { scroll: true })}
    ${filterGroup("Color", colors, { scroll: true })}
    ${filterGroup("Passengers", seats)}
    ${filterGroup("Drivetrain", drive)}
    ${filterGroup("Location", locations, { scroll: true })}
    <p class="note" style="margin:16px 0 0">Inventory refreshes daily at 1:30&nbsp;AM&nbsp;ET from our dealer management system.</p>
  </aside>`;
}

/** Compact record for the client-side index — short keys keep the payload small. */
export function indexRecord(cart) {
  return {
    id: cart.id,
    sg: cart.slug,
    t: cart.title,
    y: cart.year,
    pr: cart.price,
    mk: cart.makeKey,
    mkl: cart.make,
    md: cart.modelKey,
    c: cart.colorKey,
    cl: cart.color,
    p: cart.passengers,
    dt: cart.driveTrain ? cart.driveTrain.toLowerCase() : "",
    dtl: cart.driveTrain,
    u: cart.isUsed,
    e: cart.isElectric,
    sl: cart.isStreetLegal,
    lf: cart.isLifted,
    ls: cart.locationSlug,
    ct: cart.city,
    st: cart.stateCode,
    im: cart.images[0] || "",
    n: cart.images.length,
    s: [cart.make, cart.model, cart.year, cart.color, cart.city, cart.state, cart.condition, cart.fuel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

/**
 * Render one inventory-style page.
 *
 * `locked` pins facets that define the page itself (e.g. { isNew: true } on
 * /new/) — those filters are enforced server- and client-side and hidden from
 * the sidebar so the page can never show contradictory results.
 */
export function renderInventoryPage({
  data,
  path,
  title,
  h1,
  description,
  intro,
  locked = {},
  breadcrumbs,
  pageKeywords = [],
  relatedLinks = [],
  faqEntries = [],
  extraGraph = [],
  copy = "",
}) {
  const matching = data.carts.filter((cart) => {
    if (locked.isNew && cart.isUsed) return false;
    if (locked.isUsed && !cart.isUsed) return false;
    if (locked.isElectric && !cart.isElectric) return false;
    if (locked.isGas && cart.isElectric) return false;
    if (locked.isStreetLegal && !cart.isStreetLegal) return false;
    if (locked.isLifted && !cart.isLifted) return false;
    if (locked.make && cart.makeKey !== locked.make) return false;
    if (locked.location && cart.locationSlug !== locked.location) return false;
    return true;
  });

  const firstPage = matching.slice(0, PAGE_SIZE);
  const prices = matching.map((cart) => cart.price).filter((price) => price > 0);
  const lowPrice = prices.length ? Math.min(...prices) : null;
  const highPrice = prices.length ? Math.max(...prices) : null;

  const itemList = {
    "@type": "ItemList",
    "@id": `${abs(path)}#itemlist`,
    name: h1,
    description,
    numberOfItems: matching.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: firstPage.map((cart, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${site.url}/golfcart/${cart.slug}/`,
      name: cart.title,
      image: cartImages(cart)[0].startsWith("http") ? cartImages(cart)[0] : site.url + cartImages(cart)[0],
    })),
  };

  const collection = {
    "@type": "CollectionPage",
    "@id": `${abs(path)}#collection`,
    name: title,
    description,
    url: abs(path),
    isPartOf: { "@id": `${site.url}/#website` },
    mainEntity: { "@id": `${abs(path)}#itemlist` },
    ...(lowPrice
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice,
            highPrice,
            offerCount: matching.length,
            availability: "https://schema.org/InStock",
            seller: { "@id": `${site.url}/#organization` },
          },
        }
      : {}),
  };

  const graph = [collection, itemList, ...extraGraph];
  if (faqEntries.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${abs(path)}#faq`,
      mainEntity: faqEntries.map((entry) => ({
        "@type": "Question",
        name: entry.q,
        acceptedAnswer: { "@type": "Answer", text: entry.a },
      })),
    });
  }

  const summary =
    matching.length > 0 && lowPrice
      ? `${matching.length} in stock from ${formatPriceShort(lowPrice)} to ${formatPriceShort(highPrice)}`
      : `${matching.length} in stock`;

  const body = `<div class="page-head">
  <div class="wrap">
    <p class="eyebrow eyebrow--light">${esc(salesEvent.name)}</p>
    <h1>${esc(h1)}</h1>
    <p class="page-head__lede">${esc(intro)}</p>
    <div class="btn-row" style="margin-top:20px">
      <a class="btn btn--primary" href="${site.phoneTel}">${ICONS.phone} Call ${esc(site.phone)}</a>
      <a class="btn btn--outline" href="/financing/">Get Prequalified — 0% APR</a>
    </div>
  </div>
</div>

<div class="wrap" id="results">
  <div class="inventory-layout" data-inventory data-page-size="${PAGE_SIZE}" data-base-path="${esc(path)}" data-phone="${esc(site.phone)}" data-phone-tel="${esc(site.phoneTel)}" data-locked='${esc(JSON.stringify(locked))}'>
    ${filtersPanel(data, locked)}
    <div>
      <div class="results-bar">
        <p class="results-bar__count" data-inventory-count style="margin:0"><strong>${matching.length}</strong> cart${matching.length === 1 ? "" : "s"} &middot; ${esc(summary)}</p>
        <div class="results-controls">
          <button class="btn btn--outline btn--sm filters-toggle" type="button" data-testid="button-open-filters" aria-expanded="false" aria-controls="inventory-filters">Filters</button>
          <label class="visually-hidden" for="inv-sort">Sort inventory</label>
          <select class="field" id="inv-sort" data-inventory-sort data-testid="select-sort" style="width:auto">
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="year-desc">Year: Newest First</option>
          </select>
        </div>
      </div>
      <div data-inventory-grid class="grid-carts" data-testid="grid-inventory">
${firstPage.length ? firstPage.map((cart, index) => cartCard(cart, { eager: index < 4 })).join("\n") : `<div class="empty-state"><h3>No carts in this category right now</h3><p>Inventory refreshes every morning at 1:30 AM Eastern. Call <a href="${site.phoneTel}">${esc(site.phone)}</a> and we will source the cart you want.</p></div>`}
      </div>
      ${matching.length > PAGE_SIZE ? `<noscript><p class="note" style="margin-top:20px">Showing the first ${PAGE_SIZE} of ${matching.length} carts. Enable JavaScript to page through the full catalogue, or call ${esc(site.phone)}.</p></noscript>` : ""}
      <nav class="pagination" data-inventory-pager aria-label="Inventory pagination"></nav>
    </div>
  </div>
</div>

${copy ? `<section class="section section--surface"><div class="wrap"><div class="prose">${copy}</div></div></section>` : ""}

${
  relatedLinks.length
    ? `<section class="section section--tight">
  <div class="wrap">
    <h2 style="font-size:1.5rem">Keep shopping the ${esc(salesEvent.name)}</h2>
    <ul class="linkgrid">
      ${relatedLinks.map((link) => `<li><a href="${esc(link.href)}">${esc(link.label)}</a></li>`).join("\n      ")}
    </ul>
  </div>
</section>`
    : ""
}

${
  faqEntries.length
    ? `<section class="section section--surface">
  <div class="wrap wrap-narrow">
    <h2>Questions about ${esc(h1.toLowerCase())}</h2>
    ${faqEntries
      .map(
        (entry, index) => `<details class="faq-item"${index === 0 ? " open" : ""}>
      <summary>${esc(entry.q)}</summary>
      <div class="faq-item__body"><p>${esc(entry.a)}</p></div>
    </details>`,
      )
      .join("\n    ")}
  </div>
</section>`
    : ""
}

${ctaBand()}`;

  return renderPage({
    title,
    description: clamp(description, 158),
    path,
    body,
    breadcrumbs,
    stores: data.stores,
    pageKeywords,
    graph,
    scripts: ["/js/inventory.js"],
  });
}

export { PAGE_SIZE };
