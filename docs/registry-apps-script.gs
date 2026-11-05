/**
 * Elektronika platformasi — integratsiya kodi reestri.
 * Ega bir marta joylaydi. Talaba jurnali bu yerda EMAS:
 * bu faqat qisqa kod → o‘qituvchi veb-ilovasi manzili.
 * Yo‘riqnoma: docs/google-setup-uz.md
 *
 * CONFIG.CLIENT_ID ni google-config.js dagi clientId bilan bir xil qiling.
 */
var CONFIG = {
  CLIENT_ID: "PASTE_OAUTH_CLIENT_ID"
};

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
    if (action === "lookup") return lookup_(p.code);
    if (action === "register") return register_(p);
    return { ok: false, error: "action" };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

function lookup_(code) {
  var row = find_(norm_(code));
  if (!row) return { ok: false, error: "code" };
  return { ok: true, code: row.code, url: row.url, teacherName: row.name, teacherEmail: row.email };
}

function register_(p) {
  var info = verify_(p.idToken);
  var code = norm_(p.code);
  var url = String(p.url || "").trim();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error("code");
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) throw new Error("url");
  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][1]) === info.email && String(values[i][0]) !== code) sh.deleteRow(i + 1);
  }
  var found = find_(code);
  if (found && found.email !== info.email) throw new Error("taken");
  var now = new Date().toISOString();
  if (found) {
    sh.getRange(found.row, 1, 1, 5).setValues([[code, info.email, info.name || "", url, now]]);
  } else {
    sh.appendRow([code, info.email, info.name || "", url, now]);
  }
  return { ok: true, code: code, url: url };
}

function verify_(idToken) {
  if (!idToken) throw new Error("token");
  if (!CONFIG.CLIENT_ID || CONFIG.CLIENT_ID.indexOf("PASTE_") === 0) throw new Error("config");
  var res = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("token");
  var info = JSON.parse(res.getContentText());
  if (info.aud !== CONFIG.CLIENT_ID && info.azp !== CONFIG.CLIENT_ID) throw new Error("aud");
  if (String(info.email_verified) !== "true") throw new Error("email");
  if (info.exp && Number(info.exp) * 1000 < Date.now()) throw new Error("exp");
  return info;
}

function sheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("Reestr");
  if (!sh) {
    sh = ss.insertSheet("Reestr");
    sh.appendRow(["code", "email", "name", "url", "updated"]);
  }
  if (sh.getLastRow() < 1) sh.appendRow(["code", "email", "name", "url", "updated"]);
  return sh;
}

function find_(code) {
  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === code) {
      return { row: i + 1, code: values[i][0], email: values[i][1], name: values[i][2], url: values[i][3] };
    }
  }
  return null;
}

function norm_(code) {
  return String(code || "").trim().toUpperCase();
}

function out_(obj, callback) {
  var json = JSON.stringify(obj).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  if (callback && /^[A-Za-z0-9_]+$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + json + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
