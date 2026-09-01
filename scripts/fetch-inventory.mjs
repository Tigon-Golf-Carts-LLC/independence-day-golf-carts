#!/usr/bin/env node
/**
 * Nightly inventory sync (runs at 1:30 AM America/New_York via GitHub Actions).
 *
 * Pulls every cart and store from the dealer management system, normalises it,
 * assigns stable SEO slugs, and writes data/inventory.json. That snapshot is
 * committed so the site can always be rebuilt — on Cloudflare Pages, on GitHub
 * Pages, or locally — without depending on the DMS being reachable.
 *
 *   node scripts/fetch-inventory.mjs            # live DMS pull
 *   node scripts/fetch-inventory.mjs --fixture  # offline sample data (dev only)
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { getAllCarts, getStores } from "./lib/dms.mjs";
import { toSlugPart, toMakeKey, buildCartTitle, isoStamp } from "./lib/util.mjs";
import { locations as locationSeed, toStateCode } from "../data/locations.mjs";
import { storeDisplayName } from "../data/site.config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(root, "data/inventory.json");
const FIXTURE = resolve(root, "scripts/fixtures/inventory.sample.json");
const useFixture = process.argv.includes("--fixture");

/** Merge live DMS store records onto the geo seed, matching on city + state. */
function mergeStores(dmsStores) {
  const byCity = new Map();
  for (const store of dmsStores ?? []) {
    const key = `${toSlugPart(store?.address?.city)}|${toSlugPart(store?.address?.state)}`;
    if (!byCity.has(key)) byCity.set(key, store);
  }

  const merged = locationSeed.map((seed) => {
    const key = `${toSlugPart(seed.city)}|${toSlugPart(seed.state)}`;
    const store = byCity.get(key);
    byCity.delete(key);
    return {
      ...seed,
      storeId: store?.storeId ?? null,
      storeMongoId: store?._id ?? null,
      name: storeDisplayName(seed.city, seed.state),
      dmsName: store?.name ?? null,
      address1: store?.address?.address1 ?? "",
      address2: store?.address?.address2 ?? "",
      postalCode: store?.address?.postalCode ?? "",
      country: store?.address?.country || "USA",
      inDms: Boolean(store),
    };
  });

  // Any DMS store with no seed entry still gets a page rather than being dropped.
  for (const store of byCity.values()) {
    const city = store?.address?.city || "";
    const state = store?.address?.state || "";
    if (!city) continue;
    merged.push({
      slug: toSlugPart(`${city}-${state}`) || toSlugPart(store.storeId),
      city,
      state,
      stateCode: toStateCode(state),
      lat: null,
      lng: null,
      county: "",
      region: state,
      serviceArea: [],
      keywords: [`${city} golf carts`, `${city} ${state} golf cart dealer`],
      storeId: store?.storeId ?? null,
      storeMongoId: store?._id ?? null,
      name: storeDisplayName(city, state),
      dmsName: store?.name ?? null,
      address1: store?.address?.address1 ?? "",
      address2: store?.address?.address2 ?? "",
      postalCode: store?.address?.postalCode ?? "",
      country: store?.address?.country || "USA",
      inDms: true,
    });
  }

  return merged;
}

/**
 * Statuses the DMS uses for units that are not sellable retail stock.
 *
 * boneyard / permanent_boneyard are parts and scrap carts; work_in_progress
 * units are still being built or reconditioned. Their `retailPrice` is an
 * internal figure, not an asking price, so publishing them puts wrong prices
 * on the site.
 */
const NON_RETAIL_STATUS = new Set(["boneyard", "permanent_boneyard", "work_in_progress"]);

/**
 * Whether a raw DMS record is a cart a customer can actually buy.
 *
 * Deliberately conservative: it excludes only what the DMS marks as clearly
 * not-for-sale. Fields that are false on plainly retail units — isComplete,
 * rfsStatus.isRFS, advertising.onWebsite — are captured but not filtered on,
 * because they would exclude sellable stock.
 */
function isSellable(raw) {
  const status = String(raw?.status ?? "").toLowerCase();
  if (NON_RETAIL_STATUS.has(status)) return false;
  if (raw?.isInBoneyard === true) return false;
  if (raw?.isService === true) return false;
  if (raw?.isInStock === false) return false;
  return true;
}

/**
 * Every scalar field on a raw DMS record whose name looks like money, kept on
 * the normalised cart as `rawPricing`.
 *
 * The site publishes one price, but the DMS may carry several (retail, sale,
 * MSRP, cost). Capturing them makes it possible to see what is actually
 * available without another API round trip, and to change which one is
 * published without re-deriving the whole snapshot.
 */
const MONEY_FIELD = /price|cost|msrp|amount|retail|sale|discount|fee|payment|deposit|rebate|invoice/i;

function collectPricing(raw) {
  const pricing = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (!MONEY_FIELD.test(key)) continue;
    if (value === null || value === undefined || typeof value === "object") continue;
    pricing[key] = value;
  }
  // Nested pricing objects are common; keep them whole.
  for (const key of ["pricing", "price", "prices", "cost", "financials"]) {
    if (raw?.[key] && typeof raw[key] === "object" && !Array.isArray(raw[key])) {
      pricing[key] = raw[key];
    }
  }
  return pricing;
}

/**
 * The price the site publishes for a cart.
 *
 * `retailPrice` is the documented field and is used wherever it is a positive
 * number. The fallbacks below cover records where it is missing or zero, in
 * the order a dealership would advertise them.
 */
export function resolvePrice(raw) {
  const candidates = [
    raw?.retailPrice,
    raw?.salePrice,
    raw?.webPrice,
    raw?.internetPrice,
    raw?.listPrice,
    raw?.askingPrice,
    raw?.pricing?.retailPrice,
    raw?.pricing?.salePrice,
    raw?.pricing?.price,
    raw?.price,
  ];
  for (const value of candidates) {
    const number = typeof value === "string" ? Number(value.replace(/[^0-9.]/g, "")) : value;
    if (typeof number === "number" && Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

/** Flatten a raw DMS cart into the shape every template and feed consumes. */
function normaliseCart(raw, storeById) {
  const make = raw?.cartType?.make?.trim() || "";
  const model = raw?.cartType?.model?.trim() || "";
  const year = raw?.cartType?.year?.trim() || "";
  const attributes = raw?.cartAttributes ?? {};
  const color = attributes?.cartColor?.trim() || "";

  const storeId = raw?.cartLocation?.locationId || raw?.cartLocation?.latestStoreId || "";
  const store = storeById.get(storeId) ?? null;

  const images = [
    ...new Set(
      (Array.isArray(raw?.imageUrls) ? raw.imageUrls : [])
        .filter((name) => typeof name === "string" && name.trim())
        .map((name) => name.trim()),
    ),
  ];

  return {
    id: raw._id,
    slug: "",
    make,
    makeKey: toMakeKey(make),
    model,
    modelKey: toSlugPart(model),
    year,
    title: buildCartTitle(make, model, color),
    price: resolvePrice(raw),
    // Everything money-shaped the DMS sent, so the published price can be
    // re-pointed at a different field without another API round trip.
    rawPricing: collectPricing(raw),
    isElectric: raw?.isElectric === true,
    isUsed: raw?.isUsed === true,
    condition: raw?.isUsed === true ? "Used" : "New",
    fuel: raw?.isElectric === true ? "Electric" : "Gas",
    status: raw?.status ?? "Available",
    color,
    colorKey: toSlugPart(color),
    seatColor: attributes?.seatColor ?? "",
    driveTrain: attributes?.driveTrain ?? "",
    tireType: attributes?.tireType ?? "",
    tireRimSize: attributes?.tireRimSize ?? "",
    passengers: attributes?.passengers ?? "",
    hasSoundSystem: attributes?.hasSoundSystem === true,
    isLifted: attributes?.isLifted === true,
    hasHitch: attributes?.hasHitch === true,
    hasExtendedTop: attributes?.hasExtendedTop === true,
    isStreetLegal: raw?.title?.isStreetLegal === true,
    battery: raw?.battery
      ? {
          type: raw.battery.type ?? "",
          // The DMS carries a battery brand sharing the parent group's name.
          // It is omitted rather than renamed: dropping a field is accurate,
          // substituting a different manufacturer would not be.
          brand: /tigon/i.test(String(raw.battery.brand ?? "")) ? "" : (raw.battery.brand ?? ""),
          year: raw.battery.year ?? "",
          ampHours: raw.battery.ampHours ?? "",
          packVoltage: raw.battery.packVoltage ?? "",
          batteryVoltage: raw.battery.batteryVoltage ?? "",
          warrantyLength: raw.battery.warrantyLength ?? "",
        }
      : null,
    engine: raw?.engine
      ? {
          make: raw.engine.make ?? "",
          horsepower: raw.engine.horsepower ?? "",
          stroke: raw.engine.stroke ?? "",
        }
      : null,
    vin: raw?.vinNo ?? "",
    serial: raw?.serialNo ?? "",
    odometer: raw?.odometer ?? null,
    hours: raw?.hour ?? null,
    warranty: raw?.warrantyLength ?? "",
    images,
    hasPhotos: images.length > 0,
    // Inventory state, straight from the DMS. Kept so the sellability rules
    // above can be reviewed against real data without another API call.
    inventoryState: {
      status: raw?.status ?? null,
      isInStock: raw?.isInStock ?? null,
      isOnLot: raw?.isOnLot ?? null,
      isInBoneyard: raw?.isInBoneyard ?? null,
      isService: raw?.isService ?? null,
      isComplete: raw?.isComplete ?? null,
      isRFS: raw?.rfsStatus?.isRFS ?? null,
      categories: Array.isArray(raw?.categories) ? raw.categories : [],
      onWebsite: raw?.advertising?.onWebsite ?? null,
      needOnWebsite: raw?.advertising?.needOnWebsite ?? null,
      isDraft: raw?.advertising?.isDraft ?? null,
    },
    storeId: storeId || null,
    locationSlug: store?.slug ?? null,
    city: store?.city ?? "",
    state: store?.state ?? "",
    stateCode: store?.stateCode ?? "",
    country: store?.country ?? "USA",
    storeName: store?.name ?? "",
    locationDescription: raw?.cartLocation?.locationDescription ?? "",
  };
}

/**
 * Assign the SEO slug for every cart:
 *   {make}-{model}-{color}-{city}-{state}-{country}, duplicates get -01, -02.
 * Carts are sorted by id first so slug assignment is deterministic across runs.
 */
function assignSlugs(carts) {
  const counts = new Map();
  for (const cart of [...carts].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    const parts = [cart.make, cart.model, cart.color, cart.city, cart.state, cart.country]
      .map(toSlugPart)
      .filter(Boolean);
    const base = parts.length ? parts.join("-") : `cart-${cart.id}`;
    const seen = counts.get(base);
    if (seen === undefined) {
      counts.set(base, 0);
      cart.slug = base;
    } else {
      const next = seen + 1;
      counts.set(base, next);
      cart.slug = `${base}-${String(next).padStart(2, "0")}`;
    }
  }
  return carts;
}

/** Derive the facet lists the inventory UI and the brand pages are built from. */
function buildFacets(carts) {
  const makes = new Map();
  const models = new Map();
  const colors = new Map();
  const passengers = new Map();
  const driveTrains = new Map();
  const batteryTypes = new Map();

  const bump = (map, key, label) => {
    if (!key || !label) return;
    const entry = map.get(key) ?? { key, label, count: 0 };
    entry.count += 1;
    map.set(key, entry);
  };

  for (const cart of carts) {
    bump(makes, cart.makeKey, cart.make);
    if (cart.modelKey) bump(models, `${cart.makeKey}:${cart.modelKey}`, cart.model);
    bump(colors, cart.colorKey, cart.color);
    bump(passengers, toSlugPart(cart.passengers), cart.passengers);
    bump(driveTrains, toSlugPart(cart.driveTrain), cart.driveTrain);
    if (cart.battery?.type) bump(batteryTypes, toSlugPart(cart.battery.type), cart.battery.type);
  }

  const sortByLabel = (map) => [...map.values()].sort((a, b) => a.label.localeCompare(b.label));

  return {
    makes: sortByLabel(makes),
    models: [...models.values()]
      .map((entry) => ({ ...entry, makeKey: entry.key.split(":")[0], key: entry.key.split(":")[1] }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    colors: sortByLabel(colors),
    passengers: sortByLabel(passengers),
    driveTrains: sortByLabel(driveTrains),
    batteryTypes: sortByLabel(batteryTypes),
  };
}

function summarise(carts) {
  const prices = carts.map((cart) => cart.price).filter((price) => typeof price === "number" && price > 0);
  return {
    total: carts.length,
    new: carts.filter((cart) => !cart.isUsed).length,
    used: carts.filter((cart) => cart.isUsed).length,
    electric: carts.filter((cart) => cart.isElectric).length,
    gas: carts.filter((cart) => !cart.isElectric).length,
    streetLegal: carts.filter((cart) => cart.isStreetLegal).length,
    lifted: carts.filter((cart) => cart.isLifted).length,
    withPhotos: carts.filter((cart) => cart.hasPhotos).length,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    priceCount: prices.length,
  };
}

async function loadSource() {
  if (useFixture) {
    process.stderr.write("Using offline fixture data (development only).\n");
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
    return { rawCarts: fixture.carts, dmsStores: fixture.stores };
  }
  process.stderr.write("Fetching stores from the DMS...\n");
  const dmsStores = await getStores();
  process.stderr.write(`  ${Array.isArray(dmsStores) ? dmsStores.length : 0} stores\n`);
  process.stderr.write("Fetching inventory from the DMS...\n");
  const { carts } = await getAllCarts({ pageSize: 100 });
  return { rawCarts: carts, dmsStores };
}

async function main() {
  let source;
  try {
    source = await loadSource();
  } catch (error) {
    process.stderr.write(`\nDMS fetch failed: ${error.message}\n`);
    if (existsSync(OUTPUT)) {
      process.stderr.write("Keeping the previous data/inventory.json snapshot; the site will still build.\n");
      process.exit(0);
    }
    process.stderr.write("No previous snapshot exists. Run with --fixture for offline development.\n");
    process.exit(1);
  }

  const stores = mergeStores(source.dmsStores);
  const storeById = new Map(stores.filter((store) => store.storeId).map((store) => [store.storeId, store]));

  const sellable = source.rawCarts.filter(isSellable);
  const excluded = source.rawCarts.length - sellable.length;
  if (excluded > 0) {
    const reasons = {};
    for (const raw of source.rawCarts) {
      if (isSellable(raw)) continue;
      const key = String(raw?.status ?? "unknown");
      reasons[key] = (reasons[key] ?? 0) + 1;
    }
    process.stderr.write(
      `\nHeld back ${excluded} non-retail records: ` +
        Object.entries(reasons).map(([key, count]) => `${key}=${count}`).join(", ") +
        "\n",
    );
  }

  const carts = assignSlugs(sellable.map((raw) => normaliseCart(raw, storeById)));
  carts.sort((a, b) => {
    if (a.hasPhotos !== b.hasPhotos) return a.hasPhotos ? -1 : 1;
    return (b.price ?? 0) - (a.price ?? 0);
  });

  for (const store of stores) {
    store.cartCount = carts.filter((cart) => cart.locationSlug === store.slug).length;
  }

  const snapshot = {
    generatedAt: isoStamp(),
    source: useFixture ? "fixture" : "dms-live",
    summary: summarise(carts),
    facets: buildFacets(carts),
    stores,
    carts,
  };

  writeFileSync(OUTPUT, JSON.stringify(snapshot, null, 1) + "\n", "utf8");
  process.stderr.write(
    `\nWrote ${OUTPUT}\n  ${snapshot.summary.total} carts, ${snapshot.summary.withPhotos} with photos, ` +
      `${snapshot.facets.makes.length} makes, ${stores.length} locations\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
