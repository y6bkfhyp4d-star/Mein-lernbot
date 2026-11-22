# GENESIS X – Phase 1: vertrauenswürdige Kandidatenprüfung

**Status: PR-Vorschlag, erst nach CI und separater menschlicher Freigabe übernehmbar.**

## Sicherheitsproblem
Bisher wird `genesis-candidate-paths` durch `pull_request` auf einer PR-Merge-Revision ausgeführt. Ein Vorschlag kann versuchen, die prüfende Workflow-Datei selbst zu ändern. Die Branch-Regel fordert einen erfolgreichen Statuskontext, garantiert aber allein nicht, dass dessen Definition unveränderlich war.

## Neue Ausführung
- `pull_request_target` lädt den Workflow aus dem **geschützten base/main**, nicht aus der vorgeschlagenen PR-Version.
- Die Prüfung benutzt **keinen Checkout**, führt keine PR-Dateien aus und bekommt `contents:read` und `pull-requests:read`, keine Schreibberechtigungen.
- GitHub-PR-Dateiliste wird über die read-only REST API paginiert; umbenannte Dateien prüfen sowohl neuen als auch vorherigen Pfad; >3000 Dateien verweigern die Freigabe.
- Branches mit Präfix `neryx/auto/` dürfen nur `candidates/**` und `eval/candidates/**` ändern. Fehlende/unerlaubte Pfade führen zu fehlgeschlagenem Pflichtcheck.
- Der bestehende erforderliche Statusname `genesis-candidate-paths` bleibt unverändert.

## Grenzen und noch offene Arbeit
- **Branch-Namenswechsel ist kein Sicherheitsnachweis der Bot-Identität.** Eine böswillige PR kann anders heißen. Solange kein spezieller, technisch begrenzter Generator-Account und kein unabhängiges menschliches Freigabeerfordernis geprüft sind, bleibt die wirkliche Selbstcode-Veröffentlichung verboten.
- `CODEOWNERS` mit alleiniger Owner-Identität und `Required approvals:0` stellt keine unabhängige menschliche Kontrolle dar. Freigaben von einem Owner für eigene PRs können GitHub nicht als fremde Review-Approval erteilt werden; keine Review-Pflicht erzwingen, bevor ein echter zweiter Reviewer/Bot-Abgleich ohne Lockout vorhanden ist.
- `pull_request_target` ist nur dann sicher, wenn seine Jobs keine untrusted PR-Skripte, -Dependencies oder Shell-Argumente ausführen. Hier werden PR-Angaben ausschließlich in Umgebungsvariablen an einen statischen Python-Code übergeben und für API-Abfragen genutzt.
- Auch bestehende `integration`-/Browser-Checks auf `pull_request` können weitergehende CI-Manipulations-Risiken besitzen. Workflows und Check-Namen sollten auf echte Unabhängigkeit und Credential-Grenzen untersucht werden.
- Admins können Rulesets durch administrative Eingriffe ändern; der Test beweist keine absolute Unumgehbarkeit.
- Nach Merge müssen ein **gültiger PR** und ein **absichtlich verbotener `neryx/auto/*`-PR** getestet werden. Gerade nach Umstellung auf `pull_request_target` muss GitHub den required Kontext für beide PRs korrekt erzeugen, damit kein Deadlock entsteht. Danach Negativ-PR schließen, niemals mergen.

## Go/No-go
Diesen PR erst nach bestandenem Node-Regressionstest und bestehenden vier Checks mergen. **Kein autonomer Code-Merge, keine Token-Ausgabe an generierte Dateien.** Phase 2 kann als read-only Analyse parallel beginnen; vollautonome Änderungen bleiben gesperrt.
