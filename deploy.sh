#!/bin/bash
# פריסת צילה: מעתיק את קבצי המקור, דוחף ל-Apps Script ומפרסם גרסה חדשה על אותה כתובת.
# שימוש: ./deploy.sh "תיאור הגרסה"
set -e
cd "$(dirname "$0")"

# עותק ישן היה מחזיר לפרודקשן קוד ישן: הפריסה רק מעותק שכולל את כל מה שב-origin/main.
git fetch -q origin main
if ! git merge-base --is-ancestor origin/main HEAD; then
  echo "deploy.sh: העותק לא מעודכן מול origin/main. קודם git pull, ואז לפרוס." >&2
  exit 1
fi

# אבטחה: כל פונקציה ששמה לא נגמר ב-_ אפשר להריץ ישירות מהדפדפן (google.script.run).
# מותרות רק doGet, keepWarm, authorizeOnce, ו-api_* שהשורה הראשונה שלהן היא getUser_().
awk '
  /^function / {
    name = $2; sub(/\(.*/, "", name)
    if (name ~ /_$/ || name ~ /^(doGet|keepWarm|authorizeOnce)$/) next
    if (name ~ /^api_/) { getline; if ($0 ~ /getUser_\(\)/) next }
    print "deploy.sh: " name " אפשר להריץ מהדפדפן בלי בדיקת הרשאה. להוסיף _ לשם, או api_ עם getUser_()." > "/dev/stderr"
    bad = 1
  }
  END { exit bad }
' appscript.gs

cp appscript.gs "apps-script/קוד.js"
cp app.html "apps-script/app.html"
cd apps-script
npx @google/clasp@2.4.2 push -f
npx @google/clasp@2.4.2 deploy -i "AKfycbwYpBTjZV-ONyKbpL9OsyirMDLVjOpMphNEvIC-CB4wg1QgcaHrVvg_Rnb1rGytKYjSBA" -d "${1:-update}"
