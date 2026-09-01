/**
 * Editorial and utility pages: financing, about, contact, service, trade-in,
 * delivery, guides index + articles, FAQ, HTML sitemap, legal pages and 404.
 */

import { site, salesEvent, financingPartners, keywords } from "../../data/site.config.mjs";
import { esc, clamp, rfc822 } from "../lib/util.mjs";
import { renderPage, ICONS, abs, YEAR } from "../lib/layout.mjs";
import { ctaBand, financingGrid, valueProps } from "../lib/components.mjs";
import { faq } from "../../data/faq.mjs";
import { guides } from "../../data/guides.mjs";

/** Shared page frame for simple content pages. */
function simplePage({ data, path, title, h1, description, lede, body, pageKeywords = [], graph = [], faqEntries = [], crumbLabel }) {
  const html = `<div class="page-head">
  <div class="wrap">
    <p class="eyebrow eyebrow--light">${esc(salesEvent.name)}</p>
    <h1>${esc(h1)}</h1>
    ${lede ? `<p class="page-head__lede">${esc(lede)}</p>` : ""}
    <div class="btn-row" style="margin-top:20px">
      <a class="btn btn--primary" href="${site.phoneTel}">${ICONS.phone} Call ${esc(site.phone)}</a>
      <a class="btn btn--outline" href="/inventory/">Browse Inventory</a>
    </div>
  </div>
</div>
${body}
${
  faqEntries.length
    ? `<section class="section section--surface">
  <div class="wrap wrap-narrow">
    <h2>Questions and answers</h2>
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

  const fullGraph = [...graph];
  if (faqEntries.length) {
    fullGraph.push({
      "@type": "FAQPage",
      "@id": `${abs(path)}#faq`,
      mainEntity: faqEntries.map((entry) => ({
        "@type": "Question",
        name: entry.q,
        acceptedAnswer: { "@type": "Answer", text: entry.a },
      })),
    });
  }

  return renderPage({
    title,
    description: clamp(description),
    path,
    body: html,
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: path, label: crumbLabel ?? h1 },
    ],
    stores: data.stores,
    pageKeywords,
    graph: fullGraph,
  });
}

/* ----------------------------------------------------------- financing --- */

export function renderFinancingPage(data) {
  const rows = [6000, 8000, 10000, 12000, 15000, 18000, 22000]
    .map((price) => `<tr><th scope="row">$${price.toLocaleString("en-US")}</th><td>$${Math.round(price / 48).toLocaleString("en-US")} / mo</td><td>$${Math.round(price / 36).toLocaleString("en-US")} / mo</td><td>$${Math.round(price / 24).toLocaleString("en-US")} / mo</td></tr>`)
    .join("\n            ");

  const body = `<section class="section section--tight">
  <div class="wrap">
    <div class="grid-2">
      <div class="prose">
        <h2>0% APR for 48 months during the event</h2>
        <p>Finance any cart in the ${esc(salesEvent.name)} at 0% APR for 48 months on approved credit. No interest is charged over the term and there is no prepayment penalty, so paying it off early costs nothing extra.</p>
        <p>Six national lending partners compete for your application. Most run a soft-pull prequalification that does not affect your credit score, and the majority of decisions come back the same day.</p>
        <h3>What to have ready</h3>
        <ul>
          <li>A valid driver's license</li>
          <li>Proof of income — recent pay stubs, or two years of returns if self-employed</li>
          <li>Your address history for the last two years</li>
          <li>The stock number of the cart you want, if you have already picked one</li>
        </ul>
        <h3>Financing as a business</h3>
        <p>Resorts, campgrounds, HOAs, golf clubs and rental fleets can finance through Univest Capital or DLL Financial, both of which handle commercial paper and multi-unit purchases. Call ${esc(site.phone)} and ask for the commercial desk.</p>
      </div>
      <div class="panel">
        <h3 style="margin-top:0">Payment estimator</h3>
        <p class="note">0% APR on approved credit. Excludes tax, title, prep and any accessories.</p>
        <div class="table-scroll">
          <table class="spec-table spec-table--cols">
            <thead><tr><th scope="col">Cart price</th><th scope="col">48 months</th><th scope="col">36 months</th><th scope="col">24 months</th></tr></thead>
            <tbody>
            ${rows}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <div class="section-head section-head--center">
      <p class="eyebrow eyebrow--light">Apply direct</p>
      <h2>Our financing partners</h2>
      <p>Apply with any lender below, or call ${esc(site.phone)} and we will submit your application to whichever partner fits your situation best.</p>
    </div>
    ${financingGrid()}
  </div>
</section>`;

  return simplePage({
    data,
    path: "/financing/",
    title: `Golf Cart Financing — 0% APR for 48 Months | ${site.name}`,
    h1: "Golf Cart Financing",
    lede: "0% APR for 48 months on approved credit during the July 4th Golf Cart Sales Event. Six national lenders, soft-pull prequalification, same-day decisions.",
    description: `Finance a golf cart at 0% APR for 48 months during the ${salesEvent.name}. Apply with Sheffield BBT, BLI Heartland, DLL Financial, Roadrunner/Octane, Univest Capital or Dealer Direct.`,
    body,
    pageKeywords: ["golf cart financing", "0% APR golf cart financing", "golf cart payments", "finance a golf cart July 4th"],
    faqEntries: faq.filter((entry) => entry.topic === "financing" || entry.topic === "pricing"),
    graph: [
      {
        "@type": "FinancialProduct",
        "@id": `${site.url}/financing/#product`,
        name: "0% APR Golf Cart Financing — 48 Months",
        provider: { "@id": `${site.url}/#organization` },
        annualPercentageRate: 0,
        loanTerm: { "@type": "QuantitativeValue", value: 48, unitCode: "MON" },
        feesAndCommissionsSpecification: "No prepayment penalty. Subject to credit approval.",
        areaServed: "US",
      },
      {
        "@type": "ItemList",
        "@id": `${site.url}/financing/#partners`,
        name: "Financing partners",
        itemListElement: financingPartners.map((partner, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: { "@type": "Organization", name: partner.name, url: partner.url },
        })),
      },
    ],
  });
}

/* --------------------------------------------------------------- about --- */

export function renderAboutPage(data) {
  const body = `<section class="section section--tight">
  <div class="wrap">
    <div class="prose">
      <h2>Who we are</h2>
      <p>Independence Day Golf Carts is the Fourth of July sales event arm of ${esc(site.legalName)}, a golf cart dealer group operating ${data.stores.length} locations across ${new Set(data.stores.map((store) => store.state)).size} states. Between them our stores carry ${data.summary.total} carts — new and used, electric and gas, lifted and street legal — all listed on one shared inventory.</p>
      <p>The ${esc(salesEvent.name)} is our largest sale of the year. From June 20 through July 8 every cart on every lot carries Independence Day pricing, backed by 0% APR financing for 48 months and same-day trade appraisals.</p>
      <h2>How we work</h2>
      <p>Every cart is inspected before it reaches the sales floor. Used carts are reconditioned, and the battery year and pack condition are published on each vehicle page so you can judge remaining life before you call. Prices, photos and availability on this site come straight from our dealer management system and refresh every morning at 1:30&nbsp;AM Eastern.</p>
      <p>If the cart you want is at another location, we move it. If you need it delivered, we deliver it — locally or nationwide, quoted to your address.</p>
      <h2>What we sell</h2>
      <ul>
        <li>New golf carts from ${data.facets.makes.map((make) => make.label).join(", ")}</li>
        <li>Reconditioned used and trade-in carts</li>
        <li>Street legal Low Speed Vehicles (LSVs) with lights, mirrors, seat belts and VINs</li>
        <li>Lifted carts with all-terrain tires for sand, grass and gravel</li>
        <li>Lithium and lead-acid electric carts, plus gas models</li>
        <li>Accessories, service, parts and battery upgrades</li>
      </ul>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <div class="section-head section-head--center"><h2>Why buy from us</h2></div>
    ${valueProps()}
  </div>
</section>`;

  return simplePage({
    data,
    path: "/about/",
    title: `About Independence Day Golf Carts | ${data.stores.length} Locations`,
    h1: "About Independence Day Golf Carts",
    lede: `A ${data.stores.length}-location golf cart dealer group running the country's largest Fourth of July golf cart sales event.`,
    description: `Independence Day Golf Carts is the July 4th sales event arm of ${site.legalName}, with ${data.stores.length} locations and ${data.summary.total} carts in stock.`,
    body,
    pageKeywords: ["about independence day golf carts", "golf cart dealer group", "golf cart dealership"],
    crumbLabel: "About",
  });
}

/* ------------------------------------------------------------- contact --- */

export function renderContactPage(data) {
  const body = `<section class="section section--tight">
  <div class="wrap">
    <div class="grid-2">
      <div class="panel">
        <h2 style="margin-top:0">Call us</h2>
        <p>The fastest way to get event pricing, check stock, or start a trade appraisal.</p>
        <p><a class="phone-big" style="color:var(--red)" href="${site.phoneTel}">${esc(site.phone)}</a></p>
        <h3>Hours</h3>
        <table class="spec-table">
          <tbody>
${site.hoursDisplay.map((row) => `            <tr><th scope="row">${esc(row.label)}</th><td>${esc(row.value)}</td></tr>`).join("\n")}
          </tbody>
        </table>
        <h3 style="margin-top:24px">Email</h3>
        <p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
      </div>
      <div class="panel">
        <h2 style="margin-top:0">Send a message</h2>
        <p class="note">This form opens your email client with the details pre-filled — no data is sent to a third party.</p>
        <form action="mailto:${esc(site.email)}" method="post" enctype="text/plain">
          <p><label class="check" style="display:block"><span>Your name</span></label>
             <input class="field" type="text" name="name" autocomplete="name" required></p>
          <p><label class="check" style="display:block"><span>Phone</span></label>
             <input class="field" type="tel" name="phone" autocomplete="tel"></p>
          <p><label class="check" style="display:block"><span>Email</span></label>
             <input class="field" type="email" name="email" autocomplete="email" required></p>
          <p><label class="check" style="display:block"><span>Which location?</span></label>
             <select class="field" name="location">
               <option value="">No preference</option>
${data.stores.map((store) => `               <option value="${esc(store.city)}, ${esc(store.stateCode)}">${esc(store.city)}, ${esc(store.stateCode)}</option>`).join("\n")}
             </select></p>
          <p><label class="check" style="display:block"><span>What are you looking for?</span></label>
             <textarea class="field" name="message" rows="5" placeholder="Stock number, cart type, budget, delivery ZIP…"></textarea></p>
          <p><button class="btn btn--primary btn--block btn--lg" type="submit">Send message</button></p>
        </form>
      </div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <h2>All ${data.stores.length} locations</h2>
    <ul class="linkgrid">
${data.stores.map((store) => `      <li><a href="/locations/${store.slug}/">${ICONS.pin} ${esc(store.city)}, ${esc(store.stateCode)}</a></li>`).join("\n")}
    </ul>
  </div>
</section>`;

  return simplePage({
    data,
    path: "/contact/",
    title: `Contact Independence Day Golf Carts | ${site.phone}`,
    h1: "Contact Us",
    lede: `Call ${site.phone} Monday through Saturday, 9:00 AM to 5:00 PM, or send a message and a product specialist will get back to you the same day.`,
    description: `Contact Independence Day Golf Carts at ${site.phone}. ${data.stores.length} locations, open Monday to Saturday 9AM–5PM during the July 4th Golf Cart Sales Event.`,
    body,
    pageKeywords: ["contact golf cart dealer", "golf cart dealership phone number"],
    faqEntries: faq.filter((entry) => ["contact", "delivery"].includes(entry.topic)),
    crumbLabel: "Contact",
    graph: [
      {
        "@type": "ContactPage",
        "@id": `${site.url}/contact/#contactpage`,
        name: "Contact Independence Day Golf Carts",
        mainEntity: { "@id": `${site.url}/#organization` },
      },
    ],
  });
}

/* -------------------------------------------------- service / trade / delivery */

export function renderServicePage(data) {
  const body = `<section class="section section--tight">
  <div class="wrap"><div class="prose">
    <h2>Service, parts and upgrades</h2>
    <p>Every Independence Day Golf Carts location services what it sells, and most service the major brands regardless of where the cart was bought. Common work includes battery pack replacement and lithium conversions, controller and motor diagnostics, brake and suspension work, lift kit installation, tire and wheel packages, and LSV conversions to make a cart street legal.</p>
    <h3>What we service</h3>
    <ul>
      <li>Lithium and lead-acid battery packs, chargers and battery management systems</li>
      <li>Controllers, solenoids, motors and wiring</li>
      <li>Brakes, bearings, suspension and steering</li>
      <li>Lift kits, wheels and all-terrain tires</li>
      <li>Street legal LSV conversions — lighting, mirrors, seat belts, windshield, horn and VIN</li>
      <li>Enclosures, sound systems, rear seat kits, extended tops and hitches</li>
    </ul>
    <h3>Parts</h3>
    <p>We stock parts for the brands we carry and can order most others. Call ${esc(site.phone)} with your make, model, year and serial number and we will confirm availability.</p>
    <h3>Lithium conversion</h3>
    <p>Converting a lead-acid cart to lithium typically doubles usable range, halves the weight over the rear axle, cuts charge time from 8–10 hours to 3–5, and removes watering from the maintenance list. During the ${esc(salesEvent.name)}, conversions bundled with a cart purchase carry event pricing.</p>
  </div></div>
</section>`;

  return simplePage({
    data,
    path: "/service/",
    title: `Golf Cart Service, Parts & Upgrades | ${site.name}`,
    h1: "Service, Parts & Upgrades",
    lede: "Battery packs, lithium conversions, lift kits, LSV street legal conversions and full mechanical service at all locations.",
    description: `Golf cart service and parts at all ${data.stores.length} Independence Day Golf Carts locations — batteries, lithium conversions, lift kits and street legal LSV conversions. Call ${site.phone}.`,
    body,
    pageKeywords: ["golf cart service", "golf cart parts", "lithium conversion", "LSV conversion", "golf cart repair near me"],
    crumbLabel: "Service",
    graph: [
      {
        "@type": "Service",
        "@id": `${site.url}/service/#service`,
        name: "Golf Cart Service, Parts and Upgrades",
        provider: { "@id": `${site.url}/#organization` },
        serviceType: "Golf cart repair, battery replacement, lithium conversion, LSV conversion",
        areaServed: [...new Set(data.stores.map((store) => store.state))].map((state) => ({ "@type": "State", name: state })),
      },
    ],
  });
}

export function renderTradeInPage(data) {
  const body = `<section class="section section--tight">
  <div class="wrap"><div class="prose">
    <h2>Trade in any cart, any make, any condition</h2>
    <p>Trade-ins are appraised the same day during the ${esc(salesEvent.name)}, and trade value stacks on top of event pricing — the discount is not reduced because you are trading.</p>
    <h3>What we need to appraise it</h3>
    <ul>
      <li>Make, model and year</li>
      <li>Serial number (usually under the seat or on the frame rail)</li>
      <li>Battery year and chemistry, or engine hours on a gas cart</li>
      <li>Photos: front, rear, both sides, the seats, and the battery compartment</li>
      <li>Anything not working — we would rather know up front</li>
    </ul>
    <h3>What drives trade value</h3>
    <p>Battery age is the single biggest factor on an electric cart. A lead-acid pack older than four years is priced as a near-term replacement. Lithium packs hold value far longer. On gas carts, hours and service history matter most. Body condition, seats, tires and whether the cart is street legal all move the number.</p>
    <h3>How it works</h3>
    <ol>
      <li>Call ${esc(site.phone)} or send photos and the serial number.</li>
      <li>We give you a trade range the same day, usually within a couple of hours.</li>
      <li>Bring the cart in — or we will collect it locally when we deliver the new one.</li>
      <li>Trade value comes off the event price at the point of sale.</li>
    </ol>
  </div></div>
</section>`;

  return simplePage({
    data,
    path: "/trade-in/",
    title: `Golf Cart Trade-In Value — Same Day Appraisal | ${site.name}`,
    h1: "Trade In Your Golf Cart",
    lede: "Any make, any condition, appraised the same day. Trade value stacks on top of July 4th event pricing.",
    description: `Trade in your golf cart during the ${salesEvent.name}. Same-day appraisals on any make and condition, and trade value stacks on top of event pricing. Call ${site.phone}.`,
    body,
    pageKeywords: ["golf cart trade in", "golf cart trade in value", "sell my golf cart", "golf cart appraisal"],
    faqEntries: faq.filter((entry) => entry.topic === "trade-in" || entry.topic === "buying").slice(0, 4),
    crumbLabel: "Trade-In",
  });
}

export function renderDeliveryPage(data) {
  const states = [...new Set(data.stores.map((store) => store.state))].sort();
  const body = `<section class="section section--tight">
  <div class="wrap"><div class="prose">
    <h2>Delivery to your door</h2>
    <p>We deliver carts locally and nationwide. Delivery is quoted per order based on your address and the cart, so call ${esc(site.phone)} with your ZIP code for a firm number. With ${data.stores.length} locations across ${states.length} states, most customers are inside the local delivery range of at least one store.
    <h3>Where we deliver locally</h3>
    <p>${esc(states.join(", "))} — and we regularly deliver into neighbouring states from our border locations. Give us your ZIP code on the phone and we will quote the delivery cost before you commit.</p>
    <h3>Nationwide shipping</h3>
    <p>Carts ship anywhere in the continental United States on enclosed or open transport depending on the cart and the route. Shipping is quoted per order; call ${esc(site.phone)} with your delivery ZIP for a firm number.</p>
    <h3>What happens on delivery day</h3>
    <ul>
      <li>We confirm a delivery window the day before.</li>
      <li>The cart arrives charged (electric) or fuelled (gas) and ready to drive.</li>
      <li>We walk you through the controls, charging, the battery disconnect and the maintenance schedule.</li>
      <li>If you are trading, we collect the old cart at the same time.</li>
    </ul>
    <h3>Lead times</h3>
    <p>Most local deliveries happen within two to five days of purchase. During the peak of the July 4th event, book early — the last week before the Fourth is the busiest of the year.</p>
  </div></div>
</section>`;

  return simplePage({
    data,
    path: "/delivery/",
    title: `Golf Cart Delivery & Nationwide Shipping | ${site.name}`,
    h1: "Delivery & Shipping",
    lede: "Local and nationwide golf cart delivery, quoted to your address before you commit.",
    description: `Local and nationwide golf cart delivery from ${data.stores.length} locations during the ${salesEvent.name}. Call ${site.phone} for a delivery quote to your ZIP code.`,
    body,
    pageKeywords: ["golf cart delivery", "golf cart shipping", "golf cart delivered to my house"],
    faqEntries: faq.filter((entry) => entry.topic === "delivery"),
    crumbLabel: "Delivery",
  });
}

/* --------------------------------------------------------------- faq --- */

export function renderFaqPage(data) {
  const topics = [...new Set(faq.map((entry) => entry.topic))];
  const body = `<section class="section section--tight">
  <div class="wrap wrap-narrow">
${topics
  .map(
    (topic) => `    <h2 style="margin-top:2rem;text-transform:capitalize">${esc(topic.replace(/-/g, " "))}</h2>
${faq
  .filter((entry) => entry.topic === topic)
  .map(
    (entry) => `    <details class="faq-item">
      <summary>${esc(entry.q)}</summary>
      <div class="faq-item__body"><p>${esc(entry.a)}</p></div>
    </details>`,
  )
  .join("\n")}`,
  )
  .join("\n")}
  </div>
</section>`;

  return simplePage({
    data,
    path: "/faq/",
    title: `Golf Cart FAQ — ${faq.length} Answers | ${site.name}`,
    h1: "Questions & Answers",
    lede: `${faq.length} straight answers about the July 4th Golf Cart Sales Event, pricing, financing, street legal LSVs, batteries and delivery.`,
    description: `Answers to ${faq.length} common questions about the ${salesEvent.name} — pricing, 0% APR financing, street legal LSVs, lithium batteries, delivery and trade-ins.`,
    body,
    pageKeywords: [...keywords.voice, ...keywords.longTail.slice(0, 4)],
    crumbLabel: "FAQ",
    graph: [
      {
        "@type": "FAQPage",
        "@id": `${site.url}/faq/#faq`,
        mainEntity: faq.map((entry) => ({
          "@type": "Question",
          name: entry.q,
          acceptedAnswer: { "@type": "Answer", text: entry.a },
        })),
      },
    ],
  });
}

/* ------------------------------------------------------------- guides --- */

/** Render a guide body block array to HTML. */
export function guideBodyHtml(blocks) {
  return blocks
    .map((block) => {
      if (block.h2) return `<h2>${esc(block.h2)}</h2>`;
      if (block.h3) return `<h3>${esc(block.h3)}</h3>`;
      if (block.p) return `<p>${block.p.replace(/<(?!\/?a\b)[^>]*>/g, "")}</p>`;
      if (block.list) return `<ul>\n${block.list.map((item) => `  <li>${esc(item)}</li>`).join("\n")}\n</ul>`;
      return "";
    })
    .join("\n");
}

/** Plain-text form of a guide, for the AI training files. */
export function guideBodyText(blocks) {
  return blocks
    .map((block) => {
      if (block.h2) return `\n## ${block.h2}`;
      if (block.h3) return `\n### ${block.h3}`;
      if (block.p) return block.p.replace(/<[^>]+>/g, "");
      if (block.list) return block.list.map((item) => `- ${item}`).join("\n");
      return "";
    })
    .join("\n");
}

export function renderGuidesIndex(data) {
  const body = `<section class="section section--tight">
  <div class="wrap">
    <div class="grid-3">
${guides
  .map(
    (guide) => `      <article class="article-card">
        <h3><a href="/guides/${guide.slug}/">${esc(guide.title)}</a></h3>
        <p>${esc(guide.description)}</p>
        <p class="article-card__meta">${esc(guide.category)} &middot; ${guide.readingMinutes} min read &middot; ${esc(guide.date)}</p>
      </article>`,
  )
  .join("\n")}
    </div>
  </div>
</section>`;

  return simplePage({
    data,
    path: "/guides/",
    title: `Golf Cart Buying Guides & Resources | ${site.name}`,
    h1: "Golf Cart Buying Guides",
    lede: "Practical, dealer-side guides on buying, financing, street legal LSVs and battery chemistry — written to answer the questions we get on the phone every day.",
    description: `Golf cart buying guides from Independence Day Golf Carts: the July 4th sales event guide, electric vs gas, street legal LSV requirements, battery comparisons and a buying checklist.`,
    body,
    pageKeywords: ["golf cart buying guide", "golf cart guides", "how to buy a golf cart"],
    crumbLabel: "Guides",
    graph: [
      {
        "@type": "Blog",
        "@id": `${site.url}/guides/#blog`,
        name: `${site.name} Buying Guides`,
        url: `${site.url}/guides/`,
        publisher: { "@id": `${site.url}/#organization` },
        blogPost: guides.map((guide) => ({
          "@type": "BlogPosting",
          headline: guide.title,
          url: `${site.url}/guides/${guide.slug}/`,
          datePublished: guide.date,
          dateModified: guide.updated,
        })),
      },
    ],
  });
}

export function renderGuidePage(guide, data) {
  const path = `/guides/${guide.slug}/`;
  const others = guides.filter((entry) => entry.slug !== guide.slug).slice(0, 3);

  const body = `<div class="page-head">
  <div class="wrap wrap-narrow">
    <p class="eyebrow eyebrow--light">${esc(guide.category)} &middot; ${guide.readingMinutes} min read</p>
    <h1>${esc(guide.title)}</h1>
    <p class="page-head__lede">${esc(guide.description)}</p>
    <p class="note">Published ${esc(guide.date)}${guide.updated !== guide.date ? ` &middot; Updated ${esc(guide.updated)}` : ""} by ${esc(site.name)}</p>
  </div>
</div>

<section class="section section--tight">
  <div class="wrap wrap-narrow">
    <article class="prose">
${guideBodyHtml(guide.body)}
    </article>
    <ul class="tag-list" style="margin-top:32px">
${guide.tags.map((tag) => `      <li><a href="/guides/">${esc(tag)}</a></li>`).join("\n")}
    </ul>
  </div>
</section>

<section class="section section--surface">
  <div class="wrap">
    <h2 style="font-size:1.5rem">More guides</h2>
    <div class="grid-3">
${others
  .map(
    (entry) => `      <article class="article-card">
        <h3><a href="/guides/${entry.slug}/">${esc(entry.title)}</a></h3>
        <p>${esc(entry.description)}</p>
        <p class="article-card__meta">${esc(entry.category)} &middot; ${entry.readingMinutes} min read</p>
      </article>`,
  )
  .join("\n")}
    </div>
  </div>
</section>

${ctaBand()}`;

  return renderPage({
    title: clamp(`${guide.title} | ${site.name}`, 68),
    description: clamp(guide.description),
    path,
    body,
    ogType: "article",
    publishedAt: `${guide.date}T09:00:00+00:00`,
    modifiedAt: `${guide.updated}T09:00:00+00:00`,
    breadcrumbs: [
      { href: "/", label: "Home" },
      { href: "/guides/", label: "Guides" },
      { href: path, label: guide.title },
    ],
    stores: data.stores,
    pageKeywords: guide.tags,
    graph: [
      {
        "@type": ["Article", "BlogPosting"],
        "@id": `${abs(path)}#article`,
        headline: guide.title,
        alternativeHeadline: guide.description,
        description: guide.description,
        articleSection: guide.category,
        keywords: guide.tags.join(", "),
        wordCount: guideBodyText(guide.body).split(/\s+/).length,
        timeRequired: `PT${guide.readingMinutes}M`,
        datePublished: guide.date,
        dateModified: guide.updated,
        inLanguage: site.language,
        image: `${site.url}/images/og-image.png`,
        author: { "@id": `${site.url}/#organization` },
        publisher: { "@id": `${site.url}/#organization` },
        mainEntityOfPage: { "@id": `${abs(path)}#webpage` },
        isPartOf: { "@id": `${site.url}/guides/#blog` },
      },
    ],
  });
}

/* -------------------------------------------------- sitemap / legal / 404 --- */

export function renderHtmlSitemap(data) {
  const section = (title, links) =>
    `<h2 style="font-size:1.4rem;margin-top:2rem">${esc(title)}</h2>
    <ul class="linkgrid">
${links.map((link) => `      <li><a href="${esc(link.href)}">${esc(link.label)}</a></li>`).join("\n")}
    </ul>`;

  const body = `<section class="section section--tight">
  <div class="wrap">
    ${section("Main pages", [
      { href: "/", label: "Home" },
      { href: "/july-4th-golf-cart-sales-event/", label: "July 4th Golf Cart Sales Event" },
      { href: "/independence-day-golf-cart-sales-event/", label: "Independence Day Golf Cart Sales Event" },
      { href: "/inventory/", label: "All Inventory" },
      { href: "/financing/", label: "Financing" },
      { href: "/locations/", label: "Locations" },
      { href: "/about/", label: "About" },
      { href: "/contact/", label: "Contact" },
      { href: "/service/", label: "Service & Parts" },
      { href: "/trade-in/", label: "Trade-In" },
      { href: "/delivery/", label: "Delivery & Shipping" },
      { href: "/faq/", label: "FAQ" },
      { href: "/guides/", label: "Buying Guides" },
    ])}
    ${section("Shop by category", [
      { href: "/new/", label: "New Golf Carts" },
      { href: "/used/", label: "Used Golf Carts" },
      { href: "/electric-golf-carts/", label: "Electric Golf Carts" },
      { href: "/gas-golf-carts/", label: "Gas Golf Carts" },
      { href: "/street-legal-golf-carts/", label: "Street Legal Golf Carts & LSVs" },
      { href: "/lifted-golf-carts/", label: "Lifted Golf Carts" },
      { href: "/brands/", label: "All Brands" },
    ])}
    ${section(
      "Brands",
      data.facets.makes.map((make) => ({ href: `/brands/${make.key.replace(/_/g, "-")}/`, label: `${make.label} (${make.count})` })),
    )}
    ${section(
      "Locations",
      data.stores.map((store) => ({ href: `/locations/${store.slug}/`, label: `${store.city}, ${store.stateCode}` })),
    )}
    ${section(
      "Guides",
      guides.map((guide) => ({ href: `/guides/${guide.slug}/`, label: guide.title })),
    )}
    ${section("Machine-readable files", [
      { href: "/sitemap.xml", label: "XML Sitemap Index" },
      { href: "/robots.txt", label: "robots.txt" },
      { href: "/llms.txt", label: "llms.txt" },
      { href: "/llms-full.txt", label: "llms-full.txt" },
      { href: "/ai.txt", label: "ai.txt" },
      { href: "/rss.xml", label: "RSS Feed" },
      { href: "/inventory.json", label: "Inventory JSON" },
      { href: "/locations.geojson", label: "Locations GeoJSON" },
    ])}
    ${section("Legal", [
      { href: "/privacy/", label: "Privacy Policy" },
      { href: "/terms/", label: "Terms of Use" },
      { href: "/accessibility/", label: "Accessibility Statement" },
    ])}
    <h2 style="font-size:1.4rem;margin-top:2rem">Every cart in stock (${data.carts.length})</h2>
    <ul class="linkgrid">
${data.carts.map((cart) => `      <li><a href="/golfcart/${esc(cart.slug)}/">${esc(cart.title)}${cart.city ? ` — ${esc(cart.city)}, ${esc(cart.stateCode)}` : ""}</a></li>`).join("\n")}
    </ul>
  </div>
</section>`;

  return simplePage({
    data,
    path: "/sitemap/",
    title: `Site Map — Every Page | ${site.name}`,
    h1: "Site Map",
    lede: `Every page on independencedaygolfcarts.com, including all ${data.carts.length} carts currently in stock.`,
    description: `Complete HTML site map for Independence Day Golf Carts — all category, brand, location, guide and vehicle pages.`,
    body,
    crumbLabel: "Site Map",
    pageKeywords: ["site map"],
  });
}

const LEGAL = {
  privacy: {
    h1: "Privacy Policy",
    lede: "How Independence Day Golf Carts handles the information you share with us.",
    blocks: [
      ["Information we collect", "We collect the information you give us directly — your name, phone number, email address, delivery ZIP code and the details of any cart or trade-in you ask about. When you browse this site we also receive standard server log information such as your IP address, browser type and the pages you view."],
      ["How we use it", "We use your information to answer your enquiry, quote pricing and delivery, process a finance application when you ask us to, and arrange delivery or service. We do not sell your personal information."],
      ["Financing applications", "When you apply for financing you are dealing directly with the lender you choose. Their privacy policy governs that application. We pass on only what is needed to submit it, and only when you ask us to."],
      ["Cookies and analytics", "This site uses no advertising cookies and no cross-site tracking. Your theme preference (light or dark) is stored in your own browser's local storage and is never transmitted to us."],
      ["Your choices", "You can ask us what information we hold about you, ask us to correct it, or ask us to delete it. Email " + site.privacyEmail + " or call " + site.phone + "."],
      ["Children", "This site is not directed at children under 13 and we do not knowingly collect information from them."],
      ["Changes", "If this policy changes we will update the date below. Material changes will be highlighted on this page."],
    ],
  },
  terms: {
    h1: "Terms of Use",
    lede: "The terms that apply to using this website and to inventory pricing shown on it.",
    blocks: [
      ["Inventory and pricing", "Inventory, pricing, specifications and photographs on this site are pulled from our dealer management system and refreshed daily at 1:30 AM Eastern. Carts sell throughout the day, so availability shown here may not reflect the last few hours. Prices exclude tax, title, registration, freight and dealer prep unless stated otherwise. We reserve the right to correct errors."],
      ["Financing", "0% APR for 48 months is available on approved credit through third-party lenders. Approval, rate and term are determined by the lender, not by us. Payment figures shown on this site are estimates that exclude tax, title, prep and accessories, and are for illustration only — they are not an offer of credit."],
      ["Street legal vehicles", "Requirements for operating a golf cart or Low Speed Vehicle on public roads vary by state and municipality and change over time. Information on this site is general guidance, not legal advice. Confirm the rules with your state DMV and local authority before you buy."],
      ["Third-party links", "Links to financing partners and other third parties are provided for convenience. We do not control those sites and are not responsible for their content or practices."],
      ["Intellectual property", "The site design, text, logos and photography are the property of " + site.legalName + " unless otherwise noted. Manufacturer names and marks belong to their respective owners."],
      ["Limitation of liability", "This site is provided as-is. To the extent permitted by law we are not liable for indirect or consequential loss arising from its use."],
    ],
  },
  accessibility: {
    h1: "Accessibility Statement",
    lede: "We build this site to be usable by everyone, including people using assistive technology.",
    blocks: [
      ["Our commitment", "Independence Day Golf Carts aims to meet WCAG 2.2 Level AA. Accessibility is treated as part of building the site, not an afterthought."],
      ["What we do", "Every page uses semantic HTML landmarks and a logical heading order. All images carry descriptive alternative text. Colour contrast meets or exceeds 4.5:1 for body text. The whole site is operable by keyboard alone, with a visible focus indicator and a skip-to-content link. Forms have real labels. Motion respects the prefers-reduced-motion setting, and both light and dark themes are supported."],
      ["Assistive technology", "The site is tested against screen readers and voice control, and all content is available to text-only and assistive agents. Our accessibility.txt file at /accessibility.txt declares this in machine-readable form."],
      ["Known limitations", "Vehicle photographs come from our dealer management system; where a cart has no photograph a labelled placeholder is shown instead. Third-party financing sites we link to are outside our control."],
      ["Feedback", "If you hit an accessibility barrier on this site, call " + site.phone + " or email " + site.email + " and we will fix it and help you get what you needed in the meantime."],
    ],
  },
};

export function renderLegalPage(kind, data) {
  const spec = LEGAL[kind];
  const body = `<section class="section section--tight">
  <div class="wrap wrap-narrow"><div class="prose">
${spec.blocks.map(([heading, text]) => `    <h2>${esc(heading)}</h2>\n    <p>${esc(text)}</p>`).join("\n")}
    <p class="note" style="margin-top:2rem">Last updated ${YEAR}-01-01. ${esc(site.legalName)}, ${esc(site.phone)}.</p>
  </div></div>
</section>`;

  return simplePage({
    data,
    path: `/${kind}/`,
    title: `${spec.h1} | ${site.name}`,
    h1: spec.h1,
    lede: spec.lede,
    description: `${spec.h1} for Independence Day Golf Carts. ${spec.lede}`,
    body,
    crumbLabel: spec.h1,
    pageKeywords: [spec.h1.toLowerCase()],
  });
}

export function renderNotFoundPage(data) {
  const body = `<div class="page-head">
  <div class="wrap">
    <p class="eyebrow eyebrow--light">404</p>
    <h1>That page has driven off</h1>
    <p class="page-head__lede">The page you were after is not here — it may have sold during the ${esc(salesEvent.name)}. Here is where to go next.</p>
    <div class="btn-row" style="margin-top:20px">
      <a class="btn btn--primary" href="/inventory/">Browse All Inventory</a>
      <a class="btn btn--outline" href="${site.phoneTel}">${ICONS.phone} Call ${esc(site.phone)}</a>
    </div>
  </div>
</div>
<section class="section section--tight">
  <div class="wrap">
    <h2 style="font-size:1.4rem">Popular pages</h2>
    <ul class="linkgrid">
      <li><a href="/">Home</a></li>
      <li><a href="/july-4th-golf-cart-sales-event/">July 4th Golf Cart Sales Event</a></li>
      <li><a href="/inventory/">All Inventory</a></li>
      <li><a href="/new/">New Golf Carts</a></li>
      <li><a href="/used/">Used Golf Carts</a></li>
      <li><a href="/street-legal-golf-carts/">Street Legal Golf Carts</a></li>
      <li><a href="/financing/">0% APR Financing</a></li>
      <li><a href="/locations/">Locations</a></li>
      <li><a href="/sitemap/">Full Site Map</a></li>
    </ul>
  </div>
</section>
${ctaBand()}`;

  return renderPage({
    title: `Page Not Found | ${site.name}`,
    description: "The page you requested could not be found. Browse the July 4th Golf Cart Sales Event inventory instead.",
    path: "/404.html",
    body,
    robots: "noindex, follow",
    breadcrumbs: [{ href: "/", label: "Home" }],
    stores: data.stores,
  });
}
