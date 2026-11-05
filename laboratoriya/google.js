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

  const net = {
    async lookup(code) {
      if (!CFG.registryUrl) throw new Error("Reestr manzili google-config.js da yo‘q");
      const r = await jsonp(CFG.registryUrl, { action: "lookup", code: code });
      if (!r || !r.ok) throw new Error("Kod topilmadi");
      return r;
    },
    async register(code, url, token) {
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
      return r.rows || [];
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
      m.registry[code] = { url: url, email: info.email, name: info.name || info.email };
      saveMock(m);
      return { ok: true, code: code, url: url };
    },
    async setup(url, code, token) {
      const info = jwtPayload(token);
      const m = loadMock();
      let rows = {};
      Object.keys(m.sheets).forEach(c => {
        if (m.sheets[c].email === info.email) { Object.assign(rows, m.sheets[c].rows || {}); delete m.sheets[c]; }
      });
      m.sheets[code] = { email: info.email, clientId: CFG.clientId || "mock", rows: rows };
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
      const code = Object.keys(m.registry).find(c => m.registry[c].email === info.email && m.registry[c].url === url)
        || Object.keys(m.sheets).find(c => m.sheets[c].email === info.email);
      if (!code || !m.sheets[code]) return [];
      return Object.values(m.sheets[code].rows);
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
    document.getElementById("gAsTeacher").onclick = () => { state.mode = "teacher"; save(state); paint(); };
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
      if (!MOCK && msg) msg.textContent = "Google hali sozlanmagan. Ega laboratoriya/google-config.js ga OAuth client ID yozadi. Mehmon rejimida jurnalga yozilmaydi.";
      return;
    }
    const holder = document.createElement("div");
    holder.id = "gBtn";
    slot.appendChild(holder);
    loadGis().then(() => {
      google.accounts.id.initialize({ client_id: CFG.clientId, callback: onCredential });
      google.accounts.id.renderButton(holder, { theme: "filled_blue", size: "large", text: "signin_with", shape: "rectangular", width: 320 });
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
  function onCredential(resp) {
    const info = jwtPayload(resp.credential);
    state.account = { sub: info.sub, email: info.email, name: info.name || info.email, token: resp.credential, tokenAt: Date.now() };
    state.mode = null;
    save(state);
    paint();
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
    const code = makeCode();
    const endpoint = MOCK ? ("mock://" + code) : String(url || "").trim();
    if (!MOCK && !validExec(endpoint)) throw new Error("Manzil https://script.google.com/macros/s/…/exec bo‘lishi kerak");
    await api().setup(endpoint, code, state.account.token);
    await api().register(code, endpoint, state.account.token);
    state.teacher = { code: code, endpoint: endpoint };
    save(state);
    return code;
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

  function mergeRows(rows) {
    const TJ = window.TEACH && window.TEACH.TJ;
    if (!TJ) return 0;
    const j = TJ.load();
    rows.forEach(row => {
      if (!row || !row.sub || !row.lab) return;
      const id = nid(row.sub);
      const rec = j.students[id] || { id: row.sub, first: Date.now(), labs: {}, ai: 0, note: "" };
      rec.name = (row.ism + " " + row.familiya).trim();
      rec.group = row.kurs + "-kurs, " + row.guruh + "-guruh";
      rec.email = row.email;
      rec.google = true;
      rec.labs[row.lab.id] = row.lab;
      rec.last = row.lab.updated || Date.now();
      j.students[id] = rec;
    });
    TJ.save(j);
    return rows.length;
  }
  async function refreshDrive() {
    if (!state.account || !state.teacher) throw new Error("Avval kod oling");
    const rows = await api().list(state.teacher.endpoint, state.account.token);
    const n = mergeRows(rows);
    if (window.TEACH && window.TEACH.Teacher && window.TEACH.Teacher.auth) window.TEACH.Teacher.render();
    return n;
  }

  function teacherCard() {
    if (!window.TEACH || !window.TEACH.Teacher || !window.TEACH.Teacher.auth) return;
    if (window.TEACH.Teacher.tab !== "journal" && window.TEACH.Teacher.tab !== "set") return;
    const pane = document.getElementById("tPane");
    if (!pane || document.getElementById("gDrive")) return;
    const linked = state.teacher && state.teacher.code;
    const tpl = CFG.templateUrl ? `<a class="sec" style="display:inline-block;padding:7px 14px;border-radius:6px;text-decoration:none" target="_blank" rel="noopener" href="${esc(CFG.templateUrl)}">Jadval nusxasini olish</a>` : `<span style="color:#94a3b8">Namuna havolasi hali ulanmagan. Qadamlar Yo‘riqnoma bo‘limida.</span>`;
    pane.insertAdjacentHTML("afterbegin", `<div class="gdrive" id="gDrive">
      <b>Google Drive jurnali</b>
      <p style="margin:6px 0;color:#94a3b8;font-size:13px">${state.account ? esc(state.account.email) : "Google bilan kirilmagan."} ${MOCK ? "· sinov rejimi (haqiqiy Drive emas)" : ""}</p>
      ${linked ? `<div class="gbig" id="gCodeBig">${esc(state.teacher.code)}</div><p>Shu kodni talabalarga bering. Natijalar sizning jadvalingizga tushadi.</p><div class="grow"><button type="button" id="gCopy">Kodni nusxalash</button><button type="button" class="sec" id="gPull">Google Drive dan yangilash</button><button type="button" class="sec" id="gNew">Yangi kod</button></div><p id="gDriveMsg"></p>` :
        (state.mode === "teacher" && state.account ? `<ol style="margin:8px 0 8px 18px;color:#cbd5e1;font-size:13.5px"><li>${tpl}</li><li>Nusxada: Kengaytmalar → Apps Script → Deploy → Web app. Execute as Me, Who has access: Anyone.</li><li>…/exec manzilini quyiga qo‘ying.</li></ol>
        ${MOCK ? "" : `<input id="gExec" placeholder="https://script.google.com/macros/s/…/exec">`}
        <div class="grow"><button type="button" id="gMint">${MOCK ? "Sinov kodini olish" : "Kodni olish"}</button></div><p id="gDriveMsg"></p>` :
          `<p>Kod olish uchun avval Google bilan kiring va «Men o‘qituvchiman» ni tanlang.</p><div class="grow"><button type="button" id="gOpenAuth">Google oynasini ochish</button></div>`)}
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
    window.ELAB_AUTH = { allowJournal, signInMock, signOut, createCode, pushNow, refreshDrive, joinStudent, get state() { return state; }, mock: MOCK };
    const start = () => paint();
    if (document.getElementById("gate")) {
      const obs = new MutationObserver(() => { if (!document.getElementById("gate")) { obs.disconnect(); start(); } });
      obs.observe(document.body, { childList: true, subtree: true });
    } else start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
