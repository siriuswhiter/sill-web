(function () {
  var SPEED = 132;
  var WALK_MS = 1800;
  var WALK_FRAMES = 46;
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
    if (!screen) return;

    var bg = screen.querySelector("[data-run-bg]");
    var fg = screen.querySelector("[data-run-fg]");
    var air = screen.querySelector("[data-run-air]");
    var ground = screen.querySelector("[data-run-ground]");
    var pickups = screen.querySelector("[data-run-pickups]");
    var pobb = screen.querySelector("[data-run-pobb]");
    var notch = screen.querySelector("[data-run-notch]");
    var slots = screen.querySelector("[data-run-slots]");
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
    var onScreen = true;
    var raf = 0;
    var last = 0;
    var hopUntil = 0;
    var bgMax = 80;
    var fgMax = 80;
    var measured = false;

    SCENES.forEach(function (scene) {
      var bgPreload = new Image();
      var fgPreload = new Image();
      bgPreload.src = sceneURL(scene.file, "bg");
      fgPreload.src = sceneURL(scene.file, "fg");
    });

    function sceneURL(file, kind) {
      return new URL(file + (kind === "fg" ? "-fg.png" : "-bg.jpg"), base).href;
    }

    function layerImage(layer, buffer) {
      return layer.querySelector('[data-buffer="' + buffer + '"]');
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
      if (bgImage.src !== bgSrc) bgImage.src = bgSrc;
      if (fgImage.src !== fgSrc) fgImage.src = fgSrc;
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
      hopUntil = performance.now() + 280;
    }

    function fly(item, fromX) {
      var flyer = document.createElement("div");
      flyer.className = "run-flyer";
      flyer.innerHTML = chip(item.kind);
      screen.appendChild(flyer);
      var target = notch.dataset.count === "0"
        ? screen.querySelector(".run-notch-cap").getBoundingClientRect()
        : slots.getBoundingClientRect();
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
      var reach = width * 0.16 + 78;
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
      var frame = reduced ? 0 : Math.floor(((now % WALK_MS) / WALK_MS) * WALK_FRAMES);
      var column = frame % 8;
      var row = Math.floor(frame / 8);
      var width = pobb.clientWidth;
      var height = pobb.clientHeight;
      if (!width || !height) return;
      pobb.style.backgroundPosition = (-column * width) + "px " + (-row * height) + "px";
      var hop = 0;
      if (now < hopUntil) hop = Math.sin((1 - (hopUntil - now) / 280) * Math.PI) * -14;
      pobb.style.transform = "scaleX(-1) translateY(" + hop + "px)";
    }

    function applyLayer(layer, buffer, shift, sway) {
      var image = layerImage(layer, buffer);
      image.style.transform = "translate3d(" + (-shift) + "px," + sway + "px,0)";
    }

    function paint(now) {
      var current = buffers[front];
      var back = front === "a" ? "b" : "a";
      var bgShift = Math.min(bgMax, current.shift * 0.12);
      var fgShift = Math.min(fgMax, current.shift * 0.34);
      var sway = reduced ? 0 : Math.sin(now / 1400) * 7;
      applyLayer(bg, front, bgShift, 0);
      applyLayer(fg, front, fgShift, sway);
      applyLayer(bg, back, Math.min(bgMax, buffers[back].shift * 0.12), 0);
      applyLayer(fg, back, Math.min(fgMax, buffers[back].shift * 0.34), sway * 0.6);
      var airY = SCENES[current.scene].id === "ocean" ? -((scroll * 0.08) % 160) : Math.sin(now / 1700) * 6;
      air.style.backgroundPosition = (-scroll * 0.22) + "px " + airY + "px";
      ground.style.backgroundPositionX = (-scroll) + "px";
      placePickups(now);
      drawPobb(now);
    }

    function switchScene() {
      var back = front === "a" ? "b" : "a";
      var next = (buffers[front].scene + 1) % SCENES.length;
      assign(back, next);
      buffers[back].shift = 0;
      show(back, true);
      show(front, false);
      front = back;
      var scene = SCENES[buffers[front].scene];
      screen.dataset.scene = scene.id;
      setStatus(scene.zh, scene.en);
    }

    function step(now, dt) {
      if (!measured) measure();
      buffers[front].shift += SPEED * dt;
      scroll += SPEED * dt;
      ensurePickups();
      if (measured && buffers[front].shift * 0.34 > fgMax * 0.84) switchScene();
      paint(now);
    }

    function queue() {
      if (raf || reduced || userPaused || !onScreen) return;
      last = 0;
      raf = window.requestAnimationFrame(frame);
    }

    function frame(now) {
      raf = 0;
      if (!last) last = now;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (reduced || userPaused || !onScreen) return;
      step(now, dt);
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

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        queue();
      }, { threshold: 0.2 });
      observer.observe(screen);
    }

    document.addEventListener("visibilitychange", function () {
      last = 0;
    });

    window.addEventListener("resize", function () {
      measured = false;
    });

    window.requestAnimationFrame(function () {
      measure();
      ensurePickups();
      paint(performance.now());
      queue();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
