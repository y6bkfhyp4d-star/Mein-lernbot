# NERYX CodeBrain 1.0 – isolierter Prüfprototyp

## Zweck und Status
CodeBrain 1.0 ist eine **manuell ausgelöste, schreibgeschützte, heuristische Basisprüfung**. Es ist weder ein Sprachmodell noch ein vollständiger AST- oder Sicherheitsprüfer. Es nutzt den bestehenden `analyzeSource()` aus `eval/genesis/code-analyzer.mjs` und erfordert weder Gemini noch andere externe KI-APIs.

## Sicherheitsgrenzen
- Der Workflow wird ausschließlich über `workflow_dispatch` auf `main` gestartet; der Checkout zeigt explizit auf das vertrauenswürdige `main`.
- Berechtigungen: `contents: read`, `pull-requests: read`. Kein Secret außer dem automatisch vergebenen GitHub-Token, kein `pull_request_target`, kein Merge, kein Deploy.
- PR-Dateien werden per GitHub-API als Blob-Daten gelesen; sie werden nicht auf die Festplatte geschrieben und nicht als Module importiert. Die vorhandene Heuristik kompiliert JS mit `vm.Script`, führt es aber nicht aus.
- Höchstens 30 geänderte Dateien, höchstens 60 KB pro unterstützter Datei und insgesamt 400 KB. Keine Installation fremder Pakete.
- Nicht unterstützte Dateien, entfernte Dateien und unlesbare Dateien werden mit Grund als **übersprungen** oder **Fehler** gemeldet. Unvollständige Prüfung ergibt Exit-Code 1.
- Nur bekannte Befund-Labels werden angezeigt, keine Code-Snippets, kein PR-Quelltext oder Token. Befunde bleiben **unbestätigte Heuristiken**.

## Bekannte Grenzen
- Nur `.js`, `.mjs` und `.cjs` werden heuristisch geprüft. Python, YAML, JSON, binäre und historische Dateien bleiben ausdrücklich unüberprüft.
- Der alte Analyzer prüft Syntax über `vm.Script`, was bei ESM irreführend sein kann. Deshalb verwirft CodeBrain die `JS000`-Befunde. **Syntaxfehler werden in dieser Stufe nicht zuverlässig erkannt.**
- Dateiübergreifende Logik, Abhängigkeitsverwundbarkeiten, Codeabsicht und semantische Korrektheit sind nicht abgedeckt.
- Ein bestandener Test oder eine Meldung „keine Hinweise“ ist **keine Sicherheits- oder Korrektheitsfreigabe**.
- Der AST-Analyzer `eval/genesis-ast/analyzer.mjs` benötigt Acorn. Im Stand vom 23.11.2026 fehlt dazu das Lockfile. Eine reproduzierbare, vollständig getestete AST-Integration ist daher als zweite Stufe vorgesehen.

## Test und Betrieb
`node --test eval/tests/codebrain.test.mjs`

Der Workflow ist im Draft-PR noch **nicht als manueller Workflow des Default-Branches verfügbar**. Erst nach der separaten Freigabe und Übernahme in `main` könnte er über GitHub Actions gestartet werden. Dieser Draft-PR ist keine Freigabe zum Merge.

Gemini bleibt ein unabhängiger optionaler Workflow. Ein HTTP-503 bei Gemini ändert das Ergebnis von CodeBrain nicht.

## Nächste Schritte
1. Erst die Scanner-Tests und den Workflow-Sicherheitsvertrag im PR unabhängig auswerten.
2. Reproduzierbare Acorn-Abhängigkeit über geprüftes Lockfile vorbereiten.
3. AST-Adapter, Syntaxdiagnose, abgesichertes Berichtsformat und typbasierte Prüfungen getrennt integrieren.
4. Eine spätere Aktivierung als erforderlicher Statuscheck nur nach ausdrücklicher Freigabe.

## Erweiterung 1.1 im selben Draft-PR
- Im **manuellen GitHub-Workflow** wird `analyzeAST(file, source)` aus dem vorhandenen Acorn-Analyzer für JS/MJS/CJS verwendet. Das Ergebnis unterscheidet bestätigte Parserfehler (`AST000`) von heuristischen AST-Sicherheitswarnungen. Kein gescannter Code wird ausgeführt.
- JSON-Dateien werden mit `JSON.parse` syntaktisch geprüft, ohne Inhalt zu protokollieren.
- YAML-Dateien erhalten ausschließlich **heuristische** Trigger-/Berechtigungswarnungen. Es findet bewusst **keine vollständige YAML-Syntaxvalidierung** statt; die Report-Zeile lautet `yaml-heuristic-no-parse`.
- Andere Dateitypen bleiben übersprungen und verhindern eine vollständige Freigabe.
- Die Standard-Integrationstests nutzen beim direkten Funktionsaufruf weiterhin die optionale Heuristik-Variante, während ein separater Test im `eval/genesis-ast/tests/` den **echten AST-Adapter** nach installierter Parser-Abhängigkeit prüft.
- Die AST-Abhängigkeit wird aktuell wie im bereits bestehenden AST-Workflow mit dem fest eingetragenen Paket `acorn@8.15.0` und `npm install --ignore-scripts --no-audit --no-fund --package-lock=false` installiert. **Das ist noch kein durch Lockfile gesicherter, vollständig reproduzierbarer Installationsprozess.**
- Der manuelle Workflow steht erst nach späterer Freigabe und Merge auf dem Default-Branch zur Verfügung; dieser Draft-PR stellt **keinen nachgewiesenen Live-GitHub-API-Lauf** dar.

## Sicherheitskorrektur der Abdeckungs-/Freigabelogik
- YAML wird ohne vollständigen Parser immer als `partial` ausgewiesen, auch wenn kein Warnmuster gefunden wird; der Workflow bleibt entsprechend unvollständig und liefert Exit-Code 1.
- Auch bei vollständiger Dateiabdeckung führt ein **bestätigter** AST-/JSON-Syntaxfehler zum Fehlerstatus. `complete` beschreibt ausschließlich die Abdeckung; `blocking` beschreibt bestätigte Syntaxprobleme. Ein grüner Workflow setzt `complete && !blocking` voraus.
- Diese Schutzbedingungen werden durch zusätzliche Regressionstests abgedeckt. Bereits vorhandene Sicherheitshinweise anderer Art bleiben heuristische Warnungen, keine automatische Korrektur oder Freigabe.

## Python-Syntaxprüfung (noch im Draft)
- `.py`-Dateien werden über `.github/scripts/neryx-python-syntax.py` durch einen separaten, auf 2,5 Sekunden begrenzten Python-Prozess geprüft.
- Der geprüfte Quelltext wird ausschließlich als Standard-Eingabe an den vertrauenswürdigen Helfer übergeben. `python3 -I -S` und `ast.parse()` parsen die Syntax; `exec`, `import` des PR-Quelltexts oder `pytest` auf PR-Dateien finden nicht statt.
- Fehler werden nur als `PY000`, Zeilennummer und festes Label ausgegeben; kein Einfügen von Quelltext, Fehlermeldungen oder Secrets in GitHub-Berichte.
- Ein Timeout, Ausführungsproblem oder ungültiges Parser-Ergebnis wird als `error` markiert und verhindert ein grünes Ergebnis.
- YAML bleibt bis zur reproduzierbaren und abgesicherten Parser-Integration **partiell geprüft**. Eine Heuristik ist kein YAML-Parser.

## YAML-Syntaxprüfung (neu)
- Der isolierte Ruby-Helfer `.github/scripts/neryx-yaml-syntax.rb` nutzt auf `ubuntu-24.04` den vorhandenen Ruby-Psych-Parser und ausschließlich `Psych.parse_stream(source)`: **nur YAML-AST, keine Objektdeserialisierung**, kein `load` und keine Ausführung des YAML-Inhalts.
- Der Helfer bekommt maximal 60 KB über stdin; die Ausführung ist auf 2,5 Sekunden begrenzt. Er liefert nur `parsed` und gegebenenfalls eine Zeilennummer. Der Parser kann nicht alle logischen GitHub-Workflow-Fehler erkennen.
- Bei Parserfehler: bestätigter Syntaxbefund `YAML000`, der den Review blockiert. Bei Parserabsturz: `error`, ebenfalls nicht grün. Bei gültiger YAML-Syntax: `checked` mit Grund `yaml-ast-parse`, gegebenenfalls zusätzliche **heuristische** Warnungen für verdächtige GitHub-Actions-Muster.
- YAML-Syntaxprüfung ist **keine semantische GitHub-Actions-Workflow-Validierung** und kein Sicherheitszertifikat. Nicht unterstütztes Markdown bleibt sichtbar übersprungen.
- Es werden keine npm/pip/Ruby-Gems installiert und kein Gemini benötigt. Psych ist Bestandteil der bereitgestellten Ubuntu-Runner-Software; Verfügbarkeit wird durch echte GitHub-CI-Läufe nachgewiesen, nicht vorausgesetzt.

## Live-Test und Reproduzierbarkeit
- Der öffentliche GitHub-API-Smoke-Test prüft nur echte, anonym abrufbare Pull-Request-Daten. Bei HTTP 403 oder 429 meldet er jetzt **INCONCLUSIVE** und wird ausdrücklich als **übersprungen**, nicht als erfolgreich verifizierte Live-Abdeckung gezählt. Andere API-Fehler bleiben echte Testfehler. Ein früherer Live-Lauf für PR #97 wurde tatsächlich erfolgreich ausgeführt.
- Der zusätzliche Replay-Test verwendet die reale Dateityp-Struktur eines früheren PR-Snapshots, erzeugt seine Git-Blob-SHAs aus den aktuellen lokalen Quelldateien und bleibt damit auch nach reinen Dokumentationsänderungen ausführbar. Er ist ein **lokaler Integrations-/Contract-Test**, kein unabhängiger Live-API-Nachweis.

## AST-Isolation und reproduzierbare Installation
- Die JavaScript-AST-Prüfung des manuellen Reviewers läuft nun über den vertrauenswürdigen Helfer `eval/genesis-ast/codebrain-worker.mjs` in einem eigenen Node-Prozess, mit `--max-old-space-size=128`, 2,5-Sekunden-Timeout und maximal 16 KB Output. Der Worker liest Quelltext als stdin-JSON, importiert **keine PR-Datei** und gibt höchstens 41 regelbasierte Befunde ohne Quelltext zurück. Wenn diese Grenzen überschritten werden, wird der jeweilige Befund ausdrücklich zum Fehler oder zur gekürzten, unvollständigen Prüfung.
- Die Acorn-Abhängigkeit `8.15.0` ist jetzt im `eval/genesis-ast/package-lock.json` mit SHA-512-Integritätswert festgehalten. Der manuelle CodeBrain-Workflow und der bestehende AST-Testworkflow verwenden `npm ci --ignore-scripts --no-audit --no-fund` ausschließlich auf vertrauenswürdigem Workflow-Checkout. Die PR-Dateien bleiben reine API-Daten.
- Der Lockfile-Integritätswert stammt aus öffentlich verfügbaren Paket-Lockdateien für die identische Version und muss durch den GitHub-CI-Lauf gegen das tatsächlich ausgelieferte npm-Paket verifiziert werden. Der Node-Prozess ist mit Speicher-/Zeitlimits begrenzt, aber kein vollständiger Betriebssystem-Sandboxersatz.
- Der vollständige manuell gestartete CodeBrain-Workflow mit GitHub-Token muss **nach einer ausdrücklichen Merge-Freigabe** weiterhin separat in `main` geprüft werden. Ohne Freigabe findet kein Merge statt.
