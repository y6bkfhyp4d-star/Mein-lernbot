# LernBot 7.0 – Phase 5.2

## Intelligentes Erfahrungsgedächtnis

Diese Version basiert auf dem Weltgenerator und dem Episoden-Gedächtnis aus Phase 5.1. Sie speichert in früheren Welten **beobachtete** Ressourcen und schätzt anhand dieser Erfahrungen die Wahrscheinlichkeit, unbekannte Rohstoffe in bestimmten Regionen zu finden.

Neue Funktionen:
- Lernkurve nach 0, 10, 25, 50 und 100 Trainingsmissionen.
- Für jeden Trainingsstand getrennte Validierung mit 24 Welten und anschließender Test auf 48 bislang unbenutzten Welten.
- Automatische Rückkehr zur Basissuche, wenn die Erfahrung in den Validierungswelten nicht deutlich genug geholfen hat.
- Lokale Erinnerung, 25 weitere Welten lernen, Erinnerung kopieren und löschen.
- Vollständiger Bericht, JSON-Kopie und TXT-Export.

## Dateien
- `index.html`: Website
- `style.css`: iPhone-Layout
- `main.js`: Oberfläche, Kopierknopf und Missionssteuerung
- `world.js`: Original-Weltgenerator aus Phase 5.1
- `memory52.js`: Erfahrungsgedächtnis mit eigenem Phase-5.2-Speicherschlüssel (Phase 5.1 bleibt unberührt)
- `memory.js`: Original-Gedächtnis aus Phase 5.1 für den Referenzcode
- `agent52.js`: überarbeitete Planung
- `sim52.js`: Training, Validierung und Lernkurve
- `agent51.js`, `sim51.js`, `agent.js`: Original-Vergleichscode als Referenz
- `package.json`: JavaScript-Modulkonfiguration

Die Dateien werden direkt unter `evolution/phase52/` gespeichert. **Keinen zweiten Unterordner anlegen.**

Startadresse nach GitHub-Pages-Veröffentlichung:
https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase52/

## Test

1. Seed `2027` stehen lassen.
2. Auf **Lernkurve testen** tippen.
3. Auf **Ergebnisse kopieren** tippen und den Text in ChatGPT einsetzen.

Optional: Persönliches Lernen mit **25 frühere Welten lernen**.

## Methodische Grenzen

Die Erfolgskriterien, der Generator und die Biome sind künstlich. Ein größerer Trainingsumfang garantiert keinen Lerngewinn. Persönliche Speicherung im Browser ist geräte- und ursprungsgebunden; das Löschen der Browserdaten entfernt sie. Die Simulation ist keine allgemeine KI und ändert ihren Code nicht automatisch.
