/** GET|POST /api/cart-colors?makeKeys=denago,evolution — colours for the given makes. */
import { callDms, jsonResponse, errorResponse } from "./_dms.js";

async function makeKeysFrom(request) {
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    return Array.isArray(body.makeKeys) ? body.makeKeys : [];
  }
  return new URL(request.url).searchParams.getAll("makeKeys").flatMap((value) => value.split(",")).filter(Boolean);
}

async function handle(request, endpoint) {
  try {
    const makeKeys = await makeKeysFrom(request);
    if (!makeKeys.length) return jsonResponse([], { maxAge: 300 });
    return jsonResponse(await callDms(endpoint, { makeKeys }));
  } catch (error) {
    return errorResponse(error);
  }
}

export const onRequestGet = ({ request }) => handle(request, "/get-cart-colors");
export const onRequestPost = ({ request }) => handle(request, "/get-cart-colors");
