# GENESIS X – unabhängiger deterministischer Referenztest (Forschungszweig)

Stand 22.11.2026 · Folgeschritt nach PR #48. **Nicht produktiv eingebunden.**

## Ziel

Bisher zeigte der GENESIS-X-Worker nur den internen Status `execution_checked` bzw. `review_required`. Diese interne Wiederholungsrechnung kann denselben systematischen Fehler enthalten wie die ursprünglich gewählte Regel.

Die neue Testumgebung schafft eine zweite Implementierung der **explizit bekannten Rechenaufgabe**, ohne deren Sollwerte an GENESIS X zu übergeben:

- Forschungsaufgabe: Für ein gegebenes `x` die gelernte Funktion `y = x + 2` aus Trainings- und Validierungsdaten auswählen. Für einen Vergleichswert `b` soll die Entscheidung `y > b` gelten.
- **Referenzmodul `eval/genesis-x-independent-oracle.mjs`:** JavaScript-Code ohne Import der GENESIS-X-Module. Er berechnet unabhängig `x+2` und `value>b`. Dieses Modul ist **nicht Teil** der VM, in der GENESIS X ausgeführt wird.
- `eval/genesis-x-reference-audit.mjs` startet die originalen GENESIS-X-Research-Module in einer isolierten Node-`vm`-Umgebung, ohne `fetch`, Speicher, Browser-DOM oder `eval`-Zugriff. Die Aufgaben enthalten **nur x und b**, keine `truth`- oder `expected`-Felder. Erst **nach** `checked` werden die zurückgegebenen Kandidaten mit dem separaten Referenzmodul verglichen.
- **12 feste, öffentlich nachvollziehbare Holdout-Eingaben:** positive, negative und gebrochene Zahlen; unterschiedliche Vergleichsfälle und Grenzgleichheit. Ein unpassender Wert oder eine abweichende Entscheidung zählt als Fehler.
- Bei ungültigen Formen, veränderten Eingaben oder fehlenden Fällen wird die Auswertung blockiert. Das CI-Programm beendet sich mit Fehler, falls nicht alle Holdout-Fälle zu den Referenzen passen.
- Die veröffentlichte Konsole enthält **nur aggregierte Trefferzahlen und den Status**; keine einzelnen Prognosen, Regeln oder privaten Nutzerdaten.
- `eval/tests/genesis-x-independent-oracle.test.mjs` verifiziert die Referenzformel und prüft gezielt, ob manipulierte Zahlenwerte, falsche boolesche Entscheidungen, fehlerhafte oder umsortierte Ergebnisse erkannt werden.

## Vertrauensgrenzen

**„Unabhängig“ bedeutet hier separat implementierter Sollwert-Code**, nicht ein unabhängiger externer Anbieter, menschlicher Expertenreview oder eine geheim gehaltene Frozen-Suite. Die Aufgabenfamilie `x+2` und `y>b` ist bekannt und so gewählt, dass objektive Sollwerte verfügbar sind. Keine Aussage über beliebige neue Aufgaben, autonome Forschung, allgemeine Intelligenz oder Vertrauenswürdigkeit des Sprachmodells.

Die Referenz ist Teil des öffentlichen Forschungsrepositories und damit kein blinder Benchmark. Die Trainingsdaten und Referenzformel folgen derselben ausdrücklich festgelegten Aufgabenspezifikation; **gemeinsame Spezifikationsfehler bleiben möglich**.

Die Tests können nach einem Fehler **keine Nutzerantwort freigeben**. Die bestehenden `modules/genesis-x-worker.js`, `modules/genesis-x-worker-client.js`, `app.js`, `index.html`, `sw.js` und der Frozen-Bestand bleiben unverändert. **Keine Vercel- oder Live-Veröffentlichung.**

## Entscheidungskriterium

Erst bei erfolgreichem isoliertem Referenztest, bestandenen manipulierten Gegenproben und der vollständigen Regression kann dieser Forschungs-Schritt als technisch bestanden gelten. Das schafft noch **keine** Produktfreigabe.
