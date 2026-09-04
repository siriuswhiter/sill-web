(function () {
  var SCENES = ["clear", "constellation", "ripple", "forest", "ocean", "space"];
  var CLIPS = {
    idle: { frames: 46, fps: 12, loop: true },
    look: { frames: 46, fps: 12, loop: true },
    poke: { frames: 46, duration: 0.9, loop: false },
    surprise: { frames: 46, duration: 1.2, loop: false },
    sit: { frames: 46, duration: 1.25, loop: false }
  };

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function initScenes(stage, onChange) {
    var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-set-scene]"));
    if (!tabs.length) return function () {};

    function currentIndex() {
      var scene = stage.getAttribute("data-scene") || "forest";
      var i = SCENES.indexOf(scene);
      return i < 0 ? 0 : i;
    }

    function setScene(name, focusTab, quiet) {
      if (SCENES.indexOf(name) < 0) return;
      var changed = stage.getAttribute("data-scene") !== name;
      stage.setAttribute("data-scene", name);
      tabs.forEach(function (btn) {
        var on = btn.getAttribute("data-set-scene") === name;
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.tabIndex = on ? 0 : -1;
        if (on && focusTab) btn.focus();
      });
      if (changed && !quiet && onChange) onChange(name);
    }

    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setScene(btn.getAttribute("data-set-scene"), false);
      });
      btn.addEventListener("keydown", function (event) {
        var next = -1;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          next = (currentIndex() + 1) % SCENES.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          next = (currentIndex() - 1 + SCENES.length) % SCENES.length;
        } else if (event.key === "Home") {
          next = 0;
        } else if (event.key === "End") {
          next = SCENES.length - 1;
        }
        if (next < 0) return;
        event.preventDefault();
        setScene(SCENES[next], true);
      });
    });

    setScene(stage.getAttribute("data-scene") || "forest", false, true);
    return setScene;
  }

  function initPet(stage) {
    var sprite = stage.querySelector("[data-pet-sprite]");
    var pet = stage.querySelector("[data-pet]");
    var mood = document.querySelector("[data-pet-mood]");
    if (!sprite || !pet) return { notifyScene: function () {}, stop: function () {} };

    var still = reducedMotion();
    var paused = still;
    var hidden = false;
    var clip = "idle";
    var frame = 0;
    var last = 0;
    var raf = 0;
    var lookTimer = 0;
    var leaveTimer = 0;
    var sitTimer = 0;
    var pointerInside = false;
    var busy = false;
    var once = false;

    function setMood(id) {
      var copy = {
        idle: { zh: "文件和文本拖进岛里，随时再取走。", en: "Drop files or text onto the island, then grab them anytime." },
        look: { zh: "隙注意到你了，但还隔着一点距离。", en: "Xi noticed you — and keeps a little distance." },
        poke: { zh: "隙缩了一下，又慢慢回来。", en: "Xi flinches, then eases back." },
        surprise: { zh: "隙受惊了，差点心回缝里。", en: "Xi startles, almost slipping back into the rift." },
        sit: { zh: "隙安静下来，贴着岛沿。", en: "Xi settles against the island edge." }
      };
      var text = copy[id] || copy.idle;
      stage.setAttribute("data-pet-mood", id);
      if (!mood) return;
      var zh = mood.querySelector(".lang-zh");
      var en = mood.querySelector(".lang-en");
      if (zh) zh.textContent = text.zh;
      if (en) en.textContent = text.en;
    }

    function applyFrame() {
      var width = sprite.clientWidth || 72;
      sprite.style.backgroundImage = "url(assets/pet/" + clip + ".png)";
      sprite.style.backgroundSize = (CLIPS[clip].frames * width) + "px " + width + "px";
      sprite.style.backgroundPosition = -(frame * width) + "px 0";
    }

    function play(name, after, playOnce) {
      var spec = CLIPS[name];
      if (!spec) return;
      clip = name;
      frame = 0;
      last = 0;
      once = !!playOnce;
      busy = !spec.loop || once;
      setMood(name);
      applyFrame();
      sprite._after = after || null;
      if (still || paused || hidden) {
        busy = false;
        once = false;
        if (after) after();
      }
    }

    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (paused || hidden || still) return;
      var spec = CLIPS[clip];
      var fps = spec.fps || spec.frames / spec.duration;
      if (!last) last = now;
      if (now - last < 1000 / fps) return;
      last = now;
      frame += 1;
      if (frame >= spec.frames) {
        if (spec.loop && !once) {
          frame = 0;
        } else {
          frame = spec.frames - 1;
          busy = false;
          once = false;
          var after = sprite._after;
          sprite._after = null;
          if (after) after();
          else play("idle");
        }
      }
      applyFrame();
    }

    function scheduleSit() {
      clearTimeout(sitTimer);
      if (still || paused) return;
      sitTimer = setTimeout(function () {
        if (!pointerInside && !busy && clip === "idle") {
          play("sit", function () { play("idle"); });
        }
      }, 14000);
    }

    function lookSoon() {
      clearTimeout(lookTimer);
      lookTimer = setTimeout(function () {
        if (pointerInside && !busy) play("look");
      }, 220);
    }

    pet.addEventListener("click", function () {
      if (busy) return;
      play("poke", function () {
        play(pointerInside ? "look" : "idle");
        scheduleSit();
      });
    });

    stage.addEventListener("pointerenter", function () {
      pointerInside = true;
      clearTimeout(leaveTimer);
      if (!busy && clip !== "look") lookSoon();
    });

    stage.addEventListener("pointerleave", function () {
      pointerInside = false;
      clearTimeout(lookTimer);
      leaveTimer = setTimeout(function () {
        if (!busy && !pointerInside) {
          play("idle");
          scheduleSit();
        }
      }, 480);
    });

    stage.querySelectorAll(".tile").forEach(function (tile) {
      tile.addEventListener("pointerenter", function () {
        if (busy || still || paused) return;
        play("surprise", function () {
          play(pointerInside ? "look" : "idle");
          scheduleSit();
        });
      });
    });

    function setPaused(value) {
      paused = still || value;
      stage.classList.toggle("is-still", paused);
      applyFrame();
    }

    var pauseBtn = document.querySelector("[data-demo-pause]");
    if (pauseBtn) {
      pauseBtn.hidden = still;
      pauseBtn.addEventListener("click", function () {
        setPaused(!paused);
        pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
        pauseBtn.querySelector(".lang-zh").textContent = paused ? "继续" : "暂停";
        pauseBtn.querySelector(".lang-en").textContent = paused ? "Play" : "Pause";
      });
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        hidden = !entries[0].isIntersecting;
      }, { threshold: 0.2 });
      observer.observe(stage);
    }

    window.addEventListener("resize", applyFrame);
    play("idle");
    scheduleSit();
    if (!still) raf = requestAnimationFrame(tick);

    return {
      notifyScene: function () {
        if (busy || still || paused) return;
        play("look", function () {
          play(pointerInside ? "look" : "idle");
          scheduleSit();
        }, true);
      },
      stop: function () {
        cancelAnimationFrame(raf);
      }
    };
  }

  function initParallax(stage) {
    if (reducedMotion()) return;
    var bezel = stage.closest(".bezel") || stage;
    bezel.addEventListener("pointermove", function (event) {
      if (stage.classList.contains("is-still")) {
        stage.style.setProperty("--px", "0");
        stage.style.setProperty("--py", "0");
        return;
      }
      var box = bezel.getBoundingClientRect();
      var x = ((event.clientX - box.left) / box.width) * 2 - 1;
      var y = ((event.clientY - box.top) / box.height) * 2 - 1;
      stage.style.setProperty("--px", String(Math.max(-1, Math.min(1, x))));
      stage.style.setProperty("--py", String(Math.max(-1, Math.min(1, y))));
    });
    bezel.addEventListener("pointerleave", function () {
      stage.style.setProperty("--px", "0");
      stage.style.setProperty("--py", "0");
    });
  }

  function init() {
    var stage = document.querySelector("[data-demo-stage]");
    if (!stage) return;
    if (reducedMotion()) stage.classList.add("is-still");
    var pet = initPet(stage);
    initScenes(stage, function () {
      pet.notifyScene();
    });
    initParallax(stage);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
