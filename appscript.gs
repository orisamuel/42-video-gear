// ============================================================
// צילה 📷 · מערכת לניהול ציוד צילום · 42 — Google Apps Script
// ארכיטקטורה: HtmlService מגיש את האפליקציה, google.script.run כתעבורה,
// Google Sheets כדאטהבייס, זהות משתמש מ-Session (חומת דומיין ארגונית).
// ============================================================
//
// DEPLOYMENT (קריטי!):
//   Deploy → Manage deployments → ✏️ →
//     Execute as: Me
//     Who has access: Anyone within 42creative.co.il   ← זו חומת הכניסה
//   כל עריכה בקוד מחייבת New version → Deploy (הכתובת לא משתנה).
//
// הרשאות:
//   - צפייה/השאלה/החזרה/תיקון: כל מי שמחובר לחשבון @42creative.co.il
//   - הוספה/עריכה/מחיקה של ציוד: אימיילים ברשימת adminEmails בגיליון settings
//
// אבטחה: כל פונקציה ברמה העליונה ששמה לא נגמר ב-_ אפשר להריץ ישירות מהדפדפן
// (google.script.run), בלי לעבור דרך האפליקציה. לכן הפונקציות הציבוריות היחידות הן:
//   doGet, api_* (כל אחת בודקת getUser_ ואדמין בעצמה), keepWarm (טריגר),
//   authorizeOnce (להרצה מהעורך, אדמין בלבד). כל השאר נגמרות ב-_.
//   פונקציה חדשה: או api_ עם בדיקת הרשאה בתחילתה, או _ בסוף השם.
// ============================================================

const SHEET_ID = '1Bw6zGoOiv8jvmAth1rPT6dgB4hnKi4mgypHFUPjVXgE';

// מ-19/10/2026 צילה עברה לבית חדש, על המסד והכניסה של ימימה, עם אותם פריטים, מק"טים והיסטוריה.
// הסקריפט והגיליון נשארים כארכיון לקריאה בלבד: אי אפשר לשנות כאן כלום, וכל כניסה מפנה לבית החדש.
const NEW_HOME = 'https://yemima-42.vercel.app/tzila';
const MOVED = { success: false, moved: NEW_HOME, message: 'צילה עברה לבית חדש: ' + NEW_HOME + ' . כאן כבר אי אפשר לשנות.' };
const ALLOWED_DOMAIN = '42creative.co.il';
const FAVICON_URL = 'https://orisamuel.github.io/42-video-gear/favicon-64.png';

// סטטוסים של פריט ציוד (נשמרים בעברית בגיליון — קריא לבני אדם)
const ST_AVAILABLE = 'זמין';
const ST_OUT       = 'מושאל';
const ST_REPAIR    = 'בתיקון';

// סטטוסים של רשומת השאלה
const CO_OPEN     = 'פתוח';
const CO_RETURNED = 'הוחזר';

// ============================================================
// WEB APP — הגשת האפליקציה
// ============================================================

function doGet(e) {
  // דף נחיתה קטן אחרי החלפת חשבון (נפתח בפופאפ מתוך צילה)
  if (e && e.parameter && e.parameter.authdone) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:Heebo,sans-serif;direction:rtl;background:#0A0A0B;color:#FAFAFA;position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;">' +
      '<div><div style="font-size:3.5rem;">✅</div><h2 style="margin:12px 0 6px;">מחוברים!</h2>' +
      '<p style="color:#A1A1AA;">סוגרים את החלון הזה — וצילה תרענן את עצמה לבד.</p></div></div>'
    ).setTitle('צילה · מחוברים');
  }
  if (e && e.parameter && e.parameter.action) {
    // ה-API הישן בוטל — האפליקציה עברה ל-google.script.run מאחורי חומת הדומיין
    if (e.parameter.action === 'ping') return jsonResponse_({ success: true, version: 'v5' });
    return jsonResponse_({ success: false, message: 'ה-API הציבורי בוטל. צילה זמינה רק דרך האפליקציה.' });
  }
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Heebo,Arial,sans-serif;direction:rtl;background:#0A0A0B;color:#FAFAFA;position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;">' +
    '<div><img src="' + FAVICON_URL + '" width="72" height="72" alt="" style="opacity:.9">' +
    '<h1 style="margin:14px 0 8px;font-size:2rem;">צילה עברה לבית חדש</h1>' +
    '<p style="color:#A1A1AA;max-width:340px;margin:0 auto 22px;line-height:1.7;">אותו ציוד, אותם מק"טים ואותה היסטוריה. נכנסים עם החשבון של 42, ומשם גם משריינים ציוד לימי צילום.</p>' +
    '<a href="' + NEW_HOME + '" target="_top" style="display:inline-block;background:#fff;color:#0A0A0B;font-weight:800;text-decoration:none;padding:13px 26px;border-radius:10px;">לצילה החדשה ←</a></div></div>'
  )
    .setTitle('צילה עברה לבית חדש')
    .setFaviconUrl(FAVICON_URL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// זהות והרשאות — Session של Google (בלי סיסמאות)
// ============================================================

// מחזיר את המשתמש המחובר, או null אם אין זהות תקינה מהדומיין.
// בזכות "Execute as Me" + גישה מוגבלת לדומיין, גוגל מזהה את הגולש עבורנו.
function getUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email || !email.endsWith('@' + ALLOWED_DOMAIN)) return null;
  return {
    email: email,
    name: email.split('@')[0],
    isAdmin: getAdminEmails_().indexOf(email) !== -1
  };
}

const NO_AUTH  = { success: false, message: 'אין הרשאה — יש להתחבר עם חשבון 42creative.co.il' };
const NO_ADMIN = { success: false, message: 'רק אדמין יכול לבצע את הפעולה הזו (מוגדר בגיליון settings)' };

// ============================================================
// TABLE: SETTINGS
// Schema: key(0), value(1)
// adminEmails — רשימת אימיילים מופרדת בפסיקים שמורשים לנהל ציוד
// ============================================================

const SETTINGS_HEADERS = ['key', 'value'];
const DEFAULT_ADMIN_EMAILS = 'ori@42creative.co.il';

function getSetting_(key) {
  const sheet = ensureSheet_('settings', SETTINGS_HEADERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) return String(data[i][1]);
  }
  return null;
}

function getAdminEmails_() {
  let raw = getSetting_('adminEmails');
  if (raw === null || raw === '') {
    ensureSheet_('settings', SETTINGS_HEADERS).appendRow(['adminEmails', DEFAULT_ADMIN_EMAILS]);
    raw = DEFAULT_ADMIN_EMAILS;
  }
  return raw.split(',').map(function(s) { return s.trim().toLowerCase(); }).filter(String);
}

// עדכון/הוספה של ערך בגיליון settings
function setSetting_(key, value) {
  const sheet = ensureSheet_('settings', SETTINGS_HEADERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

// ── ניהול אדמינים (מתוך פאנל הניהול באפליקציה) ──────────────

function api_getAdmins() {
  const user = getUser_();
  if (!user) return NO_AUTH;
  if (!user.isAdmin) return NO_ADMIN;
  return { success: true, admins: getAdminEmails_() };
}

function api_addAdmin(data) {
  const user = getUser_();
  if (user) return MOVED; // ארכיון: צילה עברה לבית חדש
  if (!user) return NO_AUTH;
  if (!user.isAdmin) return NO_ADMIN;
  const email = String((data || {}).email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') === -1) return { success: false, message: 'אימייל לא תקין' };
  if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
    return { success: false, message: 'רק אימיילים של ' + ALLOWED_DOMAIN + ' יכולים להיות אדמינים' };
  }
  const admins = getAdminEmails_();
  if (admins.indexOf(email) !== -1) return { success: false, message: email + ' כבר אדמין' };
  admins.push(email);
  setSetting_('adminEmails', admins.join(', '));
  return { success: true, message: email + ' נוסף כאדמין', admins: admins };
}

function api_removeAdmin(data) {
  const user = getUser_();
  if (user) return MOVED; // ארכיון: צילה עברה לבית חדש
  if (!user) return NO_AUTH;
  if (!user.isAdmin) return NO_ADMIN;
  const email = String((data || {}).email || '').trim().toLowerCase();
  if (email === user.email) return { success: false, message: 'אי אפשר להסיר את עצמך מרשימת האדמינים' };
  const admins = getAdminEmails_().filter(function(a) { return a !== email; });
  if (admins.length === getAdminEmails_().length) return { success: false, message: email + ' לא נמצא ברשימה' };
  if (admins.length === 0) return { success: false, message: 'חייב להישאר לפחות אדמין אחד' };
  setSetting_('adminEmails', admins.join(', '));
  return { success: true, message: email + ' הוסר מרשימת האדמינים', admins: admins };
}

// ============================================================
// API — הפונקציות שהפרונט קורא דרך google.script.run
// כולן מחזירות { success, message?, ...data } ואוכפות הרשאות.
// ============================================================

function api_getDashboard() {
  const user = getUser_();
  if (!user) return NO_AUTH;
  const d = getDashboard_();
  d.user = user;
  return d;
}

function api_addEquipment(data) {
  const user = getUser_();
  if (user) return MOVED; // ארכיון: צילה עברה לבית חדש
  if (!user) return NO_AUTH;
  if (!user.isAdmin) return NO_ADMIN;
  return addEquipment_(data || {});
}

function api_updateEquipment(data) {
  const user = getUser_();
  if (user) return MOVED; // ארכיון: צילה עברה לבית חדש
  if (!user) return NO_AUTH;
  if (!user.isAdmin) return NO_ADMIN;
  return updateEquipment_(data || {});
}

function api_deleteEquipment(data) {
  const user = getUser_();
  if (user) return MOVED; // ארכיון: צילה עברה לבית חדש
  if (!user) return NO_AUTH;
  if (!user.isAdmin) return NO_ADMIN;
  return deleteEquipment_((data || {}).id);
}

function api_setEquipmentStatus(data) {
  const user = getUser_();
  if (user) return MOVED; // ארכיון: צילה עברה לבית חדש
  if (!user) return NO_AUTH;
  return setEquipmentStatus_((data || {}).id, (data || {}).status);
}

function api_checkoutEquipment(data) {
  const user = getUser_();
  if (user) return MOVED; // ארכיון: צילה עברה לבית חדש
  if (!user) return NO_AUTH;
  data = data || {};
  data.recordedBy = user.email;
  // "מי לוקח" נקבע לפי המשתמש המחובר; רק אדמין רשאי לרשום על שם מישהו אחר.
  if (!user.isAdmin || !String(data.person || '').trim()) data.person = user.name;
  return checkoutEquipment_(data);
}

function api_checkinEquipment(data) {
  const user = getUser_();
  if (user) return MOVED; // ארכיון: צילה עברה לבית חדש
  if (!user) return NO_AUTH;
  return checkinEquipment_(data || {});
}

// ============================================================
// IMAGES — תמונות מוצר נשמרות ב-Drive של בעל הסקריפט
// התיקייה משותפת לצפייה לדומיין בלבד — מוגנת כמו שאר המערכת.
// ============================================================

function getImagesFolder_() {
  const saved = getSetting_('imagesFolderId');
  if (saved) {
    try { return DriveApp.getFolderById(saved); } catch (e) {}
  }
  const folder = DriveApp.createFolder('צילה - תמונות ציוד');
  try {
    folder.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) {}
  }
  setSetting_('imagesFolderId', folder.getId());
  return folder;
}

// העלאת תמונה (אדמין בלבד). מקבלת JPEG מכווץ כ-base64, מחזירה fileId.
function api_uploadImage(data) {
  const user = getUser_();
  if (user) return MOVED; // ארכיון: צילה עברה לבית חדש
  if (!user) return NO_AUTH;
  if (!user.isAdmin) return NO_ADMIN;
  try {
    data = data || {};
    if (!data.base64) return { success: false, message: 'לא התקבלה תמונה' };
    if (data.base64.length > 2500000) return { success: false, message: 'התמונה גדולה מדי (מקסימום ~1.8MB)' };
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.base64),
      data.mimeType || 'image/jpeg',
      'tzila-' + newId_() + '.jpg'
    );
    const file = getImagesFolder_().createFile(blob);
    return { success: true, fileId: file.getId() };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// מעבירה לאשפה תמונה שהוחלפה, רק אם היא בתיקיית התמונות של צילה.
// הסקריפט רץ כבעלים, ובלי הבדיקה הזאת מזהה של קובץ אחר היה מעביר לאשפה כל קובץ ב-Drive שלו.
function trashImage_(fileId) {
  try {
    const folderId = getSetting_('imagesFolderId');
    const file = DriveApp.getFileById(fileId);
    const parents = file.getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === folderId) { file.setTrashed(true); return; }
    }
  } catch (e) {}
}

// מזהה קובץ של Drive: אותיות, ספרות, _ ו-- בלבד. כל ערך אחר (למשל קוד שהוזרק) לא מגיע לדפדפן.
function driveIdOrEmpty_(v) {
  const s = String(v || '');
  return /^[\w-]+$/.test(s) ? s : '';
}

// מריצים פעם אחת מהעורך אחרי הוספת הרשאת Drive, לאישור ההרשאה (אדמין בלבד)
function authorizeOnce() {
  const user = getUser_();
  if (!user || !user.isAdmin) return NO_ADMIN;
  Logger.log('Drive OK: ' + DriveApp.getRootFolder().getName());
  Logger.log('Sheet OK: ' + getSpreadsheet_().getName());
  Logger.log('Images folder: ' + getImagesFolder_().getName());
}

// ============================================================
// HELPERS
// ============================================================

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function getSheet_(name) {
  return getSpreadsheet_().getSheetByName(name);
}

// Auto-creates the sheet with the given headers if it doesn't exist.
function ensureSheet_(name, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    Logger.log('Created sheet: ' + name);
  }
  return sheet;
}

function fmtDate_(d) {
  return Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy');
}

function fmtTime_(d) {
  return Utilities.formatDate(d, 'Asia/Jerusalem', 'HH:mm');
}

// Normalize any date value (Date object or string) to dd/MM/yyyy.
function normalizeDate_(v) {
  if (!v && v !== 0) return '';
  const s = String(v);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
  try {
    const dt = new Date(v);
    if (!isNaN(dt.getTime())) return fmtDate_(dt);
  } catch (e) {}
  return s;
}

// Normalize any time value (Date object or string) to HH:mm.
// Sheets auto-converts "16:45" strings into 1899-era Date objects — this undoes that.
function normalizeTime_(v) {
  if (!v && v !== 0) return '';
  const s = String(v);
  if (/^\d{1,2}:\d{2}$/.test(s)) return s;
  try {
    const dt = new Date(v);
    if (!isNaN(dt.getTime())) return fmtTime_(dt);
  } catch (e) {}
  return s;
}

// Find a row by value in a given column. Returns row index (1-based) or -1.
function findRow_(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) return i + 1;
  }
  return -1;
}

function newId_() {
  return Utilities.getUuid().substring(0, 8);
}

// ============================================================
// TABLE: EQUIPMENT (ציוד)
// Schema: id(0), name(1), category(2), brand(3), serial(4),
//         notes(5), status(6), active(7), addedDate(8), assetTag(9)
// ============================================================

const EQUIPMENT_HEADERS = ['id', 'name', 'category', 'brand', 'serial', 'notes', 'status', 'active', 'addedDate', 'assetTag', 'imageId'];

// מק״ט פנימי רץ: 42-0001, 42-0002...
// כולל שורות שנמחקו (active=לא) — מספר לא ממוחזר לעולם.
function nextAssetTag_(sheet) {
  const data = sheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const m = /^42-(\d+)$/.exec(String(data[i][9] || ''));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return '42-' + String(max + 1).padStart(4, '0');
}

function equipmentRowToObj_(r) {
  return {
    id:        String(r[0] || ''),
    name:      String(r[1] || ''),
    category:  String(r[2] || ''),
    brand:     String(r[3] || ''),
    serial:    String(r[4] || ''),
    notes:     String(r[5] || ''),
    status:    String(r[6] || ST_AVAILABLE),
    addedDate: normalizeDate_(r[8]),
    assetTag:  String(r[9] || ''),
    imageId:   driveIdOrEmpty_(r[10])
  };
}

function addEquipment_(data) {
  try {
    if (!data.name) return { success: false, message: 'חסר שם פריט' };
    const sheet = ensureSheet_('equipment', EQUIPMENT_HEADERS);
    const id = newId_();
    const tag = nextAssetTag_(sheet);
    sheet.appendRow([
      id,
      data.name,
      data.category || 'אחר',
      data.brand  || '',
      data.serial || '',
      data.notes  || '',
      ST_AVAILABLE,
      'כן',
      fmtDate_(new Date()),
      tag,
      data.imageId || ''
    ]);
    return { success: true, message: 'הפריט נוסף · מק״ט ' + tag, id: id, assetTag: tag };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function updateEquipment_(data) {
  try {
    const sheet = getSheet_('equipment');
    if (!sheet) return { success: false, message: 'גיליון equipment לא נמצא' };
    const row = findRow_(sheet, 0, data.id);
    if (row === -1) return { success: false, message: 'פריט לא נמצא: ' + data.id };
    if (data.name !== undefined && data.name !== '')     sheet.getRange(row, 2).setValue(data.name);
    if (data.category !== undefined) sheet.getRange(row, 3).setValue(data.category);
    if (data.brand !== undefined)    sheet.getRange(row, 4).setValue(data.brand);
    if (data.serial !== undefined)   sheet.getRange(row, 5).setValue(data.serial);
    if (data.notes !== undefined)    sheet.getRange(row, 6).setValue(data.notes);
    if (data.imageId !== undefined) {
      const oldId = String(sheet.getRange(row, 11).getValue() || '');
      if (oldId && oldId !== data.imageId) {
        // התמונה הוחלפה/הוסרה — הישנה לאשפת ה-Drive
        trashImage_(oldId);
      }
      sheet.getRange(row, 11).setValue(data.imageId);
    }
    return { success: true, message: 'הפריט עודכן' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// Soft delete: active='לא'. Preserves history and IDs.
function deleteEquipment_(id) {
  try {
    const sheet = getSheet_('equipment');
    if (!sheet) return { success: false, message: 'גיליון equipment לא נמצא' };
    const row = findRow_(sheet, 0, id);
    if (row === -1) return { success: false, message: 'פריט לא נמצא: ' + id };
    if (findOpenCheckoutRow_(id) !== -1) {
      return { success: false, message: 'לא ניתן למחוק — יש השאלה פתוחה על הפריט. בצעו החזרה קודם.' };
    }
    sheet.getRange(row, 8).setValue('לא');
    return { success: true, message: 'הפריט הוסר מהמערכת' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// סטטוס ידני: 'בתיקון' / 'זמין'. חסום כשיש השאלה פתוחה.
function setEquipmentStatus_(id, status) {
  try {
    if (status !== ST_AVAILABLE && status !== ST_REPAIR) {
      return { success: false, message: 'סטטוס לא חוקי: ' + status };
    }
    const sheet = getSheet_('equipment');
    if (!sheet) return { success: false, message: 'גיליון equipment לא נמצא' };
    const row = findRow_(sheet, 0, id);
    if (row === -1) return { success: false, message: 'פריט לא נמצא: ' + id };
    if (findOpenCheckoutRow_(id) !== -1) {
      return { success: false, message: 'יש השאלה פתוחה על הפריט — בצעו החזרה קודם.' };
    }
    sheet.getRange(row, 7).setValue(status);
    return { success: true, message: 'הסטטוס עודכן ל"' + status + '"' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// TABLE: CHECKOUTS (השאלות)
// Schema: id(0), equipmentId(1), equipmentName(2), person(3), project(4),
//         checkoutDate(5), checkoutTime(6), dueDate(7),
//         returnDate(8), returnTime(9), status(10), notes(11), recordedBy(12)
// ============================================================

const CHECKOUTS_HEADERS = ['id', 'equipmentId', 'equipmentName', 'person', 'project',
                           'checkoutDate', 'checkoutTime', 'dueDate',
                           'returnDate', 'returnTime', 'status', 'notes', 'recordedBy'];

function checkoutRowToObj_(r) {
  return {
    id:            String(r[0] || ''),
    equipmentId:   String(r[1] || ''),
    equipmentName: String(r[2] || ''),
    person:        String(r[3] || ''),
    project:       String(r[4] || ''),
    checkoutDate:  normalizeDate_(r[5]),
    checkoutTime:  normalizeTime_(r[6]),
    dueDate:       normalizeDate_(r[7]),
    returnDate:    normalizeDate_(r[8]),
    returnTime:    normalizeTime_(r[9]),
    status:        String(r[10] || ''),
    notes:         String(r[11] || ''),
    recordedBy:    String(r[12] || '')
  };
}

// Returns row index (1-based) of the open checkout for an equipment id, or -1.
function findOpenCheckoutRow_(equipmentId) {
  const sheet = ensureSheet_('checkouts', CHECKOUTS_HEADERS);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(equipmentId) && String(data[i][10]) === CO_OPEN) {
      return i + 1;
    }
  }
  return -1;
}

// השאלה: יוצר רשומה פתוחה + מסמן את הפריט כ"מושאל"
function checkoutEquipment_(data) {
  try {
    if (!data.equipmentId) return { success: false, message: 'חסר מזהה פריט' };
    if (!data.person)      return { success: false, message: 'חסר שם — מי לוקח את הציוד?' };

    const eqSheet = ensureSheet_('equipment', EQUIPMENT_HEADERS);
    const eqRow = findRow_(eqSheet, 0, data.equipmentId);
    if (eqRow === -1) return { success: false, message: 'פריט לא נמצא: ' + data.equipmentId };

    const eqValues = eqSheet.getRange(eqRow, 1, 1, EQUIPMENT_HEADERS.length).getValues()[0];
    const eq = equipmentRowToObj_(eqValues);

    const openRow = findOpenCheckoutRow_(data.equipmentId);
    if (openRow !== -1) {
      const coSheet = getSheet_('checkouts');
      const holder = String(coSheet.getRange(openRow, 4).getValue());
      return { success: false, message: 'הפריט כבר מושאל אצל ' + holder + '. בצעו החזרה קודם.' };
    }
    if (eq.status === ST_REPAIR) {
      return { success: false, message: 'הפריט בתיקון — לא ניתן להשאיל אותו כרגע.' };
    }

    const coSheet = ensureSheet_('checkouts', CHECKOUTS_HEADERS);
    const now = new Date();
    const id = newId_();
    coSheet.appendRow([
      id,
      data.equipmentId,
      eq.name,
      data.person,
      data.project || '',
      fmtDate_(now),
      fmtTime_(now),
      data.dueDate || '',
      '', '',
      CO_OPEN,
      data.notes || '',
      data.recordedBy || ''
    ]);
    eqSheet.getRange(eqRow, 7).setValue(ST_OUT);
    return { success: true, message: eq.name + ' הושאל ל' + data.person, id: id };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// החזרה: סוגר את הרשומה הפתוחה + מחזיר את הפריט ל"זמין"
function checkinEquipment_(data) {
  try {
    if (!data.equipmentId) return { success: false, message: 'חסר מזהה פריט' };

    const openRow = findOpenCheckoutRow_(data.equipmentId);
    if (openRow === -1) return { success: false, message: 'לא נמצאה השאלה פתוחה לפריט הזה.' };

    const coSheet = getSheet_('checkouts');
    const now = new Date();
    coSheet.getRange(openRow, 9).setValue(fmtDate_(now));   // returnDate
    coSheet.getRange(openRow, 10).setValue(fmtTime_(now));  // returnTime
    coSheet.getRange(openRow, 11).setValue(CO_RETURNED);   // status
    if (data.notes) {
      const existing = String(coSheet.getRange(openRow, 12).getValue() || '');
      const combined = existing ? existing + ' | החזרה: ' + data.notes : 'החזרה: ' + data.notes;
      coSheet.getRange(openRow, 12).setValue(combined);
    }

    const eqSheet = getSheet_('equipment');
    const eqRow = findRow_(eqSheet, 0, data.equipmentId);
    if (eqRow !== -1) eqSheet.getRange(eqRow, 7).setValue(ST_AVAILABLE);

    return { success: true, message: 'הציוד הוחזר. תודה!' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// DASHBOARD — קריאה אחת שמחזירה את כל מה שהעמוד צריך
// ============================================================

// משלים כותרות חדשות בגיליונות קיימים (מיגרציה שקטה של הסכמה)
function syncHeaders_(sheet, headers) {
  if (sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function getDashboard_() {
  try {
    const eqSheet = ensureSheet_('equipment', EQUIPMENT_HEADERS);
    const coSheet = ensureSheet_('checkouts', CHECKOUTS_HEADERS);
    syncHeaders_(eqSheet, EQUIPMENT_HEADERS);
    syncHeaders_(coSheet, CHECKOUTS_HEADERS);

    const coData = coSheet.getDataRange().getValues();
    const openByEquipment = {};
    const history = [];
    const personsSet = {};
    const projectsSet = {};

    for (let i = 1; i < coData.length; i++) {
      const co = checkoutRowToObj_(coData[i]);
      if (!co.id) continue;
      history.push(co);
      if (co.person)  personsSet[co.person] = true;
      if (co.project) projectsSet[co.project] = true;
      if (co.status === CO_OPEN) openByEquipment[co.equipmentId] = co;
    }
    history.reverse(); // חדש → ישן

    const eqData = eqSheet.getDataRange().getValues();
    const equipment = [];
    for (let i = 1; i < eqData.length; i++) {
      const r = eqData[i];
      if (!r[0]) continue;
      if (String(r[7]) === 'לא') continue; // soft-deleted
      const eq = equipmentRowToObj_(r);
      const open = openByEquipment[eq.id];
      if (open) {
        eq.status       = ST_OUT; // הרשומה הפתוחה היא מקור האמת
        eq.holder       = open.person;
        eq.holderSince  = open.checkoutDate;
        eq.holderTime   = open.checkoutTime;
        eq.dueDate      = open.dueDate;
        eq.project      = open.project;
        eq.checkoutId   = open.id;
      }
      equipment.push(eq);
    }

    return {
      success: true,
      equipment: equipment,
      history: history.slice(0, 300),
      persons: Object.keys(personsSet).sort(),
      projects: Object.keys(projectsSet).sort()
    };
  } catch (e) {
    Logger.log('getDashboard error: ' + e);
    return { success: false, message: e.toString(), equipment: [], history: [] };
  }
}

// ============================================================
// MAINTENANCE
// ============================================================

// Time-based trigger runs this every 10 min — prevents cold starts.
function keepWarm() {
  Logger.log('keep-warm ' + new Date().toISOString());
}
