/** Brand index and per-brand landing pages. */

import { site, salesEvent } from "../../data/site.config.mjs";
import { esc, clamp, formatPriceShort } from "../lib/util.mjs";
import { renderPage, ICONS, abs } from "../lib/layout.mjs";
import { ctaBand } from "../lib/components.mjs";
import { renderInventoryPage } from "./inventory.mjs";

/** URL slug for a make ("club_car" -> "club-car"). */
export const brandSlug = (makeKey) => makeKey.replace(/_/g, "-");

export function renderBrandsIndex(data) {
  const path = "/brands/";
  const makes = data.facets.makes;

  const body = `<div class="page-head">
  <div class="wrap">
    <p class="eyebrow eyebrow--light">${esc(salesEvent.name)}</p>
    <h1>Shop Golf Carts by Brand</h1>
    <p class="page-head__lede">${makes.length} brands and ${data.summary.total} carts in stock across ${data.stores.length} locations, all carrying Independence Day event pricing.</p>
    <div class="btn-row" style="margin-top:20px">
      <a class="btn btn--primary" href="${site.phoneTel}">${ICONS.phone} Call ${esc(site.phone)}</a>
      <a class="btn btn--outline" href="/inventory/">Browse All Inventory</a>
    </div>
  </div>
</div>

<section class="section section--tight">
  <div class="wrap">
    <div class="grid-3">
${makes
  .map((make) => {
    const stock = data.carts.filter((cart) => cart.makeKey === make.key);
    const prices = stock.map((cart) => cart.price).filter((price) => price > 0);
    const models = [...new Set(stock.map((cart) => cart.model).filter(Boolean))].slice(0, 6);
    return `      <div class="location-card">
        <h3><a href="/brands/${brandSlug(make.key)}/">${esc(make.label)} Golf Carts</a></h3>
        <p class="note" style="margin:0">${make.count} in stock${prices.length ? ` &middot; from ${formatPriceShort(Math.min(...prices))}` : ""}</p>
        ${models.length ? `<p style="margin:8px 0 0;color:var(--muted);font-size:.9rem">${esc(models.join(", "))}</p>` : ""}
        <div class="location-card__links">
          <a class="btn btn--outline btn--sm" href="/brands/${brandSlug(make.key)}/">View ${make.count} carts</a>
        </div>
      </div>`;
  })
  .join("\n")}
    </div>
  </div>
</section>

${ctaBand({ title: "Not sure which brand fits?" , text: "Call and describe how you will use the cart — terrain, passengers, whether it needs to be street legal — and we will narrow it to two or three that fit, at Independence Day pricing." })}`;

  return renderPage({
    title: `Golf Cart Brands — ${makes.length} Makes in Stock | ${site.name}`,
    description: clamp(
      `Shop ${data.summary.total} golf carts from ${makes.map((make) => make.label).slice(0, 6).join(", ")} and more during the ${salesEvent.name}. Independence Day pricing, 0% APR for 48 months.`,
    ),
    path,
    body,
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: path, label: "Brands" },
    ],
    stores: data.stores,
    pageKeywords: [...makes.map((make) => `${make.label} golf carts for sale`), "golf cart brands"],
    graph: [
      {
        "@type": "ItemList",
        "@id": `${abs(path)}#brands`,
        name: "Golf cart brands in stock",
        numberOfItems: makes.length,
        itemListElement: makes.map((make, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${site.url}/brands/${brandSlug(make.key)}/`,
          name: `${make.label} Golf Carts`,
        })),
      },
    ],
  });
}

export function renderBrandPage(make, data) {
  const stock = data.carts.filter((cart) => cart.makeKey === make.key);
  const models = [...new Set(stock.map((cart) => cart.model).filter(Boolean))].sort();
  const prices = stock.map((cart) => cart.price).filter((price) => price > 0);
  const electric = stock.filter((cart) => cart.isElectric).length;
  const cities = [...new Set(stock.map((cart) => cart.city).filter(Boolean))];
  const path = `/brands/${brandSlug(make.key)}/`;

  const copy = `<h2>${esc(make.label)} golf carts in the ${esc(salesEvent.name)}</h2>
<p>We have ${stock.length} ${esc(make.label)} cart${stock.length === 1 ? "" : "s"} in stock${prices.length ? `, priced from ${formatPriceShort(Math.min(...prices))} to ${formatPriceShort(Math.max(...prices))}` : ""} — ${electric} electric and ${stock.length - electric} gas. Every one carries Independence Day event pricing from June 20 through July 8, with 0% APR financing for 48 months on approved credit and free local delivery.</p>
${models.length ? `<h3>${esc(make.label)} models in stock</h3>\n<ul>\n${models.map((model) => `  <li>${esc(make.label)} ${esc(model)}</li>`).join("\n")}\n</ul>` : ""}
${cities.length ? `<h3>Where to find them</h3>\n<p>${esc(make.label)} carts are currently on the floor at ${esc(cities.slice(0, 8).join(", "))}${cities.length > 8 ? " and other locations" : ""}. If the configuration you want is at another store we will transfer it — call ${esc(site.phone)}.</p>` : ""}
<h3>Buying a ${esc(make.label)} during the July 4th event</h3>
<p>Ask about the battery year and chemistry first on any electric cart — that single number drives both the running cost and the resale value. Then confirm whether the cart is street legal as it sits, what warranty remains, and the out-the-door total including freight, prep and tax. Our <a href="/guides/golf-cart-buying-checklist/">buying checklist</a> walks the full list.</p>`;

  const faqEntries = [
    {
      q: `How much does a ${make.label} golf cart cost during the July 4th sale?`,
      a: prices.length
        ? `${make.label} carts in our current stock run from ${formatPriceShort(Math.min(...prices))} to ${formatPriceShort(Math.max(...prices))} at ${salesEvent.name} pricing. Live pricing on each individual cart is on this page and refreshes every morning at 1:30 AM Eastern.`
        : `Call ${site.phone} for current ${make.label} pricing during the ${salesEvent.name}. Stock and pricing refresh daily at 1:30 AM Eastern.`,
    },
    {
      q: `Which ${make.label} models do you have in stock?`,
      a: models.length
        ? `We currently have ${models.join(", ")} in stock. Availability changes daily — this page reflects the live dealership inventory as of the most recent 1:30 AM Eastern refresh.`
        : `Stock rotates daily. Call ${site.phone} and we will tell you exactly which ${make.label} models are on the floor today across all ${data.stores.length} locations.`,
    },
    {
      q: `Do you finance ${make.label} golf carts?`,
      a: `Yes. 0% APR for 48 months on approved credit applies to every ${make.label} cart in the ${salesEvent.name}, through six national lending partners. Most offer soft-pull prequalification that does not affect your credit score.`,
    },
  ];

  return renderInventoryPage({
    data,
    path,
    title: `${make.label} Golf Carts for Sale — ${stock.length} in Stock | ${salesEvent.name}`,
    h1: `${make.label} Golf Carts for Sale`,
    description: `${stock.length} ${make.label} golf carts in stock${prices.length ? ` from ${formatPriceShort(Math.min(...prices))}` : ""} during the ${salesEvent.name}. 0% APR for 48 months, free delivery. Call ${site.phone}.`,
    intro: `${stock.length} ${make.label} cart${stock.length === 1 ? "" : "s"} in stock across ${data.stores.length} locations, all at Independence Day event pricing.`,
    locked: { make: make.key },
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/brands/", label: "Brands" },
      { href: path, label: make.label },
    ],
    pageKeywords: [
      `${make.label} golf carts for sale`,
      `${make.label} golf cart price`,
      `used ${make.label} golf cart`,
      `${make.label} July 4th golf cart sale`,
      ...models.slice(0, 6).map((model) => `${make.label} ${model} for sale`),
    ],
    relatedLinks: [
      { href: "/brands/", label: "All brands" },
      { href: "/new/", label: "New golf carts" },
      { href: "/used/", label: "Used golf carts" },
      { href: "/street-legal-golf-carts/", label: "Street legal LSVs" },
      ...data.facets.makes
        .filter((entry) => entry.key !== make.key)
        .slice(0, 6)
        .map((entry) => ({ href: `/brands/${brandSlug(entry.key)}/`, label: `${entry.label} golf carts` })),
    ],
    faqEntries,
    copy,
    extraGraph: [
      {
        "@type": "Brand",
        "@id": `${abs(path)}#brand`,
        name: make.label,
        url: abs(path),
      },
    ],
  });
}
