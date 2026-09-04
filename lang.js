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

  function detect() {
    var saved = stored();
    if (saved === "zh" || saved === "en") return saved;
    var nav = String(navigator.language || navigator.userLanguage || "en").toLowerCase();
    return nav.indexOf("zh") === 0 ? "zh" : "en";
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
  }

  window.SillLang = {
    get: function () {
      return document.documentElement.getAttribute("data-lang") || detect();
    },
    set: function (lang) {
      if (lang !== "zh" && lang !== "en") return;
      persist(lang);
      apply(lang);
    }
  };

  apply(detect());

  document.addEventListener("DOMContentLoaded", function () {
    apply(window.SillLang.get());
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.SillLang.set(btn.getAttribute("data-set-lang"));
      });
    });
  });
})();
