/**
 * Tigon DMS API client.
 *
 * The DMS is public (no key) but every read endpoint except /tigon-stores is a
 * POST. Requests are retried with backoff because the nightly build is
 * unattended and a single transient failure should not blank the site.
 */

import { DMS_BASE_URL } from "../../data/site.config.mjs";

const RETRIES = 4;
const TIMEOUT_MS = 45_000;

async function request(endpoint, body) {
  const url = `${DMS_BASE_URL}${endpoint}`;
  let lastError;

  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    if (attempt > 0) {
      const wait = 2000 * 2 ** (attempt - 1);
      process.stderr.write(`  retry ${attempt}/${RETRIES} for ${endpoint} in ${wait}ms\n`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`DMS ${endpoint} responded ${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`DMS ${endpoint} failed after ${RETRIES + 1} attempts: ${lastError?.message}`);
}

/** All dealership stores. */
export function getStores() {
  return request("/tigon-stores");
}

/** One page of inventory. */
export function getCarts(body = {}) {
  return request("/get-carts", { pageNumber: 0, pageSize: 100, ...body });
}

/** A single cart by its Mongo _id. */
export function getCartById(cartId) {
  return request("/get-cart-by-id", { cartId });
}

/** Models available for the given make keys. */
export function getCartModels(makeKeys) {
  return request("/get-cart-models", { makeKeys });
}

/** Colors available for the given make keys. */
export function getCartColors(makeKeys) {
  return request("/get-cart-colors", { makeKeys });
}

/** Featured/promoted carts. */
export function getFeaturedCarts(key = "national") {
  return request("/get-featured-carts", { key });
}

/**
 * Walk /get-carts until the catalogue is exhausted.
 *
 * The first page's `totalCarts` is treated as a hint, not a stop condition: it
 * has been observed to disagree with the number of records the endpoint will
 * actually serve. Paging therefore continues until a short page arrives or a
 * full page adds nothing new, and records are keyed by `_id` so an unstable
 * server-side sort cannot produce duplicates.
 */
export async function getAllCarts({ pageSize = 100, maxPages = 200 } = {}) {
  const byId = new Map();
  let reportedTotal = null;
  let barrenPages = 0;

  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    const data = await getCarts({ pageNumber, pageSize });
    const page = Array.isArray(data?.carts) ? data.carts : [];
    if (reportedTotal === null) reportedTotal = Number(data?.totalCarts) || null;

    let added = 0;
    for (const cart of page) {
      if (!cart?._id || byId.has(cart._id)) continue;
      byId.set(cart._id, cart);
      added += 1;
    }
    process.stderr.write(
      `  page ${pageNumber}: ${page.length} returned, ${added} new (${byId.size} total)\n`,
    );

    if (page.length === 0) break;
    // A page shorter than requested is the last one.
    if (page.length < pageSize) break;
    // A full page of records already seen means paging is not advancing.
    if (added === 0) {
      barrenPages += 1;
      if (barrenPages >= 2) {
        process.stderr.write("  paging stopped advancing; ending the walk\n");
        break;
      }
    } else {
      barrenPages = 0;
    }
  }

  const carts = [...byId.values()];
  if (reportedTotal !== null && carts.length !== reportedTotal) {
    process.stderr.write(
      `  note: collected ${carts.length} carts, endpoint reported ${reportedTotal}\n`,
    );
  }
  return { carts, totalCarts: carts.length, reportedTotal };
}
