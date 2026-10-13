/* Lead forms ("Webhook Flows" lead system).
   Drives every form[data-lead-form] on the page — the contact page form and the
   site-wide "Get a Quote" modal — plus any [data-lead-open] button that opens
   the modal, optionally pre-filled with one cart's brand / model / VIN / stock #.
   The endpoint is written into data-endpoint at build time. Plain ES2018. */
(function () {
  "use strict";

  var TRACK = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
  var STORE_KEY = "lead_first_touch";
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var SUCCESS_TEXT = "Thank you! We received your request and a product specialist will contact you shortly.";
  var IMAGE_TYPES = /^image\/(jpeg|png|gif|webp|heic|heif)$/i;
  var IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

  /* ------------------------------------------------------------ tracking */

  // First-touch attribution: the first utm_*/gclid/fbclid seen are kept for 30 days.
  function firstTouch() {
    var current = {}, found = false, query = null, saved = null;
    try { query = new URLSearchParams(window.location.search); } catch (e) {}
    TRACK.forEach(function (key) {
      var value = query && query.get(key);
      if (value) { current[key] = value; found = true; }
    });
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) {}
    if (saved && (!saved.ts || Date.now() - saved.ts > MAX_AGE_MS)) saved = null;
    if (!saved && found) {
      saved = { ts: Date.now(), v: current };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) {}
    }
    var out = {};
    TRACK.forEach(function (key) { out[key] = (saved && saved.v && saved.v[key]) || current[key] || ""; });
    return out;
  }

  // _ga cookie "GA1.1.123456.789012" -> "123456.789012"
  function gaClientId() {
    var match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
    if (!match) return "";
    var parts = decodeURIComponent(match[1]).split(".");
    return parts.length >= 4 ? parts.slice(-2).join(".") : "";
  }

  function fillTracking(form) {
    var values = firstTouch();
    values.url = window.location.href;
    values.referrer = document.referrer || "";
    values.ga_client_id = gaClientId();
    Object.keys(values).forEach(function (key) {
      var input = form.querySelector('input[type="hidden"][name="' + key + '"]');
      if (input) input.value = values[key];
    });
  }

  /* ---------------------------------------------------------- cart fields */

  var CART_FIELDS = { brand: "brand", model: "model", vin_number: "vin", sku_number: "sku" };

  function setCart(form, cart) {
    Object.keys(CART_FIELDS).forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      if (!input) return;
      var value = cart ? cart[CART_FIELDS[name]] || "" : "";
      input.value = value;
      // Lock what the cart supplies so the lead always shows which cart was asked about.
      if (cart && value) input.setAttribute("readonly", ""); else input.removeAttribute("readonly");
    });
  }

  /* ----------------------------------------------------------- messages */

  function message(form, text, kind) {
    var box = form.querySelector(".lead-form__msg");
    if (!box) return;
    box.textContent = text;
    box.setAttribute("data-kind", kind || "");
  }

  function clearErrors(form) {
    Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (input) {
      input.removeAttribute("aria-invalid");
    });
  }

  function invalid(form, input, text) {
    input.setAttribute("aria-invalid", "true");
    message(form, text, "error");
    try { input.focus(); } catch (e) {}
    return false;
  }

  /* --------------------------------------------------------- validation */

  function validate(form) {
    clearErrors(form);
    var maxBytes = (parseFloat(form.getAttribute("data-max-mb")) || 10) * 1024 * 1024;
    var get = function (name) { return form.querySelector('[name="' + name + '"]'); };
    var labels = { first_name: "your first name", last_name: "your last name", email: "your email address", phone1: "your phone number" };

    var required = ["first_name", "last_name", "email", "phone1"];
    for (var i = 0; i < required.length; i++) {
      var input = get(required[i]);
      if (input && !input.value.trim()) return invalid(form, input, "Please enter " + labels[required[i]] + ".");
    }
    var email = get("email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
      return invalid(form, email, "Please enter a valid email address, like name@example.com.");
    }
    var phones = ["phone1", "phone2"];
    for (var p = 0; p < phones.length; p++) {
      var phone = get(phones[p]);
      if (phone && phone.value.trim() && phone.value.replace(/\D/g, "").length < 10) {
        return invalid(form, phone, "Please enter a phone number with at least 10 digits, including area code.");
      }
    }
    var zip = get("zip_code");
    if (zip && zip.value.trim() && !/^\d{5}(-?\d{4})?$/.test(zip.value.trim())) {
      return invalid(form, zip, "Please enter a 5-digit ZIP code.");
    }
    var files = form.querySelectorAll('input[type="file"]');
    for (var f = 0; f < files.length; f++) {
      var file = files[f].files && files[f].files[0];
      if (!file) continue;
      if (file.size > maxBytes) return invalid(form, files[f], "“" + file.name + "” is larger than 10 MB. Please choose a smaller photo.");
      if (!IMAGE_TYPES.test(file.type || "") && !IMAGE_EXT.test(file.name)) {
        return invalid(form, files[f], "Photos must be JPG, PNG, GIF, WEBP or HEIC.");
      }
    }
    return true;
  }

  /* -------------------------------------------------------------- send */

  function buildData(form) {
    fillTracking(form);
    var data = new FormData(form);
    // Leave out empty photo inputs so no blank files are sent.
    Array.prototype.forEach.call(form.querySelectorAll('input[type="file"]'), function (input) {
      if (!input.files || !input.files.length) data.delete(input.name);
    });
    data.set("form_name", form.getAttribute("data-form-name") || "Contact form");
    if (!data.has("website")) data.set("website", "");
    return data;
  }

  function send(form) {
    var endpoint = form.getAttribute("data-endpoint");
    var phone = form.getAttribute("data-phone") || "";
    var fallback = "Sorry, something went wrong. Please try again or call us at " + phone + ".";
    if (!validate(form)) return;
    if (!endpoint) { message(form, "Online requests are temporarily unavailable. Please call us at " + phone + ".", "error"); return; }

    var button = form.querySelector('button[type="submit"]');
    var label = button ? button.textContent : "";
    if (button) { button.disabled = true; button.textContent = "Sending…"; }
    message(form, "Sending…", "");

    fetch(endpoint, { method: "POST", body: buildData(form), mode: "cors", credentials: "omit" })
      .then(function (response) {
        return response.text().then(function (body) {
          var json = null;
          try { json = JSON.parse(body); } catch (e) {}
          if (response.status === 429) throw new Error("Too many attempts. Please wait a minute and try again.");
          if (!response.ok || !json || json.ok !== true) throw new Error((json && (json.error || json.message)) || fallback);
        });
      })
      .then(function () {
        var locked = {};
        Object.keys(CART_FIELDS).forEach(function (name) {
          var input = form.querySelector('[name="' + name + '"]');
          if (input && input.hasAttribute("readonly")) locked[CART_FIELDS[name]] = input.value;
        });
        form.reset();
        if (Object.keys(locked).length) setCart(form, locked);
        fillTracking(form);
        message(form, SUCCESS_TEXT, "success");
        if (window.dataLayer) window.dataLayer.push({ event: "generate_lead", form_name: form.getAttribute("data-form-name") });
      })
      .catch(function (error) {
        var text = error && error.message;
        message(form, text && text !== "Failed to fetch" && text.indexOf("NetworkError") === -1 ? text : fallback, "error");
      })
      .then(function () {
        if (button) { button.disabled = false; button.textContent = label; }
      });
  }

  /* -------------------------------------------------------------- modal */

  var modal = document.getElementById("lead-modal");
  var modalForm = modal && modal.querySelector("form[data-lead-form]");
  var lastTrigger = null;

  function openModal(trigger) {
    if (!modal || !modalForm || typeof modal.showModal !== "function") return false;
    var cart = trigger && trigger.hasAttribute("data-brand")
      ? { brand: trigger.getAttribute("data-brand"), model: trigger.getAttribute("data-model"),
          vin: trigger.getAttribute("data-vin"), sku: trigger.getAttribute("data-sku") }
      : null;
    var cartNote = modal.querySelector("[data-lead-cart]");
    var title = trigger && trigger.getAttribute("data-title");
    if (cartNote) {
      cartNote.textContent = title ? "About: " + title + (cart && cart.sku ? " (Stock #" + cart.sku + ")" : "") : "";
      cartNote.hidden = !title;
    }
    setCart(modalForm, cart);
    message(modalForm, "", "");
    clearErrors(modalForm);
    fillTracking(modalForm);
    lastTrigger = trigger;
    modal.showModal();
    var first = modalForm.querySelector('[name="first_name"]');
    if (first) first.focus();
    return true;
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest && event.target.closest("[data-lead-open]");
    if (trigger && openModal(trigger)) { event.preventDefault(); return; }
    if (modal && event.target.closest && event.target.closest("[data-lead-close]")) modal.close();
  });

  if (modal) {
    // A click on the backdrop (outside the inner panel) closes the dialog.
    modal.addEventListener("click", function (event) { if (event.target === modal) modal.close(); });
    modal.addEventListener("close", function () { if (lastTrigger && lastTrigger.focus) lastTrigger.focus(); });
  }

  /* --------------------------------------------- contact page ?cart=slug */

  function prefillFromQuery(form) {
    var slug = null;
    try { slug = new URLSearchParams(window.location.search).get("cart"); } catch (e) {}
    if (!slug) return;
    fetch("/inventory-index.json", { credentials: "same-origin" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (index) {
        var cart = index && index.carts && index.carts.filter(function (entry) { return entry.sg === slug; })[0];
        if (!cart) return;
        setCart(form, { brand: cart.mkl, model: cart.mdl, vin: cart.vin, sku: cart.sk });
        var comments = form.querySelector('[name="comments"]');
        if (comments && !comments.value) comments.value = "I'd like more information and photos of the " + (cart.y ? cart.y + " " : "") + cart.t + ".";
      })
      .catch(function () {});
  }

  /* --------------------------------------------------------------- init */

  Array.prototype.forEach.call(document.querySelectorAll("form[data-lead-form]"), function (form) {
    fillTracking(form);
    if (form !== modalForm) prefillFromQuery(form);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      send(form);
    });
  });
})();
