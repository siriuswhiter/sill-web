(function () {
  var SPEED = 132;
  var WALK_MS = 1600;
  var WALK_FRAME_START = 8;
  var WALK_FRAME_SPAN = 32;
  var BG_VERSION = "20260930-perf2";
  var FG_VERSION = "20260930-perf2";
  var SCENES = [
    { id: "forest", file: "forest", zh: "泡泡走进森林。", en: "Pobb is walking through the forest." },
    { id: "ocean", file: "ocean", zh: "海底慢慢移到面前。", en: "The ocean scene drifts into view." },
    { id: "space", file: "space", zh: "星空慢慢移到面前。", en: "The night sky drifts into view." }
  ];
  var KINDS = ["file", "image", "text", "link"];
  var LINES = {
    file: ["brief.pdf 跳进了顶部置物岛。", "brief.pdf leapt into the notch."],
    image: ["dusk.jpg 跳进了顶部置物岛。", "dusk.jpg leapt into the notch."],
    text: ["一段文字跳进了顶部置物岛。", "A note leapt into the notch."],
    link: ["一个链接跳进了顶部置物岛。", "A link leapt into the notch."]
  };

  function init() {
    var screen = document.querySelector("[data-sill-run]");
    var play = document.querySelector("[data-run-play]");
    if (!screen || !play) return;

    var bg = screen.querySelector("[data-run-bg]");
    var fg = screen.querySelector("[data-run-fg]");
    var air = screen.querySelector("[data-run-air]");
    var ground = play.querySelector("[data-run-ground]");
    var pickups = play.querySelector("[data-run-pickups]");
    var pobb = play.querySelector("[data-run-pobb]");
    var notch = document.querySelector("[data-run-notch]");
    var slots = notch.querySelector("[data-run-slots]");
    var count = notch.querySelector("[data-run-count]");
    var toggle = document.querySelector("[data-run-toggle]");
    var statusZh = document.querySelector("[data-preview-status-zh]");
    var statusEn = document.querySelector("[data-preview-status-en]");
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var base = bg.querySelector("img").src;
    var buffers = {
      a: { scene: 0, shift: 0 },
      b: { scene: 1, shift: 0 }
    };
    var front = "a";
    var scroll = 0;
    var nextPickup = 0;
    var spawnIndex = 0;
    var items = [];
    var userPaused = false;
    var raf = 0;
    var last = 0;
    var hopUntil = 0;
    var bgMax = 80;
    var fgMax = 80;
    var measured = false;
    var frameInterval = window.innerWidth <= 760 ? 1000 / 30 : 0;
    var idlePreload = 0;
    var sceneRequest = 0;
    var pendingScene = -1;
    var primaryReady = false;

    function sceneURL(file, kind, width) {
      var version = kind.indexOf("fg") === 0 ? FG_VERSION : BG_VERSION;
      var name = "page-" + file + ".jpg";
      if (kind === "fg") name = "page-" + file + "-fg.png";
      if (kind === "fgWebp") name = "page-" + file + "-fg.webp";
      if (kind === "bgAvif") name = "page-" + file + "-" + width + ".avif";
      var url = new URL(name, base);
      url.searchParams.set("v", version);
      return url.href;
    }

    function sceneBackgroundSrcset(file) {
      return [1280, 1920, 2560, 3200].map(function (width) {
        return sceneURL(file, "bgAvif", width) + " " + width + "w";
      }).join(", ");
    }

    function scheduleNextScene() {
      if (idlePreload) return;
      if (navigator.connection && navigator.connection.saveData) return;
      idlePreload = window.setTimeout(function () {
        idlePreload = 0;
        if (document.hidden) return;
        var schedule = window.requestIdleCallback || function (callback) {
          return window.setTimeout(callback, 300);
        };
        idlePreload = schedule(function () {
          idlePreload = 0;
          if (document.hidden) return;
          var back = front === "a" ? "b" : "a";
          var nextIndex = (buffers[front].scene + 1) % SCENES.length;
          assign(back, nextIndex);
        }, { timeout: 1200 });
      }, 4000);
    }

    function layerImage(layer, buffer) {
      return layer.querySelector('img[data-buffer="' + buffer + '"]');
    }

    function setStatus(zh, en) {
      if (statusZh) statusZh.textContent = zh;
      if (statusEn) statusEn.textContent = en;
    }

    function chip(kind) {
      if (kind === "file") return '<span class="run-chip run-chip-file"><b>PDF</b><small>brief.pdf</small></span>';
      if (kind === "image") return '<span class="run-chip run-chip-image"><i></i><small>dusk.jpg</small></span>';
      if (kind === "text") return '<span class="run-chip run-chip-text"><small class="lang-zh">周五前发出去</small><small class="lang-en">Send by Friday</small></span>';
      return '<span class="run-chip run-chip-link"><b>↗</b><small class="lang-zh">链接</small><small class="lang-en">Link</small></span>';
    }

    function assign(buffer, sceneIndex) {
      buffers[buffer].scene = sceneIndex;
      var scene = SCENES[sceneIndex];
      var bgImage = layerImage(bg, buffer);
      var fgImage = layerImage(fg, buffer);
      var bgSrc = sceneURL(scene.file, "bg");
      var fgSrc = sceneURL(scene.file, "fg");
      var bgSource = bg.querySelector('source[data-buffer="' + buffer + '"]');
      var fgSource = fg.querySelector('source[data-buffer="' + buffer + '"]');
      if (bgSource) bgSource.srcset = sceneBackgroundSrcset(scene.file);
      if (fgSource) fgSource.srcset = sceneURL(scene.file, "fgWebp");
      if (bgImage.src !== bgSrc) bgImage.src = bgSrc;
      if (fgImage.src !== fgSrc) fgImage.src = fgSrc;
    }

    function whenBufferReady(buffer, callback) {
      var images = [layerImage(bg, buffer), layerImage(fg, buffer)];
      var pending = images.length;
      var ready = true;

      function settle(ok) {
        if (!ok) ready = false;
        pending -= 1;
        if (pending === 0) callback(ready);
      }

      images.forEach(function (image) {
        if (image.complete) {
          settle(image.naturalWidth > 0);
          return;
        }
        function loaded() {
          image.removeEventListener("error", failed);
          settle(true);
        }
        function failed() {
          image.removeEventListener("load", loaded);
          settle(false);
        }
        image.addEventListener("load", loaded, { once: true });
        image.addEventListener("error", failed, { once: true });
      });
    }

    function show(buffer, on) {
      layerImage(bg, buffer).classList.toggle("is-on", on);
      layerImage(fg, buffer).classList.toggle("is-on", on);
    }

    function measure() {
      var bgImage = layerImage(bg, front);
      var fgImage = layerImage(fg, front);
      var nextBg = bgImage.offsetWidth - bg.clientWidth;
      var nextFg = fgImage.offsetWidth - fg.clientWidth;
      if (nextBg < 80 || nextFg < 80) return;
      bgMax = nextBg;
      fgMax = nextFg;
      if (pobb.clientWidth) {
        pobb.style.backgroundSize = (pobb.clientWidth * 8) + "px " + (pobb.clientHeight * 6) + "px";
      }
      measured = true;
    }

    function land(kind) {
      var slot = document.createElement("div");
      slot.className = "run-slot";
      slot.innerHTML = chip(kind);
      slots.appendChild(slot);
      while (slots.children.length > 3) slots.removeChild(slots.firstElementChild);
      notch.dataset.count = String(Math.min(3, slots.children.length));
      if (count) count.textContent = String(slots.children.length);
      hopUntil = performance.now() + 280;
    }

    function fly(item, fromX) {
      var flyer = document.createElement("div");
      flyer.className = "run-flyer";
      flyer.innerHTML = chip(item.kind);
      var targetEl = notch.dataset.count === "0" ? document.querySelector(".run-notch-cap") : slots;
      if (!targetEl) return;
      document.body.appendChild(flyer);
      var target = targetEl.getBoundingClientRect();
      var host = screen.getBoundingClientRect();
      var startX = fromX;
      var startY = host.height - 96;
      var endX = target.left - host.left + target.width / 2;
      var endY = target.top - host.top + target.height / 2;
      var dx = endX - startX;
      var dy = endY - startY;
      flyer.style.left = startX + "px";
      flyer.style.top = startY + "px";
      var animation = flyer.animate([
        { transform: "translate(-50%, -50%) scale(1)" },
        { transform: "translate(calc(-50% + " + (dx * 0.5) + "px), calc(-50% + " + (dy - 86) + "px)) scale(1.08)", offset: 0.52 },
        { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(.5)" }
      ], { duration: 760, easing: "cubic-bezier(.2,.75,.2,1)", fill: "forwards" });
      animation.onfinish = function () {
        flyer.remove();
        land(item.kind);
      };
    }

    function ensurePickups() {
      var horizon = scroll + screen.clientWidth + 180;
      if (!nextPickup) nextPickup = screen.clientWidth * 0.72;
      while (nextPickup < horizon) {
        items.push({
          x: nextPickup,
          kind: KINDS[spawnIndex % KINDS.length],
          taken: false,
          el: null
        });
        nextPickup += 460 + (spawnIndex % 3) * 36;
        spawnIndex += 1;
      }
    }

    function placePickups(now) {
      var width = screen.clientWidth;
      var reach = pobb.offsetLeft + pobb.offsetWidth * 0.62;
      items.forEach(function (item) {
        var screenX = item.x - scroll;
        if (item.taken || screenX < -140 || screenX > width + 160) {
          if (item.el) {
            item.el.remove();
            item.el = null;
          }
          return;
        }
        if (!item.el) {
          item.el = document.createElement("div");
          item.el.className = "run-pickup";
          item.el.innerHTML = chip(item.kind);
          pickups.appendChild(item.el);
        }
        var bob = reduced ? 0 : Math.sin((now + item.x) / 280) * 4;
        item.el.style.transform = "translate3d(" + screenX + "px," + bob + "px,0)";
        if (!reduced && !userPaused && screenX < reach && screenX > reach - 70) {
          item.taken = true;
          item.el.remove();
          item.el = null;
          var line = LINES[item.kind];
          setStatus(line[0], line[1]);
          fly(item, screenX);
        }
      });
      items = items.filter(function (item) { return item.x - scroll > -200; });
    }

    function drawPobb(now) {
      var cycle = reduced ? 0 : (now % WALK_MS) / WALK_MS;
      var frame = reduced ? 0 : WALK_FRAME_START + Math.floor(cycle * WALK_FRAME_SPAN);
      var column = frame % 8;
      var row = Math.floor(frame / 8);
      var width = pobb.clientWidth;
      var height = pobb.clientHeight;
      if (!width || !height) return;
      pobb.style.backgroundPosition = (-column * width) + "px " + (-row * height) + "px";
      var hop = 0;
      if (now < hopUntil) hop = Math.sin((1 - (hopUntil - now) / 280) * Math.PI) * -10;
      var bounce = reduced ? 0 : Math.abs(Math.sin(cycle * Math.PI * 2)) * -4;
      pobb.style.transform = "scaleX(-1) translateY(" + (hop + bounce) + "px)";
    }

    function applyLayer(layer, buffer, shift, sway) {
      var image = layerImage(layer, buffer);
      image.style.transform = "translate3d(" + (-shift) + "px," + sway + "px,0)";
    }

    function paint(now) {
      var current = buffers[front];
      var bgShift = Math.min(bgMax, current.shift * 0.12);
      var fgShift = Math.min(fgMax, current.shift * 0.34);
      var sway = reduced ? 0 : Math.sin(now / 1400) * 7;
      applyLayer(bg, front, bgShift, 0);
      applyLayer(fg, front, fgShift, sway);
      var airY = SCENES[current.scene].id === "ocean" ? -((scroll * 0.08) % 160) : Math.sin(now / 1700) * 6;
      air.style.backgroundPosition = (-scroll * 0.22) + "px " + airY + "px";
      ground.style.backgroundPositionX = (-scroll) + "px";
      placePickups(now);
      drawPobb(now);
    }

    function markScene(id) {
      document.querySelectorAll(".scene-choice").forEach(function (choice) {
        choice.setAttribute("aria-pressed", String(choice.dataset.scene === id));
      });
    }

    function showScene(index) {
      if (SCENES[buffers[front].scene].id === SCENES[index].id && layerImage(bg, front).classList.contains("is-on")) {
        if (pendingScene !== -1) {
          sceneRequest += 1;
          pendingScene = -1;
        }
        markScene(SCENES[index].id);
        return;
      }
      if (pendingScene === index) return;
      var back = front === "a" ? "b" : "a";
      var request = ++sceneRequest;
      pendingScene = index;
      assign(back, index);
      buffers[back].shift = 0;
      whenBufferReady(back, function (ready) {
        if (request !== sceneRequest) return;
        pendingScene = -1;
        if (!ready) return;
        show(back, true);
        show(front, false);
        front = back;
        var scene = SCENES[buffers[front].scene];
        screen.dataset.scene = scene.id;
        play.dataset.scene = scene.id;
        markScene(scene.id);
        setStatus(scene.zh, scene.en);
        measured = false;
        scheduleNextScene();
      });
    }

    function switchScene() {
      showScene((buffers[front].scene + 1) % SCENES.length);
    }

    document.querySelectorAll(".scene-choice").forEach(function (choice) {
      choice.addEventListener("click", function () {
        var index = -1;
        SCENES.forEach(function (scene, sceneIndex) {
          if (scene.id === choice.dataset.scene) index = sceneIndex;
        });
        if (index < 0) return;
        showScene(index);
      });
    });

    function step(now, dt) {
      if (!measured) measure();
      buffers[front].shift += SPEED * dt;
      scroll += SPEED * dt;
      ensurePickups();
      if (measured && buffers[front].shift * 0.34 > fgMax * 0.84) switchScene();
      paint(now);
    }

    function queue() {
      if (raf || reduced || userPaused || document.hidden) return;
      last = 0;
      raf = window.requestAnimationFrame(frame);
    }

    function frame(now) {
      raf = 0;
      if (!last) last = now;
      if (frameInterval && now - last < frameInterval) {
        raf = window.requestAnimationFrame(frame);
        return;
      }
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (reduced || userPaused || document.hidden) return;
      try {
        step(now, dt);
      } catch (error) {
        if (window.console) console.error(error);
      }
      raf = window.requestAnimationFrame(frame);
    }

    function setPaused(paused) {
      userPaused = paused;
      if (toggle) {
        toggle.classList.toggle("is-paused", paused);
        toggle.setAttribute("aria-pressed", paused ? "true" : "false");
      }
    }

    if (toggle) {
      toggle.addEventListener("click", function () {
        setPaused(!userPaused);
        queue();
      });
    }

    screen.querySelectorAll("img").forEach(function (img) {
      img.addEventListener("load", function () { measured = false; });
    });

    if (reduced) {
      measure();
      land("file");
      setStatus("系统已减少动态效果，场景保持静止。", "Motion is reduced, so the scene stays still.");
      items.push({ x: screen.clientWidth * 0.62, kind: "image", taken: false, el: null });
      items.push({ x: screen.clientWidth * 0.86, kind: "text", taken: false, el: null });
      placePickups(0);
      drawPobb(0);
      return;
    }

    document.addEventListener("visibilitychange", function () {
      last = 0;
      if (!document.hidden) {
        if (primaryReady) scheduleNextScene();
        queue();
      }
    });

    window.addEventListener("resize", function () {
      measured = false;
      frameInterval = window.innerWidth <= 760 ? 1000 / 30 : 0;
    });

    window.requestAnimationFrame(function () {
      measure();
      ensurePickups();
      paint(performance.now());
      whenBufferReady(front, function () {
        primaryReady = true;
        scheduleNextScene();
      });
      queue();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
