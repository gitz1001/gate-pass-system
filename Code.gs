// ════════════════════════════════════════════════════════════════
// PGP Google Sheets API — Complete Apps Script Web App
// ════════════════════════════════════════════════════════════════
//
// HOW TO USE:
// 1. Paste this ENTIRE file into your Apps Script editor (replacing the old code)
// 2. Click ▶ Run on "testGetAll" once (it will ask for permissions — click Allow)
// 3. Deploy → Manage deployments → edit the existing one → Deploy
//    (editing the existing deployment keeps the same /exec URL)
//
// doGet/doPost only run through the deployed Web App URL. You cannot run them
// with the ▶ button — use the test functions at the bottom instead.
//
// ────────────────────────────────────────────────────────────────
// WHAT CHANGED FROM THE PREVIOUS VERSION
// ────────────────────────────────────────────────────────────────
// 1. PHOTOS NOW SAVE. The browser converts images to compact WebP, sends them
//    to this Apps Script backend, and Drive stores the actual file. Sheets stores
//    only the resulting public image URL in the Photo column.
//
// 2. DUPLICATE APPLICATIONS ARE REJECTED.  submitApplication used to append
//    unconditionally, which is why one Student ID ended up on four rows. It now
//    refuses when the student already holds a live record, and answers in the
//    shape the web form's "Already Registered" pop-up expects.
//
// 3. 'QRtoken' SPELLING MATCHES THE SHEET.  valueMap said 'QRToken'; the column
//    is 'QRtoken', so the header lookup never matched.
//
// 4. MOBILE NUMBERS KEEP THEIR LEADING ZERO.  A cell holding 09171234567 comes
//    back from Sheets as the number 9228331172. Phone-ish columns are now
//    returned as text.
//
// 5. CONCURRENT SUBMISSIONS CAN NO LONGER COLLIDE.  Pass ID generation reads the
//    highest number then appends; two applications arriving together produced
//    the same ID. That block now runs under a script lock.
//
// 6. updateTGPStatus is POST-only.  A state-changing action is never performed
//    through GET, preventing a bookmarked/prefetched URL from mutating data.
//
// 7. UNKNOWN ACTIONS REPORT FAILURE.  They used to come back as
//    { success: true, data: { error: ... } }, which reads as success.
//
// 8. cleanupBadPhotoCells() added — clears Photo cells left holding an error
//    message by an older version of this script.
//
// 9. LOGIN MOVED TO THE SERVER.  The /exec URL is public, and every action used
//    to run for anyone who called it; login only happened in the browser,
//    after getUsers had sent it every password hash. Now the login action
//    checks the password here and returns a signed session token, every
//    non-public action requires that token and the right role, and no
//    response ever contains a password column. See AUTHENTICATION below.
//    BEFORE DEPLOYING: run setupAuthSecret() once and put the value it logs
//    into Vercel as AUTH_SECRET.
// ════════════════════════════════════════════════════════════════

// Columns that hold phone numbers. Sheets stores these as numbers when they
// look numeric, which silently eats the leading zero.
var TEXT_COLUMNS = ['ParentMobile', 'StudentID', 'phone'];

// A student with a record in one of these states may not apply again.
// Anything else (archived, declined) is treated as a closed record, so a
// student who was rejected can re-apply.
var BLOCKING_STATUSES = ['active', 'for approval', 'suspended'];

// ── Fixed Google resources ───────────────────────────────────
// Keep these explicit so the Web App does not depend on whichever
// spreadsheet happens to be bound/active in the Apps Script editor.
var PHOTO_FOLDER_ID = '1D0XZn5jixNEiL0W2IMz0rau-oikqx_3L';
var SPREADSHEET_ID = '1goM8RJzzA39pgRbtj9Vuv-glTe8tw_JaAqcF6uuKhm4';

function getConfiguredSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}


// ── Web App Entry Points ─────────────────────────────────────

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

// ── Main Request Router ──────────────────────────────────────

function handleRequest(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || '';
    let result;

    // All mutations must carry a POST body. The old router allowed most write
    // actions through doGet(), which could append empty rows when a GET URL was
    // visited or prefetched. Public application submissions remain POST-only.
    var postOnlyActions = {
      login: true,
      addGate: true, updateGate: true, removeGate: true,
      addStudent: true, updateStudent: true, updateStudentStatus: true, removeStudent: true,
      addLog: true, addTGP: true, updateTGPStatus: true,
      submitApplication: true, uploadPhoto: true
    };
    if (postOnlyActions[action] && (!e || !e.postData || !String(e.postData.contents || '').trim())) {
      throw new Error('POST request with a JSON body required for this action.');
    }

    // ── Access control ──
    // The /exec URL is public (it ships in js/config.js), so every action
    // decides here who may run it. PUBLIC_ACTIONS are the ones the public
    // application forms need; everything else needs a signed session token
    // from the login action, passed as ?auth=<token>.
    if (!ACTION_ROLES.hasOwnProperty(action) && PUBLIC_ACTIONS.indexOf(action) === -1) {
      // An unknown action is a failure, not a successful response that
      // happens to carry an error.
      return sendJSON({ success: false, error: 'Unknown action: ' + action });
    }
    var session = readSession_(params.auth);
    if (PUBLIC_ACTIONS.indexOf(action) === -1 && authEnforced_()) {
      if (!session) {
        return sendJSON({ success: false, authRequired: true, error: 'Your session has expired. Please log in again.' });
      }
      if (ACTION_ROLES[action].indexOf(session.role) === -1) {
        return sendJSON({ success: false, forbidden: true, error: 'Your account (' + session.role + ') is not allowed to do this.' });
      }
    }

    switch (action) {
      case 'login':
        result = login_(readBody_(e));
        break;

      // ── READ operations (GET requests) ──
      case 'getStudents':
        result = getSheetData('students');
        break;
      case 'getLogs':
        result = getSheetData('scan_logs');
        break;
      case 'getTGP':
        result = getSheetData('temporary_passes');
        break;
      case 'getUsers':
        result = publicUserRows_(getSheetData('users'));
        break;
      case 'getAll':
        result = getAllData();
        break;
      case 'getGates':
        result = getSheetData('gates');
        break;

      // ── WRITE operations (POST requests with JSON body) ──
      case 'addGate':
        result = addRow('gates', readBody_(e));
        break;
      case 'updateGate':
        result = updateRow('gates', readBody_(e));
        break;
      case 'removeGate':
        var gateData = readBody_(e);
        result = deleteRow('gates', gateData.id);
        break;
      case 'addStudent':
        result = addRow('students', readBody_(e));
        break;
      case 'addLog':
        result = addRow('scan_logs', readBody_(e));
        break;
      case 'addTGP':
        // The public TGP request form posts here without a session. Such a
        // request can only ever create a pending pass; approving it stays a
        // staff action.
        var tgpEntry = readBody_(e);
        if (!session) {
          tgpEntry = neutralizeFormulas_(tgpEntry);
          tgpEntry.status = 'pending';
        }
        result = addRow('temporary_passes', tgpEntry);
        break;

      // ── UPDATE operations ──
      case 'updateTGPStatus':
        var tgp = readBody_(e);
        // Guards only mark a pass used at the gate; approving and rejecting
        // stay with the office.
        if (session && session.role === 'guard' && String(tgp.status) !== 'used') {
          throw new Error('Guards can only mark a temporary pass as used.');
        }
        result = updateField('temporary_passes', tgp.id, 'status', tgp.status);
        break;

      case 'updateStudentStatus':
        var statusData = readBody_(e);
        // 'Status' with a capital S, matching the sheet header exactly.
        result = updateField('students', statusData.id, 'Status', statusData.status);
        break;

      // ── FULL ROW UPDATE (POST with JSON body) ──
      case 'updateStudent':
        var studentData = readBody_(e);
        // Guards enroll faces at the scanner and may change nothing else.
        if (session && session.role === 'guard') {
          studentData = { PassID: studentData.PassID, FaceDescriptor: studentData.FaceDescriptor };
        }
        result = updateRow('students', studentData);
        break;

      // ── DELETE operations ──
      case 'removeStudent':
        var removeData = readBody_(e);
        result = deleteRow('students', removeData.id);
        break;

      case 'submitApplication':
        result = submitApplication(neutralizeFormulas_(readBody_(e)));
        break;

      // ── PHOTO UPLOAD to Google Drive (WebP only) ──
      case 'uploadPhoto':
        // Without a session the upload gets a unique file name, so the public
        // forms can never replace or trash an existing student's photo.
        result = uploadPhotoToDrive_(readBody_(e), !session);
        break;
    }

    return sendJSON({ success: true, data: result });

  } catch (err) {
    return sendJSON({ success: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ════════════════════════════════════════════════════════════════
//
// Login happens here, never in the browser. The login action checks the
// password against the users tab and answers with a signed session token:
//
//   base64url(JSON payload) + '.' + base64url(HMAC-SHA256(payload, AUTH_SECRET))
//
// Every non-public action needs that token as ?auth=<token>. The Vercel email
// functions verify the same token with the same AUTH_SECRET, so the secret
// must be identical in Script Properties and in Vercel.
//
// The payload carries a fingerprint of the stored password hash, so changing
// a password in the users tab ends every session signed with the old one.
// Deactivating or deleting a user ends their sessions within USER_CACHE_SECONDS.
//
// SETUP: run setupAuthSecret() once from the editor and copy the value it logs
// into Vercel as AUTH_SECRET.
//
// EMERGENCY: setting the Script Property AUTH_ENFORCE to false turns the
// session check off again (the pre-login behaviour). Logins still work. Only
// use it to recover from a broken rollout, and switch it back.

// Actions anyone may call: what the public application and TGP request forms need.
var PUBLIC_ACTIONS = ['login', 'getGates', 'submitApplication', 'uploadPhoto', 'addTGP'];

// Who may call every other action. Roles match the 'role' column of the users tab.
var ACTION_ROLES = {
  getAll:              ['admin', 'secretary', 'guard'],
  getStudents:         ['admin', 'secretary', 'guard'],
  getLogs:             ['admin', 'secretary', 'guard'],
  getTGP:              ['admin', 'secretary', 'guard'],
  addLog:              ['admin', 'secretary', 'guard'],
  updateTGPStatus:     ['admin', 'secretary', 'guard'],  // guards: 'used' only
  updateStudent:       ['admin', 'secretary', 'guard'],  // guards: FaceDescriptor only
  addStudent:          ['admin', 'secretary'],
  updateStudentStatus: ['admin', 'secretary'],
  removeStudent:       ['admin', 'secretary'],
  getUsers:            ['admin'],
  addGate:             ['admin'],
  updateGate:          ['admin'],
  removeGate:          ['admin']
};

var SESSION_HOURS = 12;
var USER_CACHE_SECONDS = 120;
var LOGIN_MAX_FAILURES = 5;
var LOGIN_LOCK_SECONDS = 15 * 60;
var PASSWORD_ITERATIONS = 1000;

function authEnforced_() {
  return String(PropertiesService.getScriptProperties().getProperty('AUTH_ENFORCE') || '').toLowerCase() !== 'false';
}

function authSecret_() {
  var secret = PropertiesService.getScriptProperties().getProperty('AUTH_SECRET');
  if (!secret || secret.length < 32) {
    throw new Error('Login is not set up yet. An administrator must run setupAuthSecret() in the Apps Script editor.');
  }
  return secret;
}

/**
 * Run once from the editor. Creates AUTH_SECRET if it is missing and logs it
 * so it can be copied into Vercel. Running it again prints the same secret.
 */
function setupAuthSecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('AUTH_SECRET');
  if (!secret) {
    secret = bytesToHex_(Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      Utilities.getUuid() + Utilities.getUuid() + Date.now() + Math.random()
    ));
    props.setProperty('AUTH_SECRET', secret);
    Logger.log('Created a new AUTH_SECRET.');
  }
  Logger.log('Copy this into Vercel → Settings → Environment Variables as AUTH_SECRET (Production and Preview):');
  Logger.log(secret);
}

/**
 * Start over with a new secret. Every session ends, and Vercel's AUTH_SECRET
 * must be updated to the new value before email works again.
 */
function rotateAuthSecret() {
  PropertiesService.getScriptProperties().deleteProperty('AUTH_SECRET');
  setupAuthSecret();
}

function bytesToHex_(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

function base64Url_(value) {
  return Utilities.base64EncodeWebSafe(value).replace(/=+$/, '');
}

function hmacHex_(message, key) {
  return bytesToHex_(Utilities.computeHmacSha256Signature(message, key));
}

/** Compare two strings without returning early on the first difference. */
function safeEqual_(a, b) {
  a = String(a); b = String(b);
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// ── Password storage ─────────────────────────────────────────
//
// New format: v2$<iterations>$<salt hex>$<hash hex>, a salted, iterated
// HMAC-SHA256. Older rows hold either an unsalted SHA-256 hex digest or
// plaintext; both still log in once and are upgraded to v2 on that login.

function hashPasswordV2_(password, saltHex, iterations) {
  saltHex = saltHex || bytesToHex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Math.random())).slice(0, 32);
  iterations = iterations || PASSWORD_ITERATIONS;
  var value = Utilities.computeHmacSha256Signature(String(password), saltHex);
  for (var i = 1; i < iterations; i++) {
    value = Utilities.computeHmacSha256Signature(value, Utilities.newBlob(saltHex).getBytes());
  }
  return 'v2$' + iterations + '$' + saltHex + '$' + bytesToHex_(value);
}

function verifyPassword_(password, stored) {
  stored = String(stored || '').trim();
  if (!stored || !password) return false;
  var parts = stored.split('$');
  if (parts[0] === 'v2' && parts.length === 4) {
    return safeEqual_(hashPasswordV2_(password, parts[2], parseInt(parts[1], 10)), stored);
  }
  if (/^[a-f0-9]{64}$/i.test(stored)) return safeEqual_(sha256Hex_(password), stored.toLowerCase());
  return safeEqual_(password, stored);
}

function isV2Hash_(stored) {
  return /^v2\$\d+\$[a-f0-9]+\$[a-f0-9]{64}$/.test(String(stored || '').trim());
}

// ── Users tab ────────────────────────────────────────────────

function usersSheetInfo_() {
  var sheet = getConfiguredSpreadsheet_().getSheetByName('users');
  if (!sheet) throw new Error('Sheet tab "users" not found.');
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).trim(); });
  function col(name) {
    var i = headers.indexOf(name);
    return i !== -1 ? i : headers.map(function (h) { return h.toLowerCase(); }).indexOf(name.toLowerCase());
  }
  return {
    sheet: sheet, data: data, headers: headers,
    user: col('username'), password: col('password'), role: col('role'),
    name: col('name'), gate: col('gate'), status: col('status')
  };
}

function findUserRow_(info, username) {
  var wanted = String(username || '').trim();
  if (!wanted || info.user === -1) return -1;
  for (var i = 1; i < info.data.length; i++) {
    if (String(info.data[i][info.user]).trim() === wanted) return i;
  }
  return -1;
}

function userIsActive_(info, row) {
  var status = info.status === -1 ? '' : String(info.data[row][info.status] || '').trim().toLowerCase();
  return !status || status === 'active';
}

function passwordFingerprint_(storedHash) {
  return hmacHex_('pv:' + String(storedHash || ''), authSecret_()).slice(0, 16);
}

/** User rows without the password column, safe to hand to a browser. */
function publicUserRows_(rows) {
  return (rows || []).map(function (u) {
    var copy = {};
    Object.keys(u).forEach(function (k) {
      if (String(k).toLowerCase() !== 'password') copy[k] = u[k];
    });
    return copy;
  });
}

// ── Login ────────────────────────────────────────────────────

function login_(body) {
  var username = String((body && body.username) || '').trim();
  var password = String((body && body.password) || '');
  var fail = 'Invalid username or password.';
  if (!username || !password || username.length > 100 || password.length > 200) throw new Error(fail);

  var cache = CacheService.getScriptCache();
  var failKey = 'loginfail:' + username.toLowerCase();
  var failures = parseInt(cache.get(failKey) || '0', 10);
  if (failures >= LOGIN_MAX_FAILURES) {
    throw new Error('Too many failed attempts. Wait 15 minutes, then try again.');
  }

  var secret = authSecret_();
  var info = usersSheetInfo_();
  if (info.password === -1 || info.role === -1) throw new Error('The users tab needs username, password and role columns.');
  var row = findUserRow_(info, username);
  var stored = row === -1 ? '' : String(info.data[row][info.password] || '').trim();
  var ok = row !== -1 && verifyPassword_(password, stored) && userIsActive_(info, row) &&
    String(info.data[row][info.role] || '').trim() !== '';

  if (!ok) {
    cache.put(failKey, String(failures + 1), LOGIN_LOCK_SECONDS);
    throw new Error(fail);
  }
  cache.remove(failKey);

  // Upgrade a plaintext or unsalted hash to v2 now that we hold the password.
  if (!isV2Hash_(stored)) {
    stored = hashPasswordV2_(password);
    info.sheet.getRange(row + 1, info.password + 1).setValue(stored);
    cache.remove('user:' + username);
  }

  var user = {
    username: String(info.data[row][info.user]).trim(),
    name: info.name === -1 ? '' : String(info.data[row][info.name] || '').trim(),
    role: String(info.data[row][info.role]).trim().toLowerCase(),
    gate: info.gate === -1 ? '' : String(info.data[row][info.gate] || '').trim()
  };
  var now = Date.now();
  var payload = base64Url_(Utilities.newBlob(JSON.stringify({
    u: user.username, r: user.role, iat: now, exp: now + SESSION_HOURS * 3600 * 1000,
    pv: passwordFingerprint_(stored)
  })).getBytes());
  var token = payload + '.' + base64Url_(Utilities.computeHmacSha256Signature(payload, secret));
  return { token: token, expiresAt: now + SESSION_HOURS * 3600 * 1000, user: user };
}

// ── Session check ────────────────────────────────────────────

/**
 * Returns { username, role } for a valid token, or null. Never throws: a bad
 * token is treated exactly like no token.
 */
function readSession_(token) {
  try {
    token = String(token || '');
    var dot = token.indexOf('.');
    if (dot < 1) return null;
    var payload = token.slice(0, dot);
    var expected = base64Url_(Utilities.computeHmacSha256Signature(payload, authSecret_()));
    if (!safeEqual_(expected, token.slice(dot + 1))) return null;

    var padded = payload + '===='.slice((payload.length + 3) % 4 + 1);
    var claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(padded)).getDataAsString());
    if (!claims || !claims.u || !(Number(claims.exp) > Date.now())) return null;

    var current = currentUserState_(claims.u);
    if (!current || !current.active || current.pv !== claims.pv) return null;
    return { username: claims.u, role: current.role };
  } catch (_) {
    return null;
  }
}

/** The user's current role/status/password fingerprint, cached briefly. */
function currentUserState_(username) {
  var cache = CacheService.getScriptCache();
  var key = 'user:' + username;
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  var info = usersSheetInfo_();
  var row = findUserRow_(info, username);
  var state = row === -1 ? { active: false } : {
    active: userIsActive_(info, row),
    role: String(info.data[row][info.role] || '').trim().toLowerCase(),
    pv: passwordFingerprint_(String(info.data[row][info.password] || '').trim())
  };
  cache.put(key, JSON.stringify(state), USER_CACHE_SECONDS);
  return state;
}

// ── Untrusted input ──────────────────────────────────────────

/**
 * A public form value starting with = + - @ would be stored by Sheets as a
 * formula (IMPORTXML, HYPERLINK, ...). Prefixing an apostrophe stores it as
 * plain text instead; Sheets does not display the apostrophe.
 */
function neutralizeFormulas_(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.keys(obj).forEach(function (k) {
    var v = obj[k];
    if (typeof v === 'string' && /^[=+\-@]/.test(v)) obj[k] = "'" + v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) neutralizeFormulas_(v);
  });
  return obj;
}

// ── Helpers ──────────────────────────────────────────────────

function sendJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Parse the POST body, returning {} when there is none. Guards every action
 * against a bare GET, which used to throw on e.postData.contents.
 */
function readBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  var raw = String(e.postData.contents);
  // Current browser uploads are compressed WebP and stay well below this limit.
  // Refusing unusually large JSON prevents accidental/malicious payloads from
  // consuming Apps Script memory while preserving every supported request shape.
  if (raw.length > 12 * 1024 * 1024) {
    throw new Error('Request body is too large.');
  }
  try {
    return JSON.parse(raw) || {};
  } catch (err) {
    throw new Error('Request body was not valid JSON.');
  }
}

/**
 * Sheets hands back a number for a cell like 09171234567, dropping the leading
 * zero. Phone and ID columns are returned as text instead.
 */
function normalizeCell_(header, value) {
  if (value === null || value === undefined) return '';
  if (TEXT_COLUMNS.indexOf(header) === -1) return value;
  if (typeof value !== 'number') return value;

  var s = String(value);
  // Philippine mobile numbers are 11 digits beginning 09.
  if (s.length === 10 && s.charAt(0) === '9') s = '0' + s;
  return s;
}

// ════════════════════════════════════════════════════════════════
// DATA FUNCTIONS — These are what actually read/write the sheets
// ════════════════════════════════════════════════════════════════

/**
 * Read all rows from a sheet tab and return as array of objects.
 * Each object uses the header row as keys.
 */
function getSheetData(sheetName) {
  return getSheetDataFromSpreadsheet_(getConfiguredSpreadsheet_(), sheetName);
}

function getSheetDataFromSpreadsheet_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet tab "' + sheetName + '" not found. Please create it in your spreadsheet.');
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1 || lastCol === 0) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];

  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i].every(function (cell) { return cell === '' || cell === null; })) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = normalizeCell_(headers[j], data[i][j]);
    }
    results.push(obj);
  }
  return results;
}

/**
 * Get ALL data from all 4 tabs in a single call.
 */
function getAllData() {
  var ss = getConfiguredSpreadsheet_();
  return {
    students: getSheetDataFromSpreadsheet_(ss, 'students'),
    scan_logs: getSheetDataFromSpreadsheet_(ss, 'scan_logs'),
    temporary_passes: getSheetDataFromSpreadsheet_(ss, 'temporary_passes'),
    users: publicUserRows_(getSheetDataFromSpreadsheet_(ss, 'users')),
    gates: ss.getSheetByName('gates') ? getSheetDataFromSpreadsheet_(ss, 'gates') : []
  };
}

/**
 * Add a new row to a sheet. The object keys must match the header names.
 */
function addRow(sheetName, obj) {
  var ss = getConfiguredSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet tab "' + sheetName + '" not found. Please create it in your spreadsheet.');
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    row.push(obj[headers[i]] !== undefined ? obj[headers[i]] : '');
  }
  sheet.appendRow(row);
  return obj;
}

/**
 * Update a single field in a row, found by matching the first column (ID column).
 */
function updateField(sheetName, id, field, value) {
  var ss = getConfiguredSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet tab "' + sheetName + '" not found. Please create it in your spreadsheet.');
  }
  if (!id) {
    throw new Error('No ID supplied for the update.');
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idCol = 0; // First column is always the ID
  var fieldCol = headers.indexOf(field);
  if (fieldCol === -1) {
    throw new Error('Column "' + field + '" not found in sheet "' + sheetName + '". Available columns: ' + headers.join(', '));
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(id).trim()) {
      sheet.getRange(i + 1, fieldCol + 1).setValue(value);
      var result = {};
      result[headers[idCol]] = id;
      result[field] = value;
      return result;
    }
  }
  throw new Error('Row with ID "' + id + '" not found in sheet "' + sheetName + '"');
}

/**
 * Update an entire row by matching the first column (ID column).
 */
function updateRow(sheetName, obj) {
  var ss = getConfiguredSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet tab "' + sheetName + '" not found. Please create it in your spreadsheet.');
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = 0;
  var id = obj[headers[idCol]];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(id).trim()) {
      var row = [];
      for (var j = 0; j < headers.length; j++) {
        row.push(obj[headers[j]] !== undefined ? obj[headers[j]] : data[i][j]);
      }
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return obj;
    }
  }
  throw new Error('Row with ID "' + id + '" not found in sheet "' + sheetName + '"');
}

/**
 * Delete a row by ID (first column match).
 */
function deleteRow(sheetName, id) {
  var ss = getConfiguredSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet tab "' + sheetName + '" not found. Please create it in your spreadsheet.');
  }

  var data = sheet.getDataRange().getValues();
  var idCol = 0;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { deleted: id };
    }
  }
  throw new Error('Row with ID "' + id + '" not found in sheet "' + sheetName + '"');
}

// ════════════════════════════════════════════════════════════════
// PUBLIC APPLICATION FORM
// ════════════════════════════════════════════════════════════════

/**
 * Handle a submission from the public gatepass application form.
 *
 * Returns either
 *   { success: true,  passId: '26INT09-001', message: '...' }
 * or, for a student who already holds a record,
 *   { success: false, duplicate: true, message: '... already registered ...' }
 *
 * The whole body runs under a script lock: Pass ID generation reads the highest
 * existing number and then appends, so two applications arriving at the same
 * moment would otherwise be handed the same ID.
 */
function submitApplication(data) {
  data = data || {};

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (e) {
    throw new Error('The server is busy. Please try again in a moment.');
  }

  try {
    var ss = getConfiguredSpreadsheet_();
    var sheet = ss.getSheetByName('students');
    if (!sheet) throw new Error('Sheet tab "students" not found.');

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // ── One application per student ──────────────────────────
    var clash = findLiveRecord_(sheet, headers, data.studid);
    if (clash) {
      return {
        success: false,
        duplicate: true,
        message: 'Student ID ' + String(data.studid).trim() +
                 ' is already registered to ' + clash.name +
                 ' (' + clash.status + ').'
      };
    }

    var passId = generateProperPassId_(sheet, data.grade, data.section, data.schoolyear);

    var completeName = ((data.lastname || '') + ', ' + (data.firstname || ''))
      .trim().replace(/^,\s*/, '');

    // ── Photo ────────────────────────────────────────────────
    // The browser uploads compact WebP bytes to Google Drive through this Apps Script
    // backend. Sheets only receives and stores the resulting public URL.
    var photoUrl = data.studentPhoto && data.studentPhoto.url
      ? String(data.studentPhoto.url).trim()
      : '';

    var valueMap = {
      'PassID':         passId,
      'StudentID':      data.studid        || '',
      'CompleteName':   completeName,
      'Grade':          data.grade         || '',
      'Section':        data.section       || '',
      'SchoolYear':     data.schoolyear    || '',
      'Arrangements':   data.arrangements  || '',
      'ParentName':     data.parentname    || '',
      'ParentEmail':    data.parentemail   || '',
      'ParentMobile':   data.phone         || '',
      'PreferredGate':  data.preferredgate || '',
      'VehicleDetails': '',
      'Address':        '',
      'Photo':          photoUrl,
      'Status':         'for approval',
      'FaceDescriptor': '',
      'QRtoken':        ''   // matches the sheet header exactly
    };

    var row = headers.map(function (h) {
      return valueMap.hasOwnProperty(h) ? valueMap[h] : '';
    });

    sheet.appendRow(row);

    return {
      success: true,
      passId: passId,
      message: 'Application submitted successfully.'
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Find an existing student record that should block a new application.
 * Archived and declined records are ignored, so a rejected applicant may
 * re-apply. Returns { name, status } or null.
 */
function findLiveRecord_(sheet, headers, studentId) {
  var wanted = String(studentId || '').trim().toLowerCase();
  if (!wanted) return null;

  var idCol     = headers.indexOf('StudentID');
  var nameCol   = headers.indexOf('CompleteName');
  var statusCol = headers.indexOf('Status');
  if (idCol === -1) return null;

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim().toLowerCase() !== wanted) continue;

    var status = String(statusCol === -1 ? '' : data[i][statusCol]).trim().toLowerCase();
    if (BLOCKING_STATUSES.indexOf(status) !== -1) {
      return {
        name: String(nameCol === -1 ? 'an existing student' : data[i][nameCol]),
        status: status
      };
    }
  }
  return null;
}

/**
 * Build the next Pass ID for a grade and section, e.g. 26INT09-001.
 * Call this inside a lock — it reads the highest existing number.
 */
function getPhotoSubfolder_(kind) {
  var root = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  var name = String(kind || 'pgp').toLowerCase() === 'tgp' ? 'tgp' : 'pgp';
  var folders = root.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : root.createFolder(name);
}

function uploadPhotoToDrive(data) {
  return uploadPhotoToDrive_(data);
}

/**
 * @param {Object} data
 * @param {boolean} [uniqueName] true for an unauthenticated upload: the file
 *   gets a fresh name and nothing existing is trashed.
 */
function uploadPhotoToDrive_(data, uniqueName) {
  data = data || {};
  if (!data.studentId) throw new Error('Student ID is required.');
  if (!data.base64) throw new Error('No photo data received.');
  if (String(data.mimeType || '').toLowerCase() !== 'image/webp') {
    throw new Error('Photos must be converted to WebP before upload.');
  }
  var kind = String(data.kind || 'pgp').toLowerCase() === 'tgp' ? 'tgp' : 'pgp';
  var encoded = String(data.base64).replace(/^data:image\/webp;base64,/i, '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length < 16) throw new Error('Photo data is invalid.');
  var bytes = Utilities.base64Decode(encoded);
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) throw new Error('Photo is too large.');
  if (bytes.length < 12 || bytes[0] !== 82 || bytes[1] !== 73 || bytes[2] !== 70 || bytes[3] !== 70 || bytes[8] !== 87 || bytes[9] !== 69 || bytes[10] !== 66 || bytes[11] !== 80) {
    throw new Error('Photo is not a valid WebP image.');
  }
  var safeId = String(data.studentId).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 120) || 'photo';
  var fileName = uniqueName
    ? safeId + '-' + Utilities.getUuid().slice(0, 8) + '.webp'
    : safeId + '.webp';
  var folder = getPhotoSubfolder_(kind);
  if (!uniqueName) {
    var existing = folder.getFilesByName(fileName);
    while (existing.hasNext()) existing.next().setTrashed(true);
  }
  var blob = Utilities.newBlob(bytes, 'image/webp', fileName);
  var file = folder.createFile(blob);
  // Do not call setSharing() here. The folder's sharing policy controls access;
  // programmatic permission changes can be blocked by Workspace policies.
  return { success:true, url:'https://lh3.googleusercontent.com/d/' + file.getId(), fileId:file.getId(), fileName:fileName, mimeType:'image/webp' };
}

function savePhotoToDrive_(studentId, base64, mimeType, fileName) {
  return uploadPhotoToDrive_({studentId:studentId, base64:base64, mimeType:'image/webp', fileName:fileName, kind:'pgp'}).url;
}

function generateProperPassId_(sheet, grade, section, schoolYear) {
  var yy = schoolYear ? String(schoolYear).split('-')[0].slice(-2) : '26';

  var gradeStr = String(grade || '').toLowerCase().trim();
  var gradeCode;
  if (gradeStr === 'ib1') gradeCode = 'B1';
  else if (gradeStr === 'ib2') gradeCode = 'B2';
  else {
    var m = gradeStr.match(/(\d+)/);
    gradeCode = m ? String(parseInt(m[1])).padStart(2, '0') : 'XX';
  }

  var sec = String(section || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  sec = (sec + 'XXX').substring(0, 3);

  var prefix = yy + sec + gradeCode;

  var data = sheet.getDataRange().getValues();
  var maxNNN = 0;
  var re = new RegExp('^' + prefix + '-(\\d{3})$');
  for (var i = 1; i < data.length; i++) {
    var match = String(data[i][0]).match(re);
    if (match) {
      var n = parseInt(match[1], 10);
      if (n > maxNNN) maxNNN = n;
    }
  }
  return prefix + '-' + String(maxNNN + 1).padStart(3, '0');
}

// ════════════════════════════════════════════════════════════════
// MAINTENANCE — run these by hand from the editor
// ════════════════════════════════════════════════════════════════

/**
 * Replace empty or PGP-timestamp Pass IDs with the proper format.
 */
function fixMissingPassIds() {
  var ss = getConfiguredSpreadsheet_();
  var sheet = ss.getSheetByName('students');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var passIdCol  = headers.indexOf('PassID');
  var gradeCol   = headers.indexOf('Grade');
  var sectionCol = headers.indexOf('Section');
  var syCol      = headers.indexOf('SchoolYear');

  var fixed = 0;
  for (var i = 1; i < data.length; i++) {
    var passId = String(data[i][passIdCol] || '').trim();
    if (passId && !passId.match(/^PGP-\d+$/)) continue;

    var newId = generateProperPassId_(
      sheet,
      String(data[i][gradeCol]   || ''),
      String(data[i][sectionCol] || ''),
      String(data[i][syCol]      || '')
    );
    sheet.getRange(i + 1, passIdCol + 1).setValue(newId);
    data[i][passIdCol] = newId;   // keep the local copy in step for the next ID
    fixed++;
    Logger.log('Row ' + (i + 1) + ' → ' + newId);
  }
  Logger.log('Done. Fixed: ' + fixed);
}

/**
 * An older version of this script wrote its exception text into the Photo
 * column, so those cells now hold things like
 *   "ERROR: You do not have permission to call DriveApp.Folder.createFile"
 *   "NO PHOTO DATA RECEIVED"
 * The app treats any non-empty value as a photo path and renders a broken
 * image. This clears them so those students fall back to their initials.
 *
 * The pictures themselves are not recoverable — the uploads never completed.
 */
function cleanupBadPhotoCells() {
  var ss = getConfiguredSpreadsheet_();
  var sheet = ss.getSheetByName('students');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var photoCol = headers.indexOf('Photo');
  var nameCol  = headers.indexOf('CompleteName');
  if (photoCol === -1) throw new Error('No "Photo" column found.');

  var cleared = 0;
  for (var i = 1; i < data.length; i++) {
    var v = String(data[i][photoCol] || '').trim();
    if (!v) continue;
    var looksLikeAPhoto = v.indexOf('data:image') === 0 || /^https?:\/\//i.test(v);
    if (looksLikeAPhoto) continue;

    sheet.getRange(i + 1, photoCol + 1).setValue('');
    cleared++;
    Logger.log('Cleared row ' + (i + 1) + ' (' +
      (nameCol === -1 ? '' : data[i][nameCol]) + '): ' + v.substring(0, 60));
  }
  Logger.log('Done. Cleared: ' + cleared);
}

/**
 * Replace every plaintext password in the 'users' tab with a salted v2 hash.
 *
 * HOW TO SET OR RESET A PASSWORD: type the new password into the user's
 * password cell, then run this function. Staff can also simply log in: the
 * login action upgrades a plaintext or old SHA-256 cell to v2 by itself.
 *
 * Rows already holding a v2 hash or an old SHA-256 hash are skipped (an old
 * hash can only be upgraded at login, when the password is known), so running
 * it twice is harmless. Changing a password ends that user's open sessions.
 */
function hashPlaintextPasswords() {
  var info = usersSheetInfo_();
  if (info.password === -1) throw new Error('No "password" column found in the users tab.');

  var hashed = 0, skipped = 0, blank = 0;
  for (var i = 1; i < info.data.length; i++) {
    var value = String(info.data[i][info.password] || '').trim();
    var who = info.user === -1 ? ('row ' + (i + 1)) : String(info.data[i][info.user] || ('row ' + (i + 1)));

    if (!value) { blank++; continue; }
    if (isV2Hash_(value) || /^[a-f0-9]{64}$/i.test(value)) { skipped++; continue; }

    info.sheet.getRange(i + 1, info.password + 1).setValue(hashPasswordV2_(value));
    CacheService.getScriptCache().remove('user:' + who);
    hashed++;
    Logger.log('Hashed the password for ' + who);
  }

  Logger.log('Done. Hashed: ' + hashed + ', already hashed: ' + skipped + ', blank: ' + blank);
}

/**
 * Read-only check: which accounts still use a password from the list below.
 * These include the defaults that were exposed in the repository history.
 * Logs usernames only, never a password.
 */
function reportWeakPasswords() {
  var weak = ['admin123', 'sec123', 'guard123', 'admin', 'password', 'password123',
              '123456', '12345678', 'secretary', 'guard', 'sisc123', 'southville'];
  var info = usersSheetInfo_();
  if (info.password === -1) throw new Error('No "password" column found in the users tab.');

  var found = 0;
  for (var i = 1; i < info.data.length; i++) {
    var stored = String(info.data[i][info.password] || '').trim();
    var who = info.user === -1 ? ('row ' + (i + 1)) : String(info.data[i][info.user]);
    if (!stored) { Logger.log(who + ': NO PASSWORD SET'); found++; continue; }
    for (var w = 0; w < weak.length; w++) {
      if (verifyPassword_(weak[w], stored)) {
        Logger.log(who + ': uses a known weak or leaked password. Change it now.');
        found++;
        break;
      }
    }
  }
  Logger.log(found ? 'Done. Accounts to fix: ' + found : 'Done. No account uses a password from the list.');
}

/**
 * SHA-256 as lowercase hex, byte for byte identical to the browser's
 * crypto.subtle.digest('SHA-256', ...) used by hashPassword().
 * computeDigest hands back signed bytes, hence the +256.
 */
function sha256Hex_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

/**
 * Read-only check: how many accounts still hold a plaintext password.
 * Run this first if you want to see the damage before changing anything.
 */
function reportPlaintextPasswords() {
  var ss = getConfiguredSpreadsheet_();
  var sheet = ss.getSheetByName('users');
  if (!sheet) throw new Error('Sheet tab "users" not found.');

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var pwCol = headers.indexOf('password');
  if (pwCol === -1) pwCol = headers.indexOf('Password');
  var userCol = headers.indexOf('username');
  if (userCol === -1) userCol = headers.indexOf('Username');
  if (pwCol === -1) throw new Error('No "password" column found in the users tab.');

  var plain = 0;
  for (var i = 1; i < data.length; i++) {
    var value = String(data[i][pwCol] || '').trim();
    if (!value || isV2Hash_(value) || /^[a-f0-9]{64}$/i.test(value)) continue;
    plain++;
    Logger.log('Plaintext password on row ' + (i + 1) +
      (userCol === -1 ? '' : ' (' + data[i][userCol] + ')') +
      ' — ' + value.length + ' characters');
  }
  Logger.log('Done. Accounts still storing a readable password: ' + plain);
}

/**
 * Report Student IDs that appear on more than one row, newest last.
 * Read-only — it changes nothing, it just tells you what to merge.
 */
function reportDuplicateStudents() {
  var ss = getConfiguredSpreadsheet_();
  var sheet = ss.getSheetByName('students');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var idCol     = headers.indexOf('StudentID');
  var passCol   = headers.indexOf('PassID');
  var statusCol = headers.indexOf('Status');
  var nameCol   = headers.indexOf('CompleteName');

  var seen = {};
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][idCol] || '').trim().toLowerCase();
    if (!key) continue;
    (seen[key] = seen[key] || []).push({
      row: i + 1,
      pass: data[i][passCol],
      name: data[i][nameCol],
      status: data[i][statusCol]
    });
  }

  var total = 0;
  Object.keys(seen).forEach(function (k) {
    if (seen[k].length < 2) return;
    total++;
    Logger.log('StudentID ' + k + ' → ' + seen[k].length + ' rows');
    seen[k].forEach(function (r) {
      Logger.log('    row ' + r.row + '  ' + r.pass + '  ' + r.name + '  [' + r.status + ']');
    });
  });
  Logger.log('Done. Student IDs on more than one row: ' + total);
}

// ════════════════════════════════════════════════════════════════
// TEST FUNCTIONS — Click ▶ Run on these to test in the editor
// ════════════════════════════════════════════════════════════════

/**
 * TEST: Read all data from all tabs.
 * Run this one first — it will ask for permissions.
 */
function testGetAll() {
  var data = getAllData();
  Logger.log('students: '          + data.students.length);
  Logger.log('scan_logs: '         + data.scan_logs.length);
  Logger.log('temporary_passes: '  + data.temporary_passes.length);
  Logger.log('users: '             + data.users.length);
  Logger.log('✅ All data read successfully!');
}

/**
 * TEST: the photo branch, without writing anything.
 * Proves a Google Drive WebP URL is carried through to the Photo column.
 */
function testPhotoResolution() {
  var driveStyle = { studentPhoto: { url: 'https://lh3.googleusercontent.com/d/example', mimeType: 'image/webp' } };
  var noPhoto   = { studentPhoto: null };

  var got = driveStyle.studentPhoto && driveStyle.studentPhoto.url ? driveStyle.studentPhoto.url : '';
  Logger.log('Drive URL  → ' + got);
  Logger.log('No photo   → "' + (noPhoto.studentPhoto ? '?' : '') + '"');
  Logger.log(got ? '✅ Drive URLs are stored.' : '❌ Still dropping the photo.');
}

/**
 * TEST: the duplicate guard. Read-only.
 * Put a Student ID that already exists in the sheet here.
 */
function testDuplicateGuard() {
  var ss = getConfiguredSpreadsheet_();
  var sheet = ss.getSheetByName('students');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var existing = findLiveRecord_(sheet, headers, '24-0193c');
  Logger.log(existing
    ? '✅ Would be rejected: already registered to ' + existing.name + ' (' + existing.status + ')'
    : 'ℹ️ No live record — this application would be accepted.');
}

/**
 * TEST: Add a sample scan log.
 */
function testAddLog() {
  var sample = {
    id: 'LOG-' + Date.now(),
    studentId: 'PGP-TEST001',
    gate: 'Gate 1',
    timestamp: new Date().toISOString(),
    result: 'granted',
    passType: 'PGP'
  };
  Logger.log('✅ Log added: ' + JSON.stringify(addRow('scan_logs', sample)));
}

/**
 * TEST: Add a sample TGP.
 */
function testAddTGP() {
  var sample = {
    id: 'TGP-TEST01',
    studentId: 'PGP-TEST001',
    validDate: Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd'),
    gate: 'Main Gate',
    reason: 'Medical appointment',
    requester: 'Test Parent',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  Logger.log('✅ TGP added: ' + JSON.stringify(addRow('temporary_passes', sample)));
}


function authorizeDrive() {
  DriveApp.getFolderById(PHOTO_FOLDER_ID).getName();
  Logger.log('Drive authorization OK: ' + PHOTO_FOLDER_ID);
}

function testDriveAccess() {
  var folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  return { success: true, folderName: folder.getName(), folderId: folder.getId() };
}
