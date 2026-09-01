/** GET /api/carts?pageNumber=&pageSize=&makes=&isNew=… — live inventory listing. */
import { callDms, queryToBody, jsonResponse, errorResponse } from "./_dms.js";

export async function onRequestGet({ request }) {
  try {
    const body = queryToBody(new URL(request.url));
    return jsonResponse(await callDms("/get-carts", body));
  } catch (error) {
    return errorResponse(error);
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" },
  });
}
