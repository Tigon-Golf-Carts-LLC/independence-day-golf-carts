/**
 * TIGON IOT lead form — markup for the inline contact form and the site-wide
 * modal. Behaviour (validation, tracking fields, sending) is in src/js/lead-form.js.
 *
 * Where submissions go is decided at build time:
 *   TIGON_LEAD_VIA_PROXY=1  -> /api/lead (Cloudflare Pages Function that signs
 *                              each request with the webhook's secret)
 *   TIGON_WEBHOOK_KEY=...   -> straight from the browser to the TIGON webhook
 * With neither set the forms still render, but tell visitors to call instead.
 */

import { site, leadForm } from "../../data/site.config.mjs";
import { esc } from "./util.mjs";

export function leadEndpoint() {
  if (process.env.TIGON_LEAD_VIA_PROXY === "1") return "/api/lead";
  const key = (process.env.TIGON_WEBHOOK_KEY || "").trim();
  return /^[A-Za-z0-9_-]{16,}$/.test(key) ? `${leadForm.webhookBase}${key}` : "";
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif";
const TRACKING = ["url", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "ga_client_id"];

/** Optional cart the form is about; pre-fills and locks the vehicle fields. */
function cartFields(cart) {
  if (!cart) return {};
  return { brand: cart.make || "", model: cart.model || "", vin_number: cart.vin || "", sku_number: cart.serial || "" };
}

function field({ id, name, label, type = "text", required = false, half = true, attrs = "", value = "", locked = false }) {
  const req = required ? " required" : "";
  const star = required ? ' <span class="lead-form__req" aria-hidden="true">*</span>' : "";
  const lockAttr = locked && value ? " readonly" : "";
  return `<div class="lead-form__field${half ? " lead-form__field--half" : ""}">
          <label for="${id}-${name}">${esc(label)}${star}</label>
          <input class="field" type="${type}" name="${name}" id="${id}-${name}"${value ? ` value="${esc(value)}"` : ""}${attrs ? ` ${attrs}` : ""}${req}${lockAttr}>
        </div>`;
}

/**
 * The full TIGON form. `id` must be unique on the page.
 * `extra` is markup inserted before the message box (e.g. a location picker).
 */
export function leadFormHtml({ id, cart = null, submitLabel = "Send Message", extra = "" }) {
  const v = cartFields(cart);
  const locked = Boolean(cart);
  return `<form class="lead-form" id="${id}" data-lead-form data-endpoint="${esc(leadEndpoint())}" data-form-name="${esc(leadForm.formName)}"
        data-max-mb="${leadForm.maxFileMb}" data-phone="${esc(site.phone)}" method="post" enctype="multipart/form-data" novalidate>
      <div class="lead-form__grid">
        ${field({ id, name: "first_name", label: "First name", required: true, attrs: 'autocomplete="given-name"' })}
        ${field({ id, name: "last_name", label: "Last name", required: true, attrs: 'autocomplete="family-name"' })}
        ${field({ id, name: "email", label: "Email", type: "email", required: true, attrs: 'autocomplete="email"' })}
        ${field({ id, name: "phone1", label: "Phone", type: "tel", required: true, attrs: 'autocomplete="tel"' })}
        ${field({ id, name: "phone2", label: "Alternate phone", type: "tel", attrs: 'autocomplete="tel"' })}
        ${field({ id, name: "zip_code", label: "ZIP code", attrs: 'inputmode="numeric" autocomplete="postal-code" maxlength="10"' })}
        ${field({ id, name: "address", label: "Address", half: false, attrs: 'autocomplete="street-address"' })}
        ${field({ id, name: "brand", label: "Brand", value: v.brand, locked, attrs: 'data-cart-field placeholder="e.g. Evolution, Club Car, Epic"' })}
        ${field({ id, name: "model", label: "Model", value: v.model, locked, attrs: 'data-cart-field placeholder="Cart model you are interested in"' })}
        ${field({ id, name: "vin_number", label: "VIN (optional)", value: v.vin_number, locked, attrs: 'data-cart-field autocomplete="off"' })}
        ${field({ id, name: "sku_number", label: "Stock # / SKU (optional)", value: v.sku_number, locked, attrs: 'data-cart-field autocomplete="off"' })}
        ${extra}
        <div class="lead-form__field">
          <label for="${id}-comments">Message</label>
          <textarea class="field" name="comments" id="${id}-comments" rows="4" placeholder="Questions, budget, delivery ZIP, trade-in details…"></textarea>
        </div>
        <fieldset class="lead-form__field lead-form__photos">
          <legend>Photos (optional — up to 3, 10 MB each)</legend>
          ${[1, 2, 3]
            .map(
              (n) => `<label class="lead-form__file" for="${id}-image_${n}"><span>Photo ${n}</span>
            <input type="file" name="image_${n}" id="${id}-image_${n}" accept="${IMAGE_ACCEPT}"></label>`,
            )
            .join("\n          ")}
        </fieldset>
      </div>
      <!-- Spam trap: real visitors never see this field. It must be sent empty. -->
      <div class="lead-form__hp" aria-hidden="true">
        <label for="${id}-website">Leave this field empty</label>
        <input type="text" name="website" id="${id}-website" tabindex="-1" autocomplete="off" value="">
      </div>
      <input type="hidden" name="form_name" value="${esc(leadForm.formName)}">
      ${TRACKING.map((name) => `<input type="hidden" name="${name}" value="">`).join("\n      ")}
      <button class="btn btn--primary btn--block btn--lg" type="submit">${esc(submitLabel)}</button>
      <p class="lead-form__msg" role="status" aria-live="polite"></p>
      <p class="note" style="margin:0">Prefer to talk? Call <a href="${site.phoneTel}">${esc(site.phone)}</a>, Monday–Saturday 9AM–5PM.</p>
    </form>`;
}

/** Site-wide modal, rendered once per page and opened by any [data-lead-open] control. */
export function leadModal() {
  return `<dialog class="lead-modal" id="lead-modal" aria-labelledby="lead-modal-title">
  <div class="lead-modal__inner">
    <button class="lead-modal__close" type="button" data-lead-close aria-label="Close">&times;</button>
    <p class="eyebrow eyebrow--light" style="margin-bottom:6px">Independence Day pricing</p>
    <h2 id="lead-modal-title" style="margin-top:0">Get a Quote</h2>
    <p class="lead-modal__cart" data-lead-cart hidden></p>
    <p class="note" style="margin-top:0">Send your details and a product specialist will reply the same business day.</p>
    <a class="btn btn--navy btn--block" href="${site.phoneTel}" style="margin-bottom:16px">Call Now ${esc(site.phone)}</a>
    ${leadFormHtml({ id: "lead-modal-form", submitLabel: "Send My Request" })}
  </div>
</dialog>`;
}

/**
 * Attributes for a button that opens the modal. Pass a cart to pre-fill and
 * lock brand / model / VIN / stock number. `href` is the no-JavaScript fallback.
 */
export function leadOpenAttrs(cart = null) {
  const v = cartFields(cart);
  const data = cart
    ? ` data-brand="${esc(v.brand)}" data-model="${esc(v.model)}" data-vin="${esc(v.vin_number)}" data-sku="${esc(v.sku_number)}" data-title="${esc(`${cart.year ? `${cart.year} ` : ""}${cart.title}`)}"`
    : "";
  return `href="/contact/${cart ? `?cart=${esc(cart.slug)}` : ""}#contact-form" data-lead-open${data}`;
}
