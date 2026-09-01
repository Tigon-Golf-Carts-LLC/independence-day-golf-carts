/**
 * Generates scripts/fixtures/inventory.sample.json — synthetic inventory in the
 * raw DMS response shape, used only for offline development and tests.
 * The real site is always built from the live DMS pull in scripts/fetch-inventory.mjs.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { locations } from "../../data/locations.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const catalogue = [
  { make: "Denago", models: ["Nomad XL", "Rover XL", "City Sport", "EV Nomad"], electric: true },
  { make: "Evolution", models: ["D5 Ranger 4", "D5 Maverick 4", "Classic 4 Plus", "Forester 6"], electric: true },
  { make: "Club Car", models: ["Onward 4", "Precedent", "Tempo", "Villager 6"], electric: true },
  { make: "E-Z-GO", models: ["Express S4", "Liberty", "TXT", "Valor"], electric: false },
  { make: "Yamaha", models: ["Drive2 QuieTech", "Adventurer", "Umax Rally"], electric: false },
  { make: "ICON", models: ["i40", "i60L", "i20"], electric: true },
  { make: "Advanced EV", models: ["Advent 4", "Advent 6"], electric: true },
  { make: "Bintelli", models: ["Beyond 4", "Nemesis 4"], electric: true },
];

const colors = ["Black", "White", "Gray", "Sky Blue", "Red", "Navy", "Sandstone", "Forest Green", "Champagne"];
const seatColors = ["Black", "Tan", "Gray", "Two Tone"];
const tireTypes = ["All Terrain", "Street", "Turf"];

let seed = 20260704;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (list) => list[Math.floor(rand() * list.length)];

const stores = locations.map((location, index) => ({
  _id: `store_mongo_${String(index + 1).padStart(3, "0")}`,
  storeId: `IDGC${String(index + 1).padStart(3, "0")}`,
  name: `Independence Day Golf Carts — ${location.city}`,
  address: {
    address1: `${100 + index * 7} Sample Fixture Road`,
    address2: "",
    city: location.city,
    state: location.state,
    postalCode: String(10000 + index * 137).padStart(5, "0"),
    country: "USA",
  },
}));

const carts = [];
for (let index = 0; index < 120; index += 1) {
  const brand = pick(catalogue);
  const model = pick(brand.models);
  const color = pick(colors);
  const store = pick(stores);
  const isUsed = rand() < 0.35;
  const isElectric = brand.electric ? rand() > 0.05 : rand() < 0.1;
  const lifted = rand() < 0.45;
  const passengers = pick(["2", "4", "4", "6", "6", "8"]);
  const basePrice = (isUsed ? 4200 : 9200) + Math.round(rand() * (isUsed ? 5200 : 12500));
  const hasPhotos = rand() < 0.35;

  carts.push({
    _id: `fixture${String(index).padStart(4, "0")}0000000000000000`.slice(0, 24),
    cartType: { make: brand.make, model, year: String(2022 + Math.floor(rand() * 5)) },
    retailPrice: rand() < 0.08 ? null : Math.round(basePrice / 5) * 5,
    isElectric,
    isUsed,
    cartAttributes: {
      cartColor: color,
      seatColor: pick(seatColors),
      driveTrain: pick(["2WD", "2WD", "4WD"]),
      tireRimSize: pick(["12", "14", "15"]),
      tireType: pick(tireTypes),
      hasSoundSystem: rand() < 0.5,
      isLifted: lifted,
      hasHitch: rand() < 0.6,
      hasExtendedTop: rand() < 0.3,
      passengers,
    },
    battery: isElectric
      ? {
          year: String(2022 + Math.floor(rand() * 5)),
          brand: pick(["Eco Battery", "Dakota Lithium", "Trojan", "RoyPow"]),
          type: rand() < 0.7 ? "Lithium" : "Lead Acid",
          ampHours: pick(["105", "160", "205"]),
          batteryVoltage: "51.2",
          packVoltage: pick(["48", "48", "72"]),
          warrantyLength: pick(["3 Years", "5 Years", "8 Years"]),
        }
      : null,
    engine: isElectric ? null : { make: pick(["Kawasaki", "Honda", "EFI 401cc"]), horsepower: pick(["10", "12", "14"]), stroke: "4" },
    cartLocation: {
      locationId: store.storeId,
      locationDescription: `${store.address.city}, ${store.address.state}`,
      latestStoreId: store.storeId,
    },
    serialNo: `SN${String(100000 + index)}`,
    vinNo: rand() < 0.6 ? `VIN${String(900000 + index)}` : "",
    title: { isStreetLegal: rand() < 0.4, isTitleInPossession: true },
    warrantyLength: pick(["1 Year", "2 Years", "3 Years", ""]),
    odometer: isUsed ? Math.round(rand() * 4000) : 0,
    hour: isUsed ? Math.round(rand() * 900) : 0,
    imageUrls: hasPhotos
      ? Array.from({ length: 1 + Math.floor(rand() * 4) }, (_, n) => `fixture-${index}-${n}.jpg`)
      : [],
    internalCartImageUrls: ["internal-not-public.jpg"],
    status: "Available",
  });
}

writeFileSync(
  resolve(here, "inventory.sample.json"),
  JSON.stringify({ note: "SYNTHETIC DEVELOPMENT FIXTURE - not real inventory", stores, carts }, null, 1) + "\n",
);
console.log(`fixture written: ${carts.length} carts, ${stores.length} stores`);
