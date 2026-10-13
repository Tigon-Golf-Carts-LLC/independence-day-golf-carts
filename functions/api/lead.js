/**
 * POST /api/lead — signed server-side relay for the lead forms.
 *
 * Used only when the site is built with TIGON_LEAD_VIA_PROXY=1 (Cloudflare
 * Pages). The browser posts the form here; this function forwards the exact
 * body to the webhook with an X-Tigon-Signature header:
 *
 *   X-Tigon-Signature: sha256=<hex HMAC-SHA256 of the raw body, keyed with the secret>
 *
 * Both values are Cloudflare Pages secrets (Settings -> Variables and Secrets),
 * never committed and never sent to the browser:
 *   TIGON_WEBHOOK_KEY     the key at the end of the webhook URL
 *   TIGON_WEBHOOK_SECRET  this webhook's signing secret
 */

const WEBHOOK_BASE = "https://tigoniot.com/hooks/";
const MAX_BODY_BYTES = 32 * 1024 * 1024; // three 10 MB photos plus the fields

function reply(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    },
  });
}

function allowedOrigins(env) {
  const site = (env.SITE_URL || "https://independencedaygolfcarts.com").replace(/\/$/, "");
  const host = new URL(site).host.replace(/^www\./, "");
  return [`https://${host}`, `https://www.${host}`];
}

async function sign(secret, body) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
  return Array.from(mac, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  if (!allowedOrigins(env).includes(origin)) return reply({ ok: false, error: "Origin not allowed." }, 403);
  if (!env.TIGON_WEBHOOK_KEY) return reply({ ok: false, error: "Lead form is not configured." }, 503, origin);

  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_BYTES) return reply({ ok: false, error: "Photos are too large. Each must be under 10 MB." }, 413, origin);

  // Sign the exact bytes that are forwarded — re-encoding the form would change them.
  const body = await request.arrayBuffer();
  const headers = {
    "Content-Type": request.headers.get("Content-Type") || "application/octet-stream",
    "User-Agent": request.headers.get("User-Agent") || "",
    "X-Forwarded-For": request.headers.get("CF-Connecting-IP") || "",
    Origin: origin,
  };
  if (env.TIGON_WEBHOOK_SECRET) headers["X-Tigon-Signature"] = `sha256=${await sign(env.TIGON_WEBHOOK_SECRET, body)}`;

  try {
    const upstream = await fetch(WEBHOOK_BASE + encodeURIComponent(env.TIGON_WEBHOOK_KEY), { method: "POST", headers, body });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": origin, Vary: "Origin" },
    });
  } catch {
    return reply({ ok: false, error: "Could not reach the lead system. Please call us." }, 502, origin);
  }
}

export function onRequestOptions({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  if (!allowedOrigins(env).includes(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" },
  });
}
