/* MEISTER — interactions & animations */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav : fond au scroll + burger mobile ---------- */
  var nav = document.getElementById("nav");
  var navLinks = document.getElementById("navLinks");
  var burger = document.getElementById("navBurger");

  function onNavScroll() {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onNavScroll, { passive: true });
  onNavScroll();

  burger.addEventListener("click", function () {
    var open = navLinks.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  });
  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
  });

  /* ---------- Reveal au scroll ----------
     Vérification par getBoundingClientRect (plus fiable que
     IntersectionObserver dans les iframes/aperçus sandboxés). */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  function checkReveals() {
    if (!revealEls.length) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls = revealEls.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) {
        el.classList.add("is-visible");
        return false;
      }
      return true;
    });
  }
  if (prefersReducedMotion) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    revealEls = [];
  }
  checkReveals();
  window.addEventListener("scroll", checkReveals, { passive: true });
  window.addEventListener("resize", checkReveals, { passive: true });
  window.addEventListener("load", checkReveals);

  /* ---------- Statut ouvert / fermé ----------
     lun-jeu 11:30-02:00 · ven 11:30-03:00 · sam 11:30-03:00 · dim 12:00-02:00
     (fermeture = lendemain matin) */
  var HOURS = {
    0: { open: 12 * 60, close: 2 * 60 },  // dimanche
    1: { open: 11.5 * 60, close: 2 * 60 },
    2: { open: 11.5 * 60, close: 2 * 60 },
    3: { open: 11.5 * 60, close: 2 * 60 },
    4: { open: 11.5 * 60, close: 2 * 60 },
    5: { open: 11.5 * 60, close: 3 * 60 }, // vendredi
    6: { open: 11.5 * 60, close: 3 * 60 }  // samedi
  };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmt(mins) { return pad(Math.floor(mins / 60) % 24) + "h" + pad(mins % 60); }

  function updateStatus() {
    var now = new Date();
    var day = now.getDay();
    var mins = now.getHours() * 60 + now.getMinutes();
    var today = HOURS[day];
    var yesterday = HOURS[(day + 6) % 7];

    var isOpen = false, closesAt = null, opensAt = null;

    if (mins < yesterday.close) {           // encore ouvert depuis la veille (après minuit)
      isOpen = true; closesAt = yesterday.close;
    } else if (mins >= today.open) {        // service du jour
      isOpen = true; closesAt = today.close;
    } else {
      opensAt = today.open;
    }

    var dot = document.getElementById("statusDot");
    var txt = document.getElementById("statusText");
    if (!dot || !txt) return;
    dot.classList.toggle("is-open", isOpen);
    dot.classList.toggle("is-closed", !isOpen);
    txt.textContent = isOpen
      ? "Ouvert · ferme à " + fmt(closesAt)
      : "Fermé · ouvre à " + fmt(opensAt);

    // surligner le jour courant dans le tableau des horaires
    document.querySelectorAll("#hoursTable tr").forEach(function (tr) {
      tr.classList.toggle("is-today", Number(tr.dataset.day) === day);
    });
  }
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* ---------- Visualiseur 3D : toute la carte, ingrédient par ingrédient ---------- */
  var donerSection = document.querySelector(".doner");
  var donerScene = document.getElementById("donerScene");
  var stacks = Array.prototype.slice.call(document.querySelectorAll(".doner__stack"));
  var lists = Array.prototype.slice.call(document.querySelectorAll(".doner__ingredients"));
  var hint = document.getElementById("donerHint");

  var stack = null, shadow = null, state = [], items = [];
  var rotXBase = 56, spreadK = 1, gapBase = 8;

  function currentDish() {
    var checked = document.querySelector('input[name="dish"]:checked');
    return checked ? checked.value : (stacks[0] ? stacks[0].dataset.dish : "");
  }

  // (re)lie la pile et la liste du plat sélectionné ; assemble = animation d'apparition
  function bindDish(assemble) {
    var dish = currentDish();
    stack = null;
    stacks.forEach(function (s) { if (s.dataset.dish === dish) stack = s; });
    var list = null;
    lists.forEach(function (l) { if (l.dataset.dish === dish) list = l; });
    shadow = stack ? stack.querySelector(".doner__shadow") : null;
    items = list ? Array.prototype.slice.call(list.querySelectorAll("li")) : [];
    rotXBase = stack ? (parseFloat(stack.dataset.rotx) || 56) : 56;
    spreadK = stack ? (parseFloat(stack.dataset.spread) || 1) : 1;
    gapBase = stack ? (parseFloat(stack.dataset.gapbase) || 8) : 8;

    var layers = stack ? Array.prototype.slice.call(stack.querySelectorAll(".slayer")) : [];
    state = layers.map(function (el, i) {
      var box = list ? list.querySelector('input[value="' + el.dataset.group + '"]') : null;
      var on = !box || box.checked;
      return {
        el: el, group: el.dataset.group, on: on,
        dx: parseFloat(el.dataset.dx) || 0,
        dy: parseFloat(el.dataset.dy) || 0,
        tilt: parseFloat(el.dataset.tilt) || 0,
        presence: (assemble && !prefersReducedMotion) ? 0 : (on ? 1 : 0),
        z: 0,
        wait: (assemble && !prefersReducedMotion) ? 6 + i * 7 : 0
      };
    });

    if (prefersReducedMotion && stack) {
      var n = state.length;
      state.forEach(function (s, i) {
        s.el.style.transform =
          "translate3d(" + s.dx + "px," + s.dy + "px," + (((n - 1) / 2 - i) * 26) + "px)" +
          " rotateX(" + s.tilt + "deg)";
        s.el.style.opacity = "";
        s.el.classList.toggle("is-off", !s.on);
      });
      if (shadow) shadow.style.transform = "translateZ(" + (-((n - 1) / 2) * 26 - 50) + "px)";
      items.forEach(function (li) { li.classList.add("is-passed"); });
    }
  }

  // délégation : choix du plat + cases d'ingrédients
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "dish") { bindDish(true); return; }
    if (t.type === "checkbox" && t.closest(".doner__ingredients")) {
      state.forEach(function (s) {
        if (s.group === t.value) {
          s.on = t.checked;
          if (prefersReducedMotion) s.el.classList.toggle("is-off", !t.checked);
        }
      });
    }
  });

  bindDish(true);

  var progress = 0;      // valeur lissée
  var target = 0;        // valeur brute issue du scroll
  var pointerX = 0, pointerY = 0, smoothPX = 0, smoothPY = 0;

  function computeTarget() {
    if (!donerSection) return;
    var rect = donerSection.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    if (total <= 0) { target = 1; return; }
    target = Math.min(1, Math.max(0, -rect.top / total));
  }

  // léger parallaxe/tilt à la souris (desktop)
  window.addEventListener("pointermove", function (e) {
    pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  var idleT = 0;
  var frame = 0;

  function render() {
    frame++;
    if (frame % 20 === 0) checkReveals();

    // si la page ne peut pas scroller (aperçu iframe étendu), boucle automatique
    var scrollable = document.documentElement.scrollHeight - window.innerHeight > 300;
    if (scrollable) {
      computeTarget();
    } else {
      target = 0.5 - 0.5 * Math.cos(idleT * 1.1);
    }
    progress += (target - progress) * 0.09;
    smoothPX += (pointerX - smoothPX) * 0.05;
    smoothPY += (pointerY - smoothPY) * 0.05;
    idleT += 0.008;

    var explode = easeInOut(Math.min(1, progress * 1.15)); // 0 → empilé, 1 → décomposé
    var spin = progress * 160;
    var float = Math.sin(idleT * 2) * 6;

    if (stack) {
      stack.style.transform =
        "rotateX(" + (rotXBase + smoothPY * 5) + "deg)" +
        " rotateZ(" + (-32 + spin + smoothPX * 8) + "deg)" +
        " translateZ(" + float + "px)";

      var sceneH = donerScene ? donerScene.clientHeight : 500;
      var spread = Math.min(sceneH * 0.8, 440) * spreadK;
      var selectedCount = 0;
      state.forEach(function (s) { if (s.on) selectedCount++; });
      var Non = Math.max(selectedCount, 2);
      var gap = gapBase + explode * spread / (Non - 1);
      var slot = 0;

      state.forEach(function (s, i) {
        var zTarget = s.z;
        if (s.on) { zTarget = ((Non - 1) / 2 - slot) * gap; slot++; }
        if (s.wait > 0) { s.wait--; }
        else s.presence += ((s.on ? 1 : 0) - s.presence) * 0.1;
        s.z += (zTarget - s.z) * 0.14;
        var wobble = Math.sin(idleT * 2 + i * 0.7) * explode * 4;
        var lift = (1 - s.presence) * 230; // l'ingrédient arrive et repart par le haut
        var k = 1 + explode * 0.8;         // la dispersion s'amplifie en se décomposant
        s.el.style.transform =
          "translate3d(" + (s.dx * k) + "px," + (s.dy * k) + "px," + (s.z + wobble + lift) + "px)" +
          " rotateX(" + s.tilt + "deg)" +
          " scale(" + (0.55 + 0.45 * s.presence) + ")";
        s.el.style.opacity = Math.max(0, Math.min(1, s.presence * 1.5 - 0.15));
      });

      var lowestZ = -((Non - 1) / 2) * gap;
      if (shadow) shadow.style.transform = "translateZ(" + (lowestZ - 50) + "px)";
    }

    // ingrédient actif selon la progression, parmi les cochés
    var activeItems = items.filter(function (li) {
      var box = li.querySelector("input");
      return !box || box.checked;
    });
    var idx = Math.min(activeItems.length - 1, Math.floor(explode * activeItems.length));
    items.forEach(function (li) { li.classList.remove("is-active", "is-passed"); });
    activeItems.forEach(function (li, i) {
      li.classList.toggle("is-active", i === idx && explode > 0.04);
      li.classList.toggle("is-passed", i < idx);
    });

    if (hint) hint.classList.toggle("is-hidden", progress > 0.5);

    requestAnimationFrame(render);
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  if (stack && !prefersReducedMotion) {
    requestAnimationFrame(render);
  }

  /* ---------- Divers ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
