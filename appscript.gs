// ============================================================
// ציוד וידאו · 42 — Google Apps Script Backend
// Stack: Google Sheets as DB, single web-app endpoint, action-based router
// ============================================================
//
// SETUP:
//   1. Replace SHEET_ID below with the ID of your Google Sheet
//      (the long string between /d/ and /edit in the Sheets URL).
//   2. Deploy → New deployment → Web app
//        - Execute as: Me
//        - Who has access: Anyone
//   3. Copy the deployed URL into frontend `config.js` → CONFIG.SCRIPT_URL.
//   4. EVERY time you edit this file you must redeploy:
//        Deploy → Manage deployments → ✏ edit → Version: New version → Deploy
//      (Otherwise the live URL keeps serving the OLD code.)
// ============================================================

const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';

// סטטוסים של פריט ציוד (נשמרים בעברית בגיליון — קריא לבני אדם)
const ST_AVAILABLE = 'זמין';
const ST_OUT       = 'מושאל';
const ST_REPAIR    = 'בתיקון';

// סטטוסים של רשומת השאלה
const CO_OPEN     = 'פתוח';
const CO_RETURNED = 'הוחזר';

// ============================================================
// HELPERS
// ============================================================

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

// Auto-creates the sheet with the given headers if it doesn't exist.
// ALWAYS use this instead of getSheet() inside write functions.
function ensureSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    Logger.log('Created sheet: ' + name);
  }
  return sheet;
}

function fmtDate(d) {
  return Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy');
}

function fmtTime(d) {
  return Utilities.formatDate(d, 'Asia/Jerusalem', 'HH:mm');
}

// Normalize any date value (Date object or string) to dd/MM/yyyy.
// Sheets sometimes returns Date objects, sometimes strings — this handles both.
function normalizeDate(v) {
  if (!v && v !== 0) return '';
  const s = String(v);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
  try {
    const dt = new Date(v);
    if (!isNaN(dt.getTime())) return fmtDate(dt);
  } catch (e) {}
  return s;
}

// Normalize any time value (Date object or string) to HH:mm.
// Sheets auto-converts "16:45" strings into 1899-era Date objects — this undoes that.
function normalizeTime(v) {
  if (!v && v !== 0) return '';
  const s = String(v);
  if (/^\d{1,2}:\d{2}$/.test(s)) return s;
  try {
    const dt = new Date(v);
    if (!isNaN(dt.getTime())) return fmtTime(dt);
  } catch (e) {}
  return s;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Find a row by value in a given column. Returns row index (1-based) or -1.
function findRow(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) return i + 1;
  }
  return -1;
}

function newId() {
  return Utilities.getUuid().substring(0, 8);
}

// ============================================================
// TABLE: EQUIPMENT (ציוד)
// Schema: id(0), name(1), category(2), brand(3), serial(4),
//         notes(5), status(6), active(7), addedDate(8), assetTag(9)
// ============================================================

const EQUIPMENT_HEADERS = ['id', 'name', 'category', 'brand', 'serial', 'notes', 'status', 'active', 'addedDate', 'assetTag'];

// מק״ט פנימי רץ: 42-0001, 42-0002...
// כולל שורות שנמחקו (active=לא) — מספר לא ממוחזר לעולם, כדי שמדבקה ישנה לא תצביע על פריט אחר.
function nextAssetTag(sheet) {
  const data = sheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const m = /^42-(\d+)$/.exec(String(data[i][9] || ''));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return '42-' + String(max + 1).padStart(4, '0');
}

function equipmentRowToObj(r) {
  return {
    id:        String(r[0] || ''),
    name:      String(r[1] || ''),
    category:  String(r[2] || ''),
    brand:     String(r[3] || ''),
    serial:    String(r[4] || ''),
    notes:     String(r[5] || ''),
    status:    String(r[6] || ST_AVAILABLE),
    addedDate: normalizeDate(r[8]),
    assetTag:  String(r[9] || '')
  };
}

function addEquipment(data) {
  try {
    if (!data.name) return { success: false, message: 'חסר שם פריט' };
    const sheet = ensureSheet('equipment', EQUIPMENT_HEADERS);
    const id = newId();
    const tag = nextAssetTag(sheet);
    sheet.appendRow([
      id,
      data.name,
      data.category || 'אחר',
      data.brand  || '',
      data.serial || '',
      data.notes  || '',
      ST_AVAILABLE,
      'כן',
      fmtDate(new Date()),
      tag
    ]);
    return { success: true, message: 'הפריט נוסף · מק״ט ' + tag, id: id, assetTag: tag };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function updateEquipment(data) {
  try {
    const sheet = getSheet('equipment');
    if (!sheet) return { success: false, message: 'גיליון equipment לא נמצא' };
    const row = findRow(sheet, 0, data.id);
    if (row === -1) return { success: false, message: 'פריט לא נמצא: ' + data.id };
    if (data.name !== undefined && data.name !== '')     sheet.getRange(row, 2).setValue(data.name);
    if (data.category !== undefined) sheet.getRange(row, 3).setValue(data.category);
    if (data.brand !== undefined)    sheet.getRange(row, 4).setValue(data.brand);
    if (data.serial !== undefined)   sheet.getRange(row, 5).setValue(data.serial);
    if (data.notes !== undefined)    sheet.getRange(row, 6).setValue(data.notes);
    return { success: true, message: 'הפריט עודכן' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// Soft delete: active='לא'. Preserves history and IDs.
function deleteEquipment(id) {
  try {
    const sheet = getSheet('equipment');
    if (!sheet) return { success: false, message: 'גיליון equipment לא נמצא' };
    const row = findRow(sheet, 0, id);
    if (row === -1) return { success: false, message: 'פריט לא נמצא: ' + id };
    if (findOpenCheckoutRow(id) !== -1) {
      return { success: false, message: 'לא ניתן למחוק — יש השאלה פתוחה על הפריט. בצעו החזרה קודם.' };
    }
    sheet.getRange(row, 8).setValue('לא');
    return { success: true, message: 'הפריט הוסר מהמערכת' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// סטטוס ידני: 'בתיקון' / 'זמין'. חסום כשיש השאלה פתוחה.
function setEquipmentStatus(id, status) {
  try {
    if (status !== ST_AVAILABLE && status !== ST_REPAIR) {
      return { success: false, message: 'סטטוס לא חוקי: ' + status };
    }
    const sheet = getSheet('equipment');
    if (!sheet) return { success: false, message: 'גיליון equipment לא נמצא' };
    const row = findRow(sheet, 0, id);
    if (row === -1) return { success: false, message: 'פריט לא נמצא: ' + id };
    if (findOpenCheckoutRow(id) !== -1) {
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
//         returnDate(8), returnTime(9), status(10), notes(11)
// ============================================================

const CHECKOUTS_HEADERS = ['id', 'equipmentId', 'equipmentName', 'person', 'project',
                           'checkoutDate', 'checkoutTime', 'dueDate',
                           'returnDate', 'returnTime', 'status', 'notes'];

function checkoutRowToObj(r) {
  return {
    id:            String(r[0] || ''),
    equipmentId:   String(r[1] || ''),
    equipmentName: String(r[2] || ''),
    person:        String(r[3] || ''),
    project:       String(r[4] || ''),
    checkoutDate:  normalizeDate(r[5]),
    checkoutTime:  normalizeTime(r[6]),
    dueDate:       normalizeDate(r[7]),
    returnDate:    normalizeDate(r[8]),
    returnTime:    normalizeTime(r[9]),
    status:        String(r[10] || ''),
    notes:         String(r[11] || '')
  };
}

// Returns row index (1-based) of the open checkout for an equipment id, or -1.
function findOpenCheckoutRow(equipmentId) {
  const sheet = ensureSheet('checkouts', CHECKOUTS_HEADERS);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(equipmentId) && String(data[i][10]) === CO_OPEN) {
      return i + 1;
    }
  }
  return -1;
}

// השאלה: יוצר רשומה פתוחה + מסמן את הפריט כ"מושאל"
function checkoutEquipment(data) {
  try {
    if (!data.equipmentId) return { success: false, message: 'חסר מזהה פריט' };
    if (!data.person)      return { success: false, message: 'חסר שם — מי לוקח את הציוד?' };

    const eqSheet = ensureSheet('equipment', EQUIPMENT_HEADERS);
    const eqRow = findRow(eqSheet, 0, data.equipmentId);
    if (eqRow === -1) return { success: false, message: 'פריט לא נמצא: ' + data.equipmentId };

    const eqValues = eqSheet.getRange(eqRow, 1, 1, EQUIPMENT_HEADERS.length).getValues()[0];
    const eq = equipmentRowToObj(eqValues);

    const openRow = findOpenCheckoutRow(data.equipmentId);
    if (openRow !== -1) {
      const coSheet = getSheet('checkouts');
      const holder = String(coSheet.getRange(openRow, 4).getValue());
      return { success: false, message: 'הפריט כבר מושאל אצל ' + holder + '. בצעו החזרה קודם.' };
    }
    if (eq.status === ST_REPAIR) {
      return { success: false, message: 'הפריט בתיקון — לא ניתן להשאיל אותו כרגע.' };
    }

    const coSheet = ensureSheet('checkouts', CHECKOUTS_HEADERS);
    const now = new Date();
    const id = newId();
    coSheet.appendRow([
      id,
      data.equipmentId,
      eq.name,
      data.person,
      data.project || '',
      fmtDate(now),
      fmtTime(now),
      data.dueDate || '',
      '', '',
      CO_OPEN,
      data.notes || ''
    ]);
    eqSheet.getRange(eqRow, 7).setValue(ST_OUT);
    return { success: true, message: eq.name + ' הושאל ל' + data.person, id: id };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// החזרה: סוגר את הרשומה הפתוחה + מחזיר את הפריט ל"זמין"
function checkinEquipment(data) {
  try {
    if (!data.equipmentId) return { success: false, message: 'חסר מזהה פריט' };

    const openRow = findOpenCheckoutRow(data.equipmentId);
    if (openRow === -1) return { success: false, message: 'לא נמצאה השאלה פתוחה לפריט הזה.' };

    const coSheet = getSheet('checkouts');
    const now = new Date();
    coSheet.getRange(openRow, 9).setValue(fmtDate(now));   // returnDate
    coSheet.getRange(openRow, 10).setValue(fmtTime(now));  // returnTime
    coSheet.getRange(openRow, 11).setValue(CO_RETURNED);   // status
    if (data.notes) {
      const existing = String(coSheet.getRange(openRow, 12).getValue() || '');
      const combined = existing ? existing + ' | החזרה: ' + data.notes : 'החזרה: ' + data.notes;
      coSheet.getRange(openRow, 12).setValue(combined);
    }

    const eqSheet = getSheet('equipment');
    const eqRow = findRow(eqSheet, 0, data.equipmentId);
    if (eqRow !== -1) eqSheet.getRange(eqRow, 7).setValue(ST_AVAILABLE);

    return { success: true, message: 'הציוד הוחזר. תודה!' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// DASHBOARD — קריאה אחת שמחזירה את כל מה שהעמוד צריך
// ============================================================

function getDashboard() {
  try {
    const eqSheet = ensureSheet('equipment', EQUIPMENT_HEADERS);
    const coSheet = ensureSheet('checkouts', CHECKOUTS_HEADERS);

    const coData = coSheet.getDataRange().getValues();
    const openByEquipment = {};
    const history = [];
    const personsSet = {};
    const projectsSet = {};

    for (let i = 1; i < coData.length; i++) {
      const co = checkoutRowToObj(coData[i]);
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
      const eq = equipmentRowToObj(r);
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

// Set up a time-based trigger to call this every 10 min — prevents cold starts.
// Apps Script editor → Triggers → Add Trigger → keepWarm → Time-driven → Every 10 min
function keepWarm() {
  Logger.log('keep-warm ' + new Date().toISOString());
}

// ============================================================
// HTTP ROUTER — single endpoint, switches on `action` parameter
// ============================================================

function doGet(e)  { return doPost(e); }
function doPost(e) {
  try {
    if (!e || !e.parameter) return jsonResponse({ success: false, message: 'No parameters' });
    const action = e.parameter.action;
    const p = e.parameter;

    switch (action) {

      case 'ping':
        return jsonResponse({ success: true, version: 'v1' });

      // ── Dashboard ─────────────────────────────────────────
      case 'getDashboard':
        return jsonResponse(getDashboard());

      // ── Equipment ─────────────────────────────────────────
      case 'addEquipment':
        return jsonResponse(addEquipment({
          name: p.name, category: p.category, brand: p.brand,
          serial: p.serial, notes: p.notes
        }));
      case 'updateEquipment':
        return jsonResponse(updateEquipment({
          id: p.id, name: p.name, category: p.category, brand: p.brand,
          serial: p.serial, notes: p.notes
        }));
      case 'deleteEquipment':
        return jsonResponse(deleteEquipment(p.id));
      case 'setEquipmentStatus':
        return jsonResponse(setEquipmentStatus(p.id, p.status));

      // ── Checkouts ─────────────────────────────────────────
      case 'checkoutEquipment':
        return jsonResponse(checkoutEquipment({
          equipmentId: p.equipmentId, person: p.person,
          project: p.project, dueDate: p.dueDate, notes: p.notes
        }));
      case 'checkinEquipment':
        return jsonResponse(checkinEquipment({
          equipmentId: p.equipmentId, notes: p.notes
        }));

      default:
        return jsonResponse({ success: false, message: 'Unknown action: ' + action });
    }
  } catch (e) {
    Logger.log('doPost error: ' + e);
    return jsonResponse({ success: false, message: e.toString() });
  }
}
