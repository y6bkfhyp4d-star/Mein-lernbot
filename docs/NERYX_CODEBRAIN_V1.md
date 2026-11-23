# NERYX CodeBrain 1.4 – technische Dokumentation

**Stand:** Entwicklungszweig `feature/neryx-codebrain-v1-readonly`, Draft-PR #97. Keine Merge-, Deployment- oder Sicherheitsfreigabe. CodeBrain ist ein kostenloser, deterministischer Prüfwerkzeug-Prototyp und **kein Sprachmodell**.

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
- Führt den anonymen GitHub-API-Test aus. Bei HTTP 403/429 wird der Rate-Limit-Header geprüft: **Genau ein** automatischer Wiederholungsversuch erfolgt nur, wenn ein belegter Reset oder ein `Retry-After` innerhalb von **20 Sekunden** liegt. Bei längerem oder unbekanntem Limit bleibt das Ergebnis **INCONCLUSIVE und fehlgeschlagen**, niemals grün. GitHub-Header werden ausschließlich als bereinigte Zahlen/Kategorien diagnostiziert; kein Token wird verwendet.
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

- Höchstens **30 geänderte Dateien**, **60 KB pro unterstützter Datei** und **400 KB insgesamt**. Kodierte Blob-Antworten werden vor dem Dekodieren in ihrer Größe begrenzt.
- Nicht unterstützte, entfernte, umbenannte, zu große oder nicht lesbare Dateien erscheinen als übersprungen oder fehlerhaft. Auch Markdown wird nicht vollständig geprüft.
- Vor Ausgabe wird der PR-Head erneut abgefragt. Ändert sich sein SHA, wird die Prüfung verworfen.
- Vertrauliche Quelltext-Inhalte und Token sollen nicht im Bericht erscheinen. Ausgegeben werden feste Labels, Dateinamen und Zeilennummern; die Dateinamen werden für Markdown bereinigt.
- Bestätigte Syntaxfehler setzen `blocking=true`; unvollständige Abdeckung setzt `complete=false`. Der manuelle CLI-Lauf liefert nur dann Exit-Code 0, wenn `complete && !blocking`.
- Verdächtige AST- oder YAML-Muster sind **Warnungen, keine bestätigten Sicherheitslücken**.
- Fehler, Ausfälle oder Zeitüberschreitungen bei Parsern führen nicht zu einer stillschweigenden Freigabe.
- Parser sind kein vollständiger Sandbox- oder Security-Review. Semantik, Abhängigkeiten und zur Laufzeit entstandene Probleme werden nicht umfassend analysiert.

## Isolierung und Reproduzierbarkeit

- JavaScript-Worker: eigener Node-Prozess, `--max-old-space-size=128`, 2,5 Sekunden Timeout und begrenzte Rückgabe. Die Quelle bleibt Dateninhalt; Import der geprüften Datei ist ausgeschlossen.
- Python- und YAML-Parser: eigene Prozesse, 5 Sekunden Timeout (gegen CI-Startverzögerungen), begrenzte Ausgabe, kein Python-`exec` und keine YAML-Objektdeserialisierung.
- Acorn: `eval/genesis-ast/package-lock.json`, `npm ci --ignore-scripts`; Installation und AST-Tests wurden in GitHub Actions erfolgreich ausgeführt.

## Nachweise und offene Freigabeschritte

- `eval/tests/codebrain.test.mjs`: Scanner- und Sicherheitsregressionen.
- `eval/tests/codebrain-workflow-security.test.mjs`: Workflow-Vertrauensregeln.
- `eval/tests/codebrain-live-public.test.mjs`: echte anonyme GitHub-API (bei 403/429 **Fehler**, kein Skip).
- `eval/genesis-ast/tests/codebrain-manual-contract.test.mjs`: Gesamtverhalten mit **simulierter GitHub-API**, aber realem AST-Worker und echten Python-/YAML-Parsern.
- `eval/genesis-ast/tests/codebrain-worker.test.mjs`: AST-Prozessisolierung und begrenzte Ausgabe.
- `docs/NERYX_CODEBRAIN_SECURITY_REVIEW.md`: Risiken, Grenzen, Freigabebedingungen.

**Freigabe-Gate:** Alle vorgeschriebenen Checks am endgültigen Commit erfolgreich; unabhängiger externer Review weiterhin ausstehend; Merge ausschließlich nach ausdrücklicher Zustimmung. Der authentifizierte manuelle Ende-zu-Ende-Workflow kann erst nach einer genehmigten Integration in `main` getestet werden. Bis dahin darf der erfolgreiche Vertragstest nicht als authentifizierter Live-Test dargestellt werden.
