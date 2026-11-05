/**
 * Elektronika platformasi — o‘qituvchi jurnali.
 * Shu skript o‘qituvchining o‘z Google jadvaliga biriktiriladi.
 * "Men sifatida bajarish" + "Hamma" qilib joylanadi.
 * Talaba o‘z tokeni bilan boshqa odamning Drive iga yozolmaydi;
 * yozishni shu skript o‘qituvchi nomidan bajaradi va Google ID tokenini tekshiradi.
 * Yo‘riqnoma: docs/google-setup-uz.md
 */
function doGet(e) {
  return out_(handle_(e.parameter || {}, null), e.parameter && e.parameter.callback);
}
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData && e.postData.contents || "{}"); } catch (err) { body = {}; }
  return out_(handle_(e.parameter || {}, body), null);
}

function handle_(q, body) {
  var p = body || {};
  Object.keys(q || {}).forEach(function (k) { if (p[k] == null) p[k] = q[k]; });
  var action = String(p.action || "");
  try {
    if (action === "setup") return setup_(p);
    if (action === "result") return result_(p);
    if (action === "get") return getOne_(p);
    if (action === "list") return list_(p);
    return { ok: false, error: "action" };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

function setup_(p) {
  var info = verify_(p.idToken, p.clientId);
  var code = norm_(p.code);
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error("code");
  var props = PropertiesService.getScriptProperties();
  var owner = props.getProperty("TEACHER_EMAIL");
  if (owner && owner !== info.email) throw new Error("owner");
  props.setProperty("CLIENT_ID", String(p.clientId || ""));
  props.setProperty("CODE", code);
  props.setProperty("TEACHER_EMAIL", info.email);
  props.setProperty("TEACHER_SUB", info.sub);
  sheet_();
  return { ok: true, email: info.email, code: code };
}

function result_(p) {
  var props = PropertiesService.getScriptProperties();
  var info = verify_(p.idToken, props.getProperty("CLIENT_ID"));
  if (norm_(p.code) !== props.getProperty("CODE")) throw new Error("code");
  var lab = p.lab || {};
  var labId = Number(lab.id);
  if (!labId) throw new Error("lab");
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    var key = info.sub + "|" + labId;
    var values = sh.getDataRange().getValues();
    var rowNum = 0;
    for (var i = 1; i < values.length; i++) if (String(values[i][0]) === key) { rowNum = i + 1; break; }
    var row = [
      key, info.sub, info.email, String(p.ism || ""), String(p.familiya || ""),
      String(p.kurs || ""), String(p.guruh || ""), labId,
      new Date().toISOString(), lab.score == null ? "" : lab.score, lab.gradePoint == null ? (lab.grade == null ? "" : lab.grade) : lab.gradePoint,
      lab.step || "", lab.done ? 1 : 0, lab.preOk == null ? "" : lab.preOk, lab.postOk == null ? "" : lab.postOk,
      JSON.stringify(lab.calc || []), String(lab.concl || "").slice(0, 2000), JSON.stringify(lab),
      String(lab.gradeWord || ""), JSON.stringify(lab.criteria || lab.baho && lab.baho.items || []),
      lab.gradeOverride == null ? "" : lab.gradeOverride, lab.gradeAuto == null ? "" : lab.gradeAuto
    ];
    if (rowNum) sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, sub: info.sub, lab: labId };
}

function getOne_(p) {
  var props = PropertiesService.getScriptProperties();
  var info = verify_(p.idToken, props.getProperty("CLIENT_ID"));
  if (norm_(p.code) !== props.getProperty("CODE")) throw new Error("code");
  var key = info.sub + "|" + Number(p.lab);
  var values = sheet_().getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) return { ok: true, found: true, updated: values[i][8] };
  }
  return { ok: true, found: false };
}

function list_(p) {
  var props = PropertiesService.getScriptProperties();
  var info = verify_(p.idToken, props.getProperty("CLIENT_ID"));
  if (info.email !== props.getProperty("TEACHER_EMAIL") && info.sub !== props.getProperty("TEACHER_SUB")) throw new Error("teacher");
  var values = sheet_().getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var lab = {};
    try { lab = JSON.parse(values[i][17] || "{}"); } catch (e) { lab = {}; }
    rows.push({
      sub: values[i][1], email: values[i][2], ism: values[i][3], familiya: values[i][4],
      kurs: values[i][5], guruh: values[i][6], lab: lab
    });
  }
  return { ok: true, rows: rows };
}

function verify_(idToken, clientId) {
  if (!idToken) throw new Error("token");
  if (!clientId) throw new Error("config");
  var res = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("token");
  var info = JSON.parse(res.getContentText());
  if (info.aud !== clientId && info.azp !== clientId) throw new Error("aud");
  if (String(info.email_verified) !== "true") throw new Error("email");
  if (info.exp && Number(info.exp) * 1000 < Date.now()) throw new Error("exp");
  return info;
}

function sheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("Jurnal");
  if (!sh) sh = ss.insertSheet("Jurnal");
  var want = ["key", "sub", "email", "ism", "familiya", "kurs", "guruh", "lab", "updated", "score", "grade", "step", "done", "pre", "post", "calc", "concl", "labJson", "gradeWord", "criteria", "gradeOverride", "gradeAuto"];
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, want.length).setValues([want]);
  else {
    var width = Math.max(sh.getLastColumn(), want.length);
    var header = sh.getRange(1, 1, 1, width).getValues()[0];
    for (var c = 0; c < want.length; c++) {
      if (!header[c]) sh.getRange(1, c + 1).setValue(want[c]);
    }
  }
  return sh;
}

function norm_(code) { return String(code || "").trim().toUpperCase(); }

function out_(obj, callback) {
  var json = JSON.stringify(obj).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  if (callback && /^[A-Za-z0-9_]+$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + json + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
