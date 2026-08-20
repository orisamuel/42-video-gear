# צילה 📷 · מערכת לניהול ציוד צילום · 42

מעקב והשאלות של ציוד צילום — מי לקח מה, מתי, ולאיזה פרויקט. מאחורי חומת הכניסה של Google: רק חשבונות `@42creative.co.il`.

## 🔗 קישורים

| מה | איפה |
|---|---|
| **האפליקציה (הכתובת לצוות)** | https://orisamuel.github.io/42-video-gear/ |
| כתובת ה-Web App הישירה (אם ה-iframe לא נטען) | https://script.google.com/a/macros/42creative.co.il/s/AKfycbwYpBTjZV-ONyKbpL9OsyirMDLVjOpMphNEvIC-CB4wg1QgcaHrVvg_Rnb1rGytKYjSBA/exec |
| **הדאטהבייס (Google Sheet)** | https://docs.google.com/spreadsheets/d/1Bw6zGoOiv8jvmAth1rPT6dgB4hnKi4mgypHFUPjVXgE/edit |
| **הבאקאנד (Apps Script)** | https://script.google.com/home/projects/1gwi2lpMyxrQY0LymVL6gVCARh98E2odBsts-781ZXzuU4i7Ixc6M6pMa/edit |

## ארכיטקטורה (v5+)

```
GitHub Pages (הכתובת היפה) ──► iframe מסך-מלא
        │
        ▼
Google Login Wall (רק דומיין 42creative.co.il)
        │
        ▼
Apps Script HtmlService ──► app.html (הפרונט כולו — עיצוב 42, RTL, דמות צילה)
        │  google.script.run
        ▼
קוד.js (api_* עם אכיפת הרשאות לפי זהות Session)
        │
        ▼
Google Sheet: equipment · checkouts · settings
```

- **אין מסך התחברות** — גוגל מזהה את המשתמש; מי שלא בדומיין לא רואה כלום.
- **כל פעולה מתועדת** — עמודת `recordedBy` בהיסטוריה שומרת מי ביצע כל השאלה.
- **שדה "מי לוקח" מתמלא אוטומטית** בשם המשתמש המחובר (ניתן לעריכה).

## הרשאות

- **צפייה / השאלה / החזרה / תיקון:** כל מי שמחובר עם חשבון `@42creative.co.il`.
- **הוספה / עריכה / מחיקה של ציוד:** אדמינים בלבד.
- **ניהול אדמינים מתוך האפליקציה:** לוחצים על שם המשתמש בכותרת ← נפתח פאנל "החשבון שלי · ניהול" עם רשימת האדמינים, הוספה והסרה. (הרשימה שמורה גם בגיליון settings ← adminEmails.)
- **התנתקות / החלפת חשבון:** מתוך אותו פאנל.

## עדכון המערכת (clasp — שיטת העבודה)

הפרויקט מחובר ל-[clasp](https://github.com/google/clasp), ה-CLI הרשמי של Apps Script. עדכון קוד:

```bash
# בתיקייה עם .clasp.json שמצביע על scriptId 1gwi2lpMyxrQY0LymVL6gVCARh98E2odBsts-781ZXzuU4i7Ixc6M6pMa
# הקבצים: קוד.js (מתוך appscript.gs), app.html, appsscript.json
npx @google/clasp@2.4.2 push -f
npx @google/clasp@2.4.2 deploy -i AKfycbwYpBTjZV-ONyKbpL9OsyirMDLVjOpMphNEvIC-CB4wg1QgcaHrVvg_Rnb1rGytKYjSBA -d "תיאור הגרסה"
```

- הגדרות הפריסה (Execute as: Me · Access: Domain) נשלטות מ-`appsscript.json` ← בלוק `webapp`.
- דרישות חד-פעמיות שכבר בוצעו: `clasp login` (ori@42creative.co.il) + הפעלת Google Apps Script API בהגדרות המשתמש.

## קבצי המקור בריפו

| קובץ | תפקיד |
|---|---|
| `appscript.gs` | הבאקאנד — נדחף כ-`קוד.js` |
| `app.html` | האפליקציה המלאה (HTML+CSS+JS) — מוגשת ע"י HtmlService |
| `index.html` | דף הפניה ב-GitHub Pages לכתובת החדשה |
| `favicon.svg` / `favicon-64.png` | דמות צילה — הלוגו והאייקון בלשונית |

## תכונות

מק״ט אוטומטי `42-XXXX` (לא ממוחזר) · סטטוסים זמין/מושאל/בתיקון · התראת איחור · היסטוריה מלאה עם חיפוש · השלמה אוטומטית של שמות ופרויקטים · מצב כהה/בהיר · רספונסיבי · טריגר keepWarm כל 10 דק'.
