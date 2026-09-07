(function () {
  var FRAME_COUNT = 46;
  var ATLAS_COLUMNS = 8;
  var ATLAS_ROWS = 6;
  var VIDEO_VERSION = "20260907-showcase1";
  var VIDEO_ACTIONS = { idle: true, look: true, poke: true, sleep: true, groom: true };
  var ACTIONS = {
    idle: { duration: 3833, loop: false },
    look: { duration: 1200, loop: false },
    poke: { duration: 900, loop: false },
    surprise: { duration: 1200, loop: false },
    sit: { duration: 1250, loop: false },
    happy: { duration: 1100, loop: false },
    sleep: { duration: 4000, loop: false },
    groom: { duration: 2800, loop: false },
    walk: { duration: 1800, loop: true }
  };
  var entries = [];
  var posterCache = {};
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
      poster: element.parentElement && element.parentElement.querySelector("[data-pobb-video-poster]"),
      video: element.parentElement && element.parentElement.querySelector("[data-pobb-video]"),
      action: element.getAttribute("data-pobb-action") || "idle",
      startedAt: performance.now(),
      visible: true,
      videoToken: 0
    };
    entries.push(entry);
    return entry;
  }

  function videoExtension(video) {
    var userAgent = navigator.userAgent || "";
    var appleWebKit = /Safari\//.test(userAgent) && !/(Chrome|Chromium|CriOS|Edg|OPR)\//.test(userAgent);
    var appleMobile = /iPad|iPhone|iPod/.test(userAgent);
    var supportsHEVC = video.canPlayType('video/quicktime; codecs="hvc1"');
    return (appleWebKit || appleMobile) && supportsHEVC ? "mov" : "webm";
  }

  function hideVideo(entry) {
    if (!entry.video) return;
    entry.video.pause();
    entry.video.parentElement.classList.remove("is-video-ready");
  }

  function hidePoster(entry) {
    if (!entry.poster) return;
    entry.poster.parentElement.classList.remove("has-video-poster");
  }

  function posterSource(name) {
    return "assets/pet-poster/" + name + ".webp?v=" + VIDEO_VERSION;
  }

  function loadPoster(name, callback) {
    var cached = posterCache[name];
    if (!cached) {
      cached = new Image();
      cached.decoding = "async";
      cached.src = posterSource(name);
      posterCache[name] = cached;
    }
    if (cached.complete) {
      callback(cached.naturalWidth > 0);
      return;
    }
    cached.addEventListener("load", function () { callback(true); }, { once: true });
    cached.addEventListener("error", function () { callback(false); }, { once: true });
  }

  function setVideoAction(entry, name) {
    var video = entry.video;
    entry.videoToken += 1;
    var token = entry.videoToken;
    if (!video || !VIDEO_ACTIONS[name] || (reduceMotion && reduceMotion.matches)) {
      hideVideo(entry);
      hidePoster(entry);
      return;
    }

    loadPoster(name, function (posterReady) {
      if (token !== entry.videoToken || entry.action !== name) return;
      if (posterReady && entry.poster) {
        entry.poster.src = posterSource(name);
        entry.poster.parentElement.classList.add("has-video-poster");
      } else {
        hidePoster(entry);
      }
      hideVideo(entry);

      var extension = videoExtension(video);
      var nextSource = "assets/pet-video/" + name + "." + extension + "?v=" + VIDEO_VERSION;
      video.loop = actionFor(name).loop;
      if (video.getAttribute("src") !== nextSource) {
        video.setAttribute("src", nextSource);
        video.load();
      } else {
        try { video.currentTime = 0; } catch (_) {}
      }

      function reveal() {
        if (token !== entry.videoToken || entry.action !== name) return;
        video.parentElement.classList.add("is-video-ready");
      }
      video.addEventListener("playing", reveal, { once: true });
      video.addEventListener("error", function () {
        if (token === entry.videoToken) {
          hideVideo(entry);
          hidePoster(entry);
        }
      }, { once: true });
      if (entry.visible) {
        var playAttempt = video.play();
        if (playAttempt && playAttempt.catch) playAttempt.catch(function () { hideVideo(entry); });
      }
    });
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
    var column = frame % ATLAS_COLUMNS;
    var row = Math.floor(frame / ATLAS_COLUMNS);
    element.style.backgroundSize = (width * ATLAS_COLUMNS) + "px " + (height * ATLAS_ROWS) + "px";
    element.style.backgroundPosition = (-column * width) + "px " + (-row * height) + "px";
  }

  function tick(now) {
    entries.forEach(function (entry) {
      if (entry.visible) draw(entry, now);
    });
    if (!(reduceMotion && reduceMotion.matches)) animationFrame = requestAnimationFrame(tick);
  }

  function handleReduceMotionChange() {
    var now = performance.now();
    if (reduceMotion.matches) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      entries.forEach(function (entry) {
        entry.videoToken += 1;
        hideVideo(entry);
        hidePoster(entry);
        draw(entry, now);
      });
      return;
    }

    entries.forEach(function (entry) {
      entry.startedAt = now;
      draw(entry, now);
      setVideoAction(entry, entry.action);
    });
    if (!animationFrame) animationFrame = requestAnimationFrame(tick);
  }

  function setAction(element, name) {
    if (!element || !ACTIONS[name]) return;
    var entry = entryFor(element);
    entry.action = name;
    entry.startedAt = performance.now();
    element.setAttribute("data-pobb-action", name);
    draw(entry, entry.startedAt);
    setVideoAction(entry, name);
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
        var entry = entryFor(sprite);
        entry.visible = observations[0].isIntersecting;
        if (!entry.video) return;
        if (entry.visible && VIDEO_ACTIONS[entry.action] && !(reduceMotion && reduceMotion.matches)) {
          var playAttempt = entry.video.play();
          if (playAttempt && playAttempt.catch) playAttempt.catch(function () { hideVideo(entry); });
        } else {
          entry.video.pause();
        }
      }, { threshold: 0.05 });
      observer.observe(root);
    }

    setAction(sprite, idleAction);
    scheduleRest();
  }

  function initActionShowcase(root) {
    var sprite = root.querySelector("[data-pobb-sprite-frame]");
    var replay = root.querySelector("[data-pobb-replay]");
    if (!sprite) return;

    var entry = entryFor(sprite);
    var action = sprite.getAttribute("data-pobb-action") || "idle";
    var hasStarted = false;
    entry.visible = false;

    function start() {
      if (hasStarted || (reduceMotion && reduceMotion.matches)) return;
      hasStarted = true;
      setAction(sprite, action);
    }

    if (replay) {
      replay.addEventListener("click", function () {
        if (reduceMotion && reduceMotion.matches) return;
        hasStarted = true;
        setAction(sprite, action);
      });
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (observations) {
        entry.visible = observations[0].isIntersecting;
        if (entry.visible) {
          if (!hasStarted) start();
          else if (entry.video && !entry.video.ended && !(reduceMotion && reduceMotion.matches)) {
            var playAttempt = entry.video.play();
            if (playAttempt && playAttempt.catch) playAttempt.catch(function () { hideVideo(entry); });
          }
        } else if (entry.video) {
          entry.video.pause();
        }
      }, { threshold: 0.3 });
      observer.observe(root);
    } else {
      entry.visible = true;
      start();
    }
  }

  function init() {
    Object.keys(VIDEO_ACTIONS).forEach(function (name) { loadPoster(name, function () {}); });
    document.querySelectorAll("[data-pobb-sprite-frame]").forEach(entryFor);
    document.querySelectorAll("[data-pobb-companion]").forEach(initStandaloneCompanion);
    document.querySelectorAll("[data-pobb-showcase]").forEach(initActionShowcase);
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

  if (reduceMotion) {
    if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", handleReduceMotionChange);
    else if (reduceMotion.addListener) reduceMotion.addListener(handleReduceMotionChange);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
