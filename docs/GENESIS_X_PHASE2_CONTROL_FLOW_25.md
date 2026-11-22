# GENESIS X – CodeAnalyzer 2.5: konservativer Kontrollflussgraph

**Status:** isolierter read-only Prototyp für JavaScript-Analyse; keine Änderung an der produktiven NERYX-App.

## Was 2.5 erkennt
- AST-basierter Kontrollfluss für **benannte Funktionen auf Programmebene**.
- Ein-/Ausstiegspunkte, lineare Anweisungen, `return` und `throw`.
- `if`/`else`-Verzweigungen mit getrennten `true`-/`false`-Kanten.
- `while`, `do...while` und begrenzte `for`-Strukturen mit Rückkanten.
- Jede untersuchte Anweisung hat Typ, interne Knotenkennung und Quellposition.
- Ergebnis als kontrolliert generiertes Graph-Objekt; analysierte Quelle wird **nicht ausgeführt**.

## Grenzen
- Noch **kein echter Gesamtablaufnachweis**, keine Datenfluss-Zusammenführung, keine Auswertung konkreter Bedingungen.
- `for`-Initialisierung/Update werden noch nicht modelliert; dies wird ausdrücklich als Einschränkung ausgegeben.
- `break`, `continue`, `switch`, `try/catch/finally`, `for...of`, `for...in`, Labels und `with` werden noch nicht verlässlich modelliert. Die Graphkanten werden bei solchen Anweisungen bewusst unterbrochen und die Einschränkung aufgeführt.
- Kein Async-/Callback-/Generator-/Ausnahmeflussmodell über Funktionen hinweg.
- Keine automatische Korrektur und keine Freigabe zum autonomen Umbau.
- Der bereits isolierte `genesis-ast`-GitHub-Workflow führt über `npm test` zusätzlich die neuen Kontrollfluss-Tests aus. Fünf bestehende Pflichtchecks bleiben unverändert.

## Test und Übernahme
Die Datei `eval/genesis-ast/control-flow.mjs` wird durch `eval/genesis-ast/tests/control-flow.test.mjs` getestet. Nach sechs erfolgreichen Jobs kann dieser Vorschlag manuell freigegeben werden. Das Testpaket ist weiterhin abhängig vom kostenlos installierten Acorn-Parser und bleibt vom produktiven iPhone-LernBot getrennt.

**Nächster Schritt:** präzises Modell von `break`/`continue`, `switch`, `try/catch/finally` und eine sichere Verbindung von Kontrollfluss- und Datenflussinformationen.
