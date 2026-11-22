# NERYX / GENESIS X #59 – Gemeinsamer Evidenzprüfstand

**Forschungs-Draft auf #58. Keine Produktionsintegration.**

Der Prüfstand verwendet **unverändert** die realen IIFE-Module `modules/orchestrator.js`, `math-verifier.js`, `answer-review.js`, `genesis-x-tools.js`, `genesis-x-ambiguity-gate.js` und `neryx-genesis-x-research-bridge.js`. Alle laufen innerhalb einer isolierten Node-VM. Für die Qwen-Seite wird eine explizit **synthetische Modellantwort** verwendet. Für GENESIS X wird die **reale Rechenregel-/Mehrdeutigkeitslogik** ausgeführt. Nur die Worker-Nachrichtengrenze wird simuliert, es gibt weder echte WebGPU-Generierung noch persönliche Browserdaten, API-Aufrufe oder Quellcodeänderungen.

## Vergleichsfragen

| Aufgabe | Unabhängig prüfbare Erwartung | Erlaubtes Systemverhalten |
| --- | --- | --- |
| Maler-Wandflächen, 3×4×5×2,5 | 150 m² | Fachrechner hat Vorrang, Qwen braucht nicht antworten |
| x²+2 mit Trainings-/Prüf-/Probewerten | Regelwerte unabhängig konstruiert | GENESIS nur `review_required`, niemals freigegebene Antwort |
| x+2 bei extrem kleinen x-Werten | Unterschiedliche mögliche Probe-Verhaltensweisen | `ambiguous`, keine Kandidatenausgabe |
| Widerspruch 4→999 bei ansonsten x+2 | Keine geprüfte passende Regel | `unconfirmed`, keine Ergebnisfreigabe |
| Erfundene Hauptstadt Testovias | Keine belegte Quelle | Qwen-Text nur als `unverifiziert` |
| Ungültiger Forschungsauftrag | Nicht ausführbar | `invalid`, keine Weiterleitung |
| Plausibel klingender erfundener Fakt | Kein unabhängiger Beleg | Der heutige formale Reviewer kann ihn übersehen – diese Grenze wird explizit gemessen |

## Entscheidend

GENESIS X ist **kein genereller Faktenprüfer** für die freien Sätze von Qwen. Sein derzeitiger Suchraum kann nur bestimmte numerische Muster beurteilen. Daher dürfen `review_required`, `ambiguous` und `unconfirmed` **niemals** in eine verifizierte Chat-Antwort umgewandelt werden. Die Tests behaupten keine gemeinsame produktive Routing-Funktion.

## Schutz

Keine Änderungen an `main`, dem aktiven NERYX-Chat, Qwen-WebLLM, Modellgewichten, Lernspeichern, Backups, PWA-Service-Worker, Frozen-Siegeln oder bestehenden GENESIS-Modulen. Kein Merge/Produktionsdeployment. Erst die getrennten Tests; danach kann eine **explizit optionale** Forschungsschnittstelle in einem neuen Draft vorbereitet werden.

## Ergebnis der unabhängigen CI-Prüfung

[GitHub Actions #45020007265](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45020007265): **alle 3 Jobs erfolgreich**.
- Gemeinsame NERYX/Qwen/GENESIS-X-Testfälle: **7/7 bestanden**.
- Vollständige Node-Regression: **642/642 bestanden**, keine fehlgeschlagenen Tests.
- Geschützte Quellcodedateien, Worker, PWA und Modellmodule: **unverändert**.

Kein echter Qwen-GPU-Lauf und kein iPhone-Browser-Test im Rahmen von #59. Getestet wurde Qwen durch kontrollierte Modellantworten und GENESIS X mit echter numerischer Prüfung in der isolierten VM. Darum ist dies ein **Vergleichstest**, nicht die bereits fertige gemeinsame Produktintegration.
