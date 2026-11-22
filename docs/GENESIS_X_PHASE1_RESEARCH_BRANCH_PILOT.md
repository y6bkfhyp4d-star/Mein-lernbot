# GENESIS X Phase 1 – Pilot zur Abkopplung automatischer Wissens-Pushes

**Status: Pilot als PR, noch nicht in main aktiv; keine Produktionsänderung.**

## Befund: neun direkte main-Schreiber
Die folgenden bestehenden zeitgesteuerten GitHub-Workflows besitzen `contents: write` und enthalten `git push` auf den ausgecheckten Standardbranch:
`lernbot-phase70.yml`, `lernbot-phase710.yml`, `lernbot-phase711.yml`, `lernbot-phase712.yml`, `lernbot-phase713.yml`, `lernbot-phase76.yml`, `lernbot-phase77.yml`, `lernbot-phase78.yml`, `lernbot-phase79.yml`.

**Wichtig:** Ein Ruleset mit PR- und Statuscheck-Pflichten darf noch **nicht aktiv** geschaltet werden, solange diese Workflows weiterhin direkt `main` aktualisieren. Ein einzelner Pilot behebt dieses Problem **nicht** für die acht anderen Workflows.

## Pilot: Phase 7.0

- Bestehender Zeitplan, Python-Code, Quellen und Tests bleiben erhalten.
- GitHub-Actions-Workflow-Code wird **nur aus überprüftem `main`** geladen und ausgeführt.
- Bereits unveröffentlichte Daten können **nur als JSON-Datei** aus dem Review-Branch gelesen werden, nicht als Python-Programm.
- Die generierte `evolution/phase70/knowledge.json` wird nach dem Lauf ausschließlich auf `neryx/research-phase70` geschrieben. Keine direkte Schreibaktion auf `main`; kein Force-Push.
- Ein bereits vorhandener Branch wird mit dem Stand von `main` zusammengeführt. Konflikte stoppen den Job statt Daten zu überschreiben.
- Es gibt **keinen automatischen Merge**, keine Vercel-Veröffentlichung und keine Rechte zum Regeln-Ändern.
- GitHub-`GITHUB_TOKEN`-erzeugte Branch-Pushes lösen üblicherweise **keine** weiteren `push`-CI-Workflows aus. Daher muss der Mensch einen Pull Request für die Berichte eröffnen und die tatsächlichen PR-Tests abwarten. Die Rechte reichen in diesem Pilot nur für Branch-Pushes.

### Abnahme des Piloten
1. Dieses PR benötigt erfolgreiche allgemeine Integrations-/Browserchecks und die neue statische Regression `eval/tests/phase70-review-branch-policy.test.mjs`.
2. Erst nach separater Nutzerfreigabe PR auf `main` übernehmen; GitHub-Ruleset weiterhin `disabled`.
3. Durch `workflow_dispatch` einen echten Phase-70-Lauf auf `main` starten, unter Beachtung möglicher aktiver Automations-Läufe. Ergebnis: `neryx/research-phase70` vorhanden, `main` bleibt beim selben SHA, nur `knowledge.json` als Bericht geändert.
4. Branch-Diff prüfen und den Review-Branch im GitHub-UI als **manuellen PR** öffnen. Die normalen CI-Prüfungen müssen an diesem PR laufen und der Bericht muss korrekt sein.
5. Erst danach die acht übrigen Workflows in getrennten, überschaubaren PRs umstellen und testen.
6. Wenn alle neun keinen direkten `main`-Push mehr vornehmen, eine Berechtigungs- und Ruleset-Negativtestreihe durchführen; **erst dann** Ruleset aktivieren.

### Einschränkungen und Sicherheitslücken, die dieser Pilot NICHT behebt
- `contents:write` des GitHub-Action-Tokens ist zur Branch-Erstellung erforderlich und nicht auf einen einzelnen Branch begrenzbar; technische Schreibsperre für `main` erfordert **Ruleset/Branch Protection**. Solange dieses deaktiviert ist, handelt es sich um einen *workflow-internen* Schutz, keinen erzwungenen Berechtigungszaun.
- Ein regulärer Actions-Job mit Internetzugriff ist **keine** Sandbox für untrusted generierten Code.
- JSON-Eingabedaten vom Forschungsbranch sind unvertraut; JSON-Validierung und Größenlimit sind nur erste Schranken. Für eine spätere Selbstentwicklungsengine ist ein strenger Datenschema-Validator nötig.
- Der bestehende `CODEOWNERS`-Eintrag und `genesis-candidate-paths` ersetzen keine aktivierten GitHub-Rulesets.
- Nicht alle automatisierten Forschungsberichte entsprechen automatisch geprüften Tatsachen; menschliche Bewertung bleibt nötig.

**Nächste Arbeit nach dem Pilotbeweis:** Die acht weiteren Workflows jeweils gleichermaßen auf dedizierte Review-Branches umleiten, ihren Datenfluss erhalten und erst danach die Regeln von `Disabled` auf `Active` setzen.
