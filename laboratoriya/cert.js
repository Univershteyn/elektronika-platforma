/* Sertifikat raqami va o‘qituvchi tekshiruvi.
   Ro‘yxatdan o‘tgan talaba sertifikati laboratoriya yozuvi bilan birga
   o‘qituvchining Google jurnaliga tushadi (alohida kalit yo‘q).
   Mehmon sertifikati jurnalga yozilmaydi: raqamida M belgisi bor va
   u ro‘yxatdan o‘tgan hisob deb tasdiqlanmaydi.
   Eski PDF (shu yangilanishdan oldin) markazda saqlanmagan. */
(function () {
  "use strict";
  const root = typeof window !== "undefined" ? window : globalThis;

  function fnv(s) {
    let h = 2166136261 >>> 0;
    for (const c of String(s)) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }
  function hex8(n) { return (n >>> 0).toString(16).toUpperCase().padStart(8, "0"); }
  function hashIds(base) {
    const h1 = fnv(base), h2 = fnv("v|" + base + "|" + h1), h3 = fnv("w|" + h2);
    const B32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let v = "";
    for (let i = 0; i < 10; i++) v += B32[((i < 5 ? h2 >>> (i * 6) : h3 >>> ((i - 5) * 6)) & 31)];
    return { hex: hex8(h1), code: v.slice(0, 5) + "-" + v.slice(5) };
  }
  function nid(id) { return String(id || "").trim().toLowerCase().replace(/\s+/g, ""); }
  function kind() {
    const st = root.ELAB_AUTH && root.ELAB_AUTH.state;
    if (st && st.mode === "student" && st.account && st.account.sub && st.student && st.student.code) {
      return { k: "R", sub: String(st.account.sub) };
    }
    return { k: "M", sub: "" };
  }
  function wordOf(mark) {
    const rows = root.ELAB && root.ELAB.MEZON;
    const row = rows && rows.find(x => x.n === Number(mark));
    return row ? row.w : "";
  }
  function labTitle(id, lab) {
    if (lab && lab.title) {
      if (typeof lab.title === "string") return lab.title;
      if (lab.title.uz) return lab.title.uz;
    }
    const L = root.ELAB && root.ELAB.LABS && root.ELAB.LABS.find(x => x.id === Number(id));
    if (L && L.title) return L.title.uz || L.title;
    return "Laboratoriya " + id;
  }
  function fmtDate(t1) {
    if (t1 == null || t1 === "") return "";
    const n = Number(t1);
    if (!n) return "";
    const d = new Date(n);
    if (!isFinite(d.getTime())) return "";
    const p = n => String(n).padStart(2, "0");
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear();
  }
  function checksum(rec) {
    const base = [rec.k, rec.no, rec.code, rec.name, rec.group, rec.sid, rec.lab, rec.score, rec.mark, rec.t1, rec.sub || ""].join("|");
    return hex8(fnv("c|" + base));
  }
  function issue(L, ld, sc, mark) {
    const st = root.ELAB && root.ELAB.S && root.ELAB.S.student;
    if (!st || !L || !ld) throw new Error("student");
    const acc = kind();
    const name = String(st.name || "").trim();
    const group = String(st.group || "").trim();
    const sid = String(st.id || "").trim();
    const labId = Number(L.id);
    const score = sc && sc.score != null ? sc.score : null;
    const t1 = ld.t1;
    const title = (L.title && (L.title.uz || L.title)) || labTitle(labId);
    const base = ["v2", acc.k, acc.sub || "mehmon", name.toLowerCase(), group, sid, labId, score, mark, t1].join("|");
    const ids = hashIds(base);
    const rec = {
      v: 2, k: acc.k,
      no: "TerDPI-EL-2026-" + acc.k + String(labId).padStart(2, "0") + "-" + ids.hex,
      code: ids.code, name: name, group: group, sid: sid, sub: acc.sub,
      lab: labId, title: String(title).slice(0, 160), score: score, mark: mark,
      word: wordOf(mark), t1: t1
    };
    rec.sum = checksum(rec);
    ld.cert = rec;
    return rec;
  }

  function journalStudents() {
    const TJ = root.TEACH && root.TEACH.TJ;
    if (!TJ) return [];
    const j = TJ.load();
    return Object.keys(j.students || {}).map(k => j.students[k]).filter(Boolean);
  }
  function currentPoint(lab) {
    if (!lab) return null;
    if (lab.gradeOverride >= 2 && lab.gradeOverride <= 5) return lab.gradeOverride;
    if (lab.gradePoint >= 2 && lab.gradePoint <= 5) return lab.gradePoint;
    if (lab.baho && lab.baho.mark >= 2 && lab.baho.mark <= 5) return lab.baho.mark;
    if (lab.cert && lab.cert.mark >= 2 && lab.cert.mark <= 5) return lab.cert.mark;
    return null;
  }
  function sameName(a, b) {
    return String(a || "").trim().toLowerCase().replace(/\s+/g, " ") === String(b || "").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function accountText(status, k) {
    if (k === "M" || status === "guest") return "Mehmon — tasdiqlanmagan";
    if (status === "valid") return "Ro‘yxatdan o‘tgan talaba";
    if (status === "local") return "Google hisobi bog‘lanmagan";
    if (status === "revoked" && k === "R") return "Ro‘yxatdan o‘tgan talaba";
    if (status === "badcode" && k === "R") return "Ro‘yxatdan o‘tgan talaba";
    return "";
  }
  function pack(status, extra) {
    const row = Object.assign({
      status: status, source: "", no: "", code: "", name: "", group: "", sid: "",
      email: "", sub: "", journalName: "", lab: "", labTitle: "", score: null,
      mark: null, certMark: null, word: "", t1: null, date: "", k: "",
      nameDiffers: false, noteKey: ""
    }, extra || {});
    row.date = row.date || fmtDate(row.t1);
    row.word = row.word || wordOf(row.mark);
    if (!row.accountText) row.accountText = accountText(row.status, row.k);
    if (row.journalName && row.name && !sameName(row.journalName, row.name)) row.nameDiffers = true;
    return row;
  }
  function describeStored(st, lab, cert) {
    const point = currentPoint(lab);
    const subOk = !!(cert.sub && nid(cert.sub) === nid(st.id) && (st.google || st.email));
    let status = "local";
    if (cert.k === "M") status = "guest";
    else if (subOk && point === 2) status = "revoked";
    else if (subOk) status = "valid";
    return pack(status, {
      source: "journal", no: cert.no, code: cert.code || "",
      name: cert.name || st.name || "", group: cert.group || st.group || "",
      sid: cert.sid || "", email: st.email || "", sub: st.google ? st.id : (cert.sub || ""),
      journalName: st.name || "", lab: cert.lab || lab.id, labTitle: cert.title || labTitle(cert.lab || lab.id, lab),
      score: cert.score != null ? cert.score : lab.score, mark: point, certMark: cert.mark,
      t1: cert.t1 || lab.t1, k: cert.k || ""
    });
  }
  function findStored(no) {
    let found = null;
    journalStudents().forEach(st => {
      Object.keys(st.labs || {}).forEach(id => {
        const lab = st.labs[id];
        const cert = lab && lab.cert;
        if (!cert || canonNo(cert.no) !== no) return;
        const row = describeStored(st, lab, cert);
        if (!found || (row.status === "valid" && found.status !== "valid") || (st.google && !found.email)) found = row;
      });
    });
    return found;
  }
  function findLegacy(no) {
    const m = /^TerDPI-EL-2026-(\d{2})-([0-9A-F]{8})$/.exec(no);
    if (!m) return null;
    const labId = Number(m[1]);
    let found = null;
    journalStudents().forEach(st => {
      const lab = st.labs && (st.labs[labId] || st.labs[String(labId)]);
      if (!lab || lab.t1 == null || lab.score == null || (lab.cert && lab.cert.v === 2)) return;
      const base = [String(st.name || "").trim().toLowerCase(), String(st.group || "").trim(), String(st.id || "").trim(), labId, lab.score, lab.t1].join("|");
      const ids = hashIds(base);
      const expect = "TerDPI-EL-2026-" + String(labId).padStart(2, "0") + "-" + ids.hex;
      if (expect !== no) return;
      const point = currentPoint(lab);
      const google = !!(st.google && st.email);
      const row = pack(point === 2 ? "revoked" : (google ? "valid" : "local"), {
        source: "legacy", no: no, code: ids.code,
        name: st.name || "", group: st.group || "", sid: st.id || "",
        email: st.email || "", sub: google ? st.id : "", journalName: st.name || "",
        lab: labId, labTitle: labTitle(labId, lab), score: lab.score,
        mark: point, certMark: point, t1: lab.t1, k: google ? "R" : "",
        noteKey: point === 2 ? "" : (google ? "cert_note_valid_old" : "cert_note_local")
      });
      if (!found || (google && !found.email)) found = row;
    });
    return found;
  }
  function canonNo(s) {
    const m = String(s || "").toUpperCase().match(/TERDPI-EL-2026-([RM]?\d{2})-([0-9A-F]{8})/);
    if (!m) return "";
    return "TerDPI-EL-2026-" + m[1] + "-" + m[2];
  }
  function isGuestNo(no) { return /^TerDPI-EL-2026-M\d{2}-[0-9A-F]{8}$/.test(no); }
  function isRegNo(no) { return /^TerDPI-EL-2026-R\d{2}-[0-9A-F]{8}$/.test(no); }
  function b64urlEncode(text) {
    const bytes = unescape(encodeURIComponent(text));
    return btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function b64urlDecode(token) {
    const s = String(token || "").replace(/-/g, "+").replace(/_/g, "/");
    const pad = s + "===".slice((s.length + 3) % 4);
    const bin = atob(pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (typeof TextDecoder !== "undefined") return new TextDecoder().decode(bytes);
    return decodeURIComponent([...bin].map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
  }
  function encodePayload(rec) {
    return b64urlEncode(JSON.stringify({
      v: 2, k: rec.k, no: rec.no, code: rec.code, name: rec.name, group: rec.group,
      sid: rec.sid, lab: rec.lab, score: rec.score, mark: rec.mark, t1: rec.t1,
      sub: rec.sub || "", sum: rec.sum
    }));
  }
  function decodePayload(token) {
    try {
      const o = JSON.parse(b64urlDecode(token));
      if (!o || Number(o.v) !== 2 || !o.no) return null;
      return o;
    } catch (e) { return null; }
  }
  function payloadOk(o) {
    if (!o) return false;
    const rec = {
      k: o.k, no: o.no, code: o.code, name: o.name, group: o.group, sid: o.sid,
      lab: o.lab, score: o.score, mark: o.mark, t1: o.t1, sub: o.sub || ""
    };
    return checksum(rec) === o.sum;
  }
  function withToken(token) {
    let origin = "https://elektronika-tdpi.uz";
    let path = "/laboratoriya/";
    try {
      if (typeof location !== "undefined" && location.origin && location.origin !== "null" && /^https?:/.test(location.origin)) {
        origin = location.origin;
        path = location.pathname || path;
      }
    } catch (e) {}
    path = String(path).replace(/index\.html$/i, "");
    if (!path.endsWith("/")) path += "/";
    const u = new URL(path, origin + "/");
    u.search = "";
    u.hash = "";
    u.searchParams.set("sertifikat", token);
    return u.toString();
  }
  function verifyUrl(rec) {
    const full = withToken(encodePayload(rec));
    if (qrMatrix(full)) return full;
    return withToken(rec.no);
  }
  function parseInput(raw) {
    let s = String(raw == null ? "" : raw).trim();
    if (!s) return null;
    try {
      if (/^https?:/i.test(s)) {
        const u = new URL(s);
        const p = u.searchParams.get("sertifikat") || u.searchParams.get("s");
        if (p) s = p;
      }
    } catch (e) {}
    const embedded = s.match(/[?&](?:sertifikat|s)=([^&\s#]+)/i);
    if (embedded) { try { s = decodeURIComponent(embedded[1]); } catch (e) { s = embedded[1]; } }
    let payload = null;
    if (/^[A-Za-z0-9_-]{20,}$/.test(s) && !/^terdpi/i.test(s)) payload = decodePayload(s);
    const no = canonNo(payload && payload.no ? payload.no : s);
    let code = "";
    if (!payload) {
      const cm = s.toUpperCase().match(/[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}/);
      if (cm) code = cm[0];
    }
    if (!no && !payload) return { no: s, code: code, payload: null };
    return { no: no || canonNo(payload && payload.no), code: code, payload: payload };
  }
  function applyCode(row, code) {
    if (!row || !code || !row.code) return row;
    if (String(code).toUpperCase() !== String(row.code).toUpperCase()) {
      const bad = Object.assign({}, row, { status: "badcode", noteKey: "cert_note_badcode" });
      bad.accountText = accountText("badcode", row.k);
      return bad;
    }
    return row;
  }
  function guestFromPayload(o) {
    return pack("guest", {
      source: "payload", no: canonNo(o.no), code: o.code || "",
      name: o.name || "", group: o.group || "", sid: o.sid || "",
      lab: o.lab, labTitle: labTitle(o.lab), score: o.score, mark: o.mark, certMark: o.mark,
      t1: o.t1, k: "M", noteKey: "cert_note_guest"
    });
  }
  function guestShell(no) {
    const m = /^TerDPI-EL-2026-M(\d{2})-/.exec(no);
    return pack("guest", {
      source: "format", no: no, lab: m ? Number(m[1]) : "", labTitle: m ? labTitle(Number(m[1])) : "",
      k: "M", noteKey: "cert_note_guest_noname"
    });
  }
  function lookup(raw) {
    const parsed = parseInput(raw);
    if (!parsed) return pack("empty", { noteKey: "cert_need" });
    const no = canonNo(parsed.no);
    if (no) {
      const hit = findStored(no);
      if (hit) return applyCode(hit, parsed.code);
      const legacy = findLegacy(no);
      if (legacy) return applyCode(legacy, parsed.code);
    }
    if (parsed.payload) {
      if (!payloadOk(parsed.payload)) {
        if (isGuestNo(no)) return guestShell(no);
        return pack("broken", { no: no, noteKey: "cert_note_broken" });
      }
      if (parsed.payload.k === "M" || isGuestNo(canonNo(parsed.payload.no))) return guestFromPayload(parsed.payload);
      return pack("missing", { no: canonNo(parsed.payload.no), k: "R", noteKey: "cert_note_missing_reg" });
    }
    if (isGuestNo(no)) return guestShell(no);
    if (isRegNo(no)) return pack("missing", { no: no, k: "R", noteKey: "cert_note_missing_reg" });
    return pack("missing", { no: parsed.no || "", noteKey: "cert_note_missing" });
  }
  function rows() {
    const seen = {};
    const out = [];
    const students = journalStudents().slice().sort((a, b) => (b.google ? 1 : 0) - (a.google ? 1 : 0));
    students.forEach(st => {
      Object.keys(st.labs || {}).forEach(id => {
        const lab = st.labs[id];
        const cert = lab && lab.cert;
        if (!cert || !cert.no || seen[canonNo(cert.no)]) return;
        seen[canonNo(cert.no)] = true;
        out.push(describeStored(st, lab, cert));
      });
    });
    out.sort((a, b) => (Number(b.t1) || 0) - (Number(a.t1) || 0));
    return out;
  }

  /* QR Code Model 2, byte mode, ECC M. Mask tanlanadi; format bitlari mask bilan mos. */
  const ECC_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  const BLK_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 255;
  }
  function rsDivisor(degree) {
    const result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }
  function rsRemainder(data, divisor) {
    const result = new Array(divisor.length).fill(0);
    for (let n = 0; n < data.length; n++) {
      const factor = data[n] ^ result.shift();
      result.push(0);
      for (let i = 0; i < divisor.length; i++) result[i] ^= gfMul(divisor[i], factor);
    }
    return result;
  }
  function rawModules(ver) {
    let result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const numalign = Math.floor(ver / 7) + 2;
      result -= (25 * numalign - 10) * numalign - 55;
    }
    if (ver >= 7) result -= 36;
    return result;
  }
  function dataCodewords(ver) {
    return Math.floor(rawModules(ver) / 8) - ECC_M[ver] * BLK_M[ver];
  }
  function utf8(text) {
    if (typeof TextEncoder !== "undefined") return [...new TextEncoder().encode(String(text))];
    const out = [];
    for (const c of unescape(encodeURIComponent(String(text)))) out.push(c.charCodeAt(0));
    return out;
  }
  function appendBits(bits, val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  }
  function chooseVersion(nbytes) {
    for (let ver = 1; ver <= 40; ver++) {
      const cc = ver < 10 ? 8 : 16;
      const used = 4 + cc + nbytes * 8;
      if (used <= dataCodewords(ver) * 8) return ver;
    }
    return 0;
  }
  function dataBytes(payload, ver) {
    const bits = [];
    const cc = ver < 10 ? 8 : 16;
    appendBits(bits, 0x4, 4);
    appendBits(bits, payload.length, cc);
    payload.forEach(b => appendBits(bits, b, 8));
    const cap = dataCodewords(ver) * 8;
    appendBits(bits, 0, Math.min(4, cap - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      data.push(v);
    }
    for (let p = 0; data.length < dataCodewords(ver); p++) data.push(p % 2 ? 0x11 : 0xEC);
    return data;
  }
  function addEcc(data, ver) {
    const numblocks = BLK_M[ver];
    const blockecclen = ECC_M[ver];
    const rawcodewords = Math.floor(rawModules(ver) / 8);
    const numshortblocks = numblocks - rawcodewords % numblocks;
    const shortblocklen = Math.floor(rawcodewords / numblocks);
    const rsdiv = rsDivisor(blockecclen);
    const blocks = [];
    let k = 0;
    for (let i = 0; i < numblocks; i++) {
      const len = shortblocklen - blockecclen + (i < numshortblocks ? 0 : 1);
      const dat = data.slice(k, k + len);
      k += dat.length;
      const ecc = rsRemainder(dat, rsdiv);
      const block = dat.slice();
      if (i < numshortblocks) block.push(0);
      blocks.push(block.concat(ecc));
    }
    const result = [];
    for (let i = 0; i < blocks[0].length; i++) {
      for (let j = 0; j < blocks.length; j++) {
        if (i !== shortblocklen - blockecclen || j >= numshortblocks) result.push(blocks[j][i]);
      }
    }
    return result;
  }
  function bitAt(x, i) { return ((x >>> i) & 1) !== 0; }
  function alignmentPositions(ver, size) {
    if (ver === 1) return [];
    const numalign = Math.floor(ver / 7) + 2;
    const step = Math.floor((ver * 8 + numalign * 3 + 5) / (numalign * 4 - 4)) * 2;
    const result = [];
    for (let i = 0; i < numalign - 1; i++) result.push(size - 7 - i * step);
    result.push(6);
    result.reverse();
    return result;
  }
  function blank(size) {
    const mod = [], fn = [];
    for (let y = 0; y < size; y++) {
      mod.push(new Array(size).fill(false));
      fn.push(new Array(size).fill(false));
    }
    return { mod: mod, fn: fn, size: size };
  }
  function setFn(g, x, y, dark) {
    if (x < 0 || y < 0 || x >= g.size || y >= g.size) return;
    g.mod[y][x] = !!dark;
    g.fn[y][x] = true;
  }
  function drawFinder(g, x, y) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setFn(g, x + dx, y + dy, dist !== 2 && dist !== 4);
    }
  }
  function drawAlign(g, x, y) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      setFn(g, x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  function drawFormat(g, mask) {
    let data = mask & 7;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i < 6; i++) setFn(g, 8, i, bitAt(bits, i));
    setFn(g, 8, 7, bitAt(bits, 6));
    setFn(g, 8, 8, bitAt(bits, 7));
    setFn(g, 7, 8, bitAt(bits, 8));
    for (let i = 9; i < 15; i++) setFn(g, 14 - i, 8, bitAt(bits, i));
    for (let i = 0; i < 8; i++) setFn(g, g.size - 1 - i, 8, bitAt(bits, i));
    for (let i = 8; i < 15; i++) setFn(g, 8, g.size - 15 + i, bitAt(bits, i));
    setFn(g, 8, g.size - 8, true);
  }
  function drawVersion(g, ver) {
    if (ver < 7) return;
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const bits = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = bitAt(bits, i);
      const a = g.size - 11 + i % 3;
      const b = Math.floor(i / 3);
      setFn(g, a, b, bit);
      setFn(g, b, a, bit);
    }
  }
  function drawFunctions(g, ver) {
    for (let i = 0; i < g.size; i++) {
      setFn(g, 6, i, i % 2 === 0);
      setFn(g, i, 6, i % 2 === 0);
    }
    drawFinder(g, 3, 3);
    drawFinder(g, g.size - 4, 3);
    drawFinder(g, 3, g.size - 4);
    const pos = alignmentPositions(ver, g.size);
    const n = pos.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      drawAlign(g, pos[i], pos[j]);
    }
    drawFormat(g, 0);
    drawVersion(g, ver);
  }
  function drawCodewords(g, data) {
    let i = 0;
    for (let right = g.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < g.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? (g.size - 1 - vert) : vert;
          if (!g.fn[y][x] && i < data.length * 8) {
            g.mod[y][x] = bitAt(data[i >> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }
  function maskBit(mask, x, y) {
    if (mask === 0) return ((x + y) & 1) === 0;
    if (mask === 1) return (y & 1) === 0;
    if (mask === 2) return x % 3 === 0;
    if (mask === 3) return (x + y) % 3 === 0;
    if (mask === 4) return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    if (mask === 5) return ((x * y) % 2 + (x * y) % 3) === 0;
    if (mask === 6) return (((x * y) % 2 + (x * y) % 3) & 1) === 0;
    return (((x + y) & 1) + (x * y) % 3) % 2 === 0;
  }
  function penalty(mod) {
    const n = mod.length;
    let score = 0;
    const line = (get) => {
      for (let a = 0; a < n; a++) {
        let run = 1;
        for (let b = 1; b < n; b++) {
          if (get(a, b) === get(a, b - 1)) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score++;
          } else run = 1;
        }
      }
    };
    line((y, x) => mod[y][x]);
    line((x, y) => mod[y][x]);
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      if (mod[y][x] === mod[y][x + 1] && mod[y][x] === mod[y + 1][x] && mod[y][x] === mod[y + 1][x + 1]) score += 3;
    }
    let dark = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (mod[y][x]) dark++;
    score += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
    return score;
  }
  function qrMatrix(text) {
    const payload = utf8(text);
    const ver = chooseVersion(payload.length);
    if (!ver) return null;
    const codewords = addEcc(dataBytes(payload, ver), ver);
    const size = 17 + 4 * ver;
    const base = blank(size);
    drawFunctions(base, ver);
    drawCodewords(base, codewords);
    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const g = { mod: base.mod.map(row => row.slice()), fn: base.fn, size: size };
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        if (!g.fn[y][x] && maskBit(mask, x, y)) g.mod[y][x] = !g.mod[y][x];
      }
      drawFormat(g, mask);
      const score = penalty(g.mod);
      if (score < bestScore) { bestScore = score; best = g.mod; }
    }
    return best;
  }
  function qrDataUrl(text) {
    const m = qrMatrix(text);
    if (!m || typeof document === "undefined" || !document.createElement) return "";
    const n = m.length, qz = 4, sc = 4;
    const cv = document.createElement("canvas");
    const dim = (n + qz * 2) * sc;
    cv.width = dim;
    cv.height = dim;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = "#000000";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) ctx.fillRect((x + qz) * sc, (y + qz) * sc, sc, sc);
    return cv.toDataURL("image/png");
  }

  root.ELAB_CERT = {
    kind: kind, issue: issue, lookup: lookup, rows: rows, verifyUrl: verifyUrl,
    qrMatrix: qrMatrix, qrDataUrl: qrDataUrl, canonNo: canonNo, checksum: checksum
  };
})();
