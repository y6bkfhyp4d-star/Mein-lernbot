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
