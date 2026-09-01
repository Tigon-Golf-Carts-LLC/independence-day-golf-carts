/**
 * Sitemaps and syndication feeds.
 *
 * /sitemap.xml is a sitemap index that points at every specialised sitemap, so
 * a single submission in Search Console or Bing Webmaster Tools discovers the
 * whole site. All URLs are absolute, UTF-8, and XML-escaped.
 */

import { site, salesEvent } from "../../data/site.config.mjs";
import { xmlEsc, isoDate, isoStamp, rfc822, cartImages, formatPriceShort } from "../lib/util.mjs";
import { guides } from "../../data/guides.mjs";
import { faq } from "../../data/faq.mjs";
import { brandSlug } from "../pages/brands.mjs";
import { guideBodyHtml } from "../pages/content.mjs";

const TODAY = isoDate();
const abs = (path) => site.url + path;

const NS = {
  urlset: `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"`,
};

/** One <url> entry. */
function urlEntry({ loc, lastmod = TODAY, changefreq = "weekly", priority = "0.5", images = [], hreflang = false, mobile = false }) {
  const imageXml = images
    .map(
      (image) => `    <image:image>
      <image:loc>${xmlEsc(image.loc)}</image:loc>
      <image:title>${xmlEsc(image.title)}</image:title>
      <image:caption>${xmlEsc(image.caption)}</image:caption>${image.geo ? `\n      <image:geo_location>${xmlEsc(image.geo)}</image:geo_location>` : ""}
      <image:license>${site.url}/terms/</image:license>
    </image:image>`,
    )
    .join("\n");

  return `  <url>
    <loc>${xmlEsc(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${mobile ? "\n    <mobile:mobile/>" : ""}${
      hreflang
        ? `\n    <xhtml:link rel="alternate" hreflang="en-US" href="${xmlEsc(loc)}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEsc(loc)}"/>`
        : ""
    }${imageXml ? `\n${imageXml}` : ""}
  </url>`;
}

function urlset(entries, options = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset ${NS.urlset}>
${entries.map((entry) => urlEntry({ ...entry, ...options })).join("\n")}
</urlset>
`;
}

/* ------------------------------------------------------------ entry sets --- */

function staticEntries(data) {
  return [
    { loc: abs("/"), priority: "1.0", changefreq: "daily" },
    { loc: abs("/july-4th-golf-cart-sales-event/"), priority: "1.0", changefreq: "daily" },
    { loc: abs("/independence-day-golf-cart-sales-event/"), priority: "0.9", changefreq: "daily" },
    { loc: abs("/inventory/"), priority: "0.9", changefreq: "daily" },
    { loc: abs("/new/"), priority: "0.9", changefreq: "daily" },
    { loc: abs("/used/"), priority: "0.9", changefreq: "daily" },
    { loc: abs("/electric-golf-carts/"), priority: "0.9", changefreq: "daily" },
    { loc: abs("/gas-golf-carts/"), priority: "0.9", changefreq: "daily" },
    { loc: abs("/street-legal-golf-carts/"), priority: "0.9", changefreq: "daily" },
    { loc: abs("/lifted-golf-carts/"), priority: "0.9", changefreq: "daily" },
    { loc: abs("/brands/"), priority: "0.8", changefreq: "weekly" },
    { loc: abs("/locations/"), priority: "0.8", changefreq: "monthly" },
    { loc: abs("/financing/"), priority: "0.8", changefreq: "monthly" },
    { loc: abs("/trade-in/"), priority: "0.7", changefreq: "monthly" },
    { loc: abs("/delivery/"), priority: "0.7", changefreq: "monthly" },
    { loc: abs("/service/"), priority: "0.7", changefreq: "monthly" },
    { loc: abs("/contact/"), priority: "0.8", changefreq: "monthly" },
    { loc: abs("/faq/"), priority: "0.7", changefreq: "weekly" },
    { loc: abs("/guides/"), priority: "0.6", changefreq: "weekly" },
    { loc: abs("/about/"), priority: "0.5", changefreq: "yearly" },
    { loc: abs("/sitemap/"), priority: "0.4", changefreq: "weekly" },
    { loc: abs("/privacy/"), priority: "0.3", changefreq: "yearly" },
    { loc: abs("/terms/"), priority: "0.3", changefreq: "yearly" },
    { loc: abs("/accessibility/"), priority: "0.3", changefreq: "yearly" },
  ];
}

function cartEntries(data, { withImages = false } = {}) {
  return data.carts.map((cart) => ({
    loc: abs(`/golfcart/${cart.slug}/`),
    priority: "0.9",
    changefreq: "weekly",
    images: withImages
      ? cartImages(cart)
          .filter((url) => url.startsWith("http"))
          .slice(0, 20)
          .map((url, index) => ({
            loc: url,
            title: `${cart.year ? `${cart.year} ` : ""}${cart.title} golf cart`,
            caption: `${cart.condition} ${cart.title} ${cart.isElectric ? "electric" : "gas"} golf cart for sale${cart.city ? ` in ${cart.city}, ${cart.stateCode}` : ""} — ${salesEvent.name}${cart.price ? `, ${formatPriceShort(cart.price)}` : ""} (photo ${index + 1})`,
            geo: cart.city ? `${cart.city}, ${cart.state}, USA` : "United States",
          }))
      : [],
  }));
}

function brandEntries(data) {
  return data.facets.makes.map((make) => ({
    loc: abs(`/brands/${brandSlug(make.key)}/`),
    priority: "0.8",
    changefreq: "daily",
  }));
}

function locationEntries(data) {
  return data.stores.flatMap((store) => [
    { loc: abs(`/locations/${store.slug}/`), priority: "0.8", changefreq: "monthly" },
    ...(store.cartCount ? [{ loc: abs(`/locations/${store.slug}/inventory/`), priority: "0.7", changefreq: "daily" }] : []),
  ]);
}

function guideEntries() {
  return guides.map((guide) => ({
    loc: abs(`/guides/${guide.slug}/`),
    lastmod: guide.updated,
    priority: "0.6",
    changefreq: "weekly",
  }));
}

/* ---------------------------------------------------------------- feeds --- */

function rssFeed() {
  const items = guides
    .map(
      (guide) => `    <item>
      <title>${xmlEsc(guide.title)}</title>
      <link>${abs(`/guides/${guide.slug}/`)}</link>
      <guid isPermaLink="true">${abs(`/guides/${guide.slug}/`)}</guid>
      <description>${xmlEsc(guide.description)}</description>
      <category>${xmlEsc(guide.category)}</category>
      <pubDate>${rfc822(guide.date)}</pubDate>
      <dc:creator>${xmlEsc(site.name)}</dc:creator>
      <content:encoded><![CDATA[${guideBodyHtml(guide.body)}]]></content:encoded>
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xmlEsc(site.name)} — ${xmlEsc(salesEvent.name)}</title>
    <link>${site.url}</link>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${xmlEsc(site.description)}</description>
    <language>en-us</language>
    <copyright>© ${new Date().getUTCFullYear()} ${xmlEsc(site.legalName)}</copyright>
    <managingEditor>${xmlEsc(site.email)} (${xmlEsc(site.name)})</managingEditor>
    <webMaster>${xmlEsc(site.email)} (${xmlEsc(site.name)})</webMaster>
    <lastBuildDate>${rfc822()}</lastBuildDate>
    <pubDate>${rfc822()}</pubDate>
    <ttl>1440</ttl>
    <category>Golf Carts</category>
    <category>Automotive</category>
    <image>
      <url>${site.url}/images/og-image.png</url>
      <title>${xmlEsc(site.name)}</title>
      <link>${site.url}</link>
    </image>
${items}
  </channel>
</rss>
`;
}

function atomFeed() {
  const entries = guides
    .map(
      (guide) => `  <entry>
    <title>${xmlEsc(guide.title)}</title>
    <link href="${abs(`/guides/${guide.slug}/`)}"/>
    <id>${abs(`/guides/${guide.slug}/`)}</id>
    <updated>${guide.updated}T09:00:00Z</updated>
    <published>${guide.date}T09:00:00Z</published>
    <summary>${xmlEsc(guide.description)}</summary>
    <category term="${xmlEsc(guide.category)}"/>
    <author><name>${xmlEsc(site.name)}</name></author>
    <content type="html"><![CDATA[${guideBodyHtml(guide.body)}]]></content>
  </entry>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xmlEsc(site.name)} — ${xmlEsc(salesEvent.name)}</title>
  <subtitle>${xmlEsc(site.shortDescription)}</subtitle>
  <link href="${site.url}/atom.xml" rel="self"/>
  <link href="${site.url}/"/>
  <id>${site.url}/</id>
  <updated>${isoStamp()}</updated>
  <rights>© ${new Date().getUTCFullYear()} ${xmlEsc(site.legalName)}</rights>
  <author><name>${xmlEsc(site.name)}</name><email>${xmlEsc(site.email)}</email></author>
${entries}
</feed>
`;
}

/** Google Merchant Center / Shopping product feed. */
function productFeed(data, { shopping = false, local = false } = {}) {
  const items = data.carts
    .map((cart) => {
      const image = cartImages(cart)[0];
      const imageUrl = image.startsWith("http") ? image : site.url + image;
      const link = abs(`/golfcart/${cart.slug}/`);
      const extra = local
        ? `      <g:store_code>${xmlEsc(cart.storeId || cart.locationSlug || "")}</g:store_code>
      <g:quantity>1</g:quantity>
      <g:pickup_method>buy</g:pickup_method>
      <g:pickup_sla>same_day</g:pickup_sla>`
        : `      <g:shipping>
        <g:country>US</g:country>
        <g:service>Local delivery</g:service>
        <g:price>0.00 USD</g:price>
      </g:shipping>
      <g:google_product_category>888</g:google_product_category>
      <g:product_type>Golf Carts &gt; ${xmlEsc(cart.condition)} &gt; ${xmlEsc(cart.fuel)}</g:product_type>`;

      return `    <item>
      <g:id>${xmlEsc(cart.id)}</g:id>
      <g:title>${xmlEsc(`${cart.year ? `${cart.year} ` : ""}${cart.title} Golf Cart`.slice(0, 150))}</g:title>
      <g:description>${xmlEsc(`${cart.condition} ${cart.fuel.toLowerCase()} golf cart${cart.passengers ? `, ${cart.passengers} passenger` : ""}${cart.isStreetLegal ? ", street legal LSV" : ""}${cart.isLifted ? ", lifted" : ""}${cart.city ? `, in stock in ${cart.city}, ${cart.stateCode}` : ""}. ${salesEvent.name} pricing with 0% APR financing for 48 months.`.slice(0, 4900))}</g:description>
      <g:link>${xmlEsc(link)}</g:link>
      <g:image_link>${xmlEsc(imageUrl)}</g:image_link>
${cartImages(cart)
  .slice(1, 11)
  .filter((url) => url.startsWith("http"))
  .map((url) => `      <g:additional_image_link>${xmlEsc(url)}</g:additional_image_link>`)
  .join("\n")}
      <g:availability>in stock</g:availability>
      <g:condition>${cart.isUsed ? "used" : "new"}</g:condition>
      <g:price>${cart.price ? `${cart.price.toFixed(2)} USD` : "0.00 USD"}</g:price>
      <g:brand>${xmlEsc(cart.make || site.name)}</g:brand>
      <g:mpn>${xmlEsc(cart.serial || cart.id)}</g:mpn>
      <g:identifier_exists>${cart.vin ? "yes" : "no"}</g:identifier_exists>
      <g:color>${xmlEsc(cart.color)}</g:color>
      <g:item_group_id>${xmlEsc(cart.makeKey)}</g:item_group_id>
${extra}
    </item>`;
    })
    .join("\n");

  const title = shopping ? `${site.name} — Google Shopping Feed` : local ? `${site.name} — Local Inventory Feed` : `${site.name} — Product Feed`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEsc(title)}</title>
    <link>${site.url}</link>
    <description>${xmlEsc(`${data.carts.length} golf carts in the ${salesEvent.name}. Updated daily at 1:30 AM Eastern.`)}</description>
    <lastBuildDate>${rfc822()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

/** A stylesheet so a human opening sitemap.xml sees a readable table. */
const SITEMAP_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en"><head><title>${site.name} — XML Sitemap</title>
      <style>
        body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#f6f8fc;color:#0f172a}
        header{background:#0a3161;color:#fff;padding:24px}
        h1{margin:0;font-size:1.5rem}
        .wrap{max-width:1100px;margin:0 auto;padding:24px}
        table{width:100%;border-collapse:collapse;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.1)}
        th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #e2e8f2;font-size:.9rem}
        th{background:#eef2f9}
        a{color:#b31942}
      </style>
    </head><body>
      <header><div class="wrap"><h1>${site.name} — XML Sitemap</h1></div></header>
      <div class="wrap">
        <p><xsl:value-of select="count(s:urlset/s:url)"/> URLs · <xsl:value-of select="count(s:sitemapindex/s:sitemap)"/> child sitemaps</p>
        <table>
          <tr><th>URL</th><th>Last modified</th><th>Change frequency</th><th>Priority</th></tr>
          <xsl:for-each select="s:sitemapindex/s:sitemap">
            <tr><td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                <td><xsl:value-of select="s:lastmod"/></td><td>—</td><td>—</td></tr>
          </xsl:for-each>
          <xsl:for-each select="s:urlset/s:url">
            <tr><td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                <td><xsl:value-of select="s:lastmod"/></td>
                <td><xsl:value-of select="s:changefreq"/></td>
                <td><xsl:value-of select="s:priority"/></td></tr>
          </xsl:for-each>
        </table>
      </div>
    </body></html>
  </xsl:template>
</xsl:stylesheet>
`;

/* ------------------------------------------------------------ generator --- */

/** Returns { "sitemap.xml": "<xml…>", … } for every sitemap and feed file. */
export function buildSitemaps(data) {
  const statics = staticEntries(data);
  const carts = cartEntries(data);
  const cartsWithImages = cartEntries(data, { withImages: true });
  const brands = brandEntries(data);
  const locations = locationEntries(data);
  const guidesList = guideEntries();
  const everything = [...statics, ...brands, ...locations, ...carts, ...guidesList];

  const imageEntries = cartsWithImages.filter((entry) => entry.images.length > 0);

  const files = {
    // Page groups
    "sitemap-pages.xml": urlset(statics, { hreflang: true }),
    "page-sitemap.xml": urlset(statics),
    "sitemap-inventory.xml": urlset(carts),
    "sitemap-brands.xml": urlset(brands),
    "sitemap-locations.xml": urlset(locations),
    "sitemap-blog.xml": urlset(guidesList),
    "post-sitemap.xml": urlset(guidesList),
    "category-sitemap.xml": urlset([...brands, ...statics.filter((entry) => /\/(new|used|electric-golf-carts|gas-golf-carts|street-legal-golf-carts|lifted-golf-carts)\/$/.test(entry.loc))]),
    "tag-sitemap.xml": urlset(
      [...new Set(guides.flatMap((guide) => guide.tags))].map(() => null).filter(Boolean).length
        ? []
        : guidesList,
    ),
    "author-sitemap.xml": urlset([{ loc: abs("/about/"), priority: "0.5", changefreq: "yearly" }]),

    // Specialised views of the same URLs
    "sitemap-images.xml": urlset(imageEntries),
    "image-sitemap.xml": urlset(imageEntries),
    "mobile-sitemap.xml": urlset(everything, { mobile: true }),
    "hreflang-sitemap.xml": urlset(everything, { hreflang: true }),
    "xhtml-sitemap.xml": urlset(everything, { hreflang: true }),
    "dynamic-sitemap.xml": urlset([...carts, ...brands, ...locations]),
    "geo-sitemap.xml": urlset(locations, { hreflang: true }),
    "events-sitemap.xml": urlset([
      { loc: abs("/july-4th-golf-cart-sales-event/"), priority: "1.0", changefreq: "daily" },
      { loc: abs("/independence-day-golf-cart-sales-event/"), priority: "0.9", changefreq: "daily" },
    ]),
    "news-sitemap.xml": `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${guides
  .map(
    (guide) => `  <url>
    <loc>${abs(`/guides/${guide.slug}/`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEsc(site.name)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${guide.date}T09:00:00Z</news:publication_date>
      <news:title>${xmlEsc(guide.title)}</news:title>
      <news:keywords>${xmlEsc(guide.tags.join(", "))}</news:keywords>
    </news:news>
  </url>`,
  )
  .join("\n")}
</urlset>
`,

    // Plain URL list
    "urllist.xml": urlset(everything),
    "urllist.txt": everything.map((entry) => entry.loc).join("\n") + "\n",

    // Feeds
    "rss.xml": rssFeed(),
    "feed.xml": rssFeed(),
    "atom.xml": atomFeed(),
    "podcast.xml": `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${xmlEsc(site.name)} — Golf Cart Buying Guides</title>
    <link>${site.url}/guides/</link>
    <description>${xmlEsc(`Audio-ready buying guides from the ${salesEvent.name}. Episodes are published as written guides at ${site.url}/guides/.`)}</description>
    <language>en-us</language>
    <itunes:author>${xmlEsc(site.name)}</itunes:author>
    <itunes:summary>${xmlEsc(site.shortDescription)}</itunes:summary>
    <itunes:owner><itunes:name>${xmlEsc(site.name)}</itunes:name><itunes:email>${xmlEsc(site.email)}</itunes:email></itunes:owner>
    <itunes:image href="${site.url}/images/og-image.png"/>
    <itunes:category text="Business"><itunes:category text="Shopping"/></itunes:category>
    <itunes:explicit>false</itunes:explicit>
${guides
  .map(
    (guide) => `    <item>
      <title>${xmlEsc(guide.title)}</title>
      <link>${abs(`/guides/${guide.slug}/`)}</link>
      <guid isPermaLink="true">${abs(`/guides/${guide.slug}/`)}</guid>
      <description>${xmlEsc(guide.description)}</description>
      <pubDate>${rfc822(guide.date)}</pubDate>
      <itunes:duration>${guide.readingMinutes}:00</itunes:duration>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`,

    // Product feeds
    "product_feed.xml": productFeed(data),
    "google-shopping-feed.xml": productFeed(data, { shopping: true }),
    "local-inventory-feed.xml": productFeed(data, { local: true }),

    "sitemap.xsl": SITEMAP_XSL,
  };

  // The sitemap index, listing every XML sitemap generated above.
  const children = Object.keys(files)
    .filter((name) => name.endsWith(".xml") && !name.includes("feed") && name !== "podcast.xml" && name !== "rss.xml" && name !== "atom.xml")
    .sort();

  files["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children
  .map((name) => `  <sitemap>\n    <loc>${abs(`/${name}`)}</loc>\n    <lastmod>${isoStamp()}</lastmod>\n  </sitemap>`)
  .join("\n")}
</sitemapindex>
`;

  files["sitemap_index.xml"] = files["sitemap.xml"];

  return { files, urls: everything, sitemapNames: [...children, "sitemap.xml"] };
}
