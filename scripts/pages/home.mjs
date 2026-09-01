/**
 * Home page and the two primary keyword landing pages:
 *   /july-4th-golf-cart-sales-event/
 *   /independence-day-golf-cart-sales-event/
 * These carry the site's main targets, so they lead with the event, the live
 * inventory, and the answer-shaped content that AI assistants quote.
 */

import { site, salesEvent, keywords } from "../../data/site.config.mjs";
import { esc, formatPriceShort } from "../lib/util.mjs";
import { renderPage, ICONS, salesEventSchema, abs } from "../lib/layout.mjs";
import { cartCard, ctaBand, valueProps, financingGrid } from "../lib/components.mjs";
import { faq } from "../../data/faq.mjs";
import { guides } from "../../data/guides.mjs";

function heroStats(data) {
  const { summary } = data;
  return [
    [summary.total.toLocaleString("en-US"), "Carts in Stock"],
    [String(data.stores.length), "Locations"],
    ["0%", "APR for 48 Months"],
    [summary.priceMin ? formatPriceShort(summary.priceMin) : "Call", "Starting Price"],
  ];
}

function categoryChips(data) {
  const { summary, facets } = data;
  const chips = [
    ["/new/", "New Carts", summary.new],
    ["/used/", "Used Carts", summary.used],
    ["/electric-golf-carts/", "Electric", summary.electric],
    ["/gas-golf-carts/", "Gas", summary.gas],
    ["/street-legal-golf-carts/", "Street Legal", summary.streetLegal],
    ["/lifted-golf-carts/", "Lifted", summary.lifted],
    ...facets.makes.slice(0, 8).map((make) => [`/brands/${make.key.replace(/_/g, "-")}/`, make.label, make.count]),
  ];
  return `<div class="chips">
${chips
  .filter(([, , count]) => count > 0)
  .map(([href, label, count]) => `  <a class="chip" href="${href}">${esc(label)} <span class="chip__count">${count}</span></a>`)
  .join("\n")}
</div>`;
}

function locationStrip(data) {
  return `<ul class="linkgrid">
${data.stores
  .map(
    (store) =>
      `  <li><a href="/locations/${store.slug}/">${ICONS.pin} ${esc(store.city)}, ${esc(store.stateCode)}${store.cartCount ? ` <span class="note">(${store.cartCount})</span>` : ""}</a></li>`,
  )
  .join("\n")}
</ul>`;
}

function guideCards(limit = 3) {
  return `<div class="grid-3">
${guides
  .slice(0, limit)
  .map(
    (guide) => `  <article class="article-card">
    <h3><a href="/guides/${guide.slug}/">${esc(guide.title)}</a></h3>
    <p>${esc(guide.description)}</p>
    <p class="article-card__meta">${esc(guide.category)} &middot; ${guide.readingMinutes} min read</p>
  </article>`,
  )
  .join("\n")}
</div>`;
}

/** The hero + event pitch, shared by the home page and both event landing pages. */
function hero(data, { h1, lede, eyebrow }) {
  return `<section class="hero">
  <div class="wrap hero__inner">
    <div>
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h1>${h1}</h1>
      <p class="hero__lede">${esc(lede)}</p>
      <div class="btn-row">
        <a class="btn btn--primary btn--lg" href="/inventory/">Shop ${data.summary.total} Carts</a>
        <a class="btn btn--ghost-light btn--lg" href="${site.phoneTel}">${ICONS.phone} ${esc(site.phone)}</a>
      </div>
      <div class="hero__stats">
${heroStats(data)
  .map(([value, label]) => `        <div class="stat"><span class="stat__value">${esc(value)}</span><span class="stat__label">${esc(label)}</span></div>`)
  .join("\n")}
      </div>
    </div>
    <div class="hero__panel">
      <h2>${esc(salesEvent.name)}</h2>
      <p class="muted">June 20 – July 8 &middot; All ${data.stores.length} locations</p>
      <ul class="offer-list">
${salesEvent.offers.map((offer) => `        <li>${ICONS.tick}<span>${esc(offer)}</span></li>`).join("\n")}
      </ul>
      <a class="btn btn--primary btn--block btn--lg" href="${site.phoneTel}">${ICONS.phone} Call to Lock In Event Pricing</a>
      <p class="note" style="text-align:center;margin:12px 0 0">Mon–Sat 9AM–5PM &middot; Delivery available nationwide</p>
    </div>
  </div>
</section>`;
}

export function renderHomePage(data) {
  const featured = data.carts.filter((cart) => cart.hasPhotos).slice(0, 8);
  const fallback = featured.length >= 8 ? featured : [...featured, ...data.carts.filter((cart) => !cart.hasPhotos)].slice(0, 8);
  const path = "/";

  const body = `${hero(data, {
    eyebrow: `${salesEvent.name} · June 20 – July 8`,
    h1: `The July 4th <span class="accent">Golf Cart Sales Event</span>`,
    lede: salesEvent.subhead,
  })}

<div class="eventbar">
  Independence Day pricing is live on all ${data.summary.total} carts in stock — <a href="/july-4th-golf-cart-sales-event/">see what is included in the event</a>.
</div>

<section class="section">
  <div class="wrap">
    <div class="section-head__row">
      <div class="section-head">
        <p class="eyebrow eyebrow--light">Live inventory</p>
        <h2>Golf Carts in the Independence Day Sales Event</h2>
        <p>Pulled from our dealer management system every morning at 1:30&nbsp;AM Eastern — ${data.summary.total} carts across ${data.stores.length} locations, ${data.summary.new} new and ${data.summary.used} used.</p>
      </div>
      <a class="btn btn--outline" href="/inventory/">View All Inventory</a>
    </div>
    ${categoryChips(data)}
    <div class="grid-carts" style="margin-top:26px">
      ${fallback.map((cart, index) => cartCard(cart, { eager: index < 4 })).join("\n      ")}
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <div class="section-head section-head--center">
      <p class="eyebrow eyebrow--light">Why buy during the event</p>
      <h2>The best week of the year to buy a golf cart</h2>
      <p>Independence Day sits at the midpoint of the golf cart season — spring stock has landed, next year's models are months away, and every cart on the lot is priced to move.</p>
    </div>
    ${valueProps()}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="grid-2" style="align-items:center">
      <div class="prose">
        <p class="eyebrow eyebrow--light">0% APR for 48 months</p>
        <h2>Independence Day financing, no interest</h2>
        <p>Finance any cart in the ${esc(salesEvent.name)} at 0% APR for 48 months on approved credit. On a $12,000 cart that is $250 a month with no interest charged over the term, and no prepayment penalty if you pay it off early.</p>
        <p>Six national lending partners compete for your application. Most run a soft-pull prequalification that does not affect your credit score, and approvals usually come back the same day.</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="/financing/">See Financing Options</a>
          <a class="btn btn--outline" href="${site.phoneTel}">${ICONS.phone} Talk to a Specialist</a>
        </div>
      </div>
      <div class="panel">
        <h3>What $250 a month buys during the event</h3>
        <p class="note">0% APR, 48 months, on approved credit. Tax, title and prep excluded.</p>
        <table class="spec-table">
          <tbody>
            <tr><th scope="row">$8,000 cart</th><td>$167 / month</td></tr>
            <tr><th scope="row">$10,000 cart</th><td>$209 / month</td></tr>
            <tr><th scope="row">$12,000 cart</th><td>$250 / month</td></tr>
            <tr><th scope="row">$16,000 cart</th><td>$334 / month</td></tr>
            <tr><th scope="row">$20,000 cart</th><td>$417 / month</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow eyebrow--light">${data.stores.length} locations</p>
      <h2>Shop the July 4th event near you</h2>
      <p>One shared inventory across every location. If the cart you want is at another store, we will move it to the location closest to you.</p>
    </div>
    ${locationStrip(data)}
    <p style="margin-top:22px"><a class="btn btn--outline" href="/locations/">All location details</a></p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head__row">
      <div class="section-head">
        <p class="eyebrow eyebrow--light">Buying guides</p>
        <h2>Know what you are buying</h2>
      </div>
      <a class="btn btn--outline" href="/guides/">All guides</a>
    </div>
    ${guideCards(3)}
  </div>
</section>

<section class="section section--surface">
  <div class="wrap wrap-narrow">
    <div class="section-head">
      <p class="eyebrow eyebrow--light">Answers</p>
      <h2>July 4th Golf Cart Sales Event — questions and answers</h2>
    </div>
    ${faq
      .slice(0, 8)
      .map(
        (entry, index) => `<details class="faq-item"${index === 0 ? " open" : ""}>
      <summary>${esc(entry.q)}</summary>
      <div class="faq-item__body"><p>${esc(entry.a)}</p></div>
    </details>`,
      )
      .join("\n    ")}
    <p style="margin-top:22px"><a class="btn btn--outline" href="/faq/">Read all ${faq.length} answers</a></p>
  </div>
</section>

${ctaBand()}`;

  return renderPage({
    title: `July 4th Golf Cart Sales Event ${new Date().getUTCFullYear()} | Independence Day Golf Carts`,
    description: `Shop the July 4th Golf Cart Sales Event — ${data.summary.total} new and used golf carts with Independence Day pricing and 0% APR for 48 months. ${data.stores.length} locations. Call ${site.phone}.`,
    path,
    body,
    breadcrumbs: [{ href: "/", label: "Home" }],
    stores: data.stores,
    pageKeywords: [...keywords.primary, ...keywords.secondary.slice(0, 6)],
    graph: [
      salesEventSchema(),
      {
        "@type": "FAQPage",
        "@id": `${abs(path)}#faq`,
        mainEntity: faq.slice(0, 8).map((entry) => ({
          "@type": "Question",
          name: entry.q,
          acceptedAnswer: { "@type": "Answer", text: entry.a },
        })),
      },
    ],
  });
}

/** /july-4th-golf-cart-sales-event/ and its Independence Day twin. */
export function renderEventPage(data, variant = "july4") {
  const isJuly4 = variant === "july4";
  const path = isJuly4 ? "/july-4th-golf-cart-sales-event/" : "/independence-day-golf-cart-sales-event/";
  const other = isJuly4 ? "/independence-day-golf-cart-sales-event/" : "/july-4th-golf-cart-sales-event/";
  const name = isJuly4 ? salesEvent.name : salesEvent.altName;
  const featured = data.carts.filter((cart) => cart.hasPhotos).slice(0, 8);
  const pool = featured.length >= 8 ? featured : data.carts.slice(0, 8);

  const eventFaq = faq.filter((entry) => ["event", "pricing", "financing", "delivery", "trade-in"].includes(entry.topic));

  const body = `${hero(data, {
    eyebrow: "June 20 – July 8 · All locations",
    h1: isJuly4
      ? `July 4th Golf Cart <span class="accent">Sales Event</span>`
      : `Independence Day Golf Cart <span class="accent">Sales Event</span>`,
    lede: salesEvent.subhead,
  })}

<section class="section">
  <div class="wrap">
    <div class="grid-2">
      <div class="prose">
        <h2>What the ${esc(name)} is</h2>
        <p>The ${esc(name)} is our largest sale of the year. From June 20 through July 8, every one of the ${data.summary.total} carts in stock across our ${data.stores.length} locations carries Independence Day pricing — new and used, electric and gas, lifted and street legal alike.</p>
        <p>It is not a small set of doorbusters. The whole floor is on sale, and event pricing stacks on top of your trade-in value.</p>
        <h3>Included in the event</h3>
        <ul>
${salesEvent.offers.map((offer) => `          <li>${esc(offer)}</li>`).join("\n")}
        </ul>
        <h3>Why Independence Day is the right week</h3>
        <p>July 4th falls at the exact midpoint of the golf cart selling season. Spring inventory has landed, the next model year is still months out, and dealers need floor space. That is why event pricing on in-stock carts is typically the lowest of the summer — and why waiting until September usually means a thinner selection, not a better price.</p>
        <p>Read the <a href="/guides/july-4th-golf-cart-sales-event-guide/">complete guide to the July 4th Golf Cart Sales Event</a> for the full breakdown, or call ${esc(site.phone)} and we will walk you through what is on sale near you.</p>
      </div>
      <div>
        <div class="panel">
          <h3 style="margin-top:0">Event at a glance</h3>
          <table class="spec-table">
            <tbody>
              <tr><th scope="row">Event</th><td>${esc(name)}</td></tr>
              <tr><th scope="row">Dates</th><td>June 20 – July 8, ${new Date().getUTCFullYear()}</td></tr>
              <tr><th scope="row">Carts on sale</th><td>${data.summary.total}</td></tr>
              <tr><th scope="row">Locations</th><td>${data.stores.length}</td></tr>
              <tr><th scope="row">Financing</th><td>0% APR for 48 months (OAC)</td></tr>
              <tr><th scope="row">Delivery</th><td>Local &amp; nationwide, quoted</td></tr>
              <tr><th scope="row">Trade-ins</th><td>Appraised same day, any make</td></tr>
              <tr><th scope="row">Phone</th><td><a href="${site.phoneTel}">${esc(site.phone)}</a></td></tr>
            </tbody>
          </table>
          <a class="btn btn--primary btn--block btn--lg" style="margin-top:16px" href="${site.phoneTel}">${ICONS.phone} Call ${esc(site.phone)}</a>
        </div>
        <div class="panel">
          <h3 style="margin-top:0">Also known as</h3>
          <p class="note">This event runs under both names. <a href="${other}">${esc(isJuly4 ? salesEvent.altName : salesEvent.name)}</a> is the same sale, the same pricing, the same inventory.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <div class="section-head__row">
      <div class="section-head">
        <p class="eyebrow eyebrow--light">On sale now</p>
        <h2>Carts in the ${esc(name)}</h2>
      </div>
      <a class="btn btn--outline" href="/inventory/">All ${data.summary.total} carts</a>
    </div>
    ${categoryChips(data)}
    <div class="grid-carts" style="margin-top:26px">
      ${pool.map((cart, index) => cartCard(cart, { eager: index < 4 })).join("\n      ")}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head section-head--center">
      <p class="eyebrow eyebrow--light">0% APR for 48 months</p>
      <h2>Event financing partners</h2>
      <p>Six national lenders, soft-pull prequalification, and same-day decisions on most applications.</p>
    </div>
    ${financingGrid()}
  </div>
</section>

<section class="section section--surface">
  <div class="wrap wrap-narrow">
    <div class="section-head">
      <p class="eyebrow eyebrow--light">Answers</p>
      <h2>${esc(name)} — questions and answers</h2>
    </div>
    ${eventFaq
      .map(
        (entry, index) => `<details class="faq-item"${index === 0 ? " open" : ""}>
      <summary>${esc(entry.q)}</summary>
      <div class="faq-item__body"><p>${esc(entry.a)}</p></div>
    </details>`,
      )
      .join("\n    ")}
  </div>
</section>

${ctaBand({ title: `Shop the ${name}` })}`;

  return renderPage({
    title: `${name} ${new Date().getUTCFullYear()} — ${data.summary.total} Carts on Sale | ${site.name}`,
    description: `The ${name} runs June 20 – July 8. Independence Day pricing on all ${data.summary.total} new and used golf carts, 0% APR for 48 months, ${data.stores.length} locations. Call ${site.phone}.`,
    path,
    body,
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: path, label: name },
    ],
    stores: data.stores,
    pageKeywords: [...keywords.primary, ...keywords.secondary, ...keywords.longTail.slice(0, 4)],
    graph: [
      salesEventSchema(),
      {
        "@type": "FAQPage",
        "@id": `${abs(path)}#faq`,
        mainEntity: eventFaq.map((entry) => ({
          "@type": "Question",
          name: entry.q,
          acceptedAnswer: { "@type": "Answer", text: entry.a },
        })),
      },
    ],
  });
}
