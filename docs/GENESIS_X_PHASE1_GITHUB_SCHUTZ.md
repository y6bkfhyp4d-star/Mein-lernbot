# GENESIS X – Phase 1: GitHub- und Release-Schutz

**Status: VORBEREITET, NICHT ABGESCHLOSSEN.** Dieser PR implementiert lediglich einen *Code-Review-Vorschlag* und zusätzliche Abwehrchecks. **GitHub-Branch-Schutz muss separat wirksam eingerichtet und negativ getestet werden.** Keine Änderung an Produktionscode oder Deployments.

## Verifizierter Iststand bei Anlage

- Öffentliches Repository: `y6bkfhyp4d-star/Mein-lernbot`.
- `main` meldete `protected:false` und die Ruleset-Liste war leer.
- Bereits vorhanden: `.github/workflows/neryx-merge-verification.yml` führt bei PRs gegen `main` Node-Tests und Chromium-/WebKit-Browserprüfungen aus. Die frühere Behauptung „keine PR-CI auf main“ war **falsch**. **Tests laufen** ist nicht gleichbedeutend mit **Pflichttests vor Merge**.
- `vercel.json` hat `git.deploymentEnabled:false`. Vercel-Produktion wird separat veröffentlicht.
- Die verbundene GitHub-Schnittstelle kann GitHub-Rulesets/Actions-Einstellungen **lesen**, aber **nicht** selbst als administrative Einstellung ändern. Deshalb keine Behauptung, die Rulesets seien durch dieses Commit aktiviert.

## Dateien dieses Sicherheitsvorschlags

1. `.github/CODEOWNERS`: Verantwortlichkeit für `.github/**`, `app.js`, `index.html`, `sw.js`, `vercel.json`, Codeanalyse-/Modellbridge, `eval/**`, `candidates/**` und Masterplan. **CODEOWNERS allein blockiert nichts.**
2. `.github/workflows/neryx-genesis-candidate-policy.yml`: Ergänzende **read-only** Prüfung `genesis-candidate-paths`, ausschließlich für PRs nach `main`. Bei Branches `neryx/auto/*` nur `candidates/**` und `eval/candidates/**` zulässig. Für andere Branches ist dieser Job bewusst nur Durchlauf; die bereits vorhandenen Tests und menschliche Reviews bleiben erforderlich. `actions/checkout` ist auf einen bekannten Commit gepinnt. Generierter Kandidatencode wird **nicht ausgeführt**.

### Was diese Dateien NICHT garantieren

Ein Kandidat könnte eine andere Branch-Bezeichnung benutzen. Eine Workflow-Datei im Kandidatenbranch allein ist keine unveränderliche Vertrauenswurzel. Der **Bot-Token muss unabhängig davon durch GitHub-Berechtigungen** auf einen minimalen Bereich beschränkt sein, und `main` muss PRs und Reviews erzwingen. Ebenso bedeutet ein Ordner `eval/` keine JavaScript-Isolation. Automatische GENESIS-PR-Erstellung ist **noch deaktiviert/nicht implementiert**.

## GitHub-Dashboard: Einstellungen von Menschen prüfen und aktivieren

VOR jedem Ruleset: **Weg zur wirksamen Review-Freigabe klären.** Der Eigentümer kann eine selbst erstellte PR nicht selbst als Reviewer freigeben. Es gibt derzeit keine überprüfte zweite Reviewer-Identität und keinen überprüften Generator-Bot. Deshalb **KEINE Code-Owner-Reviewpflicht einschalten, bevor der Nutzer die Reviewer-Kette tatsächlich getestet hat**. Andernfalls kann sich der Eigentümer aussperren.

1. Repository öffnen -> **Settings** -> **Rules** -> **Rulesets** -> **New branch ruleset**. Target: Default branch `main`; Enforcement: **Active** erst nach Prüfung der Review-Konfiguration.
2. Mindestens: **Require a pull request before merging**, **Block force pushes**, **Restrict deletions**. Bypass-Liste möglichst leer. Den tatsächlich ausführbaren Review-Weg im Testrepo nachweisen, bevor „Require approvals“ und „Require review from Code Owners“ aktiviert werden.
3. **Require status checks**: nur tatsächlich stabile, erfolgreiche Contexts auswählen, nachdem sie auf einem PR mit dieser Workflow-Version gelaufen sind. Geeignete Kandidaten aus bestehenden Workflows: `integration`, `browsers (chromium)`, `browsers (webkit)` des `NERYX merge candidate verification`. Zusätzlich `genesis-candidate-paths`. **Exakte Namen in GitHub „Checks“ nachsehen**, nicht raten. Prüfen, ob Events und Branch-Einstellungen Statuskontexte für den echten Merge-Commit liefern.
4. **Settings -> Actions -> General**: Workflow-GITHUB_TOKEN standardmäßig **Read repository contents permission**, PR-erstellende/PR-genehmigende Workflow-Rechte ausschalten, Fork-PR-Restriktionen prüfen. Bereits vorhandene Workflows gesondert auf Schreibrechte/Secrets prüfen.
5. Verifizierte Test-PR verwenden, um zu prüfen: Tests müssen bei Fehlern ein Merge verhindern, geschützte Dateipfade brauchen wirksame Fremdfreigabe und ein Bot kann nicht direkt in `main` pushen.
6. Verifizieren, dass ein Branch-Push **keine** Vercel-Produktionsversion auslöst. Produktionsberechtigungen, vorhandene Deploy-Tokens und den realen Rollback-Pfad in Vercel separat prüfen.

## Negative Abnahmetests, zunächst im Wegwerf-Testrepo

| Angriff/Prüfung | Erwartung | Status |
|---|---|---|
| Unbefugter direkter Push auf main | Abgewiesen | OFFEN |
| Force-Push bzw. Löschen von main | Abgewiesen | OFFEN |
| Merge trotz rotem Pflichtcheck | Abgewiesen | OFFEN |
| Ungeprüfte Änderungen in .github, app.js oder sw.js | Ohne unabhängige Freigabe blockiert | OFFEN |
| Bot verfasst und bewilligt die eigene PR | Abgewiesen | OFFEN |
| `neryx/auto/*` ändert Workflow statt candidates | Policy schlägt fehl | OFFEN |
| Kandidatenablage enthält Endlosschleifen-/Netz-Code | Nicht ausgeführt (Codeausführung kommt erst Phase 4) | OFFEN |
| Automatischer PR-Branch-Push | Keine Produktivfreigabe | OFFEN |
| Bot-Rechte | Weder Rulesets verändern noch main direkt ändern/mergen | OFFEN |
| Eigenes menschliches Freigabeszenario | Erfolgreich und ohne Aussperrung | OFFEN |

**Freigabekriterium:** Berechtigungen, Statuspflichten, Reviewer-Weg, Vercel-Grenze und Negativtests mit konkreten GitHub-/Vercel-Nachweisen verifizieren, zweimal soweit sinnvoll. Erst anschließend Phase 1 als BESTANDEN im Masterplan markieren.

## Zu beachten für künftige GENESIS X Entwicklung

- GenCode bleibt *Daten*, keine Skriptinjektion in NERYX.
- Bestehende CI `neryx-merge-verification.yml` möglichst wiederverwenden; nicht durch schwächere Testkopien ersetzen.
- Kein Bot- oder Admin-Token in Browserdateien, Kommentaren, Logs, Issues oder PRs.
- Für die eigentliche Sandbox später isolierten Ausführungsrunner entwickeln. Ein normaler Actions-Job ist noch keine Sandbox.
- Vor jedem Merge mit `main` synchronisieren; Automationen können unterdessen Commitstände verändern.
- Neue Schutzregeln sollen dem Repo-Besitzer nicht unbeabsichtigt die reguläre Weiterentwicklung blockieren.

**Zu diesem PR:** Nur CODEOWNERS + Kandidatenpolicy + Dokumentation; keine produktive Umsetzung der Selbstentwicklungsengine und keine Behauptung, GitHub-Adminsettings seien automatisch gesetzt.
