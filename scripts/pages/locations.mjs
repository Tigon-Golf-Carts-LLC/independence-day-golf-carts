/** Location index and per-store pages — the local SEO surface. */

import { site, salesEvent } from "../../data/site.config.mjs";
import { esc, clamp, formatPriceShort } from "../lib/util.mjs";
import { renderPage, ICONS, abs } from "../lib/layout.mjs";
import { cartCard, ctaBand } from "../lib/components.mjs";

/** AutoDealer node for one store, used on its page and in the geo JSON-LD files. */
export function storeSchema(store) {
  const url = `${site.url}/locations/${store.slug}/`;
  return {
    "@type": ["AutoDealer", "LocalBusiness"],
    "@id": `${url}#dealer`,
    name: store.name,
    branchOf: { "@id": `${site.url}/#organization` },
    parentOrganization: { "@id": `${site.url}/#organization` },
    url,
    image: `${site.url}/images/og-image.png`,
    logo: `${site.url}/images/logo.png`,
    telephone: site.phoneE164,
    email: site.email,
    priceRange: site.priceRange,
    currenciesAccepted: "USD",
    paymentAccepted: "Cash, Check, Credit Card, Financing",
    description: `${site.name} in ${store.city}, ${store.state} — new and used golf carts, street legal LSVs and lifted carts, on sale during the ${salesEvent.name}. Serving ${(store.serviceArea || []).slice(0, 4).join(", ") || store.state}.`,
    address: {
      "@type": "PostalAddress",
      ...(store.address1 ? { streetAddress: store.address1 } : {}),
      addressLocality: store.city,
      addressRegion: store.stateCode,
      ...(store.postalCode ? { postalCode: store.postalCode } : {}),
      addressCountry: "US",
    },
    ...(store.lat
      ? { geo: { "@type": "GeoCoordinates", latitude: store.lat, longitude: store.lng } }
      : {}),
    ...(store.lat
      ? {
          areaServed: {
            "@type": "GeoCircle",
            geoMidpoint: { "@type": "GeoCoordinates", latitude: store.lat, longitude: store.lng },
            geoRadius: "80000",
          },
        }
      : {}),
    hasMap: store.lat ? `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}` : undefined,
    openingHoursSpecification: site.hours.map((entry) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: entry.days,
      opens: entry.opens,
      closes: entry.closes,
    })),
    ...(store.cartCount
      ? {
          makesOffer: {
            "@type": "Offer",
            itemOffered: { "@type": "Product", name: `Golf carts in ${store.city}, ${store.stateCode}` },
            availability: "https://schema.org/InStock",
            priceCurrency: "USD",
          },
        }
      : {}),
  };
}

export function renderLocationsIndex(data) {
  const path = "/locations/";
  const byState = new Map();
  for (const store of data.stores) {
    if (!byState.has(store.state)) byState.set(store.state, []);
    byState.get(store.state).push(store);
  }

  const body = `<div class="page-head">
  <div class="wrap">
    <p class="eyebrow eyebrow--light">${esc(salesEvent.name)}</p>
    <h1>Golf Cart Dealership Locations</h1>
    <p class="page-head__lede">${data.stores.length} locations across ${byState.size} states, all sharing one inventory of ${data.summary.total} carts. Independence Day pricing applies at every store, and we will transfer any cart to the location nearest you.</p>
    <div class="btn-row" style="margin-top:20px">
      <a class="btn btn--primary" href="${site.phoneTel}">${ICONS.phone} Call ${esc(site.phone)}</a>
      <a class="btn btn--outline" href="/inventory/">Browse All Inventory</a>
    </div>
  </div>
</div>

<section class="section section--tight">
  <div class="wrap">
${[...byState.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([state, stores]) => `    <h2 style="font-size:1.6rem;margin-top:32px">${esc(state)}</h2>
    <div class="grid-3">
${stores
  .map(
    (store) => `      <div class="location-card">
        <h3><a href="/locations/${store.slug}/">${esc(store.city)}, ${esc(store.stateCode)}</a></h3>
        <address>
          ${store.address1 ? `${esc(store.address1)}<br>` : ""}${esc(store.city)}, ${esc(store.stateCode)} ${esc(store.postalCode)}<br>
          <a href="${site.phoneTel}">${esc(site.phone)}</a>
        </address>
        <p class="note" style="margin:8px 0 0">${store.cartCount ? `${store.cartCount} carts in stock` : "Inventory transferred on request"}${store.county ? ` &middot; ${esc(store.county)}` : ""}</p>
        <div class="location-card__links">
          <a class="btn btn--outline btn--sm" href="/locations/${store.slug}/">Location details</a>
          ${store.cartCount ? `<a class="btn btn--primary btn--sm" href="/locations/${store.slug}/inventory/">See inventory</a>` : ""}
        </div>
      </div>`,
  )
  .join("\n")}
    </div>`,
  )
  .join("\n")}
  </div>
</section>

${ctaBand({ title: "Find the July 4th event nearest you" })}`;

  return renderPage({
    title: `Golf Cart Dealership Locations — ${data.stores.length} Stores | ${site.name}`,
    description: clamp(
      `Independence Day Golf Carts has ${data.stores.length} dealership locations across ${byState.size} states with ${data.summary.total} carts in stock. July 4th event pricing at every store. Call ${site.phone}.`,
    ),
    path,
    body,
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: path, label: "Locations" },
    ],
    stores: data.stores,
    pageKeywords: ["golf cart dealer near me", "golf cart dealership locations", "July 4th golf cart sale near me"],
    graph: [
      {
        "@type": "ItemList",
        "@id": `${abs(path)}#locations`,
        name: "Independence Day Golf Carts locations",
        numberOfItems: data.stores.length,
        itemListElement: data.stores.map((store, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${site.url}/locations/${store.slug}/`,
          name: `${store.city}, ${store.stateCode}`,
        })),
      },
      ...data.stores.map((store) => storeSchema(store)),
    ],
  });
}

export function renderLocationPage(store, data) {
  const path = `/locations/${store.slug}/`;
  const stock = data.carts.filter((cart) => cart.locationSlug === store.slug);
  const prices = stock.map((cart) => cart.price).filter((price) => price > 0);
  const nearby = data.stores
    .filter((entry) => entry.slug !== store.slug && entry.state === store.state)
    .slice(0, 4);

  const locationFaq = [
    {
      q: `Does the ${store.city} location have the July 4th sales event?`,
      a: `Yes. The ${salesEvent.name} runs June 20 through July 8 at every Independence Day Golf Carts location, including ${store.city}, ${store.stateCode}. Independence Day pricing applies to all ${stock.length || "in-stock"} carts here, and 0% APR financing for 48 months is available on approved credit.`,
    },
    {
      q: `What areas does the ${store.city} store serve?`,
      a: (store.serviceArea || []).length
        ? `Our ${store.city}, ${store.stateCode} location serves ${store.serviceArea.join(", ")} and the surrounding ${store.region || store.state} area. Free local delivery is included during the sales event.`
        : `Our ${store.city}, ${store.stateCode} location serves ${store.state} and the surrounding region, with free local delivery during the sales event.`,
    },
    {
      q: `Can I get a cart from another location delivered to ${store.city}?`,
      a: `Yes. All ${data.stores.length} of our locations share one inventory of ${data.summary.total} carts. If the cart you want is at another store we will transfer it to ${store.city} or deliver it directly to you. Call ${site.phone} to arrange it.`,
    },
  ];

  const body = `<div class="page-head">
  <div class="wrap">
    <p class="eyebrow eyebrow--light">${esc(store.county || store.region || store.state)}</p>
    <h1>Golf Carts in ${esc(store.city)}, ${esc(store.stateCode)}</h1>
    <p class="page-head__lede">${esc(store.name)} — ${stock.length ? `${stock.length} carts in stock` : "inventory transferred on request"} with ${esc(salesEvent.name)} pricing${prices.length ? ` from ${formatPriceShort(Math.min(...prices))}` : ""}. Serving ${esc((store.serviceArea || []).slice(0, 5).join(", ") || store.state)}.</p>
    <div class="btn-row" style="margin-top:20px">
      <a class="btn btn--primary" href="${site.phoneTel}">${ICONS.phone} Call ${esc(site.phone)}</a>
      ${stock.length ? `<a class="btn btn--outline" href="/locations/${store.slug}/inventory/">Browse ${stock.length} carts</a>` : `<a class="btn btn--outline" href="/inventory/">Browse all inventory</a>`}
    </div>
  </div>
</div>

<section class="section section--tight">
  <div class="wrap">
    <div class="grid-2">
      <div class="prose">
        <h2>About the ${esc(store.city)} location</h2>
        <p>Our ${esc(store.city)}, ${esc(store.stateCode)} store carries new and used golf carts from ${data.facets.makes.slice(0, 6).map((make) => make.label).join(", ")} and more, including electric and gas models, lifted carts and street legal LSVs. Every cart is inspected before it reaches the sales floor.</p>
        <p>During the ${esc(salesEvent.name)}, all inventory here carries Independence Day pricing, local delivery is free, and trade-ins are appraised the same day. Financing at 0% APR for 48 months is available on approved credit through six national lenders.</p>
        ${
          (store.serviceArea || []).length
            ? `<h3>Areas we serve from ${esc(store.city)}</h3>
        <ul class="tag-list">${store.serviceArea.map((area) => `<li><a href="/locations/${store.slug}/">${esc(area)}</a></li>`).join("")}</ul>`
            : ""
        }
      </div>
      <div class="panel">
        <h3 style="margin-top:0">${esc(store.name)}</h3>
        <address style="font-style:normal;color:var(--body);line-height:1.9">
          ${store.address1 ? `${esc(store.address1)}<br>` : ""}${store.address2 ? `${esc(store.address2)}<br>` : ""}
          ${esc(store.city)}, ${esc(store.stateCode)} ${esc(store.postalCode)}<br>
          <a href="${site.phoneTel}"><strong>${esc(site.phone)}</strong></a>
        </address>
        <h4 style="margin-top:18px">Hours</h4>
        <table class="spec-table">
          <tbody>
${site.hoursDisplay.map((row) => `            <tr><th scope="row">${esc(row.label)}</th><td>${esc(row.value)}</td></tr>`).join("\n")}
          </tbody>
        </table>
        ${
          store.lat
            ? `<p style="margin-top:16px"><a class="btn btn--outline btn--sm" rel="noopener" target="_blank" href="https://www.google.com/maps/search/?api=1&amp;query=${store.lat},${store.lng}">${ICONS.pin} Get directions</a></p>`
            : ""
        }
      </div>
    </div>
  </div>
</section>

${
  stock.length
    ? `<section class="section section--surface">
  <div class="wrap">
    <div class="section-head__row">
      <div class="section-head">
        <p class="eyebrow eyebrow--light">In stock now</p>
        <h2>Golf carts at ${esc(store.city)}, ${esc(store.stateCode)}</h2>
      </div>
      <a class="btn btn--outline" href="/locations/${store.slug}/inventory/">All ${stock.length} carts</a>
    </div>
    <div class="grid-carts">
      ${stock.slice(0, 8).map((cart, index) => cartCard(cart, { eager: index < 4 })).join("\n      ")}
    </div>
  </div>
</section>`
    : ""
}

<section class="section">
  <div class="wrap wrap-narrow">
    <h2>Questions about the ${esc(store.city)} store</h2>
    ${locationFaq
      .map(
        (entry, index) => `<details class="faq-item"${index === 0 ? " open" : ""}>
      <summary>${esc(entry.q)}</summary>
      <div class="faq-item__body"><p>${esc(entry.a)}</p></div>
    </details>`,
      )
      .join("\n    ")}
  </div>
</section>

${
  nearby.length
    ? `<section class="section section--tight section--surface">
  <div class="wrap">
    <h2 style="font-size:1.5rem">Other ${esc(store.state)} locations</h2>
    <ul class="linkgrid">
      ${nearby.map((entry) => `<li><a href="/locations/${entry.slug}/">${ICONS.pin} ${esc(entry.city)}, ${esc(entry.stateCode)}</a></li>`).join("\n      ")}
      <li><a href="/locations/">All ${data.stores.length} locations</a></li>
    </ul>
  </div>
</section>`
    : ""
}

${ctaBand({ title: `Shop the July 4th event in ${store.city}` })}`;

  return renderPage({
    title: `Golf Carts in ${store.city}, ${store.stateCode} — ${salesEvent.name} | ${site.name}`,
    description: clamp(
      `${store.name} — ${stock.length ? `${stock.length} golf carts in stock` : "golf carts"} in ${store.city}, ${store.state}. July 4th event pricing, 0% APR for 48 months, free local delivery. Call ${site.phone}.`,
    ),
    path,
    body,
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/locations/", label: "Locations" },
      { href: path, label: `${store.city}, ${store.stateCode}` },
    ],
    stores: data.stores,
    geo: store,
    pageKeywords: [
      ...(store.keywords || []),
      `golf carts ${store.city} ${store.stateCode}`,
      `golf cart dealer ${store.city}`,
      `July 4th golf cart sale ${store.city}`,
    ],
    graph: [
      storeSchema(store),
      {
        "@type": "FAQPage",
        "@id": `${abs(path)}#faq`,
        mainEntity: locationFaq.map((entry) => ({
          "@type": "Question",
          name: entry.q,
          acceptedAnswer: { "@type": "Answer", text: entry.a },
        })),
      },
    ],
  });
}
