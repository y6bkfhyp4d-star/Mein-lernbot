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
