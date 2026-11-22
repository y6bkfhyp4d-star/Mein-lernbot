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

## Reale Nachmessung von PR #88 (22.11.2026)

Aus dem erfolgreichen `genesis-ast`-Job, **64 von 64 Tests bestanden**:

| Originaldatei | AST-Funktionen | CFG | Datenfluss | Korrelation: begrenzter Bericht | Manuelle Prüfung |
|---|---:|---:|---:|---:|---:|
| `app.js` | 78 | 78 | 78 | 1 | 77 |
| `modules/code-diagnose.js` | 22 | 22 | 22 | 0 | 22 |
| `modules/genesis-x.js` | 5 | 5 | 5 | 0 | 5 |
| `modules/orchestrator.js` | 10 | 10 | 10 | 1 | 9 |
| `modules/local-model-bridge.js` | 8 | 8 | 8 | 0 | 8 |
| **Summe** | **123** | **123** | **123** | **2** | **121** |

Die **funktionale Erfassungsquote nach Anzahl benannter Deklarationen** verbessert sich somit von 0/123 auf 123/123 für exakt diese fünf Dateien. **Sie ist keine Aussage über semantische Präzision** der Graphen oder deren Verständigkeit; insbesondere 121/123 Korrelationen bleiben vorsichtshalber für manuelle Begutachtung zurückgehalten. Die SHA-256-Prüfung bestätigt unveränderte Quelldateien.

Ein Regressionstest verlangt nun, dass die CFG- und Datenflussmodule alle vom AST-Inventar erkannten benannten Funktionsdeklarationen dieser fünf Dateien abdecken.
