/** Shared helpers used by both the fetch step and every page renderer. */

import { S3_CARTS_URL, PLACEHOLDER_IMAGE } from "../../data/site.config.mjs";

/** Escape a string for interpolation into HTML text or a double-quoted attribute. */
export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a string for XML text content (sitemaps, feeds). */
export const xmlEsc = esc;

/** Serialize an object as JSON-LD safe for embedding inside a <script> tag. */
export function jsonLd(data) {
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

/** Lowercase, hyphen-separated, URL-safe slug part. */
export function toSlugPart(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The DMS filter-key format for makes: lowercase with underscores ("Club Car" -> "club_car"). */
export function toMakeKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
}

/** "$12,995.00", or "Call for Price" when the DMS has no retail price set. */
export function formatPrice(price) {
  if (!price || Number(price) <= 0) return "Call for Price";
  return (
    "$" +
    Number(price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/** "$12,995" — no cents, for headlines and badges. */
export function formatPriceShort(price) {
  if (!price || Number(price) <= 0) return "Call for Price";
  return "$" + Math.round(Number(price)).toLocaleString("en-US");
}

/** Monthly payment at 0% APR over 48 months. */
export function monthlyPayment(price, months = 48) {
  if (!price || Number(price) <= 0) return null;
  return Number(price) / months;
}

/** Build a full public S3 URL from a DMS image filename. */
export function cartImageUrl(filename) {
  if (!filename) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(filename)) return filename;
  return S3_CARTS_URL + String(filename).replace(/^\/+/, "");
}

/**
 * All public gallery images for a cart, or the placeholder when there are none.
 *
 * Normalised carts (the shape everything downstream uses) hold the S3 filenames
 * on `images`. Raw DMS records call the same field `imageUrls`, so both are
 * accepted — reading only the raw name silently produced placeholders on every
 * server-rendered page.
 */
export function cartImages(cart) {
  const source = Array.isArray(cart?.images)
    ? cart.images
    : Array.isArray(cart?.imageUrls)
      ? cart.imageUrls
      : [];
  const urls = source.filter(Boolean);
  if (urls.length === 0) return [PLACEHOLDER_IMAGE];
  return urls.map(cartImageUrl);
}

/** True when a cart has at least one public photograph. */
export function hasRealPhotos(cart) {
  return cartImages(cart)[0] !== PLACEHOLDER_IMAGE;
}

/** "Denago Nomad XL Gray" from make / model / color, skipping whatever is missing. */
export function buildCartTitle(make, model, color) {
  const parts = [];
  if (make && model) parts.push(`${make} ${model}`);
  else if (make) parts.push(make);
  else if (model) parts.push(model);
  if (color) parts.push(color);
  return parts.join(" ") || "Golf Cart";
}

/** Today in YYYY-MM-DD, in a fixed timezone so builds are reproducible. */
export function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Full ISO-8601 timestamp with a +00:00 offset (sitemap lastmod format). */
export function isoStamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

/** RFC-822 date, required by RSS. */
export function rfc822(date = new Date()) {
  return new Date(date).toUTCString();
}

/** Chunk an array into fixed-size groups. */
export function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Unique, order-preserving. */
export function unique(items) {
  return [...new Set(items)];
}

/** Trim text to a length that fits a meta description without cutting mid-word. */
export function clamp(text, max = 158) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "") + "…";
}

/** Title-case a hyphenated slug for display. */
export function titleize(slug) {
  return String(slug ?? "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
