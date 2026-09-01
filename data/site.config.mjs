/**
 * Independence Day Golf Carts — central site configuration.
 * Every page, sitemap, feed and AI/SEO file reads its facts from this file,
 * so business details only ever need to be changed in one place.
 */

export const site = {
  name: "Independence Day Golf Carts",
  shortName: "Independence Day Carts",
  legalName: "Tigon Golf Carts LLC",
  domain: "independencedaygolfcarts.com",
  url: "https://independencedaygolfcarts.com",
  tagline: "The July 4th Golf Cart Sales Event",
  founded: "2016",
  description:
    "Independence Day Golf Carts hosts the nation's biggest July 4th Golf Cart Sales Event — Independence Day pricing on new and used electric and gas golf carts, street legal LSVs and lifted carts, with 0% APR financing and same-day delivery from 15 dealership locations.",
  shortDescription:
    "July 4th Golf Cart Sales Event — Independence Day savings on new & used golf carts with 0% APR financing.",
  phone: "1-844-844-6638",
  phoneE164: "+18448446638",
  phoneTel: "tel:1-844-844-6638",
  email: "sales@independencedaygolfcarts.com",
  securityEmail: "security@independencedaygolfcarts.com",
  privacyEmail: "privacy@independencedaygolfcarts.com",
  locale: "en_US",
  language: "en-US",
  country: "US",
  currency: "USD",
  priceRange: "$$-$$$",
  themeColor: "#b31942",
  backgroundColor: "#0a1633",
  twitter: "@IndyDayCarts",
  social: [
    "https://www.facebook.com/independencedaygolfcarts",
    "https://www.instagram.com/independencedaygolfcarts",
    "https://www.youtube.com/@independencedaygolfcarts",
    "https://x.com/IndyDayCarts",
  ],
  hours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:00" },
    { days: ["Saturday"], opens: "09:00", closes: "17:00" },
    { days: ["Sunday"], opens: "11:00", closes: "16:00" },
  ],
  hoursDisplay: [
    { label: "Monday – Friday", value: "9:00 AM – 6:00 PM" },
    { label: "Saturday", value: "9:00 AM – 5:00 PM" },
    { label: "Sunday", value: "11:00 AM – 4:00 PM" },
  ],
};

/** The sales event this whole site is built around. */
export const salesEvent = {
  name: "July 4th Golf Cart Sales Event",
  altName: "Independence Day Golf Cart Sales Event",
  headline: "The July 4th Golf Cart Sales Event",
  subhead:
    "Independence Day pricing on every new and used golf cart in stock. 0% APR for 48 months, free delivery, and the largest Fourth of July golf cart selection in the country.",
  startMonthDay: "06-20",
  endMonthDay: "07-08",
  offers: [
    "Independence Day pricing on every cart in stock",
    "0% APR financing for 48 months on approved credit",
    "Free local delivery during the July 4th event",
    "Trade-ins welcomed and appraised same day",
    "Lifted, street legal and lithium models included",
  ],
};

/** Financing partners (shown on /financing and in schema). */
export const financingPartners = [
  { name: "Sheffield BBT", url: "https://sheffieldbbt.com/apply", blurb: "Long-term fixed-rate recreational financing with fast decisions." },
  { name: "BLI Heartland", url: "https://app.bfrportal.com", blurb: "Flexible terms and seasonal payment options for powersports buyers." },
  { name: "DLL Financial", url: "https://www.dfrportal.com", blurb: "Established equipment lender with competitive promotional rates." },
  { name: "Roadrunner / Octane", url: "https://app.roadrunnerfinancial.com", blurb: "Soft-pull prequalification in minutes with no credit score impact." },
  { name: "Univest Capital", url: "https://www.univestcapitalinc.com/apply", blurb: "Commercial and fleet financing for resorts, clubs and communities." },
  { name: "Dealer Direct", url: "https://www.dealerdirect.com", blurb: "Multi-lender marketplace matching you to the best available offer." },
];

/** Primary + supporting keyword strategy. Drives meta keywords, seo.txt and internal linking. */
export const keywords = {
  primary: [
    "July 4th golf cart sales event",
    "Independence Day golf cart sales event",
    "July 4th golf cart sale",
    "Independence Day golf cart sale",
    "Fourth of July golf cart sales event",
  ],
  secondary: [
    "4th of July golf cart deals",
    "July 4th golf carts for sale",
    "Independence Day golf cart deals",
    "Fourth of July golf cart specials",
    "July 4th golf cart clearance",
    "Independence Day golf cart savings event",
    "summer golf cart sales event",
    "holiday golf cart sale",
  ],
  product: [
    "electric golf carts for sale",
    "gas golf carts for sale",
    "street legal golf carts",
    "lifted golf carts",
    "lithium golf carts",
    "new golf carts for sale",
    "used golf carts for sale",
    "4 passenger golf carts",
    "6 passenger golf carts",
    "low speed vehicles LSV",
  ],
  longTail: [
    "best July 4th golf cart sales event near me",
    "where to buy a golf cart on the 4th of July",
    "Independence Day golf cart financing 0 percent APR",
    "July 4th street legal golf cart sale with delivery",
    "how much do golf carts cost during the July 4th sales event",
    "lifted lithium golf cart July 4th deal",
    "trade in my golf cart during the Independence Day sale",
  ],
  voice: [
    "who has a July 4th golf cart sales event near me",
    "what is the best Independence Day golf cart deal",
    "are golf carts cheaper on the fourth of July",
    "find me a street legal golf cart for sale this weekend",
    "call the July 4th golf cart sales event",
  ],
  transactional: [
    "buy golf cart July 4th",
    "golf cart sales event financing",
    "golf cart dealership near me open today",
    "golf cart price quote Independence Day",
  ],
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/july-4th-golf-cart-sales-event/", label: "July 4th Event" },
  { href: "/inventory/", label: "Inventory" },
  { href: "/new/", label: "New" },
  { href: "/used/", label: "Used" },
  { href: "/brands/", label: "Brands" },
  { href: "/locations/", label: "Locations" },
  { href: "/financing/", label: "Financing" },
  { href: "/contact/", label: "Contact" },
];

/** Public S3 bucket that serves DMS cart photography. */
export const S3_CARTS_URL = "https://s3.amazonaws.com/prod.docs.s3/carts/";
export const PLACEHOLDER_IMAGE = "/images/cart-photo-coming-soon.svg";
export const DMS_BASE_URL = "https://api.tigondms.com/wp-website";

export default site;
