# NERYX CodeBrain 1.4 – Sicherheitsreview / Freigabe-Gate

**Status:** Draft, kein Merge und keine Freigabe. Dieser Bericht ist ein interner technischer Review, **kein unabhängiger externer Audit**. Dieses Review trennt belegte Prüfungen von nicht belegten Zusagen.

## Nachgewiesen
- Die Dateiübertragung des PR findet über die GitHub-API als Daten statt. Der manuelle Scanner importiert keine PR-Quelltextdateien.
- Die neue AST-Ausführung verwendet einen separaten Node-Prozess mit Speicherlimit, 5-Sekunden-Timeout, 128-MiB-V8-Heaplimit und begrenztem Befund-Output.
- Python wird mit `ast.parse` geprüft; YAML mit `Psych.parse_stream`; JSON mit `JSON.parse`. Keiner dieser Parser führt untersuchten Quelltext absichtlich aus.
- Die Acorn-Abhängigkeit hat ein Lockfile und wurde im AST-CI-Lauf mit `npm ci --ignore-scripts` installiert.
- Die öffentlichen Smoke-Tests haben PR #97 mehrfach ohne Authentifizierung über die GitHub-API untersucht.
- Die Tests für Auslassungen, bestätigte Syntaxfehler, Berichtsbereinigung und wechselnde PR-SHAs verhindern entsprechende irreführende Grünmeldungen.

## Verbleibende Sicherheitsgrenzen
1. **Zwei verschiedene Vertrauensmodelle:** Das manuelle `codebrain-manual` führt nach der Freigabe ausschließlich Skripte aus `main` aus und liest PR-Quelltext nur über API. Dagegen checkt `codebrain-public-smoke` einen PR-Merge-Commit aus und **führt PR-Testskripte aus**. Dort gelten `permissions: {}`, keine übergebenen Secrets und `persist-credentials: false`. Der öffentliche Smoke-Test ist **kein Ersatz für ein privilegiertes, vertrauenswürdiges Code-Review**.
2. **Anonyme GitHub-API (C28):** Die separate Live-Probe ist nur diagnostisch. Ein nachgewiesenes GitHub-Rate-Limit (HTTP 429 oder HTTP 403 mit Rate-Limit-Indiz) führt zu einem explizit als `INCONCLUSIVE` markierten übersprungenen Test und einer Warnung in der GitHub-Zusammenfassung. **Das ist kein bestandener Live-Nachweis.** Andere HTTP-Fehler, generische HTTP 403 ohne Drosselungsbeleg, Vertragsfehler und defekte Tests schlagen weiter fehl. Der unabhängige Offline-Snapshot bleibt verbindlich und führt keine anonymen API-Aufrufe aus.
3. **Dateiabdeckung (C27):** Maximal 30 geänderte Dateien, 70 KB pro unterstützter Datei, 500 KB insgesamt. Die Ausgabe unterscheidet `COMPLETE`, `PARTIAL_UNSUPPORTED` und `INCOMPLETE` und benennt jede Ausnahme. Im PR #97 wurden zuletzt 22 von 25 Dateien geprüft; zwei Markdown-Dokumente und ein Ruby-Parserhelfer wurden als nicht unterstützt ausgewiesen. Binärdateien, umbenannte und gelöschte Dateien sind nicht vollständig abgedeckt.
4. **Syntax ≠ Sicherheitsfreigabe:** AST-Befunde und Regex-Warnungen sind keine vollständige Sicherheits- oder Korrektheitsprüfung. Semantik, Abhängigkeiten, GitHub-Workflow-Logik und zur Laufzeit entstehende Effekte werden nicht umfassend validiert.
5. **Isolation:** Ein separater Prozess mit Timeout/Node-Speicherlimit ist kein Betriebssystem-Sandboxersatz. Die heuristische Alternative im öffentlichen Smoke-Test hat lediglich das Workflow-Timeout als Gesamtschutz.
6. **Manueller Ende-zu-Ende-Test:** Der echte `workflow_dispatch`-Durchlauf mit einem GitHub-Token ist auf diesem Draft-Branch nicht nachgewiesen. Der Workflow wird erst nach ausdrücklich genehmigter Integration in `main` regulär verfügbar.

## C29 – überprüfter CI-Abschluss (Stand 24.11.2026)

**Geprüfter Commit:** `b3c8ad611c7de32954f326f8f7b2d1245389e525` auf `feature/neryx-codebrain-v1-readonly` in Draft-PR #97.

Die fünf PR-Workflows meldeten für diesen Commit den Status `completed/success`:
- `GENESIS X AST Analyzer 2.1 tests`
- `NERYX free read-only code reviewer`
- `NERYX GENESIS X candidate policy`
- `NERYX CodeBrain offline gate and optional public API (no secrets)`
- `NERYX merge candidate verification`

Der Offline-Snapshot hatte 22 von 25 Dateien geprüft und drei Ausnahmen ausdrücklich als nicht unterstützte Dateitypen benannt (`PARTIAL_UNSUPPORTED`). Die öffentliche API war bei diesem Lauf erreichbar; bei Rate-Limits bleibt sie optional und ausdrücklich unbestätigt.

**Nicht nachgewiesen:** unabhängiger externer Sicherheitsreview, vollständige Analyse sämtlicher Dateitypen, echter manueller `workflow_dispatch`-Ende-zu-Ende-Lauf auf `main` und vollständige Laufzeit-/Semantikkorrektheit des Analyzers. Das positive CI-Ergebnis ist keine automatische Freigabe und ersetzt keine Genehmigung zum Merge.

Diese Dokumentationsänderung erzeugt einen neuen Commit, dessen CI separat neu bewertet werden muss; der historische Erfolg des obigen Commits wird nicht als Erfolg eines neuen Commits ausgegeben.

## C30 – Stabilitätscheck und Entscheidungsvorbereitung (24.11.2026)

**Bestätigter Stand vor diesem Dokumentationscommit:** Commit `2da52a57e07228e86c44e6d700b9b5e0a16b4082`; Draft-PR #97 offen und laut GitHub technisch zusammenführbar. Alle fünf relevanten PR-Workflow-Runs waren `completed/success`. Das Merge-Candidate-Workflow umfasste erfolgreiche Integration, Chromium und WebKit. Offline-Snapshot: 22 von 25 Dateien geprüft, drei Ausnahmen für nicht unterstützte Dateitypen (`PARTIAL_UNSUPPORTED`), keine Analysefehler; öffentliche Live-API-Probe war beim geprüften Lauf erreichbar.

**Entscheidungsstatus: keine Merge-Freigabe.** Folgende Punkte bleiben außerhalb der belegten CI-Prüfung offen:

- Externer oder unabhängiger Sicherheitsreview und abschließende manuelle Prüfung der Workflow-Vertrauensgrenzen.
- Ende-zu-Ende-Verifikation des manuellen `workflow_dispatch` nach einer ausdrücklich genehmigten Integration; auf diesem Draft-Branch nicht nachgewiesen.
- Entscheidung, ob die dokumentierten drei Dateityp-Ausnahmen vor einer Freigabe zusätzlich separat zu prüfen sind.
- Ausdrückliche Genehmigung durch den Repository-Verantwortlichen. Weder Draft-Status noch Merge-Einstellungen dürfen ohne diese Genehmigung verändert werden.

**Interpretation der Checks:** Grüner Merge-Candidate-Workflow belegt das geprüfte Integrations- und Browsertest-Ergebnis, nicht die Abwesenheit aller Sicherheits- oder Laufzeitfehler. `PARTIAL_UNSUPPORTED` ist keine vollständige Dateiabdeckung. Ein optionaler Live-API-Test mit `INCONCLUSIVE` darf niemals als bestandene Live-Verifikation ausgewiesen werden.

**Neuer Commit = neue CI-Bewertung:** Die vorstehenden Ergebnisse gelten für `2da52a5`; bei Änderungen an diesem Dokument müssen die GitHub-Checks am neuen Head erneut überprüft werden.

## C31 – Read-only-Nachprüfung der unterstützungsbedingten Ausnahmen (24.11.2026)

**Geprüfter Ausgangsstand:** `c59c52c62743f415df4cf60fa8b3fdb3932aa2ac`, Draft-PR #97, fünf von fünf PR-Workflows `completed/success` (inklusive Integration, Chromium und WebKit).

Der Offline-CodeBrain-Scanner meldete bislang `PARTIAL_UNSUPPORTED` mit 22 von 25 unterstützten Dateien geprüft. Für den bisher ausdrücklich als `unsupported-type` erfassten Ruby-Helfer `.github/scripts/neryx-yaml-syntax.rb` führt die unprivilegierte Snapshot-CI jetzt separat `ruby -c` aus. Die Syntaxprüfung parst den Helfer, führt ihn nicht als Programm aus und verwendet keine neuen API-Tokens. Ein Syntaxfehler führt zu einem roten Offline-Gate. Der CodeBrain-Snapshot selbst meldet den Ruby-Helfer weiterhin korrekt als nicht unterstützt; der zusätzliche Gate-Test ist **keine** vollständige Ruby-Sicherheitsanalyse.

Die beiden Markdown-Dokumente bleiben als nicht vom Code-Scanner geprüfte Ausnahmen ausgewiesen. Dateiabdeckung, Resultate und Abnahme dürfen nicht als vollständiger Security-Audit bezeichnet werden.

**Weiter offen vor einer Merge-Entscheidung:** unabhängiger Review, manuelle `workflow_dispatch`-E2E-Verifikation auf vertrauenswürdigem `main` nach einer ausdrücklich genehmigten Integration sowie ausdrückliche Genehmigung zum Merge. Der neue C31-Commit benötigt eine eigene CI-Abnahme; frühere grüne Checks sind kein Ersatz.

## C32 – konsolidierter Stabilitätsnachweis und verbleibende Freigabesperren (24.11.2026)

**Nachweis für unveränderten geprüften Head `262880f514cba3863dad0acfc89409259dd1a829`:** Alle fünf PR-Workflows auf GitHub `completed/success`: AST Analyzer, read-only Reviewer, Candidate Policy, Offline-Gate mit optionaler API sowie Merge Candidate Verification. Deren Jobs `integration`, `browsers (chromium)` und `browsers (webkit)` waren jeweils `completed/success`. Der Draft-PR #97 ist offen und laut GitHub technisch zusammenführbar.

| Entscheidungspunkt | Stand | Aussagegrenze |
| --- | --- | --- |
| AST- und Regressionstests | Bestanden | Keine vollständige Semantik- oder Sicherheitsgarantie |
| Offline-PR-Snapshot | Bestanden, `PARTIAL_UNSUPPORTED` | 22/25 Dateien geprüft, 3 explizite Ausnahmen |
| Ruby-Helfer | Separater `ruby -c`-Check bestanden | Syntax, kein Ruby-Sicherheitsaudit |
| Browser- und Merge-Kandidatentests | Integration, Chromium und WebKit bestanden | Nur getestete Fälle und Laufzeitumgebung |
| Live-API-Diagnostik | Optional, nicht Freigabekriterium | Bei Limit ausdrücklich `INCONCLUSIVE` |
| Unabhängiger Sicherheitsreview | **Offen** | Keine unabhängige Freigabe behaupten |
| Manueller `workflow_dispatch`-E2E-Test auf vertrauenswürdigem `main` | **Nicht nachgewiesen** | Auf Draft-Branch nicht als durchgeführt ausgeben |
| Repository-Verantwortlicher: ausdrückliche Merge-Freigabe | **Nicht erteilt** | Draft beibehalten, kein Merge und kein Deployment |

**Entscheidung:** technisch getesteter Draft-Kandidat, **nicht zur automatischen Integration freigegeben**. Der unabhängige Review, die verbleibenden manuellen Nachweise und die ausdrückliche Nutzerentscheidung sind keine durch grüne CI-Checks ersetzbaren Schritte.

**Nachweiskette:** Diese Sektion dokumentiert den historischen Erfolg von `262880f`. Der Dokumentationscommit selbst muss als neuer Head separat geprüft werden. Zusätzliche Dokumentationscommits erzeugen keine neuen Sicherheitsnachweise und sollten vermieden werden, sofern sich die Fakten nicht ändern.

## Freigaberegeln
- Erst alle erforderlichen GitHub-Checks am letzten Commit grün und einen unabhängigen Review abschließen.
- Sicherheitsgrenzen und Testresultate klar dokumentieren; keine automatischen Merges, kein Deployment, keine neuen Secrets oder Schreibrechte.
- Nutzerfreigabe für einen Merge getrennt einholen. Bis dahin Draft unverändert halten.
