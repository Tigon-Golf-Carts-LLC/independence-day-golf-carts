/* Site chrome: mobile navigation, theme toggle, vehicle gallery.
   Written as plain ES2018 so it runs everywhere with no build step. */
(function () {
  "use strict";

  /* ---------------------------------------------------------- mobile nav */
  var navToggle = document.querySelector("[data-nav-toggle]");
  var mobileNav = document.getElementById("mobilenav");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var open = mobileNav.getAttribute("data-open") === "true";
      mobileNav.setAttribute("data-open", open ? "false" : "true");
      navToggle.setAttribute("aria-expanded", open ? "false" : "true");
    });
  }

  /* -------------------------------------------------------- theme toggle */
  var themeToggle = document.querySelector("[data-theme-toggle]");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var root = document.documentElement;
      var current = root.dataset.theme;
      if (!current) {
        current = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      var next = current === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("idgc-theme", next); } catch (e) {}
    });
  }

  /* ------------------------------------------------------------- gallery */
  var gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    var main = gallery.querySelector("[data-gallery-main]");
    var thumbs = gallery.querySelectorAll("[data-gallery-thumb]");
    Array.prototype.forEach.call(thumbs, function (thumb) {
      thumb.addEventListener("click", function () {
        var src = thumb.getAttribute("data-src");
        var alt = thumb.getAttribute("data-alt") || main.alt;
        if (!src) return;
        main.src = src;
        main.alt = alt;
        Array.prototype.forEach.call(thumbs, function (other) {
          other.setAttribute("aria-current", other === thumb ? "true" : "false");
        });
      });
    });
  }

  /* ------------------------------------------- image fallback for S3 404 */
  document.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (target && target.tagName === "IMG" && !target.dataset.fallbackApplied) {
        if (target.src.indexOf("cart-photo-coming-soon") === -1) {
          target.dataset.fallbackApplied = "1";
          target.src = "/images/cart-photo-coming-soon.svg";
        }
      }
    },
    true
  );
})();
