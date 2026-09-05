(function () {
  var FRAME_COUNT = 46;
  var ACTIONS = {
    idle: { duration: 3833, loop: true },
    look: { duration: 1200, loop: true },
    poke: { duration: 900, loop: false },
    surprise: { duration: 1200, loop: false },
    sit: { duration: 1250, loop: false },
    happy: { duration: 1100, loop: false },
    sleep: { duration: 4000, loop: true },
    groom: { duration: 2800, loop: false },
    walk: { duration: 1800, loop: true }
  };
  var entries = [];
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var animationFrame = 0;

  function actionFor(name) {
    return ACTIONS[name] || ACTIONS.idle;
  }

  function entryFor(element) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].element === element) return entries[i];
    }
    var entry = {
      element: element,
      action: element.getAttribute("data-pobb-action") || "idle",
      startedAt: performance.now(),
      visible: true
    };
    entries.push(entry);
    return entry;
  }

  function draw(entry, now) {
    var element = entry.element;
    var rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var action = actionFor(entry.action);
    var elapsed = Math.max(0, now - entry.startedAt);
    var progress = action.loop ? (elapsed % action.duration) / action.duration : Math.min(elapsed / action.duration, 0.999999);
    var frame = reduceMotion && reduceMotion.matches ? 0 : Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT));
    var width = rect.width;
    var height = rect.height;
    element.style.backgroundSize = (width * FRAME_COUNT) + "px " + height + "px";
    element.style.backgroundPosition = (-frame * width) + "px 0";
  }

  function tick(now) {
    entries.forEach(function (entry) {
      if (entry.visible) draw(entry, now);
    });
    if (!(reduceMotion && reduceMotion.matches)) animationFrame = requestAnimationFrame(tick);
  }

  function setAction(element, name) {
    if (!element || !ACTIONS[name]) return;
    var entry = entryFor(element);
    entry.action = name;
    entry.startedAt = performance.now();
    element.setAttribute("data-pobb-action", name);
    draw(entry, entry.startedAt);
  }

  function initStandaloneCompanion(root) {
    var sprite = root.querySelector("[data-pobb-sprite-frame]");
    var status = root.querySelector("[data-pobb-status]");
    var idleAction = root.getAttribute("data-pobb-idle") || "idle";
    var restAction = root.getAttribute("data-pobb-rest") || "sit";
    var busy = false;
    var inside = false;
    var restTimer = 0;
    var returnTimer = 0;

    if (!sprite) return;
    entryFor(sprite);

    function statusCopy(action) {
      var copy = {
        idle: ["核核在这里。", "Pobb is here."],
        look: ["核核注意到你了。", "Pobb noticed you."],
        poke: ["轻轻回弹了一下。", "A small, springy hello."],
        sit: ["他把爪子收好，坐一会儿。", "He tucked in his paws for a moment."],
        sleep: ["核核把护鳞合上了。", "Pobb folded in his scales."],
        groom: ["一圈水光从护鳞上滑过。", "A ripple of light washed over his scales."],
        happy: ["四枚护鳞依次亮了起来。", "All four scales lit up in turn."]
      };
      if (!status || !copy[action]) return;
      var zh = status.querySelector(".lang-zh");
      var en = status.querySelector(".lang-en");
      if (zh) zh.textContent = copy[action][0];
      if (en) en.textContent = copy[action][1];
    }

    function play(action, next, delay) {
      clearTimeout(returnTimer);
      busy = action !== "idle" && action !== "look" && action !== "sleep";
      setAction(sprite, action);
      statusCopy(action);
      if (delay) {
        returnTimer = window.setTimeout(function () {
          busy = false;
          play(next || (inside ? "look" : idleAction));
        }, delay);
      }
    }

    function scheduleRest() {
      clearTimeout(restTimer);
      if (reduceMotion && reduceMotion.matches) return;
      restTimer = window.setTimeout(function () {
        if (!inside && !busy) {
          play(restAction, idleAction, actionFor(restAction).duration);
        }
      }, 12000);
    }

    root.addEventListener("pointerenter", function () {
      inside = true;
      clearTimeout(restTimer);
      if (!busy) play("look");
    });
    root.addEventListener("pointerleave", function () {
      inside = false;
      if (!busy) play(idleAction);
      scheduleRest();
    });
    root.addEventListener("click", function () {
      if (busy) return;
      play("poke", inside ? "look" : idleAction, ACTIONS.poke.duration);
      scheduleRest();
    });

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (observations) {
        entryFor(sprite).visible = observations[0].isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(root);
    }

    setAction(sprite, idleAction);
    scheduleRest();
  }

  function init() {
    document.querySelectorAll("[data-pobb-sprite-frame]").forEach(entryFor);
    document.querySelectorAll("[data-pobb-companion]").forEach(initStandaloneCompanion);
    if (reduceMotion && reduceMotion.matches) {
      entries.forEach(function (entry) { draw(entry, performance.now()); });
    } else if (!animationFrame) {
      animationFrame = requestAnimationFrame(tick);
    }
  }

  window.PobbMotion = {
    actions: ACTIONS,
    setAction: setAction,
    duration: function (name) { return actionFor(name).duration; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
