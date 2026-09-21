(function () {
  var KEY = "sill-lang";

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function persist(lang) {
    try {
      localStorage.setItem(KEY, lang);
    } catch (e) {
      /* private mode */
    }
  }

  function initialLanguage() {
    // Prerendered /en/ and /zh/ pages pin the language via data-lang-lock so a
    // returning visitor's stored preference cannot flip the static, single-
    // language DOM (the other language's nodes are absent on those pages).
    var locked = document.documentElement.getAttribute("data-lang-lock");
    if (locked === "zh" || locked === "en") return locked;
    try {
      var requested = new URLSearchParams(window.location.search).get("lang");
      if (requested === "zh" || requested === "en") return requested;
    } catch (e) {
      /* older browser fallback */
    }
    var saved = stored();
    if (saved === "zh" || saved === "en") return saved;
    return "en";
  }

  function apply(lang) {
    var root = document.documentElement;
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang === "zh" ? "zh-Hans" : "en");
    var zh = root.getAttribute("data-title-zh");
    var en = root.getAttribute("data-title-en");
    if (zh && en) document.title = lang === "zh" ? zh : en;
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-set-lang") === lang ? "true" : "false");
    });
    document.querySelectorAll("[data-zh-label][data-en-label]").forEach(function (element) {
      element.setAttribute("aria-label", element.getAttribute(lang === "zh" ? "data-zh-label" : "data-en-label"));
    });
    document.querySelectorAll("[data-zh-title][data-en-title]").forEach(function (element) {
      element.setAttribute("title", element.getAttribute(lang === "zh" ? "data-zh-title" : "data-en-title"));
    });
    document.querySelectorAll("[data-tooltip-zh][data-tooltip-en]").forEach(function (element) {
      element.setAttribute("data-tooltip", element.getAttribute(lang === "zh" ? "data-tooltip-zh" : "data-tooltip-en"));
    });
    document.querySelectorAll("[data-alt-zh][data-alt-en]").forEach(function (element) {
      element.setAttribute("alt", element.getAttribute(lang === "zh" ? "data-alt-zh" : "data-alt-en"));
    });
  }

  window.SillLang = {
    get: function () {
      return document.documentElement.getAttribute("data-lang") || initialLanguage();
    },
    set: function (lang) {
      if (lang !== "zh" && lang !== "en") return;
      persist(lang);
      apply(lang);
    }
  };

  apply(initialLanguage());

  document.addEventListener("DOMContentLoaded", function () {
    apply(window.SillLang.get());
    var lock = document.documentElement.getAttribute("data-lang-lock");
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-set-lang");
        // On a prerendered single-language page the opposite language's nodes
        // are not in the DOM, so toggling in place would blank the content.
        // Follow the sibling prerendered URL instead (data-lang-<t>-href is
        // injected by scripts/prerender-i18n.mjs).
        if (lock) {
          var href = btn.getAttribute("data-lang-" + target + "-href");
          if (href) {
            window.location.href = href;
            return;
          }
        }
        window.SillLang.set(target);
      });
    });
  });
})();
