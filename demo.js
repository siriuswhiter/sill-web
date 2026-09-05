(function () {
  var SCENES = ["clear", "constellation", "ripple", "forest", "ocean", "space"];

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getLang() {
    return document.documentElement.getAttribute("data-lang") || "zh";
  }

  /* ==========================================================================
     1. High-Tech Background Canvas (Interactive Particle & Neural Mesh)
     ========================================================================== */
  function initTechCanvas() {
    if (reducedMotion()) return;
    var canvas = document.getElementById("tech-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var width = (canvas.width = window.innerWidth);
    var height = (canvas.height = window.innerHeight);
    var particles = [];
    var count = Math.min(65, Math.max(25, Math.floor((width * height) / 22000)));
    var mouse = { x: -1000, y: -1000, active: false };
    var animId = 0;
    var isRunning = true;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize, { passive: true });

    window.addEventListener("pointermove", function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }, { passive: true });

    window.addEventListener("pointerleave", function () {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    }, { passive: true });

    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.5 + 0.8,
        alpha: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.4 ? "48, 191, 234" : (Math.random() > 0.5 ? "108, 232, 209" : "255, 181, 74")
      });
    }

    function render() {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        else if (p.y > height) p.y = 0;

        // Gravity repulsion with mouse cursor
        if (mouse.active) {
          var dx = mouse.x - p.x;
          var dy = mouse.y - p.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            var force = (140 - dist) / 140;
            p.x -= (dx / dist) * force * 1.2;
            p.y -= (dy / dist) * force * 1.2;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.color + ", " + p.alpha + ")";
        ctx.fill();

        // Connect lines to nearby particles
        for (var j = i + 1; j < particles.length; j++) {
          var p2 = particles[j];
          var distSq = (p.x - p2.x) * (p.x - p2.x) + (p.y - p2.y) * (p.y - p2.y);
          if (distSq < 130 * 130) {
            var d = Math.sqrt(distSq);
            var lineAlpha = (1 - d / 130) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = "rgba(48, 191, 234, " + lineAlpha + ")";
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    }

    render();

    // Pause when tab not visible to save GPU
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animId);
      } else {
        isRunning = true;
        render();
      }
    });
  }

  /* ==========================================================================
     2. Interactive Card Spotlight (Mouse-Follow Radial Glow)
     ========================================================================== */
  function initSpotlightCards() {
    var cards = document.querySelectorAll("[data-spotlight]");
    if (!cards.length) return;

    function handlePointerMove(e) {
      cards.forEach(function (card) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", x + "px");
        card.style.setProperty("--mouse-y", y + "px");
      });
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
  }

  /* ==========================================================================
     3. Scene Switcher
     ========================================================================== */
  function initScenes(stage, onChange) {
    var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-set-scene]"));
    if (!tabs.length) return function () {};

    function currentIndex() {
      var scene = stage.getAttribute("data-scene") || "clear";
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

    setScene(stage.getAttribute("data-scene") || "clear", false, true);
    return setScene;
  }

  /* ==========================================================================
     4. Interactive Pet Pobb (Pure 2D Pokemon Mascot & Mood Reactions)
     ========================================================================== */
  function initPet(stage) {
    var sprite = stage.querySelector("[data-pet-sprite]");
    var pet = stage.querySelector("[data-pet]");
    var mood = document.querySelector("[data-pet-mood]");
    if (!sprite || !pet) {
      return {
        notifyScene: function () {},
        poke: function () {},
        stop: function () {}
      };
    }

    var still = reducedMotion();
    var paused = still;
    var hidden = false;
    var clip = "idle";
    var lookTimer = 0;
    var leaveTimer = 0;
    var sitTimer = 0;
    var moodTimer = 0;
    var pointerInside = false;
    var busy = false;

    var MOOD_DURATIONS = {
      idle: 0,
      look: 0,
      poke: 750,
      surprise: 850,
      sit: 4200
    };

    function setMood(id) {
      var copy = {
        idle: {
          zh: "文件和文本拖进岛里，随时再取走。点击岛上的卡片或桌宠“核核”试试。",
          en: "Drop files or text onto the island, grab back anytime. Click companion Pobb or tiles to interact."
        },
        look: {
          zh: "核核注意到你的光标了，圆滚滚的耳朵微微耸起。",
          en: "Pobb noticed your cursor, perking up its round fuzzy ears."
        },
        poke: {
          zh: "核核被戳了一下，轻快缩回又好奇地探出头！",
          en: "Pobb flinches softly, then bounces back with bright eyes!"
        },
        surprise: {
          zh: "新内容入岛！核核背上的液态玻璃鳞甲泛起水光。",
          en: "New item dropped! Pobb's liquid glass scales glow with surprise."
        },
        sit: {
          zh: "核核把小爪爪揣在肚皮下，在置物岛边沿打盹。",
          en: "Pobb tucks its paws like a cozy loaf on the island shelf."
        }
      };
      var text = copy[id] || copy.idle;
      stage.setAttribute("data-pet-mood", id);
      if (!mood) return;
      var zh = mood.querySelector(".lang-zh");
      var en = mood.querySelector(".lang-en");
      if (zh) zh.textContent = text.zh;
      if (en) en.textContent = text.en;
    }

    function play(name, after) {
      clip = name;
      busy = (name === "poke" || name === "surprise");
      setMood(name);
      clearTimeout(moodTimer);

      var dur = MOOD_DURATIONS[name] || 0;
      if (dur > 0 && !still && !paused) {
        moodTimer = setTimeout(function () {
          busy = false;
          if (after) after();
          else if (!pointerInside) play("idle");
          else play("look");
        }, dur);
      } else {
        if (after) after();
      }
    }

    function scheduleSit() {
      clearTimeout(sitTimer);
      if (still || paused) return;
      sitTimer = setTimeout(function () {
        if (!pointerInside && !busy && clip === "idle") {
          play("sit", function () {
            play("idle");
          });
        }
      }, 14000);
    }

    function lookSoon() {
      clearTimeout(lookTimer);
      lookTimer = setTimeout(function () {
        if (pointerInside && !busy) play("look");
      }, 220);
    }

    function triggerPoke() {
      if (busy) return;
      play("poke", function () {
        play(pointerInside ? "look" : "idle");
        scheduleSit();
      });
    }

    pet.addEventListener("click", triggerPoke);

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
    }

    var pauseBtn = document.querySelector("[data-demo-pause]");
    if (pauseBtn) {
      pauseBtn.hidden = still;
      pauseBtn.addEventListener("click", function () {
        setPaused(!paused);
        pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
        pauseBtn.classList.toggle("is-paused", paused);
      });
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        hidden = !entries[0].isIntersecting;
      }, { threshold: 0.2 });
      observer.observe(stage);
    }

    play("idle");
    scheduleSit();

    return {
      poke: triggerPoke,
      notifyScene: function () {
        if (busy || still || paused) return;
        play("look", function () {
          play(pointerInside ? "look" : "idle");
          scheduleSit();
        });
      },
      stop: function () {
        clearTimeout(moodTimer);
        clearTimeout(sitTimer);
        clearTimeout(lookTimer);
        clearTimeout(leaveTimer);
      }
    };
  }

  /* ==========================================================================
     5. Parallax Motion on Stage
     ========================================================================== */
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

  /* ==========================================================================
     6. Stage Mode Switcher (Expanded vs Collapsed vs Menubar)
     ========================================================================== */
  function initModeSwitcher(stage) {
    var modeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-set-mode]"));
    if (!modeButtons.length) return;

    function setMode(mode) {
      stage.setAttribute("data-stage-mode", mode);
      modeButtons.forEach(function (btn) {
        var on = btn.getAttribute("data-set-mode") === mode;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.classList.toggle("active", on);
      });
    }

    modeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setMode(btn.getAttribute("data-set-mode"));
      });
    });

    var pill = stage.querySelector("[data-notch-pill]");
    if (pill) {
      pill.addEventListener("click", function () {
        setMode("expanded");
      });
    }
  }

  /* ==========================================================================
     7. Tile Interactions & Live Toast HUD
     ========================================================================== */
  function initTileActions(stage) {
    var toast = stage.querySelector("[data-island-toast]");
    var toastTimer = null;

    function showToast(msgZh, msgEn) {
      if (!toast) return;
      var lang = getLang();
      toast.querySelector(".toast-text").textContent = lang === "zh" ? msgZh : msgEn;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.classList.remove("show");
      }, 2600);
    }

    stage.querySelectorAll(".tile").forEach(function (tile) {
      tile.addEventListener("click", function (e) {
        e.stopPropagation();
        var type = tile.getAttribute("data-tile-type");
        if (type === "file") {
          showToast("已固定长存：brief.pdf · 拖拽可放入任意 App", "Pinned: brief.pdf · Drag into any app");
        } else if (type === "image") {
          showToast("已复制 dusk.jpg 到剪贴板", "Copied dusk.jpg to clipboard");
        } else if (type === "text") {
          showToast("已复制便签文本到剪贴板", "Copied note text to clipboard");
        } else if (type === "sensitive") {
          var locked = tile.classList.contains("unlocked");
          if (locked) {
            tile.classList.remove("unlocked");
            showToast("已恢复隐私遮罩 (****)", "Re-locked sensitive item (****)");
          } else {
            tile.classList.add("unlocked");
            showToast("Touch ID 验证成功 · 已解锁隐私内容", "Touch ID verified · Sensitive item unlocked");
          }
        }
      });
    });
  }

  /* ==========================================================================
     8. Touch ID Biometric Vault Demo Card
     ========================================================================== */
  function initSensitiveVault() {
    var vaultCard = document.querySelector("[data-vault-demo]");
    if (!vaultCard) return;
    var btn = vaultCard.querySelector("[data-vault-unlock]");
    var secretText = vaultCard.querySelector("[data-vault-text]");
    var badge = vaultCard.querySelector("[data-vault-badge]");
    if (!btn || !secretText) return;

    var isUnlocked = false;

    btn.addEventListener("click", function () {
      isUnlocked = !isUnlocked;
      if (isUnlocked) {
        secretText.textContent = "sk_live_9a7b6c5d4e3f2g1h0i";
        secretText.classList.add("revealed");
        btn.querySelector(".lang-zh").textContent = "锁定内容";
        btn.querySelector(".lang-en").textContent = "Lock";
        if (badge) {
          badge.querySelector(".lang-zh").textContent = "Touch ID 已解锁";
          badge.querySelector(".lang-en").textContent = "Touch ID Unlocked";
          badge.classList.add("unlocked");
        }
      } else {
        secretText.textContent = "••••••••••••••••••••••••";
        secretText.classList.remove("revealed");
        btn.querySelector(".lang-zh").textContent = "验证解锁";
        btn.querySelector(".lang-en").textContent = "Unlock";
        if (badge) {
          badge.querySelector(".lang-zh").textContent = "需 Touch ID 验证";
          badge.querySelector(".lang-en").textContent = "Touch ID Protected";
          badge.classList.remove("unlocked");
        }
      }
    });
  }

  /* ==========================================================================
     9. FAQ Accordion
     ========================================================================== */
  function initFaqAccordion() {
    var items = document.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      var question = item.querySelector(".faq-question");
      if (!question) return;
      question.addEventListener("click", function () {
        var isOpen = item.classList.contains("open");
        items.forEach(function (other) {
          if (other !== item) {
            other.classList.remove("open");
            var btn = other.querySelector(".faq-question");
            if (btn) btn.setAttribute("aria-expanded", "false");
          }
        });
        item.classList.toggle("open", !isOpen);
        question.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      });
    });
  }

  /* ==========================================================================
     10. External Trigger Poke Buttons
     ========================================================================== */
  function initExternalPetButtons(pet) {
    var pokeBtns = document.querySelectorAll("[data-trigger-poke]");
    pokeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        pet.poke();
      });
    });
  }

  /* ==========================================================================
     Entry Initializer
     ========================================================================== */
  function init() {
    initTechCanvas();
    initSpotlightCards();
    var stage = document.querySelector("[data-demo-stage]");
    if (!stage) return;
    if (reducedMotion()) stage.classList.add("is-still");
    var pet = initPet(stage);
    initScenes(stage, function () {
      pet.notifyScene();
    });
    initParallax(stage);
    initModeSwitcher(stage);
    initTileActions(stage);
    initSensitiveVault();
    initFaqAccordion();
    initExternalPetButtons(pet);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
