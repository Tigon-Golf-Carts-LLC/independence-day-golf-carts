#!/usr/bin/env node
/**
 * DMS payload inspector.
 *
 * Prints the real shape of a cart record straight from the DMS: every
 * top-level key, every price-like field found at any depth with sample values,
 * and a couple of complete raw records.
 *
 * Use it whenever a field on the site disagrees with the dealership system —
 * it answers "what does the API actually send?" without guessing.
 *
 *   npm run inspect            # 25 carts
 *   npm run inspect -- 100     # a larger sample
 */

import { getCarts } from "./lib/dms.mjs";

const SAMPLE = Number.parseInt(process.argv[2], 10) || 25;
const MONEYISH = /price|cost|msrp|amount|retail|sale|discount|fee|payment|deposit|value|total|rebate|invoice/i;

const out = [];
const say = (line = "") => {
  out.push(line);
  process.stdout.write(`${line}\n`);
};

/** Walk an object and collect every leaf path with a money-ish key name. */
function findMoneyFields(value, path = "", found = new Map()) {
  if (value === null || value === undefined) return found;
  if (Array.isArray(value)) {
    if (value.length) findMoneyFields(value[0], `${path}[0]`, found);
    return found;
  }
  if (typeof value !== "object") return found;

  for (const [key, child] of Object.entries(value)) {
    const here = path ? `${path}.${key}` : key;
    if (MONEYISH.test(key) && (typeof child !== "object" || child === null)) {
      const entry = found.get(here) ?? { path: here, type: typeof child, values: [], nulls: 0 };
      if (child === null || child === "") entry.nulls += 1;
      else if (entry.values.length < 6) entry.values.push(child);
      found.set(here, entry);
    }
    if (child && typeof child === "object") findMoneyFields(child, here, found);
  }
  return found;
}

async function main() {
  say(`Fetching ${SAMPLE} carts from the DMS...\n`);
  const data = await getCarts({ pageNumber: 0, pageSize: SAMPLE });
  const carts = data?.carts ?? [];
  if (!carts.length) throw new Error("the DMS returned no carts");

  say(`Returned ${carts.length} carts (totalCarts: ${data.totalCarts})`);
  say("");

  // Every top-level key seen across the sample, with the type it carries.
  const keys = new Map();
  for (const cart of carts) {
    for (const [key, value] of Object.entries(cart)) {
      const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
      const entry = keys.get(key) ?? { key, types: new Set(), present: 0 };
      entry.types.add(type);
      entry.present += 1;
      keys.set(key, entry);
    }
  }
  say("== TOP-LEVEL KEYS ==");
  for (const entry of [...keys.values()].sort((a, b) => a.key.localeCompare(b.key))) {
    say(`  ${entry.key.padEnd(28)} ${[...entry.types].join("|").padEnd(16)} present on ${entry.present}/${carts.length}`);
  }
  say("");

  // Anything that looks like money, wherever it lives in the record.
  const money = new Map();
  for (const cart of carts) findMoneyFields(cart, "", money);
  say("== PRICE-LIKE FIELDS (any depth) ==");
  if (money.size === 0) say("  none found");
  for (const entry of [...money.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    const samples = entry.values.map((v) => JSON.stringify(v)).join(", ");
    say(`  ${entry.path.padEnd(38)} ${entry.type.padEnd(8)} empty:${String(entry.nulls).padEnd(4)} e.g. ${samples || "(all empty)"}`);
  }
  say("");

  // How the field the site currently uses is populated.
  const retail = carts.map((c) => c.retailPrice);
  const numeric = retail.filter((v) => typeof v === "number" && v > 0);
  say("== retailPrice (the field this site currently publishes) ==");
  say(`  numeric and > 0 : ${numeric.length}/${carts.length}`);
  say(`  null or zero    : ${carts.length - numeric.length}/${carts.length}`);
  if (numeric.length) say(`  range           : ${Math.min(...numeric)} – ${Math.max(...numeric)}`);
  say("");

  say("== TWO COMPLETE RAW RECORDS ==");
  for (const cart of carts.slice(0, 2)) {
    say(JSON.stringify(cart, null, 2));
    say("");
  }

  // Mirror everything into the Actions job summary when running in CI.
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## DMS payload\n\n\`\`\`\n${out.join("\n")}\n\`\`\`\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
