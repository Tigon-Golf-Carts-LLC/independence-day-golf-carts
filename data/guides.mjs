/**
 * Long-form editorial content. Each guide becomes a static article page, an
 * entry in the blog/news sitemaps, an RSS/Atom item, and Article JSON-LD.
 * Body is authored as an array of blocks so it can be rendered to HTML for the
 * site and to plain text for the AI training files.
 */

export const guides = [
  {
    slug: "july-4th-golf-cart-sales-event-guide",
    title: "The Complete Guide to the July 4th Golf Cart Sales Event",
    description:
      "Everything to know before you buy during the Independence Day Golf Cart Sales Event: what is discounted, how event financing works, and how to lock in July 4th pricing.",
    date: "2026-06-18",
    updated: "2026-06-18",
    category: "Sales Event",
    tags: ["july 4th golf cart sales event", "independence day golf cart sale", "buying guide"],
    readingMinutes: 7,
    body: [
      { h2: "Why the Fourth of July is the best week of the year to buy a golf cart" },
      { p: "Independence Day sits at the exact midpoint of the golf cart selling season. Spring inventory has landed, the next model year is still months away, and dealers need floor space. That combination is why the July 4th Golf Cart Sales Event consistently produces the deepest in-stock pricing of the summer — deeper, in most years, than Memorial Day, and without the September wait." },
      { p: "The event runs from June 20 through July 8. Event pricing applies to every cart in stock at all 15 Independence Day Golf Carts locations: new, used, electric, gas, lifted, and street legal LSV models alike." },
      { h2: "What is actually discounted during the Independence Day event" },
      { list: [
        "Current model-year new carts, which carry the largest reductions because they are being cleared ahead of the changeover.",
        "Reconditioned trade-ins, which are priced to move quickly during the holiday week.",
        "Lithium battery upgrades and lift kits when bundled with a cart purchase.",
        "Accessory packages — enclosures, sound systems, rear seat kits and light kits — added at the time of sale.",
      ] },
      { h2: "How 0% APR financing works during the sale" },
      { p: "0% APR for 48 months is available on approved credit through six lending partners. On a $12,000 cart that works out to $250 per month with no interest charged over the term. Most partners run a soft-pull prequalification that does not affect your credit score, and approvals typically come back the same day." },
      { p: "Bring a driver's license and proof of income. If you are financing as a business — a resort, HOA, campground or club — Univest Capital and DLL Financial handle commercial paper and fleet purchases." },
      { h2: "How to lock in July 4th pricing" },
      { list: [
        "Browse live inventory on this site — it refreshes every morning at 1:30 AM Eastern directly from the dealership system.",
        "Call 1-844-844-6638 with the stock you want. A deposit holds event pricing even if delivery is scheduled after July 8.",
        "Ask for the trade appraisal at the same time; trade value stacks on top of event pricing.",
        "Confirm delivery. Local delivery is free during the event and most locations can deliver within a few days.",
      ] },
      { h2: "New or used during the event?" },
      { p: "New carts carry a full factory warranty and the current battery chemistry, which matters most on electric models — a new lithium pack should give 8 to 10 years of service. Used carts from the event floor have been reconditioned and inspected, and the battery year is published on every vehicle page on this site so you can judge remaining pack life before you call." },
      { p: "If the cart will see daily neighborhood or beach use, a new lithium model bought at event pricing is usually the better long-run value. If it will be a second cart or see seasonal use only, a reconditioned trade-in during the Independence Day sale is hard to beat on price." },
    ],
  },
  {
    slug: "electric-vs-gas-golf-carts",
    title: "Electric vs Gas Golf Carts: How to Choose in 2026",
    description:
      "A practical comparison of electric and gas golf carts — range, running cost, maintenance, noise and resale — to help you pick the right cart during the July 4th sales event.",
    date: "2026-06-10",
    updated: "2026-06-10",
    category: "Buying Guide",
    tags: ["electric golf carts", "gas golf carts", "buying guide", "lithium"],
    readingMinutes: 6,
    body: [
      { h2: "The short answer" },
      { p: "For neighborhood, resort, beach and golf community use, an electric cart — ideally lithium — is the right choice for most buyers. For very large acreage, hunting, hilly terrain or all-day continuous running with no chance to charge, gas still wins." },
      { h2: "Running cost" },
      { p: "A full charge on a 48V electric cart costs roughly $0.50 to $1.50 depending on local electricity rates, and delivers 25 to 40 miles on lead-acid or 45 to 60 miles on lithium. A gas cart burns about a gallon every 30 to 40 miles. Over a typical season, electric running costs are a small fraction of gas." },
      { h2: "Maintenance" },
      { list: [
        "Electric with lithium: effectively no scheduled battery maintenance, no watering, no engine service. Brakes, tires and the charger are the wear items.",
        "Electric with lead-acid: monthly water checks and terminal cleaning; pack replacement every 4 to 6 years.",
        "Gas: oil changes, air and fuel filters, spark plugs, belts and carburetor service, plus fuel stabilizer for winter storage.",
      ] },
      { h2: "Noise, emissions and where you can drive" },
      { p: "Many golf communities, campgrounds, gated neighborhoods and beach towns restrict or ban gas carts outright on noise and emissions grounds. Confirm local rules before buying gas. Electric carts are near silent and are accepted everywhere carts are permitted." },
      { h2: "Lithium versus lead-acid" },
      { p: "Lithium (LiFePO4) packs run 3,000 to 5,000 cycles against 500 to 1,000 for lead-acid, weigh roughly half as much, charge in 3 to 5 hours instead of 8 to 10, and hold voltage to the end of discharge so the cart does not slow as the pack drains. The purchase premium is usually recovered within one pack replacement cycle." },
      { h2: "Resale" },
      { p: "Lithium electric carts hold value best, followed by gas carts in low-hour condition, then lead-acid electric — where the buyer is always pricing in an imminent pack replacement. If resale matters, buy lithium." },
    ],
  },
  {
    slug: "street-legal-golf-carts-lsv-guide",
    title: "Street Legal Golf Carts and LSVs: Requirements by State",
    description:
      "What separates a street legal LSV from a standard golf cart, the federal equipment list, and how titling and registration differ across the states we serve.",
    date: "2026-06-05",
    updated: "2026-06-05",
    category: "Legal",
    tags: ["street legal golf carts", "LSV", "registration", "regulations"],
    readingMinutes: 6,
    body: [
      { h2: "Golf cart, LSV, or NEV?" },
      { p: "A standard golf cart tops out under 20 mph and is not federally regulated as a motor vehicle. A Low Speed Vehicle (LSV), sometimes called a Neighborhood Electric Vehicle, reaches 20 to 25 mph and is regulated under Federal Motor Vehicle Safety Standard 500. LSVs get a VIN, and in most states they are titled, registered and insured like a car." },
      { h2: "Federal equipment required on an LSV" },
      { list: [
        "Headlights, tail lights and stop lights",
        "Front and rear turn signal lamps",
        "Red reflex reflectors — one on each side and one at the rear",
        "An exterior mirror on the driver side plus either an interior mirror or a passenger-side exterior mirror",
        "A parking brake",
        "A windshield meeting the federal glazing standard",
        "A Vehicle Identification Number",
        "A Type 1 or Type 2 seat belt at each designated seating position",
      ] },
      { h2: "How the states we serve differ" },
      { p: "Requirements vary and change; always confirm with your state DMV or local municipality before purchase. In broad terms: Delaware, Florida, North Carolina and South Carolina all register LSVs for road use on streets posted at or below 35 mph, with local exceptions along the beaches. Pennsylvania and New Jersey are more restrictive — carts are generally limited to private property, permitted communities and specific municipal ordinances. Virginia, Indiana and Vermont permit local ordinance-based operation that differs town by town." },
      { p: "Independence Day Golf Carts sells LSV-equipped carts and can bring an existing cart up to LSV specification. Every vehicle page on this site shows whether that specific cart is street legal, and the inventory search has a street legal filter." },
      { h2: "Insurance" },
      { p: "Where an LSV is registered for road use, liability insurance is normally required, and most auto carriers will add an LSV to an existing policy inexpensively. Even where insurance is not required, coverage is worth carrying — carts are frequently stolen and are rarely covered by homeowners policies once they leave the property." },
    ],
  },
  {
    slug: "golf-cart-battery-guide",
    title: "Golf Cart Batteries: Lithium, AGM and Lead-Acid Compared",
    description:
      "How to read a battery pack spec, what lifespan to expect from each chemistry, and how to judge the battery on a used golf cart before you buy.",
    date: "2026-05-28",
    updated: "2026-05-28",
    category: "Maintenance",
    tags: ["golf cart batteries", "lithium", "maintenance", "used golf carts"],
    readingMinutes: 5,
    body: [
      { h2: "Reading the spec on a vehicle page" },
      { p: "Every electric cart on this site publishes its pack voltage, cell voltage, amp hours, chemistry, brand, battery year and remaining battery warranty. Pack voltage — 36V, 48V, 72V — sets the cart's power. Amp hours set the range. Battery year tells you how much life is left." },
      { h2: "Expected life by chemistry" },
      { list: [
        "Lithium iron phosphate (LiFePO4): 8 to 10 years, 3,000 to 5,000 cycles, no maintenance, 3 to 5 hour charge.",
        "AGM sealed lead-acid: 4 to 6 years, 600 to 1,200 cycles, no watering, 6 to 8 hour charge.",
        "Flooded lead-acid: 4 to 6 years, 500 to 1,000 cycles, monthly watering required, 8 to 10 hour charge.",
      ] },
      { h2: "Judging the battery on a used cart" },
      { p: "Ask for the battery year first — a lead-acid pack older than four years should be treated as a near-term replacement cost of $900 to $1,800. On a test drive, watch for the cart slowing noticeably on a hill or after 20 minutes of running; that is voltage sag and it points to a tired pack. On flooded packs, check for corrosion at the terminals and confirm the water level is above the plates." },
      { h2: "Charging habits that extend pack life" },
      { list: [
        "Charge after every use rather than waiting for the pack to run low, on any chemistry.",
        "Never store a lead-acid pack discharged over winter — it will sulfate and lose capacity permanently.",
        "Leave a lithium pack at roughly half charge for long storage, and keep the disconnect off.",
        "Use the charger matched to the pack. A lead-acid charger on a lithium pack will not charge it correctly.",
      ] },
    ],
  },
  {
    slug: "golf-cart-buying-checklist",
    title: "Golf Cart Buying Checklist: 12 Questions to Ask Before You Sign",
    description:
      "A dealer-side checklist covering warranty, battery age, street legality, delivery, trade-in and financing so nothing gets missed during a sales event purchase.",
    date: "2026-05-20",
    updated: "2026-05-20",
    category: "Buying Guide",
    tags: ["buying guide", "checklist", "golf cart warranty"],
    readingMinutes: 4,
    body: [
      { h2: "Before you shop" },
      { list: [
        "How many passengers do you need to seat regularly — 2, 4, 6 or 8?",
        "Will the cart be driven on public roads? If yes, you need an LSV, not a standard cart.",
        "What terrain — flat pavement, sand, grass, or hills? Hills and sand favor lifted carts and higher pack voltage.",
        "Where will it charge? Electric carts need a standard outlet within reach of where the cart parks.",
      ] },
      { h2: "On the lot" },
      { list: [
        "What is the battery year and chemistry, and how much battery warranty remains?",
        "What warranty covers the cart itself, and what is specifically excluded?",
        "Is this cart street legal as it sits, and does it have a VIN and title?",
        "What is the total out-the-door price including freight, prep, tax and any accessories?",
      ] },
      { h2: "Closing" },
      { list: [
        "What is my trade worth, and does trade value stack on top of event pricing? (At Independence Day Golf Carts it does.)",
        "What is the monthly payment at 0% APR for 48 months, and what does prequalification require?",
        "When can it be delivered, and is delivery included?",
        "Who services the cart afterward, and where is the nearest service location?",
      ] },
      { p: "Call 1-844-844-6638 with this list in hand and any Independence Day Golf Carts location will walk it with you line by line." },
    ],
  },
];

export default guides;
