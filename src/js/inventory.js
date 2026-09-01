/* Inventory browser.
   The server pre-renders page 1 for crawlers; this script takes over once it
   loads and filters/sorts/paginates the full catalogue client-side from
   /inventory-index.json. Every control mirrors into the URL so results are
   shareable, reloadable and survive back/forward navigation. */
(function () {
  "use strict";

  var grid = document.querySelector("[data-inventory-grid]");
  if (!grid) return;

  var root = document.querySelector("[data-inventory]");
  var PAGE_SIZE = parseInt(root.getAttribute("data-page-size"), 10) || 24;
  var BASE_PATH = root.getAttribute("data-base-path") || "/inventory/";
  // Read from the server-rendered container so the number lives in one place.
  var PHONE_TEL = root.getAttribute("data-phone-tel") || "tel:+18444562228";
  var PHONE_DISPLAY = root.getAttribute("data-phone") || "844-456-2228";
  var LOCKED = JSON.parse(root.getAttribute("data-locked") || "{}");
  var PLACEHOLDER = "/images/cart-photo-coming-soon.svg";
  var S3 = "https://s3.amazonaws.com/prod.docs.s3/carts/";
  var PHONE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';

  var countEl = document.querySelector("[data-inventory-count]");
  var pagerEl = document.querySelector("[data-inventory-pager]");
  var sortEl = document.querySelector("[data-inventory-sort]");
  var searchEl = document.querySelector("[data-inventory-search]");
  var resetEl = document.querySelector("[data-inventory-reset]");
  var openFiltersEl = document.querySelector("[data-testid='button-open-filters']");
  var filtersEl = document.querySelector(".filters");

  var carts = [];
  var state = readState();

  /* --------------------------------------------------------------- data */

  fetch("/inventory-index.json", { credentials: "same-origin" })
    .then(function (response) {
      if (!response.ok) throw new Error("inventory index " + response.status);
      return response.json();
    })
    .then(function (data) {
      carts = data.carts || [];
      grid.setAttribute("data-hydrated", "true");
      render();
    })
    .catch(function () {
      /* Leave the server-rendered first page in place. */
      grid.setAttribute("data-hydrated", "failed");
    });

  /* -------------------------------------------------------------- state */

  function readState() {
    var params = new URLSearchParams(window.location.search);
    var list = function (name) {
      var values = params.getAll(name);
      if (values.length === 1 && values[0].indexOf(",") > -1) values = values[0].split(",");
      return values.filter(Boolean);
    };
    return {
      q: params.get("q") || params.get("searchText") || "",
      isNew: params.get("isNew") === "true",
      isUsed: params.get("isUsed") === "true",
      isElectric: params.get("isElectric") === "true",
      isGas: params.get("isGas") === "true",
      isStreetLegal: params.get("isStreetLegal") === "true",
      isLifted: params.get("isLifted") === "true",
      makes: list("makes"),
      models: list("models"),
      colors: list("colors"),
      seats: list("seats"),
      driveTrain: list("driveTrain"),
      storeIds: list("storeIds"),
      sort: params.get("priceSortASC") === "true" ? "price-asc"
        : params.get("priceSortASC") === "false" ? "price-desc"
        : params.get("sort") || "featured",
      page: Math.max(0, parseInt(params.get("page"), 10) || 0)
    };
  }

  function writeState(replace) {
    var params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    ["isNew", "isUsed", "isElectric", "isGas", "isStreetLegal", "isLifted"].forEach(function (key) {
      if (state[key] && !LOCKED[key]) params.set(key, "true");
    });
    ["makes", "models", "colors", "seats", "driveTrain", "storeIds"].forEach(function (key) {
      state[key].forEach(function (value) { params.append(key, value); });
    });
    if (state.sort === "price-asc") params.set("priceSortASC", "true");
    else if (state.sort === "price-desc") params.set("priceSortASC", "false");
    else if (state.sort !== "featured") params.set("sort", state.sort);
    if (state.page > 0) params.set("page", String(state.page));

    var query = params.toString();
    var url = BASE_PATH + (query ? "?" + query : "");
    if (replace) window.history.replaceState({ idgc: true }, "", url);
    else window.history.pushState({ idgc: true }, "", url);
  }

  window.addEventListener("popstate", function () {
    state = readState();
    syncControls();
    render();
  });

  /* ------------------------------------------------------------ filters */

  function matches(cart) {
    if (LOCKED.isNew && cart.u) return false;
    if (LOCKED.isUsed && !cart.u) return false;
    if (LOCKED.isElectric && !cart.e) return false;
    if (LOCKED.isGas && cart.e) return false;
    if (LOCKED.isStreetLegal && !cart.sl) return false;
    if (LOCKED.isLifted && !cart.lf) return false;
    if (LOCKED.make && cart.mk !== LOCKED.make) return false;
    if (LOCKED.location && cart.ls !== LOCKED.location) return false;

    if (state.isNew !== state.isUsed) {
      if (state.isNew && cart.u) return false;
      if (state.isUsed && !cart.u) return false;
    }
    if (state.isElectric !== state.isGas) {
      if (state.isElectric && !cart.e) return false;
      if (state.isGas && cart.e) return false;
    }
    if (state.isStreetLegal && !cart.sl) return false;
    if (state.isLifted && !cart.lf) return false;
    if (state.makes.length && state.makes.indexOf(cart.mk) === -1 && state.makes.indexOf(cart.mkl) === -1) return false;
    if (state.models.length && state.models.indexOf(cart.md) === -1) return false;
    if (state.colors.length && state.colors.indexOf(cart.c) === -1 && state.colors.indexOf(cart.cl) === -1) return false;
    if (state.seats.length && state.seats.indexOf(cart.p) === -1) return false;
    if (state.driveTrain.length && state.driveTrain.indexOf(cart.dt) === -1) return false;
    if (state.storeIds.length && state.storeIds.indexOf(cart.ls) === -1) return false;

    if (state.q) {
      var needle = state.q.toLowerCase();
      if (cart.s.indexOf(needle) === -1) return false;
    }
    return true;
  }

  function sortCarts(list) {
    var sorted = list.slice();
    if (state.sort === "price-asc") {
      sorted.sort(function (a, b) { return (a.pr || Infinity) - (b.pr || Infinity); });
    } else if (state.sort === "price-desc") {
      sorted.sort(function (a, b) { return (b.pr || 0) - (a.pr || 0); });
    } else if (state.sort === "year-desc") {
      sorted.sort(function (a, b) { return (parseInt(b.y, 10) || 0) - (parseInt(a.y, 10) || 0); });
    }
    return sorted;
  }

  /* ------------------------------------------------------------- render */

  function money(value) {
    if (!value) return "Call for Price";
    return "$" + Math.round(value).toLocaleString("en-US");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function cardHtml(cart, eager) {
    var image = cart.im ? S3 + cart.im : PLACEHOLDER;
    var alt = (cart.y ? cart.y + " " : "") + cart.t + " golf cart for sale" +
      (cart.ct ? " in " + cart.ct + ", " + cart.st : "") + " — July 4th Golf Cart Sales Event";
    var meta = [cart.y, cart.p ? cart.p.replace(/passengers?/i, "").trim() + " Passenger" : "", cart.dtl,
      cart.ct ? cart.ct + ", " + cart.st : ""].filter(Boolean);
    var monthly = cart.pr ? Math.round(cart.pr / 48) : null;

    return '<article class="cart-card" data-testid="card-cart-' + escapeHtml(cart.id) + '">' +
      '<div class="cart-card__media">' +
        '<span class="cart-card__flag">July 4th Pricing</span>' +
        '<a href="/golfcart/' + escapeHtml(cart.sg) + '/" tabindex="-1" aria-hidden="true">' +
        '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(alt) + '" width="800" height="600" loading="' +
        (eager ? "eager" : "lazy") + '" decoding="async">' +
        '</a>' +
        (cart.n > 1 ? '<span class="cart-card__count">' + cart.n + " photos</span>" : "") +
      "</div>" +
      '<div class="cart-card__body">' +
        '<div class="cart-card__badges">' +
          '<span class="badge badge--' + (cart.u ? "used" : "new") + '" data-testid="badge-condition-' + escapeHtml(cart.id) + '">' + (cart.u ? "Used" : "New") + "</span>" +
          '<span class="badge badge--' + (cart.e ? "electric" : "gas") + '">' + (cart.e ? "Electric" : "Gas") + "</span>" +
          (cart.sl ? '<span class="badge badge--legal">Street Legal</span>' : "") +
          (cart.lf ? '<span class="badge badge--lifted">Lifted</span>' : "") +
        "</div>" +
        '<h3 class="cart-card__title" data-testid="text-title-' + escapeHtml(cart.id) + '"><a href="/golfcart/' +
          escapeHtml(cart.sg) + '/">' + escapeHtml(cart.t) + "</a></h3>" +
        '<p class="cart-card__meta">' + meta.map(function (item) { return "<span>" + escapeHtml(item) + "</span>"; }).join("") + "</p>" +
        '<div class="cart-card__price-row">' +
          '<span class="cart-card__price" data-testid="text-price-' + escapeHtml(cart.id) + '">' + money(cart.pr) + "</span>" +
          (monthly ? '<span class="cart-card__mo">$' + monthly.toLocaleString("en-US") + "/mo · 0% APR</span>" : "") +
        "</div>" +
        '<div class="cart-card__cta">' +
          '<a class="btn btn--outline btn--sm" href="/golfcart/' + escapeHtml(cart.sg) + '/">View Details</a>' +
          '<a class="btn btn--primary btn--sm" href="' + escapeHtml(PHONE_TEL) + '" aria-label="Call about the ' + escapeHtml(cart.t) + '">' + PHONE_ICON + '</a>' +
        "</div>" +
      "</div></article>";
  }

  function render() {
    var filtered = sortCarts(carts.filter(matches));
    var pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page >= pages) state.page = pages - 1;
    var start = state.page * PAGE_SIZE;
    var slice = filtered.slice(start, start + PAGE_SIZE);

    if (slice.length === 0) {
      grid.className = "";
      grid.innerHTML = '<div class="empty-state"><h3>No carts match those filters right now</h3>' +
        '<p>Try clearing a filter, or call <a href="' + escapeHtml(PHONE_TEL) + '">' + escapeHtml(PHONE_DISPLAY) + '</a> — we will find the cart you are after across all 15 locations.</p></div>';
    } else {
      grid.className = "grid-carts";
      grid.innerHTML = slice.map(function (cart, index) { return cardHtml(cart, index < 4); }).join("");
    }

    if (countEl) {
      countEl.innerHTML = filtered.length === 0
        ? "No matching carts"
        : "<strong>" + filtered.length.toLocaleString("en-US") + "</strong> cart" + (filtered.length === 1 ? "" : "s") +
          " &middot; showing " + (start + 1) + "–" + (start + slice.length);
    }
    renderPager(pages);
    updateCounts();
  }

  function renderPager(pages) {
    if (!pagerEl) return;
    if (pages <= 1) { pagerEl.innerHTML = ""; return; }
    var html = "";
    html += '<a href="#" class="' + (state.page === 0 ? "is-disabled" : "") + '" data-page="' + (state.page - 1) +
      '" data-testid="button-prev-page" rel="prev">Prev</a>';
    var from = Math.max(0, state.page - 2);
    var to = Math.min(pages - 1, from + 4);
    from = Math.max(0, to - 4);
    if (from > 0) html += '<a href="#" data-page="0">1</a>' + (from > 1 ? "<span>…</span>" : "");
    for (var index = from; index <= to; index += 1) {
      html += index === state.page
        ? '<span aria-current="page">' + (index + 1) + "</span>"
        : '<a href="#" data-page="' + index + '">' + (index + 1) + "</a>";
    }
    if (to < pages - 1) html += (to < pages - 2 ? "<span>…</span>" : "") + '<a href="#" data-page="' + (pages - 1) + '">' + pages + "</a>";
    html += '<a href="#" class="' + (state.page >= pages - 1 ? "is-disabled" : "") + '" data-page="' + (state.page + 1) +
      '" data-testid="button-next-page" rel="next">Next</a>';
    pagerEl.innerHTML = html;
  }

  /** Live facet counts, computed against every filter except the facet itself. */
  function updateCounts() {
    var nodes = document.querySelectorAll("[data-facet-count]");
    if (!nodes.length || !carts.length) return;
    Array.prototype.forEach.call(nodes, function (node) {
      var field = node.getAttribute("data-facet-field");
      var value = node.getAttribute("data-facet-count");
      var saved = state[field];
      state[field] = Array.isArray(saved) ? [] : false;
      var pool = carts.filter(matches);
      state[field] = saved;
      var total = pool.filter(function (cart) {
        if (field === "makes") return cart.mk === value;
        if (field === "colors") return cart.c === value;
        if (field === "seats") return cart.p === value;
        if (field === "driveTrain") return cart.dt === value;
        if (field === "storeIds") return cart.ls === value;
        if (field === "models") return cart.md === value;
        return false;
      }).length;
      node.textContent = total ? String(total) : "0";
      var label = node.closest("label");
      if (label) label.style.opacity = total ? "" : ".45";
    });
  }

  /* ----------------------------------------------------------- controls */

  function syncControls() {
    document.querySelectorAll("[data-filter-field]").forEach(function (input) {
      var field = input.getAttribute("data-filter-field");
      var value = input.getAttribute("data-filter-value");
      var checked = value ? state[field].indexOf(value) > -1 : Boolean(state[field]);
      input.checked = checked;
      var wrapper = input.closest("[data-testid]");
      if (wrapper) wrapper.setAttribute("data-state", checked ? "checked" : "unchecked");
    });
    if (sortEl) sortEl.value = state.sort;
    if (searchEl) searchEl.value = state.q;
  }

  document.addEventListener("change", function (event) {
    var input = event.target.closest && event.target.closest("[data-filter-field]");
    if (!input) return;
    var field = input.getAttribute("data-filter-field");
    var value = input.getAttribute("data-filter-value");
    if (value) {
      var index = state[field].indexOf(value);
      if (input.checked && index === -1) state[field].push(value);
      if (!input.checked && index > -1) state[field].splice(index, 1);
    } else {
      if (LOCKED[field]) { input.checked = true; return; }
      state[field] = input.checked;
    }
    state.page = 0;
    syncControls();
    writeState(false);
    render();
  });

  if (sortEl) {
    sortEl.addEventListener("change", function () {
      state.sort = sortEl.value;
      state.page = 0;
      writeState(false);
      render();
    });
  }

  if (searchEl) {
    var timer = null;
    searchEl.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        state.q = searchEl.value.trim();
        state.page = 0;
        writeState(false);
        render();
      }, 220);
    });
    var form = searchEl.closest("form");
    if (form) form.addEventListener("submit", function (event) { event.preventDefault(); });
  }

  if (resetEl) {
    resetEl.addEventListener("click", function (event) {
      event.preventDefault();
      state = { q: "", isNew: false, isUsed: false, isElectric: false, isGas: false, isStreetLegal: false,
        isLifted: false, makes: [], models: [], colors: [], seats: [], driveTrain: [], storeIds: [],
        sort: "featured", page: 0 };
      syncControls();
      writeState(false);
      render();
    });
  }

  if (pagerEl) {
    pagerEl.addEventListener("click", function (event) {
      var link = event.target.closest("a[data-page]");
      if (!link || link.classList.contains("is-disabled")) return;
      event.preventDefault();
      state.page = Math.max(0, parseInt(link.getAttribute("data-page"), 10) || 0);
      writeState(false);
      render();
      var anchor = document.getElementById("results");
      if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (openFiltersEl && filtersEl) {
    openFiltersEl.addEventListener("click", function () {
      var collapsed = filtersEl.getAttribute("data-collapsed") === "true";
      filtersEl.setAttribute("data-collapsed", collapsed ? "false" : "true");
      openFiltersEl.setAttribute("aria-expanded", collapsed ? "true" : "false");
    });
  }

  syncControls();
  writeState(true);
})();
