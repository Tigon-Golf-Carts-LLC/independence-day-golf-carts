/** GET /api/brands — makes derived from live inventory (the DMS has no brands endpoint). */
import { callDms, jsonResponse, errorResponse } from "./_dms.js";

export async function onRequestGet() {
  try {
    const data = await callDms("/get-carts", { pageNumber: 0, pageSize: 500 });
    const makes = new Map();
    for (const cart of data?.carts ?? []) {
      const make = cart?.cartType?.make;
      if (typeof make !== "string" || !make.trim()) continue;
      const key = make.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const entry = makes.get(key) ?? { key, label: make.trim(), count: 0 };
      entry.count += 1;
      makes.set(key, entry);
    }
    return jsonResponse([...makes.values()].sort((a, b) => a.label.localeCompare(b.label)));
  } catch (error) {
    return errorResponse(error);
  }
}
