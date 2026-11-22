# GENESIS X – IIFE-Abdeckung statt weiterer Schein-Fortschritte

## Ausgangslage (Messung PR #87)

Fünf echte Projektdateien: 5/5 parsbar und 123 Funktionsdeklarationen im grundlegenden AST-Inventar. **Kontrollfluss 0, Datenfluss 0, Korrelation 0**. Die zentralen LernBot-Dateien kapseln Funktionsdeklarationen in IIFEs.

## Gezielte Korrektur

- Neues isoliertes `function-discovery.mjs` sammelt benannte `FunctionDeclaration`-Knoten rekursiv und vergibt eindeutige, quellpositionsbasierte IDs (`name@start`).
- `control-flow.mjs` und `dataflow-analyzer.mjs` analysieren dieselben entdeckten Deklarationen unabhängig vom Verschachtelungsgrad.
- `flow-correlation.mjs` verknüpft die Ergebnisse anhand der stabilen Funktions-ID und nicht nur anhand von Namen. Bei doppelt vorkommenden Funktionsnamen bleibt die Freigabe von Herkunftshinweisen weiterhin gesperrt.
- Anonyme Arrow-/Function-Expressions werden weiter ausdrücklich als nicht vollständig abgedeckt gemeldet. Umfangreiche Datenfluss-/Kontrollfluss-Einschränkungen gelten unverändert.
- Zusätzliche Tests prüfen IIFE, verschachtelte Deklarationen, gleiche Namen, nicht erfasste Arrow-Funktionen und Nicht-Ausführung.
- Die bestehende reale Baseline mit genau denselben fünf Quelldateien läuft erneut. **Abnahme erst, wenn Kontroll-/Datenflussfunktionen tatsächlich erkannt werden** und alle sechs CI-Jobs erfolgreich sind.

## Grenzen

- Größere Anzahl analysierter Funktionen beweist noch keine korrekte Semantik, Fehlerrate oder zuverlässige Laufzeitprognose.
- Lexikalische Closure- und Global-Bindings werden im bisherigen Datenflussmodell nicht vollständig aufgelöst.
- Keine automatische Anwendung von Empfehlungen, keine App-Integration und keine autonomen Merges.
- Keine Änderung an `app.js`, `modules/**` oder GitHub-Branch-Schutz.
