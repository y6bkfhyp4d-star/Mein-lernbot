# GENESIS X – prüfende Mehrdeutigkeits-Schnittstelle (Research, kein Produktions-API)

22.11.2026 · PR nach #52

## Änderung

Der zuvor externe Testschutz für mehrdeutige Zwei-Schritt-Programme ist jetzt als separate **optionale Worker-Forschungs-Schnittstelle** implementiert, ohne den bestehenden GENESIS-X-Worker umzubauen.

- `modules/genesis-x-ambiguity-gate.js`: begrenzte Suche nach **1–2 Schritten** aus vordefinierten Rechenoperationen und Konstanten `[0,1,2,3]`. Mehrere mit Trainings- und Validierungsdaten verträgliche Programme werden anhand **getrennter Probe-Eingaben** auf verschiedene numerische Verhaltensweisen geprüft.
- `modules/genesis-x-ambiguity-worker.js`: lädt ausschließlich bestehende GENESIS-X-Numerik und das neue Gate. Rückmeldung ohne rohe ausgewählte Programme, Beispielantworten oder Vorhersagewerte; nur `ambiguous`, `review_required`, `unconfirmed`, `invalid`, `unavailable` oder `blocked` plus gegebenenfalls begrenzte Zähler, immer `publishable:false`.
- `modules/genesis-x-ambiguity-client.js`: separate optionale Client-Schnittstelle mit Timeout, strenger Nachrichtenprüfung und Worker-Beendigung. Die bisherige `NERYXGenesisXWorkerClient.preview`-Schnittstelle wurde **nicht** verändert.
- Der alte Composer gibt bei bestimmten dichten/mehrdeutigen Eingaben weiterhin `candidate` zurück; **dieser neue Worker** dagegen `ambiguous`. Diese Unterscheidung ist der eigentliche Funktionsfortschritt.

## Vertrauensgrenzen

Der Status `review_required` bedeutet **nicht**, dass die Prognose auf weiteren, unbekannten oder realen Eingaben korrekt ist. Er bedeutet lediglich, dass unter den begrenzt enumerierten Programmen auf den angegebenen Probe-Eingaben kein abweichendes Ergebnis gefunden wurde.

Der gleiche Ursprung und die gemeinsame JavaScript-Laufzeit setzen keine starke Schadcode-Isolierung voraus. Ein Same-Origin-Worker ist keine Sicherheits-Sandbox für bösartigen Code. Unterbestimmte Aufgaben, fehlerhafte Trainingsbeispiele und numerische Toleranzen bleiben echte Risiken.

## Tests

- Isolierte Node-Suite für Mehrdeutigkeit, zweistufige Regeln, ungültige und manipulierte Eingaben.
- Echte Chromium- und Linux-WebKit-Browser-Smokes prüfen `ambiguous`, `review_required`, verweigerte Eingaben, fehlenden Worker, null Browser-Speicherzugriffe und keine Forschungs-Globals im Hauptfenster.
- Alle NERYX-/GENESIS-X-Regressionen und vorherige Multi-Step-Audits laufen zusätzlich.

Keine Änderungen an `main`, `app.js`, `index.html`, `sw.js`, Frozen oder den bestehenden Worker-Protokollen. **Keine automatische Verdrahtung in die Live-App, keine Vercel-Veröffentlichung**. Die opt-in Worker-Funktion ist nur im Forschungsbranch vorhanden und nicht automatisch offline vorgecached.

Ein zukünftiger Release benötigt weiterhin unabhängige Qualitätsprüfung, echte iPhone-Tests und ausdrückliche Freigabe.
