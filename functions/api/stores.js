/** GET /api/stores — live dealership locations. */
import { callDms, jsonResponse, errorResponse } from "./_dms.js";

export async function onRequestGet() {
  try {
    return jsonResponse(await callDms("/tigon-stores"));
  } catch (error) {
    return errorResponse(error);
  }
}
