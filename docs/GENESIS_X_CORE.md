# GENESIS X CORE 0.1 – isoliertes Strategielabor

**Status: Experiment / kein autonomes Programmieren und keine neue Denkfähigkeit.**

- Datei: `modules/genesis-x.js`, exportiert nur `window.NERYXGenesisX.compare({training,holdout})` und `demo()`.
- Zwei vordefinierte Ansätze für Zahlenabbildungen: **linear** und **quadratisch**. Sie werden nur aus Trainingspaaren angepasst; getrennte Holdout-Paare messen, ob die vorhergesagten Werte passen.
- Rückgabe: Kandidaten, Trefferzahlen, gewähltes Verfahren nur bei **100 % Trefferquote auf allen gelieferten Prüfwerten**, sonst `unconfirmed`.
- Die Prüfdaten kommen vom Aufrufer. Sie sind von den Trainingsdaten getrennt, aber **nicht geheim oder unabhängig von diesem Repository erstellt**. Erfolg beweist weder Erfindung eines neuen Algorithmus noch Verallgemeinerbarkeit.
- **Keine Speicherung**, keine Netzwerkanfragen, keine DOM-Eingriffe, kein `eval`, kein Codegenerator, keine Installation, kein Zugriff auf `meinLernBot.v1`.
- **Absichtlich nicht in `index.html` oder das Chat-Routing eingebunden.** So bleibt die produktive Haupt-App unverändert. Die neue Bibliothek wird nur in isolierten Node-Prüfungen geladen.

Test: `node --test eval/tests/genesis-x-core.test.mjs`

**Folgestufe (separat):** Ein deklarativer Werkzeug-Baukasten mit expliziten erlaubten Operationen, extern vorbereiteten Holdout-Tests und bestätigungspflichtiger Installation. Erst bei nachgewiesener Robustheit darf der Hauptchat neue Vorschläge sehen.
