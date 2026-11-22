# GENESIS X: optionale NERYX-Forschungsansicht

**22.11.2026 · Forschung nach PR #54 · kein produktiver Release**

## Neue Vorschau

`eval/genesis-x-ambiguity-preview.html` bietet eine iPhone-freundliche, NERYX-gestaltete **separate** Forschungsansicht. Sie enthält eine Auswahl aus genau drei öffentlich vorgegebenen Aufgabenfamilien und einen expliziten Startknopf:

1. Zweistufig `x²+2`, bei dem die betrachteten Programme auf zusätzlichen Probe-Eingaben übereinstimmen: nur `review_required`.
2. Absichtlich unterbestimmte Daten nahe Null: `ambiguous`, keine Antwort.
3. Widersprüchliche Trainings-/Validierungsdaten: `unconfirmed`, keine Antwort.

`eval/genesis-x-ambiguity-preview-ui.js` spricht ausschließlich `NERYXGenesisXAmbiguityClient.inspect` an. Es gibt **keine Verbindung zum normalen NERYX-Chat, zu gespeicherten Fakten, lokalen Daten oder einem kostenpflichtigen API-Dienst**. Der Status wird in gewöhnlichem Text angezeigt, ohne Rohregeln, Kandidatenwerte und Prognosen. Bei unerwarteten Rückmeldungen und Fehlern wird die Ausführung blockiert.

Ein Link `../index.html` führt zur normalen NERYX-App zurück. `index.html`, `app.js`, `sw.js`, die normalen GENESIS-X-Module und Frozen werden **nicht** geändert. Dieser Forschungspunkt ist nicht in der bestehenden PWA-Navigation eingetragen und wird vom aktuellen Produkt-SW nicht als Offline-Unterseite vorgehalten.

## Testumfang

`eval/genesis-x-ambiguity-preview-browser-smoke.mjs` prüft die **drei** Auswahlfälle und den Ausfall des Forschungs-Workers in realem Chromium und Linux-WebKit bei mobiler Viewport-Größe. Er prüft auch die Trennung von der Haupt-App (keine Haupt-App-Skripte oder Forschungs-Engine-Globals im Fenster) und, dass im Testkontext kein lokaler Browser-Speicher angelegt wird. Zusätzlich: vollständiger Node-Regressionsbestand und Protected-File-Prüfung.

Diese isolierte Vorschau ist **nicht** gleichzusetzen mit einer installierten oder produktiv verkabelten NERYX-Funktion. Auch Linux-WebKit belegt nicht Safari auf einem realen iPhone.

## Nächste Freigabegrenzen

Ein optionales Vercel-Preview-Deployment kann ausschließlich als Vorschau des **separaten Forschungsbranches** erfolgen; nie als Production-Target. Vor Freigabe nach `main` müssen iPhone-Safari, Offline-Ladeverhalten einer bewusst aktivierten Vorschau, echte Nutzerdaten-Backups und eine unabhängige Antwortqualitätsprüfung durchlaufen werden. Ein `review_required` ist keine verifizierte richtige Antwort.

## Test- und Preview-Nachweis vom 22.11.2026

[GitHub Actions #45015248928](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45015248928) **erfolgreich: 4/4 Jobs**, gesamte Node-Suite **620/620**, Chromium und Linux-WebKit erfolgreich für alle drei Forschungsfälle sowie den bewusst fehlenden Worker. Nachweise: `GENESIS_X_OPTIONAL_PREVIEW_UI_OK` in beiden Browserjobs, `missingWorker:"blocked"`, `storage:0`. Die Produktdatei-/Frozen-Schutzprüfung ist ebenfalls erfolgreich.

**Vercel-Testdeployment (nur Preview):**
- Ursprungscommit: `3928da197a3ce3993561dede1747b3700d02b88f`.
- Branch: `neryx/genesis-x-10-optional-preview-ui`.
- Deployment: `dpl_B38gPD25yRjXDB4LcPZ2cackk234`; Status: **READY**; `target:null` (Preview, **nicht** Produktion).
- Basisadresse: https://mein-lernbot-cubft03k1-pierags.vercel.app
- Experiment-Seite: https://mein-lernbot-cubft03k1-pierags.vercel.app/eval/genesis-x-ambiguity-preview.html

Das Vercel-Projekt verwendet gemäß Projektprüfung **SSO-Schutz für Preview-Adressen**. Eine Anmeldung kann deshalb erforderlich sein. Eine auf dem echten iPhone manuell bestätigte Prüfung ist noch offen; der READY-Status alleine ist keine E2E-Prüfung der öffentlichen URL.

Die Produktdomain `mein-lernbot.vercel.app` wurde **nicht** zu diesem Preview umgeschaltet.
