/** Reusable markup fragments shared across page templates. */

import { site, salesEvent, financingPartners } from "../../data/site.config.mjs";
import { esc, formatPrice, formatPriceShort, monthlyPayment, cartImages, clamp } from "./util.mjs";
import { ICONS } from "./layout.mjs";

/** One inventory tile. `eager` skips lazy-loading for above-the-fold images. */
export function cartCard(cart, { eager = false } = {}) {
  const images = cartImages(cart);
  const price = formatPriceShort(cart.price);
  const monthly = monthlyPayment(cart.price);
  const alt = `${cart.year ? `${cart.year} ` : ""}${cart.title} golf cart for sale${cart.city ? ` in ${cart.city}, ${cart.stateCode}` : ""} — ${salesEvent.name}`;

  const meta = [
    cart.year,
    cart.passengers ? `${String(cart.passengers).replace(/passengers?/i, "").trim()} Passenger` : "",
    cart.driveTrain,
    cart.city ? `${cart.city}, ${cart.stateCode}` : "",
  ].filter(Boolean);

  return `<article class="cart-card" data-testid="card-cart-${esc(cart.id)}">
  <div class="cart-card__media">
    <span class="cart-card__flag">July 4th Pricing</span>
    <a href="/golfcart/${esc(cart.slug)}/" tabindex="-1" aria-hidden="true">
      <img src="${esc(images[0])}" alt="${esc(alt)}" width="800" height="600"
           loading="${eager ? "eager" : "lazy"}" decoding="${eager ? "sync" : "async"}"${eager ? ' fetchpriority="high"' : ""}
           onerror="this.onerror=null;this.src='/images/cart-photo-coming-soon.svg'">
    </a>
    ${images.length > 1 ? `<span class="cart-card__count">${images.length} photos</span>` : ""}
  </div>
  <div class="cart-card__body">
    <div class="cart-card__badges">
      <span class="badge badge--${cart.isUsed ? "used" : "new"}" data-testid="badge-condition-${esc(cart.id)}">${cart.isUsed ? "Used" : "New"}</span>
      <span class="badge badge--${cart.isElectric ? "electric" : "gas"}">${cart.isElectric ? "Electric" : "Gas"}</span>
      ${cart.isStreetLegal ? '<span class="badge badge--legal">Street Legal</span>' : ""}
      ${cart.isLifted ? '<span class="badge badge--lifted">Lifted</span>' : ""}
    </div>
    <h3 class="cart-card__title" data-testid="text-title-${esc(cart.id)}"><a href="/golfcart/${esc(cart.slug)}/">${esc(cart.title)}</a></h3>
    <p class="cart-card__meta">${meta.map((item) => `<span>${esc(item)}</span>`).join("")}</p>
    <div class="cart-card__price-row">
      <span class="cart-card__price" data-testid="text-price-${esc(cart.id)}">${esc(price)}</span>
      ${monthly ? `<span class="cart-card__mo">$${Math.round(monthly).toLocaleString("en-US")}/mo &middot; 0% APR</span>` : ""}
    </div>
    <div class="cart-card__cta">
      <a class="btn btn--outline btn--sm" href="/golfcart/${esc(cart.slug)}/">View Details</a>
      <a class="btn btn--primary btn--sm" href="${site.phoneTel}" aria-label="Call about the ${esc(cart.title)}">${ICONS.phone}</a>
    </div>
  </div>
</article>`;
}

export function cartGrid(carts, { eagerCount = 4, testId = "grid-inventory" } = {}) {
  if (!carts.length) {
    return `<div class="empty-state">
      <h3>No carts match those filters right now</h3>
      <p>Inventory refreshes every morning at 1:30 AM Eastern. Call <a href="${site.phoneTel}">${esc(site.phone)}</a> and we will find the cart you are after across all 15 locations.</p>
    </div>`;
  }
  return `<div class="grid-carts" data-testid="${testId}">
${carts.map((cart, index) => cartCard(cart, { eager: index < eagerCount })).join("\n")}
</div>`;
}

/** Product/Vehicle JSON-LD for one cart. */
export function cartSchema(cart, { includeOffer = true } = {}) {
  const images = cartImages(cart).map((url) => (url.startsWith("http") ? url : site.url + url));
  const node = {
    "@type": ["Product", "Vehicle"],
    "@id": `${site.url}/golfcart/${cart.slug}/#product`,
    name: `${cart.year ? `${cart.year} ` : ""}${cart.title}`.trim(),
    description: cartDescription(cart),
    image: images,
    url: `${site.url}/golfcart/${cart.slug}/`,
    sku: cart.serial || cart.id,
    mpn: cart.serial || cart.id,
    productID: cart.id,
    ...(cart.vin ? { vehicleIdentificationNumber: cart.vin } : {}),
    ...(cart.make ? { brand: { "@type": "Brand", name: cart.make }, manufacturer: { "@type": "Organization", name: cart.make } } : {}),
    ...(cart.model ? { model: cart.model } : {}),
    ...(cart.year ? { vehicleModelDate: cart.year, productionDate: cart.year } : {}),
    ...(cart.color ? { color: cart.color } : {}),
    itemCondition: cart.isUsed ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
    vehicleConfiguration: [cart.isElectric ? "Electric" : "Gas", cart.isLifted ? "Lifted" : null, cart.isStreetLegal ? "Street Legal LSV" : null]
      .filter(Boolean)
      .join(", "),
    fuelType: cart.isElectric ? "Electric" : "Gasoline",
    vehicleEngine: cart.isElectric
      ? { "@type": "EngineSpecification", engineType: "Electric Motor", fuelType: "Electric" }
      : cart.engine?.make
        ? {
            "@type": "EngineSpecification",
            name: cart.engine.make,
            fuelType: "Gasoline",
            ...(cart.engine.horsepower ? { enginePower: { "@type": "QuantitativeValue", value: Number(cart.engine.horsepower) || cart.engine.horsepower, unitCode: "BHP" } } : {}),
          }
        : undefined,
    ...(cart.passengers ? { seatingCapacity: String(cart.passengers).replace(/\D+/g, "") || cart.passengers, vehicleSeatingCapacity: String(cart.passengers).replace(/\D+/g, "") || cart.passengers } : {}),
    ...(cart.driveTrain ? { driveWheelConfiguration: cart.driveTrain } : {}),
    ...(cart.odometer !== null && cart.odometer !== undefined && cart.odometer !== ""
      ? { mileageFromOdometer: { "@type": "QuantitativeValue", value: Number(cart.odometer) || 0, unitCode: "SMI" } }
      : {}),
    bodyType: "Golf Cart",
    vehicleSpecialUsage: cart.isStreetLegal ? "Street Legal Low Speed Vehicle" : "Off-road / Community Use",
    additionalProperty: cartProperties(cart).map((row) => ({
      "@type": "PropertyValue",
      name: row.label,
      value: row.value,
    })),
    category: "Golf Carts",
    isFamilyFriendly: true,
  };

  if (includeOffer) {
    node.offers = {
      "@type": "Offer",
      "@id": `${site.url}/golfcart/${cart.slug}/#offer`,
      url: `${site.url}/golfcart/${cart.slug}/`,
      priceCurrency: "USD",
      ...(cart.price ? { price: cart.price } : { price: 0, priceSpecification: { "@type": "PriceSpecification", priceCurrency: "USD", valueAddedTaxIncluded: false } }),
      itemCondition: cart.isUsed ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${site.url}/#organization` },
      priceValidUntil: `${new Date().getUTCFullYear()}-12-31`,
      ...(cart.city
        ? {
            availableAtOrFrom: {
              "@type": "Place",
              name: cart.storeName || `${site.name} — ${cart.city}`,
              address: { "@type": "PostalAddress", addressLocality: cart.city, addressRegion: cart.stateCode, addressCountry: "US" },
            },
          }
        : {}),
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
        deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" } },
      },
    };
  }

  return node;
}

/** A natural-language paragraph describing a cart — used for meta, schema and AI files. */
export function cartDescription(cart) {
  const bits = [];
  bits.push(`${cart.condition} ${cart.year ? `${cart.year} ` : ""}${cart.title}`.replace(/\s+/g, " ").trim());
  bits.push(cart.isElectric ? "electric golf cart" : "gas golf cart");
  if (cart.passengers) bits.push(`seating ${String(cart.passengers).replace(/\D+/g, "") || cart.passengers}`);
  const features = [];
  if (cart.isStreetLegal) features.push("street legal LSV equipped");
  if (cart.isLifted) features.push("lifted");
  if (cart.battery?.type) features.push(`${cart.battery.type.toLowerCase()} battery`);
  if (cart.hasSoundSystem) features.push("sound system");
  if (cart.hasHitch) features.push("receiver hitch");
  const sentence =
    `${bits.join(" ")}${features.length ? `, ${features.join(", ")}` : ""}` +
    `${cart.city ? `, in stock at our ${cart.city}, ${cart.stateCode} location` : ""}. ` +
    `${cart.price ? `${salesEvent.name} price ${formatPriceShort(cart.price)}` : "Call for July 4th event pricing"}` +
    ` with 0% APR financing for 48 months. Call ${site.phone}.`;
  return sentence.replace(/\s+/g, " ").trim();
}

/** Flat label/value rows for the spec table and structured data. */
export function cartProperties(cart) {
  const yn = (value) => (value ? "Yes" : "No");
  const rows = [
    ["Condition", cart.condition],
    ["Power", cart.isElectric ? "Electric" : "Gas"],
    ["Make", cart.make],
    ["Model", cart.model],
    ["Year", cart.year],
    ["Color", cart.color],
    ["Seat Color", cart.seatColor],
    ["Passengers", cart.passengers],
    ["Drivetrain", cart.driveTrain],
    ["Tire Type", cart.tireType],
    ["Rim Size", cart.tireRimSize ? `${cart.tireRimSize}"` : ""],
    ["Street Legal", yn(cart.isStreetLegal)],
    ["Lift Kit", yn(cart.isLifted)],
    ["Sound System", yn(cart.hasSoundSystem)],
    ["Receiver Hitch", yn(cart.hasHitch)],
    ["Extended Top", yn(cart.hasExtendedTop)],
    ["Warranty", cart.warranty],
    ["VIN", cart.vin],
    ["Stock / Serial", cart.serial],
  ];
  if (cart.isUsed) {
    rows.push(["Odometer", cart.odometer === null || cart.odometer === "" ? "" : `${cart.odometer} mi`]);
    rows.push(["Hours", cart.hours === null || cart.hours === "" ? "" : String(cart.hours)]);
  }
  if (cart.battery) {
    rows.push(
      ["Battery Type", cart.battery.type],
      ["Battery Brand", cart.battery.brand],
      ["Battery Year", cart.battery.year],
      ["Capacity", cart.battery.ampHours ? `${cart.battery.ampHours} Ah` : ""],
      ["Pack Voltage", cart.battery.packVoltage ? `${cart.battery.packVoltage}V` : ""],
      ["Cell Voltage", cart.battery.batteryVoltage ? `${cart.battery.batteryVoltage}V` : ""],
      ["Battery Warranty", cart.battery.warrantyLength],
    );
  }
  if (cart.engine) {
    rows.push(
      ["Engine", cart.engine.make],
      ["Horsepower", cart.engine.horsepower ? `${cart.engine.horsepower} HP` : ""],
      ["Stroke", cart.engine.stroke],
    );
  }
  if (cart.storeName) rows.push(["Location", `${cart.city}, ${cart.stateCode}`]);

  return rows
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([label, value]) => ({ label, value: String(value) }));
}

/** The blue/red call-to-action band used at the bottom of most pages. */
export function ctaBand({
  title = `Shop the ${salesEvent.name}`,
  text = "Event pricing runs June 20 through July 8 on every cart in stock. Call now and a product specialist will match you to the right cart, lock in Independence Day pricing, and arrange delivery.",
  primaryLabel = `Call ${site.phone}`,
} = {}) {
  return `<section class="ctaband">
  <div class="wrap">
    <p class="eyebrow">${esc(salesEvent.name)}</p>
    <h2>${esc(title)}</h2>
    <p>${esc(text)}</p>
    <div class="btn-row">
      <a class="btn btn--primary btn--lg" href="${site.phoneTel}">${ICONS.phone} ${esc(primaryLabel)}</a>
      <a class="btn btn--ghost-light btn--lg" href="/inventory/">Browse All Inventory</a>
    </div>
  </div>
</section>`;
}

/** Renders the FAQ accordion. */
export function faqBlock(entries, { title = "Questions &amp; Answers", intro = "" } = {}) {
  return `<section class="section" id="faq">
  <div class="wrap wrap-narrow">
    <div class="section-head">
      <p class="eyebrow eyebrow--light">Answers</p>
      <h2>${title}</h2>
      ${intro ? `<p>${esc(intro)}</p>` : ""}
    </div>
    ${entries
      .map(
        (entry, index) => `<details class="faq-item"${index === 0 ? " open" : ""}>
      <summary>${esc(entry.q)}</summary>
      <div class="faq-item__body"><p>${esc(entry.a)}</p></div>
    </details>`,
      )
      .join("\n    ")}
  </div>
</section>`;
}

/** Financing partner cards. */
export function financingGrid() {
  // Each card links straight to that lender's dealer-specific application.
  // The whole card is a click target; the button is the accessible name.
  return `<div class="grid-lenders">
${financingPartners
  .map(
    (partner) => `  <div class="feature feature--link">
    <div class="feature__icon">${ICONS.tick}</div>
    <h3><a href="${esc(partner.url)}" rel="noopener nofollow external" target="_blank">${esc(partner.name)}</a></h3>
    <p>${esc(partner.blurb)}</p>
    <p class="feature__cta"><a class="btn btn--primary btn--sm" href="${esc(partner.url)}" rel="noopener nofollow external" target="_blank">
      Apply with ${esc(partner.name)} ${ICONS.external}<span class="visually-hidden"> (opens in a new tab)</span>
    </a></p>
  </div>`,
  )
  .join("\n")}
</div>`;
}

/** Small "why buy here" grid. */
export function valueProps() {
  const items = [
    ["Independence Day Pricing", "Every cart in stock is marked with July 4th event pricing from June 20 through July 8 — the deepest in-stock pricing of the summer."],
    ["0% APR for 48 Months", "Financing on approved credit through six national lenders, with soft-pull prequalification that does not touch your credit score."],
    ["15 Locations, One Inventory", "Shop the combined stock of every Independence Day Golf Carts location and we will move the cart you want to the store nearest you."],
    ["Delivery Available", "Local and nationwide delivery can be arranged on any cart in stock. Call with your ZIP code for a delivery quote."],
    ["Same-Day Trade Appraisals", "Bring any make in any condition. Trade value stacks on top of event pricing."],
    ["Inventory Updated Daily", "Prices, photos and availability are pulled straight from our dealer management system every morning at 1:30 AM Eastern."],
  ];
  return `<div class="grid-features">
${items
  .map(
    ([title, text]) => `  <div class="feature">
    <div class="feature__icon">${ICONS.tick}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(text)}</p>
  </div>`,
  )
  .join("\n")}
</div>`;
}

export { clamp, formatPrice };
