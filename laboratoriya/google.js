/* Google kirish, mehmon rejimi va o‘qituvchi Drive jurnali.
   Talaba o‘z tokeni bilan o‘qituvchi Drive iga yozolmaydi. Yozuv o‘qituvchi
   joylagan Apps Script orqali, uning jadvaliga tushadi. Qisqa kod reestrda
   shu manzilga bog‘lanadi. Kalit repoda yo‘q. */
(function () {
  "use strict";
  const CFG = window.ELAB_GOOGLE || { clientId: "", registryUrl: "", templateUrl: "" };
  const KEY = "elektronika_google_v1";
  const MOCK_KEY = "elektronika_drive_mock_v1";
  const MOCK = /(?:\?|&)googleMock=1(?:&|$)/.test(location.search);
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nid = s => String(s || "").trim().toLowerCase().replace(/\s+/g, "");

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch (e) { return {}; }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }
  let state = load();
  let picking = false;

  function loadMock() {
    try { return JSON.parse(localStorage.getItem(MOCK_KEY) || "null") || { registry: {}, sheets: {} }; }
    catch (e) { return { registry: {}, sheets: {} }; }
  }
  function saveMock(m) { localStorage.setItem(MOCK_KEY, JSON.stringify(m)); }

  function makeCode() {
    const b = new Uint8Array(6);
    crypto.getRandomValues(b);
    let s = "";
    for (const n of b) s += ALPHA[n % ALPHA.length];
    return s;
  }
  function mailKey(s) {
    const e = String(s || "").trim().toLowerCase();
    const at = e.lastIndexOf("@");
    if (at < 1) return e;
    let user = e.slice(0, at);
    let host = e.slice(at + 1);
    if (host === "googlemail.com") host = "gmail.com";
    if (host === "gmail.com") {
      const plus = user.indexOf("+");
      if (plus >= 0) user = user.slice(0, plus);
      user = user.replace(/\./g, "");
    }
    return user + "@" + host;
  }
  function jwtPayload(token) {
    const p = String(token || "").split(".")[1] || "";
    const b = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
    const json = decodeURIComponent([...b].map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
    return JSON.parse(json);
  }
  function fakeJwt(payload) {
    const body = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    return "e30." + body + ".sig";
  }
  function validExec(url) {
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(url || "").trim());
  }

  function jsonp(url, params) {
    return new Promise((resolve, reject) => {
      const cb = "elabCb" + Math.random().toString(36).slice(2, 10);
      const s = document.createElement("script");
      const timer = setTimeout(() => { cleanup(); reject(new Error("Google javob bermadi")); }, 25000);
      function cleanup() { clearTimeout(timer); try { delete window[cb]; } catch (e) { } s.remove(); }
      window[cb] = data => { cleanup(); resolve(data); };
      const q = new URLSearchParams();
      Object.keys(params || {}).forEach(k => { if (params[k] != null) q.set(k, String(params[k])); });
      q.set("callback", cb);
      s.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + q.toString();
      s.onerror = () => { cleanup(); reject(new Error("Tarmoq xatosi")); };
      document.head.appendChild(s);
    });
  }
  async function postPlain(url, obj) {
    await fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(obj) });
  }
  async function postJson(url, obj) {
    const join = url.indexOf("?") >= 0 ? "&" : "?";
    const r = await fetch(url + join + "action=" + encodeURIComponent(obj.action || ""), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(obj)
    });
    const text = await r.text();
    try { return JSON.parse(text); }
    catch (e) { throw new Error("javob"); }
  }

  const net = {
    async lookup(code) {
      if (!CFG.registryUrl) throw new Error("Sinf kodi hali ulanmagan. Sayt egasi reestrni qo‘yadi. Hozircha mehmon sifatida davom eting — natija jurnalga yozilmaydi.");
      const r = await jsonp(CFG.registryUrl, { action: "lookup", code: code });
      if (!r || !r.ok) throw new Error("Kod topilmadi");
      return r;
    },
    async register(code, url, token) {
      if (!CFG.registryUrl) throw new Error("Sinf kodi hali ulanmagan. Sayt egasi reestrni qo‘yadi. Laboratoriya va lokal jurnal ishlaydi.");
      await postPlain(CFG.registryUrl, { action: "register", code: code, url: url, idToken: token });
      const r = await jsonp(CFG.registryUrl, { action: "lookup", code: code });
      if (!r || !r.ok) throw new Error("Kod reestrga yozilmadi");
      return r;
    },
    async setup(url, code, token) {
      await postPlain(url, { action: "setup", code: code, idToken: token, clientId: CFG.clientId });
      return { ok: true };
    },
    async result(url, body) {
      await postPlain(url, body);
      const ack = await jsonp(url, { action: "get", code: body.code, lab: body.lab && body.lab.id, idToken: body.idToken });
      if (!ack || !ack.ok || !ack.found) throw new Error("Jurnal tasdiqlanmadi");
      return ack;
    },
    async list(url, token) {
      const r = await jsonp(url, { action: "list", idToken: token });
      if (!r || !r.ok) throw new Error((r && r.error) || "Ro‘yxat olinmadi");
      return r;
    },
    async teacher(token) {
      if (!CFG.registryUrl) return { ok: false, error: "none" };
      return postJson(CFG.registryUrl, { action: "teacher", idToken: token });
    },
    async link(code, token) {
      if (!CFG.registryUrl) throw new Error("Sinf kodi hali ulanmagan. Sayt egasi reestrni qo‘yadi.");
      return postJson(CFG.registryUrl, { action: "link", code: code, idToken: token });
    },
    async mark(url, token, sub, lab, gradeOverride) {
      const r = await jsonp(url, { action: "mark", idToken: token, sub: sub, lab: lab, gradeOverride: gradeOverride == null ? "" : gradeOverride });
      return r || { ok: false, error: "mark" };
    },
    async note(url, token, sub, note) {
      const r = await jsonp(url, { action: "note", idToken: token, sub: sub, note: note });
      return r || { ok: false, error: "note" };
    },
    async drop(url, token, sub) {
      const r = await jsonp(url, { action: "drop", idToken: token, sub: sub });
      return r || { ok: false, error: "drop" };
    },
    async gradeOf(url, token, code, lab) {
      return jsonp(url, { action: "get", code: code, lab: lab, idToken: token });
    }
  };
  const mock = {
    async lookup(code) {
      const m = loadMock();
      const row = m.registry[String(code || "").toUpperCase()];
      if (!row) throw new Error("Kod topilmadi");
      return { ok: true, code: code.toUpperCase(), url: row.url, teacherName: row.name, teacherEmail: row.email };
    },
    async register(code, url, token) {
      const info = jwtPayload(token);
      const m = loadMock();
      const prev = m.registry[code];
      if (prev && prev.email !== info.email) throw new Error("taken");
      Object.keys(m.registry).forEach(k => {
        if (m.registry[k].email === info.email && k !== code) delete m.registry[k];
      });
      m.registry[code] = { url: url, email: info.email, sub: info.sub, name: info.name || info.email };
      saveMock(m);
      return { ok: true, code: code, url: url };
    },
    async teacher(token) {
      const info = jwtPayload(token);
      if (!info || !info.exp || Number(info.exp) * 1000 < Date.now()) return { ok: false, error: "token" };
      const m = loadMock();
      const code = Object.keys(m.registry).find(c => {
        const row = m.registry[c];
        return row && ((row.sub && row.sub === info.sub) || (row.email && mailKey(row.email) === mailKey(info.email)));
      });
      if (!code) return { ok: false, error: "none" };
      const row = m.registry[code];
      if (!row.sub) { row.sub = info.sub; row.email = row.email || info.email; saveMock(m); }
      return { ok: true, code: code, url: row.url, teacherName: row.name, teacherEmail: row.email, sub: row.sub || info.sub };
    },
    async link(code, token) {
      const info = jwtPayload(token);
      const m = loadMock();
      code = String(code || "").toUpperCase();
      const row = m.registry[code];
      if (!row) return { ok: false, error: "code" };
      if (row.sub && row.sub === info.sub) return { ok: true, code: code, url: row.url, teacherName: row.name, teacherEmail: row.email, sub: row.sub };
      if (row.email && row.email === info.email) {
        row.sub = info.sub;
        saveMock(m);
        return { ok: true, code: code, url: row.url, teacherName: row.name, teacherEmail: row.email, sub: row.sub };
      }
      if (row.email && row.email !== info.email) return { ok: false, error: "taken" };
      const owner = m.sheets[code] && m.sheets[code].email;
      if (!owner) return { ok: false, error: "whoami" };
      if (owner !== info.email) return { ok: false, error: "owner" };
      row.email = info.email;
      row.sub = info.sub;
      row.name = info.name || row.name || info.email;
      saveMock(m);
      return { ok: true, code: code, url: row.url, teacherName: row.name, teacherEmail: row.email, sub: row.sub };
    },
    async setup(url, code, token) {
      const info = jwtPayload(token);
      const m = loadMock();
      let rows = {}, notes = {};
      Object.keys(m.sheets).forEach(c => {
        if (m.sheets[c].email === info.email) {
          Object.assign(rows, m.sheets[c].rows || {});
          Object.assign(notes, m.sheets[c].notes || {});
          delete m.sheets[c];
        }
      });
      m.sheets[code] = { email: info.email, clientId: CFG.clientId || "mock", rows: rows, notes: notes };
      saveMock(m);
      return { ok: true };
    },
    async result(url, body) {
      const code = String(body.code || "").toUpperCase();
      const info = jwtPayload(body.idToken);
      const m = loadMock();
      const sh = m.sheets[code];
      if (!sh) throw new Error("Jurnal topilmadi");
      const lab = body.lab || {};
      const key = info.sub + "|" + lab.id;
      sh.rows[key] = { sub: info.sub, email: info.email, ism: body.ism, familiya: body.familiya, kurs: body.kurs, guruh: body.guruh, lab: lab, updated: new Date().toISOString() };
      saveMock(m);
      return { ok: true, found: true };
    },
    async list(url, token) {
      const info = jwtPayload(token);
      const m = loadMock();
      const code = Object.keys(m.registry).find(c => {
        const row = m.registry[c];
        return row && (row.url === url || String(url).indexOf(c) >= 0) && (row.email === info.email || row.sub === info.sub);
      }) || Object.keys(m.sheets).find(c => m.sheets[c].email === info.email);
      if (!code || !m.sheets[code]) return { ok: true, rows: [], marks: true, notes: {} };
      return { ok: true, rows: Object.values(m.sheets[code].rows || {}), marks: true, notes: m.sheets[code].notes || {} };
    },
    async mark(url, token, sub, lab, gradeOverride) {
      const info = jwtPayload(token);
      const m = loadMock();
      const code = Object.keys(m.sheets).find(c => m.sheets[c].email === info.email);
      if (!code) return { ok: false, error: "teacher" };
      const row = m.sheets[code].rows[sub + "|" + lab];
      if (!row || !row.lab) return { ok: false, error: "row" };
      if (gradeOverride === "" || gradeOverride == null) delete row.lab.gradeOverride;
      else row.lab.gradeOverride = Number(gradeOverride);
      saveMock(m);
      return { ok: true };
    },
    async note(url, token, sub, note) {
      const info = jwtPayload(token);
      const m = loadMock();
      const code = Object.keys(m.sheets).find(c => m.sheets[c].email === info.email);
      if (!code) return { ok: false, error: "teacher" };
      m.sheets[code].notes = m.sheets[code].notes || {};
      m.sheets[code].notes[sub] = String(note || "").slice(0, 2000);
      saveMock(m);
      return { ok: true };
    },
    async drop(url, token, sub) {
      const info = jwtPayload(token);
      const m = loadMock();
      const code = Object.keys(m.sheets).find(c => m.sheets[c].email === info.email);
      if (!code) return { ok: false, error: "teacher" };
      Object.keys(m.sheets[code].rows || {}).forEach(k => { if (k.indexOf(sub + "|") === 0) delete m.sheets[code].rows[k]; });
      if (m.sheets[code].notes) delete m.sheets[code].notes[sub];
      saveMock(m);
      return { ok: true };
    },
    async gradeOf(url, token, code, lab) {
      const info = jwtPayload(token);
      const m = loadMock();
      const sh = m.sheets[String(code || "").toUpperCase()];
      if (!sh) return { ok: false, error: "code" };
      const row = sh.rows[info.sub + "|" + lab];
      if (!row || !row.lab) return { ok: true, found: false };
      return { ok: true, found: true, score: row.lab.score, gradeOverride: row.lab.gradeOverride == null ? null : row.lab.gradeOverride };
    }
  };
  const api = () => MOCK ? mock : net;

  function allowJournal() { return state.mode === "student" || state.mode === "teacher"; }

  function css() {
    if (document.getElementById("gCss")) return;
    const s = document.createElement("style");
    s.id = "gCss";
    s.textContent = `
#gOverlay{position:fixed;inset:0;z-index:2147483001;background:rgba(2,6,23,.72);display:flex;align-items:safe center;justify-content:center;padding:16px;overflow:auto}
#gOverlay[hidden]{display:none}
.gcard{width:min(460px,100%);background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:14px;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.45);margin:auto}
.gcard h2{margin:0 0 8px;font-size:20px}
.gcard p{color:#94a3b8;font-size:13.5px;line-height:1.45}
.gcard label{display:block;font-size:13px;margin:8px 0 4px}
.gcard input,.gcard select{width:100%;box-sizing:border-box}
.grow{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.gbig{font-size:32px;letter-spacing:.18em;font-weight:800;color:#fde68a;margin:8px 0}
#gChip{font-size:12px;color:#cbd5e1;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gnote{margin:0 0 8px;font-size:13px;color:#fde68a}
.gdrive{border:1px solid #334155;border-radius:10px;padding:10px;margin:0 0 12px;background:#0f172a}
`;
    document.head.appendChild(s);
  }

  function overlay() {
    let el = document.getElementById("gOverlay");
    if (el) return el;
    el = document.createElement("div");
    el.id = "gOverlay";
    el.hidden = true;
    el.innerHTML = `
      <div class="gcard" id="gGate">
        <h2>Kim sifatida kirmoqchisiz?</h2>
        <p>Google hisobi natijani o‘qituvchi jurnaliga yuboradi. Mehmon laboratoriyani bajara oladi, lekin jurnalga yozilmaydi.</p>
        <div id="gGoogleSlot"></div>
        <p id="gGateMsg"></p>
        <div class="grow"><button type="button" class="sec" id="gGuest">Mehmon sifatida davom etish</button></div>
      </div>
      <div class="gcard" id="gRole" hidden>
        <h2>Hisobingiz</h2>
        <p id="gWho"></p>
        <div class="grow">
          <button type="button" id="gAsTeacher">Men o‘qituvchiman</button>
          <button type="button" class="sec" id="gAsStudent">Men talabaman</button>
        </div>
      </div>
      <div class="gcard" id="gForm" hidden>
        <h2>Talaba ma’lumoti</h2>
        <p>Ism va familiya, kurs, guruh raqami va o‘qituvchi bergan integratsiya kodi.</p>
        <label for="gIsm">Ism</label><input id="gIsm" autocomplete="given-name">
        <label for="gFam">Familiya</label><input id="gFam" autocomplete="family-name">
        <label for="gKurs">Kurs</label>
        <select id="gKurs">${[1, 2, 3, 4].map(n => `<option value="${n}">${n}-kurs</option>`).join("")}</select>
        <label for="gGuruh">Guruh raqami</label>
        <select id="gGuruh">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">${i + 1}-guruh</option>`).join("")}</select>
        <label for="gCode">O‘qituvchi kodi</label><input id="gCode" maxlength="80" autocapitalize="characters" placeholder="Masalan K7M2QP">
        <p id="gFormMsg"></p>
        <div class="grow"><button type="button" id="gJoin">Jurnalga ulanish</button><button type="button" class="sec" id="gBack">Orqaga</button></div>
      </div>
      <div class="gcard" id="gAccount" hidden>
        <h2>Hisob</h2>
        <p id="gAccText"></p>
        <div class="grow"><button type="button" class="sec" id="gSignOut">Chiqish</button><button type="button" id="gCloseAcc">Yopish</button></div>
      </div>`;
    document.body.appendChild(el);
    document.getElementById("gGuest").onclick = () => { state.mode = "guest"; state.student = null; save(state); paint(); };
    document.getElementById("gAsTeacher").onclick = async () => {
      state.mode = "teacher";
      state.student = null;
      save(state);
      paint();
      await ensureTeacher();
      paint();
      if (window.TEACH && window.TEACH.Teacher) window.TEACH.Teacher.open();
    };
    document.getElementById("gAsStudent").onclick = () => { state.mode = "student"; save(state); paint(); };
    document.getElementById("gBack").onclick = () => { state.mode = null; save(state); paint(); };
    document.getElementById("gJoin").onclick = () => joinStudent();
    document.getElementById("gSignOut").onclick = () => { picking = false; signOut(); };
    document.getElementById("gCloseAcc").onclick = () => { picking = false; paint(); };
    return el;
  }

  function paint() {
    css();
    const root = overlay();
    const dlg = document.getElementById("teacher");
    const showOverlay = (picking && state.mode) || (!state.mode && !state.account) || (state.account && !state.mode) || (state.mode === "student" && !state.student);
    if (showOverlay && dlg && dlg.open) dlg.close();
    const gate = document.getElementById("gGate");
    const role = document.getElementById("gRole");
    const form = document.getElementById("gForm");
    const acc = document.getElementById("gAccount");
    gate.hidden = role.hidden = form.hidden = acc.hidden = true;
    if (picking && state.mode) {
      acc.hidden = false; root.hidden = false;
      document.getElementById("gAccText").textContent = noteText() || "Hisob tanlanmagan";
      return;
    }
    if (!state.mode && !state.account) { gate.hidden = false; root.hidden = false; mountGoogleButton(); }
    else if (state.account && !state.mode) { role.hidden = false; root.hidden = false; document.getElementById("gWho").textContent = (state.account.name || "") + " · " + state.account.email; }
    else if (state.mode === "student" && !state.student) {
      form.hidden = false; root.hidden = false;
      const parts = String((state.account && state.account.name) || "").trim().split(/\s+/);
      const ism = document.getElementById("gIsm"), fam = document.getElementById("gFam");
      if (ism && !ism.value && parts[0]) ism.value = parts[0];
      if (fam && !fam.value && parts.length > 1) fam.value = parts.slice(1).join(" ");
    } else root.hidden = true;
    chip();
    if (window.ELAB && typeof window.ELAB.render === "function") { /* note is painted from wrapped render */ }
    const note = document.getElementById("gNote");
    if (note) note.textContent = noteText();
  }

  function noteText() {
    if (state.mode === "guest") return "Mehmon. Natija jurnalga yozilmaydi.";
    if (state.mode === "student" && state.student) return "O‘qituvchi jurnali: " + (state.student.teacherName || state.student.code) + " · kod " + state.student.code;
    if (state.mode === "teacher" && state.account) return "O‘qituvchi · " + state.account.email + (state.teacher && state.teacher.code ? " · kod " + state.teacher.code : "");
    return "";
  }

  function chip() {
    let el = document.getElementById("gChip");
    if (!el) {
      const who = document.getElementById("who");
      el = document.createElement("button");
      el.type = "button";
      el.id = "gChip";
      el.className = "sec";
      if (who && who.parentNode) who.parentNode.insertBefore(el, who.nextSibling);
      else document.querySelector("header") && document.querySelector("header").appendChild(el);
      el.onclick = () => { picking = true; paint(); };
    }
    if (state.mode === "guest") el.textContent = "Mehmon";
    else if (state.account) el.textContent = state.account.email;
    else el.textContent = "Google";
  }

  function mountGoogleButton() {
    const slot = document.getElementById("gGoogleSlot");
    if (!slot) return;
    slot.innerHTML = "";
    const msg = document.getElementById("gGateMsg");
    if (MOCK) {
      slot.innerHTML = `<p>Sinov rejimi: haqiqiy Google o‘rniga sinov hisobi.</p><div class="grow"><button type="button" id="gMockT">Sinov: o‘qituvchi</button><button type="button" class="sec" id="gMockS">Sinov: talaba</button></div>`;
      document.getElementById("gMockT").onclick = () => signInMock({ sub: "teacher-sub-1", email: "oqituvchi.sinov@gmail.com", name: "Oromiddinov Sardorbek" });
      document.getElementById("gMockS").onclick = () => signInMock({ sub: "student-sub-1", email: "talaba.sinov@gmail.com", name: "Madina Aliyeva" });
    }
    if (!CFG.clientId) {
      if (!MOCK && msg) msg.textContent = "Google hali sozlanmagan. Mehmon sifatida davom eting — natija jurnalga yozilmaydi.";
      return;
    }
    if (!MOCK && msg && (!CFG.registryUrl || !CFG.templateUrl)) {
      msg.textContent = "Google bilan kirish tayyor. O‘qituvchi jurnali (namuna jadval va sinf kodi) hali ulanmagan. Mehmon sifatida davom etsangiz, natija jurnalga yozilmaydi.";
    }
    const holder = document.createElement("div");
    holder.id = "gBtn";
    slot.appendChild(holder);
    loadGis().then(() => {
      try {
        gisInit();
        google.accounts.id.renderButton(holder, { theme: "filled_blue", size: "large", text: "signin_with", shape: "rectangular", width: 320 });
      } catch (e) {
        if (msg) msg.textContent = "Google tugmasi ochilmadi. Mehmon sifatida kirishingiz mumkin — natija jurnalga yozilmaydi.";
      }
    }).catch(() => { if (msg) msg.textContent = "Google tugmasi yuklanmadi. Internetni tekshiring yoki mehmon sifatida kiring."; });
  }
  function loadGis() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("gis"));
      document.head.appendChild(s);
    });
  }
  function tokenStale(token) {
    try {
      const info = jwtPayload(token);
      if (!info || !info.exp) return true;
      return Number(info.exp) * 1000 < Date.now() + 120000;
    } catch (e) { return true; }
  }
  let credWait = null;
  function onCredential(resp) {
    if (!resp || !resp.credential) return;
    const info = jwtPayload(resp.credential);
    const keep = !!(credWait && credWait.keepMode);
    state.account = { sub: info.sub, email: info.email, name: info.name || info.email, token: resp.credential, tokenAt: Date.now() };
    if (!keep) state.mode = null;
    save(state);
    const waiting = credWait;
    credWait = null;
    if (waiting) waiting.resolve(resp.credential);
    if (!keep) paint();
  }
  function gisInit() {
    if (!CFG.clientId || !window.google || !google.accounts || !google.accounts.id) return;
    google.accounts.id.initialize({ client_id: CFG.clientId, callback: onCredential, auto_select: true, cancel_on_tap_outside: false });
  }
  function freshIdToken(force) {
    if (MOCK) {
      if (!force && state.account && state.account.token && !tokenStale(state.account.token)) return Promise.resolve(state.account.token);
      let old = {};
      try { if (state.account && state.account.token) old = jwtPayload(state.account.token) || {}; } catch (e) { old = {}; }
      const token = fakeJwt({
        sub: (state.account && state.account.sub) || old.sub,
        email: (state.account && state.account.email) || old.email,
        name: (state.account && state.account.name) || old.name,
        email_verified: true,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      if (state.account) {
        state.account.token = token;
        state.account.tokenAt = Date.now();
        save(state);
      }
      return Promise.resolve(token);
    }
    if (!force && state.account && state.account.token && !tokenStale(state.account.token)) return Promise.resolve(state.account.token);
    return new Promise(resolve => {
      let settled = false;
      const finish = tok => { if (settled) return; settled = true; credWait = null; resolve(tok || null); };
      const timer = setTimeout(() => finish(null), 8000);
      credWait = { keepMode: true, resolve: tok => { clearTimeout(timer); finish(tok); } };
      loadGis().then(() => {
        gisInit();
        google.accounts.id.prompt(n => {
          const blocked = (n.isNotDisplayed && n.isNotDisplayed()) || (n.isSkippedMoment && n.isSkippedMoment());
          if (blocked) { clearTimeout(timer); finish(null); }
        });
      }).catch(() => { clearTimeout(timer); finish(null); });
    });
  }
  function signInMock(profile) {
    const token = fakeJwt({ sub: profile.sub, email: profile.email, name: profile.name, email_verified: true, exp: Math.floor(Date.now() / 1000) + 3600 });
    const same = state.keptTeacher && state.keptTeacher.email === profile.email ? state.keptTeacher.teacher : null;
    state.account = { sub: profile.sub, email: profile.email, name: profile.name, token: token, tokenAt: Date.now() };
    state.mode = null;
    state.student = null;
    state.teacher = same;
    picking = false;
    save(state);
    paint();
  }
  function signOut() {
    state = { mode: null, account: null, student: null, teacher: null, keptTeacher: state.teacher && state.account ? { email: state.account.email, teacher: state.teacher } : (state.keptTeacher || null) };
    picking = false;
    save(state);
    paint();
  }

  async function joinStudent() {
    const msg = document.getElementById("gFormMsg");
    const ism = document.getElementById("gIsm").value.trim();
    const familiya = document.getElementById("gFam").value.trim();
    const kurs = document.getElementById("gKurs").value;
    const guruh = document.getElementById("gGuruh").value;
    const code = document.getElementById("gCode").value.trim().toUpperCase();
    if (!ism || !familiya) { msg.textContent = "Ism va familiyani yozing."; return; }
    if (!/^[A-Z0-9]{6}$/.test(code)) { msg.textContent = "Kod 6 ta harf yoki raqam."; return; }
    msg.textContent = "Tekshirilmoqda…";
    try {
      const found = await api().lookup(code);
      state.mode = "student";
      state.student = { ism: ism, familiya: familiya, kurs: kurs, guruh: guruh, code: code, endpoint: found.url, teacherName: found.teacherName || found.teacherEmail || "" };
      save(state);
      paint();
      if (window.ELAB && window.ELAB.render) window.ELAB.render();
    } catch (e) { msg.textContent = e.message || "Kod qabul qilinmadi"; }
  }

  async function createCode(url) {
    if (!state.account || state.mode !== "teacher") throw new Error("Avval o‘qituvchi sifatida Google bilan kiring");
    if (!MOCK && !CFG.registryUrl) throw new Error("Sinf kodi hali ulanmagan. Sayt egasi reestrni qo‘yadi. Laboratoriya va lokal jurnal ishlaydi.");
    const code = makeCode();
    const endpoint = MOCK ? ("mock://" + code) : String(url || "").trim();
    if (!MOCK && !validExec(endpoint)) throw new Error("Manzil https://script.google.com/macros/s/…/exec bo‘lishi kerak");
    await api().setup(endpoint, code, state.account.token);
    await api().register(code, endpoint, state.account.token);
    state.teacher = { code: code, endpoint: endpoint, linked: true };
    save(state);
    return code;
  }

  function linkText(error) {
    if (error === "whoami") return "Jurnal skriptida egasini tasdiqlash (whoami) yo‘q. O‘z jadval nusxangizda Kengaytmalar → Apps Script kodini yangi nusxa bilan almashtiring. So‘ng Joylashtirish → Joylashtirishlarni boshqarish → qalamcha → Yangi versiya → Joylashtirish. Shundan keyin kodni shu yerga qayta yozing.";
    if (error === "taken" || error === "owner") return "Bu kod boshqa Google hisobiga tegishli.";
    if (error === "code") return "Kod topilmadi. 6 ta belgini tekshiring.";
    if (error === "action") return "Reestr skripti hali yangilanmagan. Sayt egasi docs/registry-apps-script.gs ni yangi versiya qilib joylashi kerak. Shu brauzerda jurnal allaqachon ochilgan bo‘lsa, u saqlanadi.";
    return "Bog‘lanmadi. Qayta urinib ko‘ring.";
  }

  let teacherJob = null;
  function lookupErrorText(code) {
    if (code === "token" || code === "exp") return "Google belgisi eskirgan. Qayta urinib, hisobni yangilang.";
    if (code === "aud") return "Google belgisi bu sayt uchun emas.";
    if (code === "action") return "Reestr skripti yangilanmagan. Sayt egasi yangi nusxani joylashi kerak.";
    if (code === "javob") return "Reestr javobini o‘qib bo‘lmadi.";
    if (code === "none") return "Bu hisobda jurnal yo‘q.";
    return "Jurnalni olishda xato.";
  }
  async function ensureTeacher() {
    if (!state.account || state.mode !== "teacher") return state.teacher || null;
    if (!MOCK && !CFG.registryUrl) return state.teacher || null;
    if (teacherJob) return teacherJob;
    teacherJob = (async () => {
      state.lookup = { status: "loading", error: "" };
      let rec = null;
      try {
        let token = await freshIdToken(false);
        if (!token) token = state.account.token;
        rec = await api().teacher(token);
        if (rec && (rec.error === "token" || rec.error === "aud" || rec.error === "exp")) {
          const again = await freshIdToken(true);
          if (again) rec = await api().teacher(again);
        }
      } catch (e) {
        rec = { ok: false, error: e && e.message === "javob" ? "javob" : "javob" };
      }
      if (rec && rec.ok && rec.code && rec.url) {
        state.teacher = { code: rec.code, endpoint: rec.url, linked: true };
        state.lookup = { status: "ok", error: "" };
        state.syncMsg = "";
        save(state);
        try { await refreshDrive(); } catch (e) { state.syncMsg = e.message || "Jadval yangilanmadi"; save(state); }
        return state.teacher;
      }
      const err = (rec && rec.error) || "javob";
      state.lookup = { status: err === "none" ? "none" : "error", error: err };
      state.syncMsg = lookupErrorText(err);
      save(state);
      if (state.teacher && state.teacher.code && state.teacher.endpoint) {
        state.teacher.linked = true;
        save(state);
        return state.teacher;
      }
      return null;
    })();
    try { return await teacherJob; }
    finally { teacherJob = null; }
  }

  async function linkExisting(code) {
    if (!state.account || state.mode !== "teacher") throw new Error("Avval o‘qituvchi sifatida Google bilan kiring");
    const rec = await api().link(String(code || "").trim().toUpperCase(), state.account.token);
    if (!rec || !rec.ok) {
      const err = new Error(linkText(rec && rec.error));
      err.code = rec && rec.error;
      throw err;
    }
    state.teacher = { code: rec.code, endpoint: rec.url, linked: true };
    save(state);
    try { await refreshDrive(); } catch (e) { state.syncMsg = e.message || ""; }
    return rec.code;
  }

  function legacyScript(res) {
    return res && (res.error === "action" || res.ok === false && res.error === "action");
  }

  async function pushNow() {
    if (state.mode !== "student" || !state.student || !state.account) return { skipped: true };
    const S = window.ELAB && window.ELAB.S;
    if (!S || !S.labId || !S.student) return { skipped: true };
    const rec = window.TEACH.TJ.load().students[nid(S.student.id)];
    const lab = rec && rec.labs && rec.labs[S.labId];
    if (!lab) return { skipped: true };
    await api().result(state.student.endpoint, {
      action: "result", idToken: state.account.token, code: state.student.code,
      ism: state.student.ism, familiya: state.student.familiya, kurs: state.student.kurs, guruh: state.student.guruh, lab: lab
    });
    state.lastSync = Date.now();
    save(state);
    return { ok: true, lab: S.labId };
  }
  let pushTimer = null;
  function queuePush() {
    if (state.mode !== "student") return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushNow().catch(e => console.warn(e)); }, 700);
  }

  function applyRows(pack) {
    const TJ = window.TEACH && window.TEACH.TJ;
    if (!TJ) return 0;
    const rows = Array.isArray(pack) ? pack : ((pack && pack.rows) || []);
    const marks = !!(pack && pack.marks);
    const notes = (pack && pack.notes) || {};
    const j = TJ.load();
    if (marks) {
      Object.keys(j.students).forEach(id => { if (j.students[id] && j.students[id].google) delete j.students[id]; });
    }
    const seen = {};
    rows.forEach(row => {
      if (!row || !row.sub || !row.lab) return;
      const id = nid(row.sub);
      const rec = j.students[id] || { id: row.sub, first: Date.now(), labs: {}, ai: 0, note: "" };
      rec.name = ((row.ism || "") + " " + (row.familiya || "")).trim();
      rec.group = row.kurs + "-kurs, " + row.guruh + "-guruh";
      rec.email = row.email;
      rec.google = true;
      if (!marks) {
        const prevLab = rec.labs[row.lab.id];
        if (prevLab && prevLab.gradeOverride != null && row.lab.gradeOverride == null) row.lab.gradeOverride = prevLab.gradeOverride;
      }
      rec.labs[row.lab.id] = row.lab;
      rec.last = row.lab.updated || Date.now();
      if (notes[row.sub] != null) rec.note = notes[row.sub];
      j.students[id] = rec;
      seen[id] = true;
    });
    Object.keys(notes).forEach(sub => {
      const id = nid(sub);
      if (j.students[id]) j.students[id].note = notes[sub];
    });
    TJ.save(j);
    state.journalMarks = marks;
    save(state);
    return Object.keys(seen).length;
  }
  async function refreshDrive() {
    if (!state.account || !state.teacher) throw new Error("Avval kod oling");
    const pack = await api().list(state.teacher.endpoint, state.account.token);
    const n = applyRows(pack);
    if (window.TEACH && window.TEACH.Teacher && window.TEACH.Teacher.auth) window.TEACH.Teacher.render();
    return n;
  }
  async function saveMark(sub, lab, gradeOverride) {
    if (!state.account || !state.teacher) return { skipped: true };
    const res = await api().mark(state.teacher.endpoint, state.account.token, sub, lab, gradeOverride);
    if (legacyScript(res)) return { legacy: true };
    return res;
  }
  async function saveNote(sub, note) {
    if (!state.account || !state.teacher) return { skipped: true };
    const res = await api().note(state.teacher.endpoint, state.account.token, sub, note);
    if (legacyScript(res)) return { legacy: true };
    return res;
  }
  async function gradeOf(labId) {
    if (!state.account || state.mode !== "student" || !state.student) return null;
    try { return await api().gradeOf(state.student.endpoint, state.account.token, state.student.code, labId); }
    catch (e) { return null; }
  }
  async function dropStudent(sub) {
    if (!state.account || !state.teacher) return { skipped: true };
    const res = await api().drop(state.teacher.endpoint, state.account.token, sub);
    if (legacyScript(res)) return { legacy: true };
    return res;
  }

  function teacherCard() {
    if (!window.TEACH || !window.TEACH.Teacher || !window.TEACH.Teacher.auth) return;
    if (window.TEACH.Teacher.tab !== "journal" && window.TEACH.Teacher.tab !== "set") return;
    const pane = document.getElementById("tPane");
    if (!pane || document.getElementById("gDrive")) return;
    const linked = state.teacher && state.teacher.code && state.teacher.linked;
    const look = state.lookup || { status: state.mode === "teacher" && state.account && !linked ? "loading" : "", error: "" };
    const tpl = CFG.templateUrl ? `<a class="sec" style="display:inline-block;padding:7px 14px;border-radius:6px;text-decoration:none" target="_blank" rel="noopener" href="${esc(CFG.templateUrl)}">Jadval nusxasini olish</a>` : `<span>Namuna jadval hali ulanmagan. Sayt egasi havolani qo‘ygach, shu yerda «Jadval nusxasini olish» chiqadi. Hozircha lokal jurnal ishlaydi.</span>`;
    const setup = `<p>Bu Google hisobida hali jurnal yo‘q. Birinchi marta shunday ochiladi.</p>
        <ol style="margin:8px 0 8px 18px;color:#cbd5e1;font-size:13.5px"><li>${tpl}</li><li>Nusxada: Kengaytmalar → Apps Script → Joylashtirish → Veb-ilova. Bajarish: Men. Kirish: Hamma.</li><li>…/exec manzilini quyiga qo‘ying.</li></ol>
        ${MOCK ? "" : `<input id="gExec" placeholder="https://script.google.com/macros/s/…/exec">`}
        <div class="grow"><button type="button" id="gMint">${MOCK ? "Sinov kodini olish" : "Kodni olish"}</button></div>`;
    const advanced = `<details id="gAdv"><summary style="color:#64748b;font-size:12px">Qo‘lda bog‘lash</summary>
        <label for="gOldCode">Integratsiya kodi</label><input id="gOldCode" maxlength="12" autocapitalize="characters" placeholder="Masalan K7M2QP">
        <div class="grow"><button type="button" class="sec" id="gLink">Shu hisobga bog‘lash</button></div></details>`;
    const errLine = look.error ? `<p style="color:#64748b;font-size:12px;margin:6px 0 0">reestr: ${esc(look.error)}</p>` : "";
    let body = "";
    if (linked) {
      body = `<div class="gbig" id="gCodeBig">${esc(state.teacher.code)}</div><p>Shu kodni talabalarga bering. Talabalar va baholar Google jadvalingizdan keladi — telefon va kompyuterda bir xil.</p><div class="grow"><button type="button" id="gCopy">Kodni nusxalash</button><button type="button" class="sec" id="gPull">Jadvaldan yangilash</button><button type="button" class="sec" id="gNew">Yangi kod</button></div><p id="gDriveMsg">${esc(state.syncMsg || "")}</p>`;
    } else if (look.status === "loading") {
      body = `<p id="gDriveMsg">Jurnal qidirilmoqda…</p>`;
    } else if (look.status === "none" && state.mode === "teacher" && state.account) {
      body = setup + advanced + `<p id="gDriveMsg"></p>` + errLine;
    } else if (state.mode === "teacher" && state.account) {
      body = `<p>${esc(lookupErrorText(look.error || "javob"))}</p><div class="grow"><button type="button" id="gRetry">Qayta urinish</button></div>${errLine}${advanced}<p id="gDriveMsg"></p>`;
    } else {
      body = `<p>Kod olish uchun avval Google bilan kiring va «Men o‘qituvchiman» ni tanlang. Google hisobi panel paroli o‘rnini bosadi.</p><div class="grow"><button type="button" id="gOpenAuth">Google oynasini ochish</button></div>`;
    }
    pane.insertAdjacentHTML("afterbegin", `<div class="gdrive" id="gDrive">
      <b>Google Drive jurnali</b>
      <p style="margin:6px 0;color:#94a3b8;font-size:13px">${state.account ? esc(state.account.email) : "Google bilan kirilmagan."} ${MOCK ? "· sinov rejimi (haqiqiy Drive emas)" : ""}</p>
      ${!MOCK && !CFG.registryUrl ? `<p>Sinf kodi hali ulanmagan. Sayt egasi reestrni qo‘yadi. Laboratoriya va lokal jurnal ishlaydi.</p>` : ""}
      ${body}
    </div>`);
    const card = document.getElementById("gDrive");
    if (card && !document.getElementById("gToGuide")) {
      const bar = document.createElement("div");
      bar.className = "grow";
      bar.innerHTML = `<button type="button" class="sec" id="gToGuide">Yo‘riqnoma</button>`;
      card.appendChild(bar);
      document.getElementById("gToGuide").onclick = () => {
        window.TEACH.Teacher.tab = "guide";
        window.TEACH.Teacher.render();
      };
    }
    const open = document.getElementById("gOpenAuth");
    if (open) open.onclick = () => { state.mode = null; save(state); paint(); };
    const retry = document.getElementById("gRetry");
    if (retry) retry.onclick = async () => {
      const msg = document.getElementById("gDriveMsg");
      if (msg) msg.textContent = "Jurnal qidirilmoqda…";
      state.lookup = { status: "loading", error: "" };
      await ensureTeacher();
      window.TEACH.Teacher.render();
    };
    const linkBtn = document.getElementById("gLink");
    if (linkBtn) linkBtn.onclick = async () => {
      const msg = document.getElementById("gDriveMsg");
      const code = (document.getElementById("gOldCode").value || "").trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) { msg.textContent = "Kod 6 ta harf yoki raqam."; return; }
      msg.textContent = "Tekshirilmoqda…";
      try {
        await linkExisting(code);
        msg.textContent = "Bog‘landi. Endi barcha qurilmalarda shu jurnal ochiladi.";
        window.TEACH.Teacher.render();
      } catch (e) { msg.textContent = e.message || "Xato"; }
    };
    const mint = document.getElementById("gMint");
    if (mint) mint.onclick = async () => {
      const msg = document.getElementById("gDriveMsg");
      msg.textContent = "Yozilmoqda…";
      try {
        const code = await createCode(MOCK ? "" : document.getElementById("gExec").value);
        msg.textContent = "Tayyor: " + code;
        window.TEACH.Teacher.render();
      } catch (e) { msg.textContent = e.message || "Xato"; }
    };
    const copy = document.getElementById("gCopy");
    if (copy) copy.onclick = async () => {
      try { await navigator.clipboard.writeText(state.teacher.code); document.getElementById("gDriveMsg").textContent = "Nusxalandi"; }
      catch (e) { document.getElementById("gDriveMsg").textContent = state.teacher.code; }
    };
    const pull = document.getElementById("gPull");
    if (pull) pull.onclick = async () => {
      const msg = document.getElementById("gDriveMsg");
      try { const n = await refreshDrive(); msg.textContent = n + " ta yozuv olindi"; }
      catch (e) { msg.textContent = e.message || "Xato"; }
    };
    const newer = document.getElementById("gNew");
    if (newer) newer.onclick = async () => {
      const msg = document.getElementById("gDriveMsg");
      msg.textContent = "Yangi kod yozilmoqda…";
      try {
        const code = await createCode(state.teacher.endpoint);
        msg.textContent = "Yangi kod: " + code + ". Eski kod endi ishlamaydi.";
        window.TEACH.Teacher.render();
      } catch (e) { msg.textContent = e.message || "Xato"; }
    };
  }

  function prefill() {
    const panel = document.getElementById("panel");
    if (panel && !document.getElementById("gNote")) {
      const n = document.createElement("p");
      n.id = "gNote";
      n.className = "gnote";
      panel.prepend(n);
    }
    const note = document.getElementById("gNote");
    if (note) note.textContent = noteText();
    if (state.mode !== "student" || !state.student || !state.account) return;
    const rn = document.getElementById("rn"), rg = document.getElementById("rg"), ri = document.getElementById("ri");
    if (rn && !rn.value) rn.value = (state.student.ism + " " + state.student.familiya).trim();
    if (rg && !rg.value) rg.value = state.student.kurs + "-kurs, " + state.student.guruh + "-guruh";
    if (ri && !ri.value) ri.value = state.account.sub;
  }

  function boot() {
    css();
    const prev = window.ELAB_onSave;
    window.ELAB_onSave = function () {
      if (!allowJournal()) return;
      if (prev) prev();
      queuePush();
    };
    if (window.ELAB && window.ELAB.render) {
      const r0 = window.ELAB.render;
      window.ELAB.render = function () { r0(); prefill(); };
    }
    if (window.TEACH && window.TEACH.Teacher) {
      const t0 = window.TEACH.Teacher.render.bind(window.TEACH.Teacher);
      window.TEACH.Teacher.render = function () { t0(); teacherCard(); };
    }
    window.ELAB_AUTH = {
      allowJournal, signInMock, signOut, createCode, pushNow, refreshDrive, joinStudent, ensureTeacher, linkExisting, saveMark, saveNote, dropStudent, gradeOf,
      openGate() { state.mode = null; picking = false; save(state); paint(); },
      get state() { return state; }, mock: MOCK
    };
    if (state.mode === "teacher" && state.account) ensureTeacher();
    const start = () => paint();
    if (document.getElementById("gate")) {
      const obs = new MutationObserver(() => { if (!document.getElementById("gate")) { obs.disconnect(); start(); } });
      obs.observe(document.body, { childList: true, subtree: true });
    } else start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
