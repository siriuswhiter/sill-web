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
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.SillLang.set(btn.getAttribute("data-set-lang"));
      });
    });
  });
})();
