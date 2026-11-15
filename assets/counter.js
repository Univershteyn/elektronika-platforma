/* Sayt hisoblagichi. Ochiq publishable kalit (maxfiy emas).
   Repoda tayyor Supabase klient topilmadi — shu kalit REST RPC orqali ishlatiladi.
   Supabase ishlamasa sahifa buzilmasin: xatolar yutiladi, bir marta ogohlantiriladi. */
(function () {
  if (window.__elabHisoblagich) return;
  window.__elabHisoblagich = true;

  var URL = "https://nwiwfqsdydqmyaqoqzzg.supabase.co";
  var KEY = "sb_publishable_XuOOoYK4hrCVg9nmhsvkfA_3HqbSndO";
  var STORE = "elektronika_visitor_v1";
  var BEAT_MS = 30000;
  var warned = {};

  function warn(scope, err) {
    if (warned[scope]) return;
    warned[scope] = true;
    try { console.warn("hisoblagich:", scope, err && err.message ? err.message : err); } catch (e) {}
  }

  function randomId() {
    var bytes = new Uint8Array(16);
    try {
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
      else throw new Error("no crypto");
    } catch (e) {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    var hex = "";
    for (var j = 0; j < bytes.length; j++) hex += ("0" + bytes[j].toString(16)).slice(-2);
    return hex;
  }

  function visitorId() {
    try {
      var id = localStorage.getItem(STORE) || "";
      if (id.length >= 8 && id.length <= 64) return id;
      id = randomId();
      localStorage.setItem(STORE, id);
      return id;
    } catch (e) {
      return randomId();
    }
  }

  function pageName() {
    var path = (location.pathname || "/").toLowerCase();
    if (path.indexOf("laboratoriya") !== -1) return "laboratoriya";
    if (path.indexOf("maruza") !== -1) return "maruza";
    return "bosh";
  }

  function inLab() {
    try {
      if ((location.pathname || "").toLowerCase().indexOf("laboratoriya") === -1) return false;
      if (document.getElementById("gate")) return false;
      var S = window.ELAB && window.ELAB.S;
      return !!(S && S.student && S.labId);
    } catch (e) {
      return false;
    }
  }

  function rpc(name, body) {
    var opts = {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: "Bearer " + KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body || {}),
      credentials: "omit"
    };
    try {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        opts.signal = AbortSignal.timeout(8000);
      }
    } catch (e) {}
    return fetch(URL + "/rest/v1/rpc/" + name, opts).then(function (res) {
      if (!res.ok) throw new Error(name + " HTTP " + res.status);
      return res.text().then(function (text) {
        if (!text) return null;
        try { return JSON.parse(text); } catch (e) { return null; }
      });
    });
  }

  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function fmtInt(v) {
    var n = num(v);
    if (n == null) return "—";
    var rounded = Math.round(n);
    try { return rounded.toLocaleString("uz-UZ"); } catch (e) { return String(rounded); }
  }

  function fmtPct(v) {
    var n = num(v);
    if (n == null) return "—";
    var rounded = Math.round(n * 10) / 10;
    var text = Math.abs(rounded - Math.round(rounded)) < 0.05 ? String(Math.round(rounded)) : rounded.toFixed(1);
    return text + "%";
  }

  function setText(key, text) {
    var root = document.getElementById("site-stats");
    if (!root) return;
    var el = root.querySelector('[data-k="' + key + '"]');
    if (el) el.textContent = text;
  }

  function paint(stats) {
    if (!document.getElementById("site-stats")) return;
    var s = stats;
    if (typeof s === "string") {
      try { s = JSON.parse(s); } catch (e) { s = null; }
    }
    if (!s || typeof s !== "object") s = null;
    setText("visits", s ? fmtInt(s.visits_total) : "—");
    setText("today", "bugun: " + (s ? fmtInt(s.visits_today) : "—"));
    setText("users", s ? fmtInt(s.users_total) : "—");
    setText("lab", s ? fmtInt(s.in_lab_now) : "—");
    setText("online", "onlayn: " + (s ? fmtInt(s.online_now) : "—"));
    setText("quality", s ? fmtPct(s.lab_quality_pct) : "—");
    var graded = s ? num(s.labs_graded) : null;
    setText("graded", graded == null ? "—" : fmtInt(graded) + " ta baholangan ish");
  }

  function refreshStats() {
    if (!document.getElementById("site-stats")) return;
    rpc("get_site_stats", {}).then(function (data) {
      paint(data);
    }).catch(function (e) {
      warn("get_site_stats", e);
      paint(null);
    });
  }

  var visitor = "";
  var timer = 0;

  function visible() {
    return !document.visibilityState || document.visibilityState === "visible";
  }

  function beat() {
    if (!visible() || !visitor) return Promise.resolve();
    return rpc("heartbeat", { p_visitor: visitor, p_in_lab: inLab() }).catch(function (e) {
      warn("heartbeat", e);
    });
  }

  function arm(immediate) {
    if (timer) clearInterval(timer);
    timer = 0;
    if (!visible()) return Promise.resolve();
    var pending = immediate ? beat() : Promise.resolve();
    timer = setInterval(beat, BEAT_MS);
    return pending;
  }

  function boot() {
    visitor = visitorId();
    /* Statistikani tashrif yozilgach so‘raymiz, aks holda birinchi sonlar 0 bo‘lib qoladi. */
    rpc("track_visit", { p_visitor: visitor, p_page: pageName() }).catch(function (e) {
      warn("track_visit", e);
    }).then(function () {
      return arm(true);
    }).then(function () {
      refreshStats();
    });
    document.addEventListener("visibilitychange", function () {
      arm(true).then(refreshStats);
    });
    setInterval(refreshStats, BEAT_MS);
  }

  try {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  } catch (e) {
    warn("boot", e);
  }
})();
