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
