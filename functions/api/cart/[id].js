/** GET /api/cart/:id — live detail for one cart, by DMS record id. */
import { callDms, jsonResponse, errorResponse } from "../_dms.js";

export async function onRequestGet({ params }) {
  const cartId = String(params.id || "");
  if (!/^[a-f0-9]{24}$/i.test(cartId)) {
    return jsonResponse({ error: "cartId must be a 24-character DMS record id" }, { status: 400, maxAge: 300 });
  }
  try {
    return jsonResponse(await callDms("/get-cart-by-id", { cartId }));
  } catch (error) {
    return errorResponse(error);
  }
}
