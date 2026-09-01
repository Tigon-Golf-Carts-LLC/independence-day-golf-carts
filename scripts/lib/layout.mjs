/**
 * Page shell: <head> metadata, header, footer, and the JSON-LD graph.
 *
 * Every page on the site is produced by `renderPage()`, so the SEO/AEO surface
 * — canonical, Open Graph, Twitter, geo meta, icons, feeds, hreflang and
 * structured data — is guaranteed to be identical and complete everywhere.
 */

import { site, salesEvent, nav, keywords } from "../../data/site.config.mjs";
import { esc, jsonLd, isoStamp } from "./util.mjs";

const YEAR = new Date().getUTCFullYear();
const OG_IMAGE = `${site.url}/images/og-image.png`;

/** Absolute URL for any site-relative path. */
export function abs(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return site.url + (path.startsWith("/") ? path : `/${path}`);
}

/* ----------------------------------------------------------- structures --- */

/** The AutoDealer node every page's graph hangs off. */
export function organizationSchema(stores = []) {
  return {
    "@type": ["AutoDealer", "Organization", "LocalBusiness"],
    "@id": `${site.url}/#organization`,
    name: site.name,
    legalName: site.legalName,
    alternateName: ["Independence Day Carts", "July 4th Golf Cart Sales Event"],
    url: site.url,
    logo: {
      "@type": "ImageObject",
      "@id": `${site.url}/#logo`,
      url: `${site.url}/images/logo.png`,
      contentUrl: `${site.url}/images/logo.png`,
      width: 760,
      height: 160,
      caption: site.name,
    },
    image: OG_IMAGE,
    description: site.description,
    slogan: salesEvent.headline,
    telephone: site.phoneE164,
    email: site.email,
    priceRange: site.priceRange,
    currenciesAccepted: "USD",
    paymentAccepted: "Cash, Check, Credit Card, Financing",
    foundingDate: site.founded,
    sameAs: site.social,
    knowsAbout: [
      "golf carts",
      "low speed vehicles",
      "street legal golf carts",
      "lithium golf cart batteries",
      "golf cart financing",
      "July 4th golf cart sales event",
    ],
    areaServed: [...new Set(stores.map((store) => store.state).filter(Boolean))].map((state) => ({
      "@type": "State",
      name: state,
    })),
    openingHoursSpecification: site.hours.map((entry) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: entry.days,
      opens: entry.opens,
      closes: entry.closes,
    })),
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: site.phoneE164,
        contactType: "sales",
        areaServed: "US",
        availableLanguage: ["English"],
      },
      {
        "@type": "ContactPoint",
        telephone: site.phoneE164,
        contactType: "customer service",
        areaServed: "US",
        availableLanguage: ["English"],
      },
    ],
  };
}

/** WebSite node, including the sitelinks search box action. */
export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    url: site.url,
    name: site.name,
    description: site.description,
    inLanguage: site.language,
    publisher: { "@id": `${site.url}/#organization` },
    copyrightHolder: { "@id": `${site.url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site.url}/inventory/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** The SaleEvent this entire site is organised around. */
export function salesEventSchema() {
  return {
    "@type": "SaleEvent",
    "@id": `${site.url}/july-4th-golf-cart-sales-event/#event`,
    name: `${salesEvent.name} ${YEAR}`,
    alternateName: salesEvent.altName,
    description: salesEvent.subhead,
    url: `${site.url}/july-4th-golf-cart-sales-event/`,
    image: OG_IMAGE,
    startDate: `${YEAR}-${salesEvent.startMonthDay}T09:00:00-04:00`,
    endDate: `${YEAR}-${salesEvent.endMonthDay}T17:00:00-04:00`,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    organizer: { "@id": `${site.url}/#organization` },
    performer: { "@id": `${site.url}/#organization` },
    location: [
      { "@type": "VirtualLocation", url: `${site.url}/inventory/` },
    ],
    offers: {
      "@type": "Offer",
      url: `${site.url}/inventory/`,
      availability: "https://schema.org/InStock",
      priceCurrency: "USD",
      validFrom: `${YEAR}-${salesEvent.startMonthDay}`,
      category: "Independence Day golf cart sales event pricing",
    },
  };
}

export function breadcrumbSchema(trail) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: abs(crumb.href),
    })),
  };
}

export function faqSchema(entries, id) {
  return {
    "@type": "FAQPage",
    "@id": id,
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a },
    })),
  };
}

/* ---------------------------------------------------------------- head --- */

function iconLinks() {
  const png = [16, 32, 48, 96, 128, 192, 256, 384, 512]
    .map((size) => `  <link rel="icon" type="image/png" sizes="${size}x${size}" href="/icons/icon-${size}.png">`)
    .join("\n");
  const apple = [57, 60, 72, 76, 114, 120, 144, 152, 167, 180]
    .map((size) => `  <link rel="apple-touch-icon" sizes="${size}x${size}" href="/icons/icon-${size}.png">`)
    .join("\n");
  return `  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/svg+xml" href="/images/favicon.svg">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="mask-icon" href="/images/favicon.svg" color="${site.themeColor}">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
${png}
${apple}`;
}

function discoveryLinks() {
  return `  <link rel="manifest" href="/manifest.json">
  <link rel="search" type="application/opensearchdescription+xml" title="${esc(site.name)}" href="/opensearch.xml">
  <link rel="alternate" type="application/rss+xml" title="${esc(site.name)} — News &amp; Guides" href="/rss.xml">
  <link rel="alternate" type="application/atom+xml" title="${esc(site.name)} — Atom Feed" href="/atom.xml">
  <link rel="alternate" type="application/json" title="${esc(site.name)} — Inventory JSON" href="/inventory.json">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
  <link rel="author" href="/humans.txt">
  <link rel="license" href="/terms/">
  <link rel="help" href="/contact/">`;
}

/**
 * Full <head>. Callers pass page facts; everything site-wide is filled in here.
 */
function head(options) {
  const {
    title,
    description,
    path,
    image = OG_IMAGE,
    imageAlt = `${site.name} — ${salesEvent.name}`,
    imageWidth = 1200,
    imageHeight = 630,
    ogType = "website",
    pageKeywords = [],
    robots = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    publishedAt,
    modifiedAt,
    geo,
    extraHead = "",
    graph = [],
    prev,
    next,
  } = options;

  const canonical = abs(path);
  const allKeywords = [...new Set([...keywords.primary, ...pageKeywords])].slice(0, 22).join(", ");
  const geoPlace = geo ? `${geo.city}, ${geo.state}` : "United States";
  const geoRegion = geo ? `US-${geo.stateCode}` : "US";

  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="keywords" content="${esc(allKeywords)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta name="robots" content="${esc(robots)}">
  <meta name="googlebot" content="${esc(robots)}">
  <meta name="bingbot" content="${esc(robots)}">
  <meta name="google" content="notranslate">
  <meta name="rating" content="general">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="format-detection" content="telephone=yes">
  <meta name="author" content="${esc(site.name)}">
  <meta name="publisher" content="${esc(site.legalName)}">
  <meta name="copyright" content="© ${YEAR} ${esc(site.legalName)}">
  <meta name="language" content="${esc(site.language)}">
  <meta name="revisit-after" content="1 day">
  <meta name="distribution" content="global">
  <meta name="coverage" content="Worldwide">
  <meta name="target" content="all">
  <meta name="subject" content="${esc(salesEvent.name)}">
  <meta name="classification" content="Golf Cart Dealership, Low Speed Vehicles, Powersports Retail">
  <meta name="category" content="Automotive &gt; Golf Carts &gt; Sales Event">
  <meta name="topic" content="${esc(salesEvent.altName)}">
  <meta name="summary" content="${esc(description)}">
  <meta name="owner" content="${esc(site.legalName)}">
  <meta name="url" content="${esc(canonical)}">
  <meta name="identifier-URL" content="${esc(canonical)}">
  <meta name="theme-color" content="${site.themeColor}">
  <meta name="color-scheme" content="light dark">
  <meta name="msapplication-TileColor" content="${site.backgroundColor}">
  <meta name="msapplication-TileImage" content="/icons/mstile-150x150.png">
  <meta name="msapplication-config" content="/browserconfig.xml">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${esc(site.shortName)}">
  <meta name="application-name" content="${esc(site.shortName)}">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="HandheldFriendly" content="true">
  <meta name="MobileOptimized" content="width">

  <meta name="geo.region" content="${esc(geoRegion)}">
  <meta name="geo.placename" content="${esc(geoPlace)}">
  ${geo && geo.lat ? `<meta name="geo.position" content="${geo.lat};${geo.lng}">
  <meta name="ICBM" content="${geo.lat}, ${geo.lng}">` : `<meta name="geo.position" content="39.1582;-75.5244">
  <meta name="ICBM" content="39.1582, -75.5244">`}
  <meta name="DC.title" content="${esc(title)}">
  <meta name="DC.description" content="${esc(description)}">
  <meta name="DC.publisher" content="${esc(site.legalName)}">
  <meta name="DC.language" content="${esc(site.language)}" scheme="RFC1766">
  <meta name="DC.coverage" content="${esc(geoPlace)}">
  <meta name="DC.rights" content="© ${YEAR} ${esc(site.legalName)}">

  <meta property="og:type" content="${esc(ogType)}">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:locale" content="${esc(site.locale)}">
  <meta property="og:image" content="${esc(abs(image))}">
  <meta property="og:image:secure_url" content="${esc(abs(image))}">
  <meta property="og:image:width" content="${imageWidth}">
  <meta property="og:image:height" content="${imageHeight}">
  <meta property="og:image:alt" content="${esc(imageAlt)}">
  <meta property="og:image:type" content="image/${abs(image).endsWith(".jpg") ? "jpeg" : "png"}">
  ${publishedAt ? `<meta property="article:published_time" content="${esc(publishedAt)}">` : ""}
  ${modifiedAt ? `<meta property="article:modified_time" content="${esc(modifiedAt)}">` : ""}
  <meta property="business:contact_data:phone_number" content="${esc(site.phoneE164)}">
  <meta property="business:contact_data:website" content="${site.url}">
  <meta property="business:contact_data:country_name" content="United States">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="${esc(site.twitter)}">
  <meta name="twitter:creator" content="${esc(site.twitter)}">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(abs(image))}">
  <meta name="twitter:image:alt" content="${esc(imageAlt)}">
  <meta name="twitter:label1" content="Call">
  <meta name="twitter:data1" content="${esc(site.phone)}">
  <meta name="twitter:label2" content="Sales Event">
  <meta name="twitter:data2" content="${esc(salesEvent.name)}">

  <link rel="alternate" hreflang="en-us" href="${esc(canonical)}">
  <link rel="alternate" hreflang="en" href="${esc(canonical)}">
  <link rel="alternate" hreflang="x-default" href="${esc(canonical)}">
  ${prev ? `<link rel="prev" href="${esc(abs(prev))}">` : ""}
  ${next ? `<link rel="next" href="${esc(abs(next))}">` : ""}

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://s3.amazonaws.com">
  <link rel="preconnect" href="https://s3.amazonaws.com" crossorigin>
  <link rel="preload" as="style" href="/styles/site.css">
  <link rel="stylesheet" href="/styles/site.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;600;700&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;600;700&display=swap"></noscript>

${iconLinks()}
${discoveryLinks()}

  <script type="application/ld+json">
${jsonLd({ "@context": "https://schema.org", "@graph": graph })}
  </script>
${extraHead}`;
}

/* -------------------------------------------------------------- chrome --- */

const ICONS = {
  phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>`,
  pin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  tick: `<svg class="tick" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  external: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>`,
  menu: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
  sun: `<svg class="icon-light" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  moon: `<svg class="icon-dark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
};

export { ICONS };

function header(activePath) {
  const isActive = (href) =>
    href === "/" ? activePath === "/" : activePath.startsWith(href);

  const navItems = nav
    .map(
      (item) =>
        `<li><a href="${item.href}"${isActive(item.href) ? ' aria-current="page"' : ""}>${esc(item.label)}</a></li>`,
    )
    .join("");

  return `<a class="skip-link" href="#main">Skip to main content</a>
<div class="topbar">
  <div class="wrap topbar__inner">
    <ul class="topbar__list topbar__meta">
      <li>${ICONS.pin} 15 Locations Nationwide</li>
      <li>${ICONS.clock} Mon–Sat 9AM–5PM</li>
      <li>Delivery Available Nationwide</li>
    </ul>
    <ul class="topbar__list">
      <li><strong style="color:#fff">${esc(salesEvent.name)}</strong></li>
      <li><a href="${site.phoneTel}" aria-label="Call ${esc(site.phone)}">${ICONS.phone} ${esc(site.phone)}</a></li>
    </ul>
  </div>
</div>
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="/" aria-label="${esc(site.name)} home">
      <img class="brand__light" src="/images/logo.svg" width="760" height="160" alt="${esc(site.name)} — ${esc(salesEvent.name)}">
      <img class="brand__dark" src="/images/logo-light.svg" width="760" height="160" alt="${esc(site.name)} — ${esc(salesEvent.name)}">
    </a>
    <nav class="mainnav" aria-label="Primary">
      <ul class="mainnav__list">${navItems}</ul>
    </nav>
    <button class="navtoggle" type="button" aria-expanded="false" aria-controls="mobilenav" data-nav-toggle>
      ${ICONS.menu}<span>Menu</span>
    </button>
    <div class="header-actions">
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch between light and dark theme">
        ${ICONS.sun}${ICONS.moon}
      </button>
      <a class="btn btn--primary btn--sm" href="${site.phoneTel}">${ICONS.phone}<span>${esc(site.phone)}</span></a>
    </div>
  </div>
  <nav class="mobilenav" id="mobilenav" aria-label="Mobile" data-open="false">
    <ul>${navItems}</ul>
  </nav>
</header>`;
}

function footer(stores = []) {
  const locationLinks = stores
    .slice(0, 16)
    .map(
      (store) =>
        `<li><a href="/locations/${store.slug}/">${esc(store.city)}, ${esc(store.stateCode)}</a></li>`,
    )
    .join("");

  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-col footer-brand">
        <img src="/images/logo-light.svg" width="760" height="160" alt="${esc(site.name)}" loading="lazy">
        <p>${esc(site.shortDescription)}</p>
        <p><a class="phone-big" style="font-size:1.6rem" href="${site.phoneTel}">${esc(site.phone)}</a></p>
        <ul class="tag-list" style="margin-top:10px">
          ${site.social.map((url) => `<li><a href="${esc(url)}" rel="noopener me" target="_blank">${esc(new URL(url).hostname.replace("www.", "").split(".")[0])}</a></li>`).join("")}
        </ul>
      </div>
      <div class="footer-col">
        <h3>Shop Inventory</h3>
        <ul>
          <li><a href="/inventory/">All Golf Carts</a></li>
          <li><a href="/new/">New Golf Carts</a></li>
          <li><a href="/used/">Used Golf Carts</a></li>
          <li><a href="/electric-golf-carts/">Electric Golf Carts</a></li>
          <li><a href="/gas-golf-carts/">Gas Golf Carts</a></li>
          <li><a href="/street-legal-golf-carts/">Street Legal &amp; LSV</a></li>
          <li><a href="/lifted-golf-carts/">Lifted Golf Carts</a></li>
          <li><a href="/brands/">Shop by Brand</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h3>The July 4th Event</h3>
        <ul>
          <li><a href="/july-4th-golf-cart-sales-event/">July 4th Sales Event</a></li>
          <li><a href="/independence-day-golf-cart-sales-event/">Independence Day Event</a></li>
          <li><a href="/financing/">0% APR Financing</a></li>
          <li><a href="/trade-in/">Trade In Your Cart</a></li>
          <li><a href="/delivery/">Delivery &amp; Shipping</a></li>
          <li><a href="/guides/">Buying Guides</a></li>
          <li><a href="/faq/">Questions &amp; Answers</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h3>Locations</h3>
        <ul>${locationLinks}<li><a href="/locations/"><strong style="color:#fff">View all locations</strong></a></li></ul>
      </div>
      <div class="footer-col">
        <h3>Company</h3>
        <ul>
          <li><a href="/about/">About Us</a></li>
          <li><a href="/contact/">Contact</a></li>
          <li><a href="/service/">Service &amp; Parts</a></li>
          <li><a href="/sitemap/">HTML Sitemap</a></li>
          <li><a href="/sitemap.xml">XML Sitemap</a></li>
          <li><a href="/llms.txt">llms.txt (AI)</a></li>
          <li><a href="/privacy/">Privacy Policy</a></li>
          <li><a href="/terms/">Terms of Use</a></li>
          <li><a href="/accessibility/">Accessibility</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p style="margin:0">© ${YEAR} ${esc(site.legalName)} — ${esc(site.name)}. All rights reserved. Inventory updated daily at 1:30&nbsp;AM&nbsp;ET.</p>
      <ul>
        <li><a href="/privacy/">Privacy</a></li>
        <li><a href="/terms/">Terms</a></li>
        <li><a href="/accessibility/">Accessibility</a></li>
        <li><a href="/humans.txt">humans.txt</a></li>
      </ul>
    </div>
  </div>
</footer>`;
}

export function breadcrumbHtml(trail) {
  if (!trail || trail.length < 2) return "";
  const items = trail
    .map((crumb, index) =>
      index === trail.length - 1
        ? `<li><span aria-current="page">${esc(crumb.label)}</span></li>`
        : `<li><a href="${esc(crumb.href)}">${esc(crumb.label)}</a></li>`,
    )
    .join("");
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><div class="wrap"><ol>${items}</ol></div></nav>`;
}

/* ---------------------------------------------------------------- page --- */

/**
 * Compose a complete HTML document.
 * `graph` entries are merged with the site-wide Organization/WebSite nodes.
 */
export function renderPage(options) {
  const { body, path, breadcrumbs = [], stores = [], bodyClass = "", scripts = [] } = options;

  const graph = [
    organizationSchema(stores),
    websiteSchema(),
    {
      "@type": "WebPage",
      "@id": `${abs(path)}#webpage`,
      url: abs(path),
      name: options.title,
      description: options.description,
      isPartOf: { "@id": `${site.url}/#website` },
      about: { "@id": `${site.url}/#organization` },
      inLanguage: site.language,
      datePublished: options.publishedAt ?? `${YEAR}-01-01`,
      dateModified: options.modifiedAt ?? isoStamp(),
      primaryImageOfPage: { "@type": "ImageObject", url: abs(options.image ?? OG_IMAGE) },
      ...(breadcrumbs.length > 1 ? { breadcrumb: { "@id": `${abs(path)}#breadcrumb` } } : {}),
    },
    ...(breadcrumbs.length > 1
      ? [{ ...breadcrumbSchema(breadcrumbs), "@id": `${abs(path)}#breadcrumb` }]
      : []),
    ...(options.graph ?? []),
  ];

  const scriptTags = ["/js/site.js", ...scripts]
    .map((src) => `<script src="${src}" defer></script>`)
    .join("\n");

  return `<!doctype html>
<html lang="${site.language}" dir="ltr" prefix="og: https://ogp.me/ns#">
<head>
  ${head({ ...options, graph })}
  <script>
    // Applied before paint so a stored theme choice never flashes the wrong palette.
    try { var t = localStorage.getItem("idgc-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  </script>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
${header(path)}
${breadcrumbHtml(breadcrumbs)}
<main id="main">
${body}
</main>
${footer(stores)}
${scriptTags}
</body>
</html>
`;
}

export { OG_IMAGE, YEAR };
