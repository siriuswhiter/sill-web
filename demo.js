(function () {
  function initSpotlightCards() {
    var cards = document.querySelectorAll("[data-spotlight]");
    if (!cards.length) return;

    window.addEventListener("pointermove", function (event) {
      cards.forEach(function (card) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", event.clientX - rect.left + "px");
        card.style.setProperty("--mouse-y", event.clientY - rect.top + "px");
      });
    }, { passive: true });
  }

  function initFaqAccordion() {
    var items = document.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      var question = item.querySelector(".faq-question");
      if (!question) return;

      question.addEventListener("click", function () {
        var isOpen = item.classList.contains("open");
        items.forEach(function (other) {
          if (other === item) return;
          other.classList.remove("open");
          var otherQuestion = other.querySelector(".faq-question");
          if (otherQuestion) otherQuestion.setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("open", !isOpen);
        question.setAttribute("aria-expanded", isOpen ? "false" : "true");
      });
    });
  }

  function initFeaturePreview() {
    var preview = document.querySelector("[data-feature-preview]");
    if (!preview) return;

    var replay = document.querySelector("[data-preview-replay]");
    var countZh = preview.querySelector("[data-item-count-zh]");
    var countEn = preview.querySelector("[data-item-count-en]");
    var statusZh = document.querySelector("[data-preview-status-zh]");
    var statusEn = document.querySelector("[data-preview-status-en]");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var timers = [];
    var hasPlayed = false;

    var states = {
      start: { className: "is-starting", count: 1, zh: "先把文件拖到屏幕顶部。", en: "First, drag a file to the top of the screen." },
      file: { className: "phase-file", count: 1, zh: "拖到屏幕顶部，松手暂存。", en: "Drag to the top and release to store it." },
      landed: { className: "file-landed", count: 2, zh: "brief.pdf 已进入 Sill。", en: "brief.pdf is now on Sill." },
      copy: { className: "phase-copy", count: 2, zh: "接着选择一段文字并复制。", en: "Next, select some text and copy it." },
      clipboard: { className: "phase-clipboard", count: 2, zh: "按默认快捷键 ⌥⌘C，把剪贴板内容放入 Sill。", en: "Press the default shortcut ⌥⌘C to add the clipboard to Sill." },
      complete: { className: "is-complete", count: 3, zh: "文件和文字已暂存在 Sill。", en: "File and text are stored on Sill." }
    };

    function clearTimers() {
      timers.forEach(window.clearTimeout);
      timers = [];
    }

    function applyState(name) {
      var state = states[name];
      preview.classList.remove("is-starting", "phase-file", "file-landed", "phase-copy", "phase-clipboard", "is-complete");
      preview.classList.add(state.className);
      preview.setAttribute("data-preview-state", name);
      if (countZh) countZh.textContent = state.count + " 个项目";
      if (countEn) countEn.textContent = state.count + (state.count === 1 ? " item" : " items");
      if (statusZh) statusZh.textContent = state.zh;
      if (statusEn) statusEn.textContent = state.en;
    }

    function schedule(name, delay) {
      timers.push(window.setTimeout(function () { applyState(name); }, delay));
    }

    function play() {
      clearTimers();
      if (reduceMotion) {
        applyState("complete");
        return;
      }
      preview.classList.add("is-resetting");
      applyState("start");
      preview.offsetWidth;
      preview.classList.remove("is-resetting");
      schedule("file", 360);
      schedule("landed", 1450);
      schedule("copy", 2050);
      schedule("clipboard", 3100);
      schedule("complete", 4250);
    }

    if (replay) replay.addEventListener("click", play);

    if (reduceMotion) {
      applyState("complete");
      return;
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting || hasPlayed) return;
        hasPlayed = true;
        play();
        observer.disconnect();
      }, { threshold: 0.45 });
      observer.observe(preview);
    } else {
      hasPlayed = true;
      play();
    }
  }

  function init() {
    initSpotlightCards();
    initFeaturePreview();
    initFaqAccordion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
