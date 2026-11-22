# GENESIS X – Phase 1: Alle neun Wissensworkflows auf Review-Branches

## Status
**Entwurf, NICHT auf `main` aktiviert.** Ziel: Acht noch direkt nach `main` schreibende Forschungsworkflows umstellen und Phase 7.0 nach einem Squash-Merge gegen Branch-Divergenz absichern.

## Architektur
- Die neun bisherigen Zeitpläne, Python-Generatoren und Unit-Tests bleiben erhalten; alte `push`-Trigger für Workflow-Dateiänderungen werden entfernt.
- Jeder Workflow checkt **explizit `main`** aus, lädt den gemeinsamen Publisher aus diesem überprüften Stand und führt nur diesen Hauptbranch-Code aus.
- `.github/scripts/research-review-branch.sh prepare` liest optional ausschließlich allowlist-gelistete JSON-Daten aus dem alten Bot-Branch. JSON-Parsing und Größenlimit verhindern triviale Fehler; Inhalte bleiben **unvertraut**.
- `.github/scripts/research-review-branch.sh publish` stellt ausschließlich **die definierten JSON-Ergebnisse** als Commit-Baum auf Basis des aktuellen `main` bereit. Insbesondere werden KEINE sonstigen Dateien aus dem Bot-Branch in den neuen Commit-Baum übernommen.
- Der neue Commit besitzt ggf. den alten Review-Commit und `main` als Eltern. Damit ist die Branch-Aktualisierung ohne Force-Push möglich, auch wenn zuvor ein Bericht per Squash-PR in `main` übernommen wurde.
- Wenn `main` den Bericht nach der Branch-Abspaltung bereits aktualisiert hat, werden die aktuelleren geprüften `main`-Daten statt veralteter Bot-Daten verwendet.
- Es gibt **keinen Auto-PR, keinen Auto-Merge, keinen App-Deploy**. Freigabe erfolgt ausschließlich durch einen Mensch über einen PR mit Checks.
- Falls `main` während der Checkout-Vorbereitung fortschreitet, stoppt der Lauf, statt unbemerkt zu veralten. Nicht-fast-forward-Pushes schlagen fehl.

## Branch-/Datei-Allowlist
| Workflow | Review-Branch | Erlaubte Berichte |
| --- | --- | --- |
| phase70 | `neryx/research-phase70` | `evolution/phase70/knowledge.json` |
| phase76 | `neryx/research-phase76` | `evolution/phase76/review76.json` |
| phase77 | `neryx/research-phase77` | `evolution/phase77/research77.json` |
| phase78 | `neryx/research-phase78` | `evolution/phase78/research78.json` |
| phase79 | `neryx/research-phase79` | `evolution/phase79/research79.json` |
| phase710 | `neryx/research-phase710` | `evolution/phase710/research710.json` |
| phase711 | `neryx/research-phase711` | `evolution/phase711/research711.json` |
| phase712 | `neryx/research-phase712` | `evolution/phase712/audit712.json`, `evolution/phase712/research711.json` |
| phase713 | `neryx/research-phase713` | `evolution/phase713/audit713.json`, `evolution/phase713/research711.json` |

## Review- und Abnahme
1. PR-Integrationstests, Chromium, WebKit und Kandidatenpfadprüfung müssen bestehen; neue neunfache Regression für Workflow-Konfiguration einschließen.
2. Vor Übernahme erneut den `main`-Stand und die tatsächlichen Dateidiffs kontrollieren; Merge nur nach Nutzerfreigabe.
3. Ruleset bis nach den echten Negativtests weiterhin **Disabled**.
4. Nach Merge jeden Workflow mit `workflow_dispatch` prüfen: Läuft er erfolgreich? Nur erlaubte JSON-Dateien im jeweiligem Review-Branch? `main`-SHA unverändert (sofern keine fremden zeitgleichen Änderungen)?
5. Re-Run von Phase 7.0 **nach** seinem vorherigen Squash-Merge muss ohne Git-Konflikt funktionieren.
6. Für jede Gruppe von Forschungsdaten manuellen PR öffnen, syntaktische und inhaltliche Prüfungen durchführen und nur mit Freigabe mergen.
7. GitHub-Ruleset erst aktivieren, wenn alle neun Läufe keine direkten `main`-Pushes mehr machen, erforderliche Checks laufen, und die Review-Rechte/Owner-Situation getestet sind.

## Grenzen
- Bei `contents:write` kann der Bot-Token technisch auch auf `main` schreiben, solange Ruleset **Disabled** bleibt. Workflow-Code allein ist **keine** vollwertige Branch-Schutzbarriere.
- Alle neuen Daten kommen aus öffentlich zugänglichen Quellen, sind nicht automatisch verifiziert und müssen entsprechend markiert werden.
- Die PR-CI prüft bisher vor allem Code-Stabilität und Workflow-Policies, nicht die Echtheit der Forschungsdaten.
- Acht Python-Workflows nutzen für Folgeschritte Daten aus `main`, bis deren separate Review-PRs übernommen sind. Dadurch laufen nicht alle Forschungsverbesserungen sofort synchron, was bewusst zugunsten der menschlichen Freigabe in Kauf genommen wird.
