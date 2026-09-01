/**
 * Vehicle detail page — /golfcart/{slug}/
 * Gallery, full specification tables, financing maths, location, and the
 * richest structured data on the site (Product + Vehicle + Offer + FAQ).
 */

import { site, salesEvent } from "../../data/site.config.mjs";
import { esc, clamp, formatPrice, formatPriceShort, monthlyPayment, cartImages } from "../lib/util.mjs";
import { renderPage, ICONS, abs } from "../lib/layout.mjs";
import { cartCard, cartSchema, cartDescription, cartProperties, ctaBand } from "../lib/components.mjs";

/** Split the flat property list into the tables shown on the page. */
function specSections(cart) {
  const rows = cartProperties(cart);
  const pick = (labels) => rows.filter((row) => labels.includes(row.label));
  const batteryLabels = ["Battery Type", "Battery Brand", "Battery Year", "Capacity", "Pack Voltage", "Cell Voltage", "Battery Warranty"];
  const engineLabels = ["Engine", "Horsepower", "Stroke"];
  const detailLabels = ["Condition", "Power", "VIN", "Stock / Serial", "Odometer", "Hours", "Warranty", "Location"];

  return [
    { title: "Specifications", rows: rows.filter((row) => ![...batteryLabels, ...engineLabels, ...detailLabels].includes(row.label)) },
    { title: cart.isElectric ? "Battery & Charging" : "Engine", rows: pick(cart.isElectric ? batteryLabels : engineLabels) },
    { title: "Vehicle Details", rows: pick(detailLabels) },
  ].filter((section) => section.rows.length > 0);
}

function specTable(section) {
  return `<div class="table-scroll">
  <table class="spec-table">
    <caption>${esc(section.title)}</caption>
    <tbody>
      ${section.rows.map((row) => `<tr><th scope="row">${esc(row.label)}</th><td>${esc(row.value)}</td></tr>`).join("\n      ")}
    </tbody>
  </table>
</div>`;
}

/** Cart-specific Q&A — visible on the page and emitted as FAQPage schema. */
function vehicleFaq(cart) {
  const priceText = cart.price ? formatPriceShort(cart.price) : "available by phone";
  const monthly = monthlyPayment(cart.price);
  const entries = [
    {
      q: `How much is this ${cart.title}?`,
      a: cart.price
        ? `The ${salesEvent.name} price on this ${cart.year ? `${cart.year} ` : ""}${cart.title} is ${formatPrice(cart.price)}. With 0% APR financing over 48 months on approved credit that works out to about $${Math.round(monthly).toLocaleString("en-US")} per month. Call ${site.phone} to confirm the out-the-door total.`
        : `Pricing on this ${cart.title} is ${priceText}. Call ${site.phone} and we will quote Independence Day event pricing including delivery.`,
    },
    {
      q: `Is this ${cart.title} street legal?`,
      a: cart.isStreetLegal
        ? `Yes. This cart is equipped as a street legal Low Speed Vehicle, meaning it carries the lighting, mirrors, seat belts, windshield and VIN required for road registration. Confirm your state and municipal rules before registering — requirements vary.`
        : `This particular cart is not configured as a street legal LSV as it sits. It can be upgraded to LSV specification with lights, mirrors, seat belts, a windshield and a horn. Call ${site.phone} for an upgrade quote, or browse our street legal inventory.`,
    },
    {
      q: `Where is this cart located and can it be delivered?`,
      a: cart.city
        ? `This cart is in stock at our ${cart.city}, ${cart.stateCode} location. Local and nationwide delivery can be arranged and is quoted to your ZIP code. We can also transfer it to whichever of our 15 locations is closest to you.`
        : `Call ${site.phone} and we will confirm which of our 15 locations has this cart and arrange delivery, quoted to your ZIP code.`,
    },
  ];

  if (cart.isElectric && cart.battery?.type) {
    entries.push({
      q: `What battery does this ${cart.title} have?`,
      a: `This cart runs a ${cart.battery.type}${cart.battery.brand ? ` ${cart.battery.brand}` : ""} pack${cart.battery.packVoltage ? ` at ${cart.battery.packVoltage} volts` : ""}${cart.battery.ampHours ? ` rated ${cart.battery.ampHours} amp hours` : ""}${cart.battery.year ? `, dated ${cart.battery.year}` : ""}.${cart.battery.warrantyLength ? ` The battery carries a ${cart.battery.warrantyLength} warranty.` : ""} Lithium packs typically deliver 8 to 10 years of service.`,
    });
  }

  return entries;
}

export function renderVehiclePage({ cart, data, related }) {
  const images = cartImages(cart);
  const heading = `${cart.year ? `${cart.year} ` : ""}${cart.title}`.trim();
  const title = `${heading} for Sale${cart.city ? ` in ${cart.city}, ${cart.stateCode}` : ""} | ${salesEvent.name}`;
  const description = cartDescription(cart);
  const monthly = monthlyPayment(cart.price);
  const store = data.stores.find((entry) => entry.slug === cart.locationSlug);
  const faqEntries = vehicleFaq(cart);
  const path = `/golfcart/${cart.slug}/`;

  const altFor = (index) =>
    `${heading} golf cart${cart.color ? ` in ${cart.color}` : ""} — photo ${index + 1} of ${images.length}${cart.city ? `, ${cart.city}, ${cart.stateCode}` : ""}`;

  const badges = [
    `<span class="badge badge--${cart.isUsed ? "used" : "new"}">${cart.condition}</span>`,
    `<span class="badge badge--${cart.isElectric ? "electric" : "gas"}">${cart.fuel}</span>`,
    cart.isStreetLegal ? '<span class="badge badge--legal">Street Legal LSV</span>' : "",
    cart.isLifted ? '<span class="badge badge--lifted">Lifted</span>' : "",
    cart.passengers ? `<span class="badge badge--lifted">${esc(cart.passengers)} Passenger</span>` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = `<div class="wrap section--tight" style="padding-top:28px">
  <div class="vehicle">
    <div>
      <div style="margin-bottom:18px">
        <div class="cart-card__badges" style="margin-bottom:10px">${badges}</div>
        <h1 style="margin-bottom:8px">${esc(heading)}</h1>
        <p style="color:var(--muted);margin:0">
          ${cart.city ? `${ICONS.pin} In stock at ${esc(store?.name || `${site.name} — ${cart.city}`)}, ${esc(cart.city)}, ${esc(cart.stateCode)}` : "Call for current location"}
          ${cart.serial ? ` &middot; Stock #${esc(cart.serial)}` : ""}
        </p>
      </div>

      <div data-gallery>
        <figure class="gallery__main" style="margin:0">
          <img data-gallery-main src="${esc(images[0])}" alt="${esc(altFor(0))}" width="800" height="600"
               fetchpriority="high" decoding="sync"
               onerror="this.onerror=null;this.src='/images/cart-photo-coming-soon.svg'">
        </figure>
        ${
          images.length > 1
            ? `<div class="gallery__thumbs">
          ${images
            .map(
              (image, index) => `<button class="gallery__thumb" type="button" data-gallery-thumb data-src="${esc(image)}"
              data-alt="${esc(altFor(index))}" aria-current="${index === 0 ? "true" : "false"}" aria-label="Show photo ${index + 1}">
              <img src="${esc(image)}" alt="${esc(altFor(index))}" width="200" height="150" loading="lazy" decoding="async">
            </button>`,
            )
            .join("\n          ")}
        </div>`
            : ""
        }
      </div>

      <div class="panel" style="margin-top:28px">
        <h2 style="font-size:1.5rem">About this ${esc(cart.title)}</h2>
        <p>${esc(description)}</p>
        <p>Every cart on our lot is inspected before it reaches the sales floor, and this one is covered by ${cart.warranty ? `a ${esc(cart.warranty)} warranty` : "our standard dealer inspection"}. During the ${esc(salesEvent.name)} — June 20 through July 8 — this cart carries Independence Day pricing and 0% APR financing for 48 months on approved credit.</p>
      </div>

      ${specSections(cart).map((section) => `<div class="panel">${specTable(section)}</div>`).join("\n      ")}

      <div class="panel">
        <h2 style="font-size:1.5rem">Questions about this cart</h2>
        ${faqEntries
          .map(
            (entry, index) => `<details class="faq-item"${index === 0 ? " open" : ""}>
          <summary>${esc(entry.q)}</summary>
          <div class="faq-item__body"><p>${esc(entry.a)}</p></div>
        </details>`,
          )
          .join("\n        ")}
      </div>
    </div>

    <div>
      <div class="buybox">
        <p class="eyebrow eyebrow--light" style="margin-bottom:10px">July 4th Event Price</p>
        <p class="buybox__price">${esc(formatPrice(cart.price))}</p>
        ${cart.price ? `<p class="note" style="margin:0">Independence Day event pricing &middot; plus tax, title and prep</p>` : `<p class="note" style="margin:0">Call for Independence Day event pricing on this cart</p>`}
        ${
          monthly
            ? `<div class="buybox__finance">
          <strong>$${Math.round(monthly).toLocaleString("en-US")} / month</strong>
          0% APR for 48 months on approved credit. No interest, no prepayment penalty.
        </div>`
            : ""
        }
        <a class="btn btn--primary btn--block btn--lg" href="${site.phoneTel}">${ICONS.phone} Call ${esc(site.phone)}</a>
        <a class="btn btn--navy btn--block" href="/financing/">Apply Now — 0% Financing</a>
        <a class="btn btn--outline btn--block" href="/contact/?cart=${esc(cart.slug)}">Request More Photos</a>
        <a class="btn btn--outline btn--block" href="/trade-in/">Value My Trade</a>
        <ul class="offer-list" style="margin-top:18px">
          <li>${ICONS.tick}<span>Local and nationwide delivery available</span></li>
          <li>${ICONS.tick}<span>Same-day trade appraisal</span></li>
          <li>${ICONS.tick}<span>Dealer inspected before sale</span></li>
          <li>${ICONS.tick}<span>Nationwide shipping available</span></li>
        </ul>
      </div>

      ${
        store
          ? `<div class="panel" style="margin-top:24px">
        <h2 style="font-size:1.25rem">Where to see it</h2>
        <p style="margin-bottom:6px"><strong>${esc(store.name)}</strong></p>
        <address style="font-style:normal;color:var(--muted);margin-bottom:12px">
          ${store.address1 ? `${esc(store.address1)}<br>` : ""}${esc(store.city)}, ${esc(store.stateCode)} ${esc(store.postalCode)}
        </address>
        <a class="btn btn--outline btn--sm" href="/locations/${esc(store.slug)}/">Location details</a>
      </div>`
          : ""
      }
    </div>
  </div>
</div>

${
  related.length
    ? `<section class="section section--surface">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow eyebrow--light">More from the event</p>
      <h2>Similar carts in the ${esc(salesEvent.name)}</h2>
    </div>
    <div class="grid-carts">
      ${related.map((entry) => cartCard(entry)).join("\n      ")}
    </div>
    <p style="margin-top:24px"><a class="btn btn--outline" href="/inventory/">View all ${data.carts.length} carts</a></p>
  </div>
</section>`
    : ""
}

${ctaBand({ title: `Lock in July 4th pricing on this ${esc(cart.title)}`, primaryLabel: `Call ${site.phone}` })}`;

  const graph = [
    cartSchema(cart),
    {
      "@type": "FAQPage",
      "@id": `${abs(path)}#faq`,
      mainEntity: faqEntries.map((entry) => ({
        "@type": "Question",
        name: entry.q,
        acceptedAnswer: { "@type": "Answer", text: entry.a },
      })),
    },
  ];

  return renderPage({
    title: clamp(title, 68),
    description: clamp(description, 158),
    path,
    body,
    ogType: "product",
    image: images[0],
    imageAlt: altFor(0),
    imageWidth: 800,
    imageHeight: 600,
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/inventory/", label: "Inventory" },
      ...(cart.make ? [{ href: `/brands/${cart.makeKey.replace(/_/g, "-")}/`, label: cart.make }] : []),
      { href: path, label: heading },
    ],
    stores: data.stores,
    pageKeywords: [
      `${cart.title} for sale`,
      `${cart.make} golf cart July 4th sale`,
      cart.city ? `golf carts ${cart.city} ${cart.stateCode}` : "",
      cart.isElectric ? "electric golf cart for sale" : "gas golf cart for sale",
      cart.isStreetLegal ? "street legal golf cart" : "",
      cart.isLifted ? "lifted golf cart" : "",
    ].filter(Boolean),
    geo: store && store.lat ? store : undefined,
    graph,
  });
}
