#!/bin/bash
# פריסת צילה: מעתיק את קבצי המקור, דוחף ל-Apps Script ומפרסם גרסה חדשה על אותה כתובת.
# שימוש: ./deploy.sh "תיאור הגרסה"
set -e
cd "$(dirname "$0")"
cp appscript.gs "apps-script/קוד.js"
cp app.html "apps-script/app.html"
cd apps-script
npx @google/clasp@2.4.2 push -f
npx @google/clasp@2.4.2 deploy -i "AKfycbwYpBTjZV-ONyKbpL9OsyirMDLVjOpMphNEvIC-CB4wg1QgcaHrVvg_Rnb1rGytKYjSBA" -d "${1:-update}"
