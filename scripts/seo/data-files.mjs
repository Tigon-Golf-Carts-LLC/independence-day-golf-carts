/**
 * Machine-readable data files: PWA manifest, Windows tile config, OpenSearch,
 * location data in three geo formats, per-location JSON-LD, the combined schema
 * graph, and the JSON inventory feeds the site's own client script consumes.
 */

import { site, salesEvent, financingPartners } from "../../data/site.config.mjs";
import { xmlEsc, isoStamp, cartImages } from "../lib/util.mjs";
import { organizationSchema, websiteSchema, salesEventSchema } from "../lib/layout.mjs";
import { cartSchema } from "../lib/components.mjs";
import { storeSchema } from "../pages/locations.mjs";
import { indexRecord } from "../pages/inventory.mjs";
import { brandSlug } from "../pages/brands.mjs";
import { faq } from "../../data/faq.mjs";
import { guides } from "../../data/guides.mjs";

function manifestJson(data) {
  return JSON.stringify(
    {
      name: `${site.name} — ${salesEvent.name}`,
      short_name: site.shortName,
      description: site.shortDescription,
      start_url: "/?utm_source=pwa",
      id: "/",
      scope: "/",
      display: "standalone",
      display_override: ["window-controls-overlay", "standalone", "minimal-ui", "browser"],
      orientation: "any",
      background_color: site.backgroundColor,
      theme_color: site.themeColor,
      lang: site.language,
      dir: "ltr",
      categories: ["shopping", "business", "travel", "lifestyle"],
      prefer_related_applications: false,
      icons: [
        ...[48, 72, 96, 128, 144, 152, 192, 256, 384, 512].map((size) => ({
          src: `/icons/icon-${size}.png`,
          sizes: `${size}x${size}`,
          type: "image/png",
          purpose: "any",
        })),
        { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: "/images/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      ],
      screenshots: [
        { src: "/images/og-image.png", sizes: "1200x630", type: "image/png", form_factor: "wide", label: `${salesEvent.name}` },
        { src: "/images/og-image-square.png", sizes: "1200x1200", type: "image/png", form_factor: "narrow", label: site.name },
      ],
      shortcuts: [
        { name: "Browse inventory", short_name: "Inventory", url: "/inventory/", description: `All ${data.summary.total} carts in stock`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        { name: "July 4th Sales Event", short_name: "Event", url: "/july-4th-golf-cart-sales-event/", description: salesEvent.subhead, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        { name: "Financing", short_name: "Financing", url: "/financing/", description: "0% APR for 48 months", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        { name: "Locations", short_name: "Locations", url: "/locations/", description: `${data.stores.length} dealerships`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      ],
      related_applications: [],
      launch_handler: { client_mode: "auto" },
    },
    null,
    2,
  );
}

function browserconfigXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="/icons/mstile-70x70.png"/>
      <square150x150logo src="/icons/mstile-150x150.png"/>
      <square310x310logo src="/icons/mstile-310x310.png"/>
      <TileColor>${site.backgroundColor}</TileColor>
    </tile>
    <notification>
      <polling-uri src="${site.url}/rss.xml"/>
      <frequency>1440</frequency>
      <cycle>1</cycle>
    </notification>
  </msapplication>
</browserconfig>
`;
}

function opensearchXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/"
                       xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>${xmlEsc(site.shortName)}</ShortName>
  <LongName>${xmlEsc(`${site.name} — ${salesEvent.name}`)}</LongName>
  <Description>${xmlEsc(`Search ${site.name} golf cart inventory — ${salesEvent.name}`)}</Description>
  <Tags>golf carts inventory july 4th independence day sales event LSV</Tags>
  <Contact>${xmlEsc(site.email)}</Contact>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
  <Language>en-us</Language>
  <AdultContent>false</AdultContent>
  <Developer>${xmlEsc(site.legalName)}</Developer>
  <Attribution>© ${new Date().getUTCFullYear()} ${xmlEsc(site.legalName)}</Attribution>
  <SyndicationRight>open</SyndicationRight>
  <Image width="16" height="16" type="image/x-icon">${site.url}/favicon.ico</Image>
  <Image width="64" height="64" type="image/png">${site.url}/icons/icon-64.png</Image>
  <Url type="text/html" method="get" template="${site.url}/inventory/?q={searchTerms}"/>
  <Url type="application/rss+xml" rel="results" template="${site.url}/rss.xml"/>
  <Url type="application/opensearchdescription+xml" rel="self" template="${site.url}/opensearch.xml"/>
  <moz:SearchForm>${site.url}/inventory/</moz:SearchForm>
</OpenSearchDescription>
`;
}

function locationsGeoJson(data) {
  return JSON.stringify(
    {
      type: "FeatureCollection",
      name: `${site.name} dealership locations`,
      generatedAt: isoStamp(),
      features: data.stores
        .filter((store) => store.lat)
        .map((store) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [store.lng, store.lat] },
          properties: {
            name: store.name,
            slug: store.slug,
            city: store.city,
            state: store.state,
            stateCode: store.stateCode,
            street: store.address1 || null,
            postalCode: store.postalCode || null,
            country: "USA",
            county: store.county || null,
            region: store.region || null,
            phone: site.phone,
            email: site.email,
            url: `${site.url}/locations/${store.slug}/`,
            cartsInStock: store.cartCount,
            serviceArea: store.serviceArea || [],
            hours: site.hoursDisplay,
            salesEvent: salesEvent.name,
          },
        })),
    },
    null,
    2,
  );
}

function locationsKml(data) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xmlEsc(site.name)} — Dealership Locations</name>
    <description>${xmlEsc(`${data.stores.length} golf cart dealerships hosting the ${salesEvent.name}. Call ${site.phone}.`)}</description>
${data.stores
  .filter((store) => store.lat)
  .map(
    (store) => `    <Placemark>
      <name>${xmlEsc(store.name)}</name>
      <description><![CDATA[${store.address1 ? `${store.address1}<br>` : ""}${store.city}, ${store.stateCode} ${store.postalCode}<br>
        Phone: ${site.phone}<br>
        Carts in stock: ${store.cartCount}<br>
        <a href="${site.url}/locations/${store.slug}/">Location details</a>]]></description>
      <address>${xmlEsc(`${store.address1 ? `${store.address1}, ` : ""}${store.city}, ${store.stateCode} ${store.postalCode}`)}</address>
      <phoneNumber>${xmlEsc(site.phone)}</phoneNumber>
      <Point><coordinates>${store.lng},${store.lat},0</coordinates></Point>
    </Placemark>`,
  )
  .join("\n")}
  </Document>
</kml>
`;
}

/** The full JSON-LD graph for the whole site, served as one file. */
function schemaJson(data) {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        organizationSchema(data.stores),
        websiteSchema(),
        salesEventSchema(),
        ...data.stores.map((store) => storeSchema(store)),
        {
          "@type": "FAQPage",
          "@id": `${site.url}/faq/#faq`,
          mainEntity: faq.map((entry) => ({
            "@type": "Question",
            name: entry.q,
            acceptedAnswer: { "@type": "Answer", text: entry.a },
          })),
        },
        {
          "@type": "ItemList",
          "@id": `${site.url}/inventory/#itemlist`,
          name: `${site.name} inventory`,
          numberOfItems: data.carts.length,
          itemListElement: data.carts.map((cart, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${site.url}/golfcart/${cart.slug}/`,
            name: cart.title,
          })),
        },
        {
          "@type": "OfferCatalog",
          "@id": `${site.url}/#catalog`,
          name: `${salesEvent.name} catalogue`,
          numberOfItems: data.carts.length,
          itemListElement: data.facets.makes.map((make) => ({
            "@type": "OfferCatalog",
            name: `${make.label} golf carts`,
            url: `${site.url}/brands/${brandSlug(make.key)}/`,
            numberOfItems: make.count,
          })),
        },
        ...guides.map((guide) => ({
          "@type": "BlogPosting",
          "@id": `${site.url}/guides/${guide.slug}/#article`,
          headline: guide.title,
          description: guide.description,
          url: `${site.url}/guides/${guide.slug}/`,
          datePublished: guide.date,
          dateModified: guide.updated,
          author: { "@id": `${site.url}/#organization` },
          publisher: { "@id": `${site.url}/#organization` },
        })),
        ...financingPartners.map((partner) => ({
          "@type": "Organization",
          name: partner.name,
          url: partner.url,
          description: partner.blurb,
        })),
      ],
    },
    null,
    2,
  );
}

/** Google-friendly XML wrapper around the inventory, for generic consumers. */
function dataXml(data) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<dataset xmlns:idgc="${site.url}/ns#">
  <meta>
    <name>${xmlEsc(site.name)} Inventory</name>
    <url>${site.url}</url>
    <generated>${isoStamp()}</generated>
    <refresh>daily 01:30 America/New_York</refresh>
    <license>${site.url}/terms/</license>
    <count>${data.carts.length}</count>
    <event>${xmlEsc(salesEvent.name)}</event>
    <phone>${xmlEsc(site.phone)}</phone>
  </meta>
  <vehicles>
${data.carts
  .map(
    (cart) => `    <vehicle id="${xmlEsc(cart.id)}">
      <url>${site.url}/golfcart/${xmlEsc(cart.slug)}/</url>
      <make>${xmlEsc(cart.make)}</make>
      <model>${xmlEsc(cart.model)}</model>
      <year>${xmlEsc(cart.year)}</year>
      <condition>${xmlEsc(cart.condition)}</condition>
      <powertrain>${xmlEsc(cart.fuel)}</powertrain>
      <price currency="USD">${cart.price ?? ""}</price>
      <color>${xmlEsc(cart.color)}</color>
      <passengers>${xmlEsc(cart.passengers)}</passengers>
      <driveTrain>${xmlEsc(cart.driveTrain)}</driveTrain>
      <streetLegal>${cart.isStreetLegal}</streetLegal>
      <lifted>${cart.isLifted}</lifted>
      <city>${xmlEsc(cart.city)}</city>
      <state>${xmlEsc(cart.state)}</state>
      <image>${xmlEsc(cartImages(cart)[0].startsWith("http") ? cartImages(cart)[0] : site.url + cartImages(cart)[0])}</image>
    </vehicle>`,
  )
  .join("\n")}
  </vehicles>
</dataset>
`;
}

export function buildDataFiles(data) {
  const files = {
    "manifest.json": manifestJson(data),
    "site.webmanifest": manifestJson(data),
    "browserconfig.xml": browserconfigXml(),
    "opensearch.xml": opensearchXml(),

    "locations.json": JSON.stringify(
      {
        generatedAt: isoStamp(),
        count: data.stores.length,
        phone: site.phone,
        salesEvent: salesEvent.name,
        locations: data.stores.map((store) => ({
          slug: store.slug,
          name: store.name,
          street: store.address1 || null,
          city: store.city,
          state: store.state,
          stateCode: store.stateCode,
          postalCode: store.postalCode || null,
          country: "USA",
          county: store.county || null,
          region: store.region || null,
          lat: store.lat,
          lng: store.lng,
          phone: site.phone,
          email: site.email,
          url: `${site.url}/locations/${store.slug}/`,
          cartsInStock: store.cartCount,
          serviceArea: store.serviceArea || [],
          hours: site.hoursDisplay,
        })),
      },
      null,
      2,
    ),
    "locations.geojson": locationsGeoJson(data),
    "locations.kml": locationsKml(data),

    "schema.json": schemaJson(data),
    "schema/all-locations.jsonld": JSON.stringify(
      { "@context": "https://schema.org", "@graph": data.stores.map((store) => storeSchema(store)) },
      null,
      2,
    ),

    "data.xml": dataXml(data),
    "api-feed.xml": dataXml(data),

    // Full inventory, for anyone consuming the site as an API.
    "inventory.json": JSON.stringify(
      {
        generatedAt: data.generatedAt,
        source: "dealer management system",
        refresh: "daily 01:30 America/New_York",
        salesEvent: { name: salesEvent.name, alternateName: salesEvent.altName },
        summary: data.summary,
        facets: data.facets,
        // dmsName is stripped: the store list is published verbatim and must not
        // carry the dealer group's internal naming.
        stores: data.stores.map(({ dmsName, ...store }) => store),
        carts: data.carts.map((cart) => ({
          ...cart,
          url: `${site.url}/golfcart/${cart.slug}/`,
          imageUrls: cartImages(cart),
        })),
      },
      null,
      1,
    ),

    // Compact index consumed by the client-side inventory filter.
    "inventory-index.json": JSON.stringify({
      generatedAt: data.generatedAt,
      count: data.carts.length,
      carts: data.carts.map((cart) => indexRecord(cart)),
    }),
  };

  // One JSON-LD file per location.
  for (const store of data.stores) {
    files[`schema/${store.slug}.jsonld`] = JSON.stringify(
      { "@context": "https://schema.org", ...storeSchema(store) },
      null,
      2,
    );
  }

  // Per-vehicle JSON-LD, so any consumer can fetch structured data for one cart.
  for (const cart of data.carts) {
    files[`schema/vehicles/${cart.slug}.jsonld`] = JSON.stringify(
      { "@context": "https://schema.org", ...cartSchema(cart) },
      null,
      2,
    );
  }

  return files;
}
