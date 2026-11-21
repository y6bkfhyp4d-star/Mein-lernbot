# GENESIS X 0.2 – isolierter deklarativer Werkzeug-Baukasten

**Experiment, keine autonome Programmierfähigkeit und keine Produktintegration.**

- `modules/genesis-x-tools.js` stellt ausschließlich `window.NERYXGenesisXTools.compose({training,holdout,constants,maxSteps})` bereit.
- Aus sechs festen Rechenbausteinen entstehen Abläufe bis höchstens drei Schritte. Die Suche endet spätestens nach 5000 geprüften Kandidaten.
- Erst muss ein Ablauf sämtliche Trainingsbeispiele erfüllen; anschließend müssen **alle separat gelieferten Holdout-Beispiele** passen. Sonst `unconfirmed`.
- Kleinere Schritttiefen werden zuerst ausprobiert. Ein Treffer ist nur ein Kandidat, **kein Beweis für Allgemeingültigkeit**.
- Trainings- und Holdout-Daten dürfen keine identischen x-Werte enthalten; die Prüfwerte werden aber vom Aufrufer geliefert und sind nicht unabhängig geheim.
- Keine Installation, keine Speicherung, kein Netzwerk, kein DOM-Zugriff, kein `eval`, keine Verbindung zu `app.js`, `index.html` oder Nutzerdaten.
- Test: `node --test eval/tests/genesis-x-tools.test.mjs`.
- Bestehender GENESIS X Core 0.1 bleibt unverändert. Dieses Experiment liegt nur auf `neryx/genesis-x-02-tools`.

**Nächster separater Schritt:** unabhängige Aufgaben/Negativtests und CI ergänzen, danach sichere Freigabeprüfung vor jeglicher Integration.

## Generierte Audit-Prüfung (zusätzlicher Entwicklungstest)

- `eval/tests/genesis-x-tools-property.test.mjs` generiert 60 reproduzierbare Aufgaben mit unterschiedlichen Rechenregeln und prüft die ausgegebenen Programme anschließend über eine **separate** Auswertungsfunktion gegen 660 zusätzliche Eingaben. Diese dritten Eingaben werden `compose()` nicht übergeben.
- Weitere 30 unvereinbare Prüfkonstellationen verlangen ein klares `unconfirmed`.
- Ein bewusst abweichendes Beispiel zeigt ausdrücklich die Grenze: Selbst perfekte Anpassung an Training **und** mitgelieferte Validierungswerte beweist nicht, dass die unbekannte wahre Regel außerhalb dieser Stichproben zutrifft.
- Der Audit-Generator ist offen im Repository und reproduzierbar. Er stellt **keine geheime oder vollkommen unabhängige externe Benchmark** dar.
- **Präzise Bezeichnung:** Das `holdout`-Argument von `compose()` ist ein zur Kandidatenauswahl verwendetes **Validierungsset**. Ein unberührtes finales Audit muss getrennt stattfinden. Auch 660 erfolgreiche Auditsamples sind keine Garantie für neue, beliebige Probleme.
- Keine Nutzung der Frozen-Suite, keine Änderung von `frozen.seal.json`, keine Integration in die Haupt-App.
