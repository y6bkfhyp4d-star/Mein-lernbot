# NERYX CodeBrain 1.4 – Sicherheitsreview / Freigabe-Gate

**Status:** Draft, kein Merge und keine Freigabe. Dieser Bericht ist ein interner technischer Review, **kein unabhängiger externer Audit**. Dieses Review trennt belegte Prüfungen von nicht belegten Zusagen.

## Nachgewiesen
- Die Dateiübertragung des PR findet über die GitHub-API als Daten statt. Der manuelle Scanner importiert keine PR-Quelltextdateien.
- Die neue AST-Ausführung verwendet einen separaten Node-Prozess mit Speicherlimit, 2,5-Sekunden-Timeout und begrenztem Befund-Output.
- Python wird mit `ast.parse` geprüft; YAML mit `Psych.parse_stream`; JSON mit `JSON.parse`. Keiner dieser Parser führt untersuchten Quelltext absichtlich aus.
- Die Acorn-Abhängigkeit hat ein Lockfile und wurde im AST-CI-Lauf mit `npm ci --ignore-scripts` installiert.
- Die öffentlichen Smoke-Tests haben PR #97 mehrfach ohne Authentifizierung über die GitHub-API untersucht.
- Die Tests für Auslassungen, bestätigte Syntaxfehler, Berichtsbereinigung und wechselnde PR-SHAs verhindern entsprechende irreführende Grünmeldungen.

## Verbleibende Sicherheitsgrenzen
1. **Zwei verschiedene Vertrauensmodelle:** Das manuelle `codebrain-manual` führt nach der Freigabe ausschließlich Skripte aus `main` aus und liest PR-Quelltext nur über API. Dagegen checkt `codebrain-public-smoke` einen PR-Merge-Commit aus und **führt PR-Testskripte aus**. Dort gelten `permissions: {}`, keine übergebenen Secrets und `persist-credentials: false`. Der öffentliche Smoke-Test ist **kein Ersatz für ein privilegiertes, vertrauenswürdiges Code-Review**.
2. **Anonyme GitHub-API:** HTTP 403/429 liefert jetzt ausdrücklich einen **fehlgeschlagenen** Smoke-Test mit `INCONCLUSIVE`-Meldung. Es darf dabei kein grüner Live-Nachweis entstehen. Anonyme GitHub-Ratenlimits können dadurch CI zeitweise rot machen; das ist eine bewusst sichtbare Einschränkung.
3. **Dateiabdeckung:** Maximal 30 geänderte Dateien, 60 KB pro unterstützter Datei, 400 KB insgesamt; Markdown, Binärdateien, umbenannte und gelöschte Dateien sind nicht vollständig abgedeckt. Die Ergebnisanzeige muss den Umfang nennen.
4. **Syntax ≠ Sicherheitsfreigabe:** AST-Befunde und Regex-Warnungen sind keine vollständige Sicherheits- oder Korrektheitsprüfung. Semantik, Abhängigkeiten, GitHub-Workflow-Logik und zur Laufzeit entstehende Effekte werden nicht umfassend validiert.
5. **Isolation:** Ein separater Prozess mit Timeout/Node-Speicherlimit ist kein Betriebssystem-Sandboxersatz. Die heuristische Alternative im öffentlichen Smoke-Test hat lediglich das Workflow-Timeout als Gesamtschutz.
6. **Manueller Ende-zu-Ende-Test:** Der echte `workflow_dispatch`-Durchlauf mit einem GitHub-Token ist auf diesem Draft-Branch nicht nachgewiesen. Der Workflow wird erst nach ausdrücklich genehmigter Integration in `main` regulär verfügbar.

## Freigaberegeln
- Erst alle erforderlichen GitHub-Checks am letzten Commit grün und einen unabhängigen Review abschließen.
- Sicherheitsgrenzen und Testresultate klar dokumentieren; keine automatischen Merges, kein Deployment, keine neuen Secrets oder Schreibrechte.
- Nutzerfreigabe für einen Merge getrennt einholen. Bis dahin Draft unverändert halten.
