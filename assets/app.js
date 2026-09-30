/* 33 % — thème, progression, chapitres, devinettes, indice d'optimisme. Rien n'est envoyé nulle part. */
(function () {
  "use strict";
  var root = document.documentElement;
  var nf = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 1 });

  /* thème */
  var tb = document.querySelector(".theme");
  if (tb) tb.addEventListener("click", function () {
    var dark = root.getAttribute("data-theme") ? root.getAttribute("data-theme") === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    var next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("tiers-theme", next); } catch (e) {}
  });

  /* progression */
  var bar = document.querySelector(".progress span");
  function prog() {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (h > 0 ? Math.min(100, scrollY / h * 100) : 0) + "%";
  }
  addEventListener("scroll", prog, { passive: true }); prog();

  /* chapitre courant */
  var chap = document.querySelector(".chap"), sum = chap && chap.querySelector("summary");
  var links = chap ? Array.prototype.slice.call(chap.querySelectorAll("a")) : [];
  links.forEach(function (a) { a.addEventListener("click", function () { chap.removeAttribute("open"); }); });
  if ("IntersectionObserver" in window && links.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + e.target.id;
          a.setAttribute("aria-current", on ? "true" : "false");
          if (on) sum.textContent = a.querySelector(".cn-t").textContent;
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var t = document.getElementById(a.getAttribute("href").slice(1)); if (t) io.observe(t); });
  }
  document.addEventListener("click", function (e) { if (chap && chap.open && !chap.contains(e.target)) chap.removeAttribute("open"); });

  /* devinettes */
  function fmt(v, unit) {
    if (unit.trim() === "h") { var h = Math.floor(v), m = Math.round((v - h) * 60); if (m === 60) { h++; m = 0; } return h + " h " + (m < 10 ? "0" : "") + m; }
    return nf.format(v) + unit;
  }
  var answers = {};
  var guesses = Array.prototype.slice.call(document.querySelectorAll("[data-guess]"));
  guesses.forEach(function (g) {
    var ui = g.querySelector(".g-ui"), r = g.querySelector(".g-range"), o = g.querySelector("output"), go = g.querySelector(".g-go");
    var unit = g.getAttribute("data-unit") || "", scale = parseFloat(g.getAttribute("data-scale"));
    ui.hidden = false;
    function show() { o.textContent = fmt(parseFloat(r.value), unit); }
    r.addEventListener("input", show); show();
    go.addEventListener("click", function () {
      var v = parseFloat(r.value), a = parseFloat(g.getAttribute("data-answer"));
      var you = g.querySelector("[data-you]");
      you.hidden = false;
      you.querySelector(".b-fill").style.setProperty("--v", Math.max(0, Math.min(100, v / scale * 100)) + "%");
      you.querySelector(".b-v").textContent = fmt(v, unit);
      var span = parseFloat(g.getAttribute("data-max")) - parseFloat(g.getAttribute("data-min"));
      var err = (v - a) / span, bias = g.getAttribute("data-bias");
      var verdict = Math.abs(err) < 0.04 ? "Dans le mille." : (bias === "none" ? (Math.abs(err) < 0.12 ? "Pas loin." : "Raté, mais vous n'êtes pas seul.") :
        ((bias === "up" ? err : -err) > 0 ? "Vous étiez plus optimiste que la réalité." : "Vous étiez plus pessimiste que la réalité. C'est rare."));
      var ans = g.querySelector(".g-ans");
      if (!ans.querySelector(".g-verdict")) { var s = document.createElement("span"); s.className = "g-verdict"; ans.insertBefore(s, ans.firstChild); }
      ans.querySelector(".g-verdict").textContent = verdict;
      g.classList.add("done"); r.disabled = true; go.disabled = true; go.textContent = "Réponse enregistrée";
      answers[g.id] = { v: v, a: a, ad: g.getAttribute("data-answer-display"), err: err, bias: bias, unit: unit };
      score();
    });
  });

  /* indice d'optimisme */
  var box = document.querySelector("[data-score]");
  var LEVELS = [
    [20, "Ministre du Budget", "Vous croyez aux hypothèses. Toutes. Le Comité de monitoring aimerait vous rencontrer, de préférence avant le prochain conclave."],
    [8, "Porte-parole du kern", "Optimiste, mais présentable. Vous voyez le gâteau cuire là où d'autres ne voient que le four."],
    [-8, "Conseiller à la Cour des comptes", "Lucide et documenté. Personne ne vous invitera plus aux conclaves."],
    [-999, "Cynique certifié", "Vous avez imaginé pire que la réalité. C'est rare, et un peu inquiétant. Félicitations, ou condoléances."]
  ];
  function score() {
    if (!box) return;
    var ks = Object.keys(answers), biased = ks.filter(function (k) { return answers[k].bias !== "none"; });
    if (!ks.length) return;
    var list = ks.map(function (k) { var x = answers[k]; return "<li><span>" + (guesses.indexOf(document.getElementById(k)) + 1) + ". Vous : " + fmt(x.v, x.unit) + "</span><span>Réalité : " + (x.ad || fmt(x.a, x.unit)) + "</span></li>"; }).join("");
    if (biased.length < 3) {
      box.innerHTML = "<p class='s-label'>Indice en cours</p><p class='s-desc'>Encore " + (3 - biased.length) + " devinette" + (3 - biased.length > 1 ? "s" : "") + " pour obtenir votre indice.</p><ul class='s-list'>" + list + "</ul>";
      return;
    }
    var avg = biased.reduce(function (s, k) { var x = answers[k]; return s + (x.bias === "up" ? x.err : -x.err); }, 0) / biased.length * 100;
    var idx = Math.round(avg), lvl = LEVELS.filter(function (l) { return idx > l[0]; })[0] || LEVELS[3];
    var pos = Math.max(0, Math.min(100, 50 + idx * 1.25));
    box.innerHTML = "<p class='s-label'>Indice : " + (idx > 0 ? "+" : "") + idx + " · vous êtes</p><p class='s-big'>" + lvl[1] + "</p><p class='s-desc'>" + lvl[2] + "</p>" +
      "<div class='s-meter' role='img' aria-label='Indice " + idx + " sur une échelle allant de pessimiste à optimiste'><span class='s-dot' style='left:" + pos + "%'></span></div><div class='s-ends'><span>Plus pessimiste que les faits</span><span>Plus optimiste que les faits</span></div>" +
      "<ul class='s-list'>" + list + "</ul><button class='s-copy' type='button'>Copier mon résultat</button>";
    var btn = box.querySelector(".s-copy");
    btn.addEventListener("click", function () {
      var txt = "Mon indice d'optimisme sur « 33 % » : " + (idx > 0 ? "+" : "") + idx + " (" + lvl[1] + ")." + (location.protocol.indexOf("http") === 0 ? " " + location.href.split("#")[0] : "");
      function ok() { btn.textContent = "Copié"; }
      try { navigator.clipboard.writeText(txt).then(ok, function () { btn.textContent = txt; }); } catch (e) { btn.textContent = txt; }
    });
  }
})();
