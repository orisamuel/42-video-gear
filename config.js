/**
 * config.js — הגדרות הפרונטאנד
 * עורכים ערכים רק כאן. הקובץ נטען בכל עמוד.
 */
const CONFIG = {

    // ── כתובת ה-Web App של Google Apps Script ────────────────
    // מדביקים את הכתובת מ: Apps Script → Deploy → Manage deployments
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwYpBTjZV-ONyKbpL9OsyirMDLVjOpMphNEvIC-CB4wg1QgcaHrVvg_Rnb1rGytKYjSBA/exec',

    // ── קישור ישיר לגיליון (לכפתור "פתיחת הגיליון") ──────────
    SHEETS_URL: 'https://docs.google.com/spreadsheets/d/1Bw6zGoOiv8jvmAth1rPT6dgB4hnKi4mgypHFUPjVXgE/edit',

    // ── זהות האפליקציה ───────────────────────────────────────
    APP_NAME:     'ציוד וידאו',
    APP_SUBTITLE: 'מערכת מעקב והשאלות · מחלקת וידאו · 42',

    // ── קטגוריות ציוד (אפשר להוסיף/לשנות בחופשיות) ──────────
    CATEGORIES: [
        { name: 'מצלמות',            emoji: '📷' },
        { name: 'עדשות',             emoji: '🔭' },
        { name: 'תאורה',             emoji: '💡' },
        { name: 'סאונד',             emoji: '🎙️' },
        { name: 'חצובות וגימבלים',   emoji: '🎬' },
        { name: 'מוניטורים',         emoji: '🖥️' },
        { name: 'סוללות וכרטיסים',   emoji: '🔋' },
        { name: 'רחפנים',            emoji: '🚁' },
        { name: 'אביזרים',           emoji: '🧰' },
        { name: 'אחר',               emoji: '📦' },
    ],

    // ── סטטוסים (ערכים כפי שנשמרים בגיליון) ─────────────────
    STATUS: {
        AVAILABLE: 'זמין',
        OUT:       'מושאל',
        REPAIR:    'בתיקון',
    },

    // ── התנהגות ──────────────────────────────────────────────
    NEW_ITEM_SOUND: false,

    // ── ערכת נושא ────────────────────────────────────────────
    DEFAULT_THEME: 'dark',       // 'dark' או 'light'
};
