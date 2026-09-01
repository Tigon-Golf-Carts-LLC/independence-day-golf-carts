/**
 * Shared helper for the Cloudflare Pages Functions that proxy the DMS.
 *
 * The site itself is fully static and does not need these endpoints — they
 * exist so a deployment on Cloudflare Pages can answer "is this cart still
 * available?" between the nightly rebuilds, and so third parties have a CORS-
 * enabled endpoint. On GitHub Pages these functions are simply absent and the
 * site falls back to the daily snapshot, which is the normal path.
 */

const DMS_BASE_URL = "https://api.tigondms.com/wp-website";

/** Cache at the edge until the next 01:30 America/New_York refresh. */
export function secondsUntilRefresh() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour").value) % 24;
  const minute = Number(parts.find((part) => part.type === "minute").value);
  const minutesNow = hour * 60 + minute;
  const target = 90; // 01:30
  const delta = minutesNow < target ? target - minutesNow : 24 * 60 - minutesNow + target;
  return Math.max(delta * 60, 300);
}

export function jsonResponse(data, { status = 200, maxAge } = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge ?? secondsUntilRefresh()}`,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Call a DMS endpoint. GET when no body is supplied, POST otherwise. */
export async function callDms(endpoint, body) {
  const response = await fetch(`${DMS_BASE_URL}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`DMS ${endpoint} responded ${response.status}`);
  return response.json();
}

/** Translate the site's GET query string into the DMS POST body. */
export function queryToBody(url) {
  const params = url.searchParams;
  const body = {
    pageNumber: Math.max(0, Number.parseInt(params.get("pageNumber"), 10) || 0),
    pageSize: Math.min(Math.max(Number.parseInt(params.get("pageSize"), 10) || 20, 1), 100),
  };

  const search = params.get("searchText") || params.get("q");
  if (search) body.searchText = search;
  if (params.has("priceSortASC")) body.priceSortASC = params.get("priceSortASC") === "true";

  for (const flag of ["isNew", "isUsed", "isElectric", "isGas", "isStreetLegal", "isLifted"]) {
    if (params.get(flag) === "true") body[flag] = true;
  }

  const list = (name) => {
    const values = params.getAll(name).flatMap((value) => value.split(","));
    return values.map((value) => value.trim()).filter(Boolean);
  };
  // The DMS expects make keys with underscores ("Club Car" -> "club_car").
  const makes = list("makes").map((make) => make.toLowerCase().replace(/[^a-z0-9]/g, "_"));
  if (makes.length) body.makes = makes;
  for (const [param, transform] of [
    ["models", (value) => value.toLowerCase()],
    ["colors", (value) => value.toLowerCase()],
    ["seats", (value) => value.toLowerCase()],
    ["driveTrain", (value) => value.toLowerCase()],
    ["storeIds", (value) => value],
  ]) {
    const values = list(param).map(transform);
    if (values.length) body[param] = values;
  }

  return body;
}

export function errorResponse(error) {
  return jsonResponse(
    { error: "Upstream inventory service unavailable", detail: String(error && error.message) },
    { status: 502, maxAge: 60 },
  );
}
