# GENESIS X – Phase 2: Qualitätsmessung mit echten Projektdateien

**Zweck:** Nach 2.6 prüfen wir, ob die Analyzer an realem LernBot-Code funktionieren, statt einfach zusätzliche Funktionen zu programmieren.

## Umfang des ersten Baselinesatzes
- `app.js`
- `modules/code-diagnose.js`
- `modules/genesis-x.js`
- `modules/orchestrator.js`
- `modules/local-model-bridge.js`

`eval/genesis-ast/tests/real-sources.test.mjs` ruft die bereits isolierten Analyzer für AST, Scopes, Kontrollfluss, Datenfluss, Korrelation und Abhängigkeiten auf. Der bestehende Workflow `genesis-ast` führt den Test automatisch mit den bisherigen Tests aus.

## Messwerte (aus GitHub-Actions-Logs zu entnehmen)
- Anzahl parsbarer Dateien und AST-Funktionen;
- Anzahl AST-Befunde und erkannter Bindings;
- erfasste Kontrollflussgraphen und Datenflussfunktionen;
- Anteil von Korrelationen mit ausdrücklich begrenztem Bericht vs. `manual-review-required`;
- Importkanten, aufgelöste/unaufgelöste Referenzen, Zyklen und Parsefehler;
- SHA-256-Hash der Projektdateien **vor und nach** der Analyse.

**Messwert ist keine Qualitätsgarantie:** Viele erfasste Funktionen bedeuten weder hohe Trefferquote noch Korrektheit. Für Präzisions-/Recall-Messungen brauchen wir eine kuratierte, menschlich geprüfte Referenz mit positiven und negativen Beispielen. Besonders bei Skripten ohne ES-Module sind die Module- und Importmetriken möglicherweise wenig aussagekräftig.

## Sicherheitsgrenzen
- Nur die fünf **explizit gelesenen** Quelldateien, keine automatische Import-Verfolgung.
- Keine Source-Ausführung, keine Änderungen der Projekt- oder App-Dateien, keine Schreibrechte für den Testworkflow.
- Hash-Vergleich im Test überprüft, dass die beobachteten Quelldateien unverändert bleiben.
- CI-Protokoll enthält nur Größen und aggregierte Befunde, **keine Quellcodeauszüge oder Geheimnisse**.
- Keine neuen npm-Abhängigkeiten, Änderung nur im isolierten Test und in dieser Dokumentation.
- Bestehende fünf Pflichtchecks bleiben weiterhin verpflichtend.

## Abnahmekriterium
Sechs CI-Jobs erfolgreich und Messwerte im Log plausibel. Bei vielen nicht parsebaren Dateien oder `manual-review-required`-Ergebnissen wird **zuerst die Genauigkeit verbessert**, nicht autonomes Editieren eingeschaltet. Dieser PR bleibt bis zur Prüfung getrennt von `main`.

## Erste reale Messung (GitHub Actions, 22.11.2026)

Der neue `genesis-ast`-Test war erfolgreich; die **fachliche Abdeckung** ist allerdings noch unzureichend:

| Kennzahl | Ergebnis |
|---|---:|
| Exakt untersuchte Projektdateien | 5 |
| Vom AST-Parser lesbare Dateien | 5 |
| AST-erkannte Funktionsdeklarationen | 123 |
| AST-Hinweise (keine bestätigten Fehler) | 3 |
| Scope-Bindings | 947 |
| Vom separaten Kontrollfluss-Analyzer erfasste Funktionen | **0** |
| Vom separaten Datenfluss-Analyzer erfasste Funktionen | **0** |
| Korrelationen | **0** |
| Gefundene Importkanten | 1 |
| Innerhalb der fünf Dateien aufgelöste Importkanten | 0 |

**Wichtige Ursache:** `app.js` und `modules/code-diagnose.js` sind in eine sofort aufgerufene Funktion (`(() => { ... })();`, IIFE) eingeschlossen. Die Analyzer 2.4/2.5/2.6 betrachten bislang nur benannte Funktionen direkt auf Programmebene. Sie überspringen daher die eigentlichen LernBot-Funktionen. Die Dateien sind parsbar, aber die relevante Kontroll-/Datenflussabdeckung ist in dieser Auswahl **null**. Der Importgraph ist für die hauptsächlich über klassische Skripte eingebundene App außerdem nur begrenzt aussagekräftig.

**Konsequenz:** Kein Grund, autonomes Code-Editieren zu aktivieren. Bevor wir von echter Qualität sprechen, müssen wir eine sichere Erfassung von Funktionen innerhalb von IIFEs und anderen realen Projektstrukturen ergänzen und dann dieselben Metriken erneut messen.

Diese Angaben stammen aus dem AST-Job von PR #87; die fünf Quelldateien wurden laut Hash-Vergleich nicht verändert.
