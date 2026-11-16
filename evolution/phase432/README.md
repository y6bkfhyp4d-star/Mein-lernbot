# LernBot 7.0 – Phase 4.3.2: Fehlalarm-Diagnose

Installiere alle sieben Dateien direkt unter `evolution/phase432/` auf GitHub Pages. `index.html` startet das Experiment.

- `model.js` und `portfolio.js` stammen unverändert aus Phase 4.3.1.
- `guard.js` führt die Phase-4.2-Strategie exakt aus und protokolliert bestätigte Alarme.
- Mehrere Quotenfilter werden **nur nachträglich** als Schattentest angewandt. Kein Alarm und keine Modellaktualisierung wird tatsächlich geändert.
- Die Auswahl eines Quotenfilters erfolgt anhand der Trainingswelten; Validierung und Test bleiben davon getrennt.
- Die Ergebnisse eines hypothetischen Filters sind **keine** vollwertige Simulation einer aktivierten Regel. Bei einer echten Aktivierung könnten Folgeentscheidungen anders ausfallen.
- Ein automatischer Abgleich meldet, ob die unveränderte Erkennung dieselben Ergebnisse wie Phase 4.2 erzielt.

Nur simulierte Parameteranpassung; keine selbstständige Codeänderung. Kostenlos und offline nutzbar.
