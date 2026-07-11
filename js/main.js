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

  /* ---------- Döner 3D : décomposition au scroll ---------- */
  var donerSection = document.querySelector(".doner");
  var donerScene = document.getElementById("donerScene");
  var stack = document.getElementById("donerStack");
  var shadow = stack ? stack.querySelector(".doner__shadow") : null;
  var layers = stack ? Array.prototype.slice.call(stack.querySelectorAll(".slayer")) : [];
  var ingredients = document.querySelectorAll("#donerIngredients li");
  var hint = document.getElementById("donerHint");

  var N = layers.length; // 9 couches
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
    // filet de sécurité : re-vérifier les reveals même si l'event scroll ne vient pas
    if (frame % 20 === 0) checkReveals();

    // si la page ne peut pas scroller (aperçu iframe étendu), boucle automatique
    var scrollable = document.documentElement.scrollHeight - window.innerHeight > 300;
    if (scrollable) {
      computeTarget();
    } else {
      target = 0.5 - 0.5 * Math.cos(idleT * 1.1);
    }
    // interpolation pour une fluidité totale
    progress += (target - progress) * 0.09;
    smoothPX += (pointerX - smoothPX) * 0.05;
    smoothPY += (pointerY - smoothPY) * 0.05;
    idleT += 0.008;

    var explode = easeInOut(Math.min(1, progress * 1.15)); // 0 → empilé, 1 → décomposé
    var spin = progress * 160;                             // rotation continue pendant le scroll
    var float = Math.sin(idleT * 2) * 6;                   // flottement permanent

    if (stack) {
      stack.style.transform =
        "rotateX(" + (56 + smoothPY * 5) + "deg)" +
        " rotateZ(" + (-32 + spin + smoothPX * 8) + "deg)" +
        " translateZ(" + float + "px)";

      // amplitude totale de l'explosion, adaptée à la taille de la scène
      var sceneH = donerScene ? donerScene.clientHeight : 500;
      var spread = Math.min(sceneH * 0.8, 440);
      var gap = 8 + explode * spread / (N - 1);
      var lowestZ = -((N - 1) / 2) * gap;

      layers.forEach(function (layer, i) {
        // i=0 en haut, dernier en bas ; centré autour du milieu de la pile
        var offset = (N - 1) / 2 - i;
        var wobble = Math.sin(idleT * 2 + i * 0.7) * explode * 4;
        layer.style.transform = "translateZ(" + (offset * gap + wobble) + "px)";
      });
      if (shadow) shadow.style.transform = "translateZ(" + (lowestZ - 50) + "px)";
    }

    // ingrédient actif selon la progression (du haut vers le bas)
    var idx = Math.min(N - 1, Math.floor(explode * N));
    ingredients.forEach(function (li, i) {
      li.classList.toggle("is-active", i === idx && explode > 0.04);
      li.classList.toggle("is-passed", i < idx);
    });

    if (hint) hint.classList.toggle("is-hidden", progress > 0.08);

    requestAnimationFrame(render);
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  if (stack && !prefersReducedMotion) {
    requestAnimationFrame(render);
  } else if (stack) {
    // mouvement réduit : pile légèrement éclatée, statique
    stack.style.transform = "rotateX(56deg) rotateZ(-32deg)";
    layers.forEach(function (layer, i) {
      var offset = (N - 1) / 2 - i;
      layer.style.transform = "translateZ(" + offset * 26 + "px)";
    });
    if (shadow) shadow.style.transform = "translateZ(" + (-((N - 1) / 2) * 26 - 50) + "px)";
    ingredients.forEach(function (li) { li.classList.add("is-passed"); });
  }

  /* ---------- Divers ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
