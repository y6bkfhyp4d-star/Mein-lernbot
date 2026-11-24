# NERYX CodeBrain 1.4 – technische Dokumentation

**Stand:** Entwicklungszweig `feature/neryx-codebrain-v1-readonly`, Draft-PR #97. Keine Merge-, Deployment- oder Sicherheitsfreigabe. CodeBrain ist ein kostenloses, deterministisches Analysesystem und **kein Sprachmodell**.

## Zwei unterschiedliche Ausführungsmodelle

### Manueller Reviewer – vertrauenswürdiger Code von `main`

Datei: `.github/workflows/neryx-codebrain.yml`.

- Start durch `workflow_dispatch` auf `main` mit PR-Nummer; Checkout **ausschließlich `main`**, `persist-credentials: false`.
- Rechte: `contents: read`, `pull-requests: read`. Keine automatischen Merges oder Deployments.
- Nach `npm ci --ignore-scripts --no-audit --no-fund` im vertrauenswürdigen Verzeichnis `eval/genesis-ast` werden lokale Tests ausgeführt. Acorn `8.15.0` hat ein festes Lockfile mit Paket-Integritätswert.
- Das GitHub-Token wird beim Scan an die REST-API übergeben. Geprüfte PR-Inhalte werden als **Daten** aus Git-Blobs gelesen, nicht ausgecheckt, als Module importiert oder als PR-Skripte gestartet.
- Parser-Unterprozesse erhalten ausschließlich `PATH` und `LANG`, **nicht das GitHub-Token**.
- **Noch nicht vollständig live getestet:** Solange dieser Workflow nicht mit ausdrücklicher Freigabe nach `main` übernommen wurde, ist der authentifizierte `workflow_dispatch`-Lauf offen.

### Öffentlicher Smoke-Test – PR-Checkout ohne GitHub-Berechtigungen

Datei: `.github/workflows/neryx-codebrain-public-smoke.yml`.

- Trigger: `pull_request` gegen `main`; Test gegen die auslösende PR-Nummer.
- `permissions: {}`, keine übergebenen Secrets, `persist-credentials: false`.
- **Führt Testdateien aus dem PR-Merge-Checkout aus.** Deshalb gilt die Zusage „kein PR-Code wird ausgeführt“ **nicht** für diesen unprivilegierten Smoke-Job.
- Installiert keine npm-, pip- oder Ruby-Pakete.
- Führt den anonymen GitHub-API-Test aus. Bei HTTP 403/429 wird der Rate-Limit-Header geprüft: **Genau ein** automatischer Wiederholungsversuch erfolgt nur, wenn ein belegter Reset oder ein `Retry-After` innerhalb von **20 Sekunden** liegt. Bei belegter Drosselung ohne erfolgreiche Wiederholung ist der optionale Live-Test **INCONCLUSIVE (übersprungen)**; ein grüner Workflow ist dann kein Live-Nachweis. Nicht belegte HTTP-Fehler bleiben Fehler. GitHub-Header werden ausschließlich als bereinigte Zahlen/Kategorien diagnostiziert; kein Token wird verwendet.
- Der PR-Smoke-Workflow bricht veraltete Läufe für dieselbe PR per `concurrency` ab, damit neue Commits nicht unnötig parallel anonyme API-Anfragen auslösen. Es gibt **keinen später geplanten automatischen GitHub-Run** für ein Stundenlimit; das würde einen separat genehmigten Workflow benötigen.
- Dieser Smoke-Test ist kein unabhängiger oder privilegierter Sicherheitsreview.

## Unterstützte Prüfungen

| Typ | Prüfverfahren | Einordnung |
| --- | --- | --- |
| `.js`, `.mjs`, `.cjs` | Im manuellen Reviewer Acorn-AST via `eval/genesis-ast/codebrain-worker.mjs` | Syntaxfehler bestätigt; Sicherheitsmuster heuristisch |
| `.py` | `.github/scripts/neryx-python-syntax.py`, `python3 -I -S`, `ast.parse` | Nur Syntax |
| `.yml`, `.yaml` | `.github/scripts/neryx-yaml-syntax.rb`, `Psych.parse_stream` | YAML-Syntax; Actions-Warnmuster heuristisch |
| `.json` | `JSON.parse` | Nur Syntax |

Der öffentliche Smoke-Test verwendet bei JavaScript die heuristische Variante, **nicht** den separaten Acorn-Worker. Die AST-Tests und der manuelle Vertragstest prüfen diesen Worker separat.

### Grenzen und Fehlermeldungen

- Höchstens **30 geänderte Dateien**, **70.000 Bytes pro unterstützter Datei** und **500.000 analysierte Bytes insgesamt**. Kodierte Blob-Antworten werden vor dem Dekodieren in ihrer Größe begrenzt.
- Nicht unterstützte, entfernte, zu große oder nicht lesbare Dateien erscheinen als übersprungen oder fehlerhaft. Der API-Scanner prüft auch renamed, copied und changed; der Offline-Diff verwendet A/M/D ohne Rename-Erkennung und bricht bei anderen Status ab. Auch Markdown wird nicht vollständig geprüft.
- Vor Ausgabe werden PR-Head, Basis-SHA (soweit vorhanden), Dateianzahl, Zustand und Zielbranch erneut abgeglichen. Abweichungen verwerfen den Bericht. Doppelte Dateipfade werden abgelehnt; beide Scanner verifizieren die tatsächlichen Git-Blob-Bytes gegen die erwartete SHA-1.
- Vertrauliche Quelltext-Inhalte und Token sollen nicht im Bericht erscheinen. Ausgegeben werden feste Labels, Dateinamen und Zeilennummern; die Dateinamen werden für Markdown bereinigt.
- Bestätigte Syntaxfehler setzen `blocking=true`; unvollständige Abdeckung setzt `complete=false`. Der manuelle CLI-Lauf liefert nur dann Exit-Code 0, wenn `complete && !blocking`.
- Verdächtige AST- oder YAML-Muster sind **Warnungen, keine bestätigten Sicherheitslücken**.
- Fehler, Ausfälle oder Zeitüberschreitungen bei Parsern führen nicht zu einer stillschweigenden Freigabe.
- Parser sind kein vollständiger Sandbox- oder Security-Review. Semantik, Abhängigkeiten und zur Laufzeit entstandene Probleme werden nicht umfassend analysiert.

## Isolierung und Reproduzierbarkeit

- JavaScript-Worker: eigener Node-Prozess, `--max-old-space-size=128`, 5 Sekunden Timeout und begrenzte Rückgabe. Die Quelle bleibt Dateninhalt; Import der geprüften Datei ist ausgeschlossen.
- Python- und YAML-Parser: eigene Prozesse, 5 Sekunden Timeout (gegen CI-Startverzögerungen), begrenzte Ausgabe, kein Python-`exec` und keine YAML-Objektdeserialisierung.
- Acorn: `eval/genesis-ast/package-lock.json`, `npm ci --ignore-scripts`; Installation und AST-Tests wurden in GitHub Actions erfolgreich ausgeführt.

## Nachweise und offene Freigabeschritte

- `eval/tests/codebrain.test.mjs`: Scanner- und Sicherheitsregressionen.
- `eval/tests/codebrain-workflow-security.test.mjs`: Workflow-Vertrauensregeln.
- `eval/tests/codebrain-live-public.test.mjs`: optionale echte anonyme GitHub-API (bei belegter Drosselung **INCONCLUSIVE**, kein Live-Nachweis).
- `eval/genesis-ast/tests/codebrain-manual-contract.test.mjs`: Gesamtverhalten mit **simulierter GitHub-API**, aber realem AST-Worker und echten Python-/YAML-Parsern.
- `eval/genesis-ast/tests/codebrain-worker.test.mjs`: AST-Prozessisolierung und begrenzte Ausgabe.
- `docs/NERYX_CODEBRAIN_SECURITY_REVIEW.md`: Risiken, Grenzen, Freigabebedingungen.

**Freigabe-Gate:** Alle vorgeschriebenen Checks am endgültigen Commit erfolgreich; unabhängiger externer Review weiterhin ausstehend; Merge ausschließlich nach ausdrücklicher Zustimmung. Der authentifizierte manuelle Ende-zu-Ende-Workflow kann erst nach einer genehmigten Integration in `main` getestet werden. Bis dahin darf der erfolgreiche Vertragstest nicht als authentifizierter Live-Test dargestellt werden.

## C42 – Abschlusskandidat der Härtungsphase (24.11.2026)

**Verifizierter Vorgänger:** `e6466888dbc249df05f2797cf9f1508e664db5a1` (C41), fünf von fünf Workflows erfolgreich; Integration, Chromium und WebKit erfolgreich. Offline-Snapshot: 22 von 25 Dateien geprüft, 3 ausdrücklich nicht unterstützte Dateien, 0 Scanfehler, PARTIAL_UNSUPPORTED. Ausnahmen: Ruby-Parserhelfer (separater Syntaxcheck) und die beiden Markdown-Dokumente. Offline-Adaptertests 19/19, API-Schutz-/Diagnostiktests 60/60 erfolgreich. Optionaler Live-API-Test in diesem Lauf wegen belegter Drosselung übersprungen (INCONCLUSIVE, nicht live verifiziert). Nachweise: Runs 45403496479 und 45403496380.

### Abgeschlossene Entwicklungspakete bis zum Vorgänger
- C33–C36: Abdeckung, Ergebnisschema, eindeutiger Git-Diff-Abgleich und Blob-Integrität.
- C37–C38: gemeinsame Blob-Hashprüfung, API-Inventar und stabile PR-Metadaten.
- C39–C40: exakte Ressourcen-Grenzwerte und kombinierte Fehlerfälle über reale Parser und simulierten Transport.
- C41: interner Architekturreview und Reihenfolge der Node-Laufzeitinstallation im manuellen Workflow.
- C42: konsolidierte Dokumentation und eingefrorener Abschlusskandidat nach erfolgreicher eigener CI.

Der C42-Dokumentationscommit muss separat verifiziert werden; keine automatische Freigabe. Draft-PR #97 bleibt offen und unverändert. Kein Merge, kein Deployment, keine neuen Secrets. Unabhängiger Sicherheitsreview und authentifizierter manueller Dispatch auf main bleiben offen. Die Parserprozesse sind keine OS-Sandbox. Die geprüften Fälle belegen weder allgemeine Fehlerfreiheit noch vollständige Sicherheit.

### Nächste Entwicklungsphase (Vorschlag, nicht implementiert)
Die Analyseleistung getrennt von der Infrastruktur messen: reproduzierbarer, unabhängiger Holdout mit erwarteten Befunden und negativen Fällen; Vergleich mit passenden ESLint-/CodeQL-Regeln auf gemeinsamen Aufgaben; Precision, Recall, Fehlalarme, Laufzeit und Abdeckung dokumentieren. Erst danach gezielt Semantik, Kontrollfluss und Datenfluss ausbauen. Keine Behauptung einer Überlegenheit ohne Vergleichsmessung. Die kostenlose, read-only Architektur und die bisherigen Regressionstests bleiben Ausgangsanforderungen. Keine Änderung des Freigabestatus durch diesen Vorschlag.
