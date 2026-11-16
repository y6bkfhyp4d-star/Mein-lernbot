# Mein LernBot 7.0 – Phase 5.3

## Lernen aus Entscheidungen

Die Phase nutzt denselben 8×8-Weltgenerator wie Phase 5.2. Fünf Such-Taktiken werden durch abgeschlossene eigene Missionen bewertet. Der Agent sammelt beobachtete Rohstoffstatistiken und prüft anhand getrennter Validierungswelten, ob eine alternative Such-Taktik günstiger ist als die Basis.

**Wichtig:** Die Strategien lesen keine verborgenen Kartenfelder. Trainings-, Validierungs- und Test-Seeds sind getrennt. Eine Taktik wird nur nach einer Verbesserung in Training und Validierung aktiviert; ansonsten bleibt die Basissuche aktiv. Mehr Training garantiert keine Verbesserung.

## Installation iPhone / GitHub Pages

Alle Dateien aus diesem ZIP direkt in `evolution/phase53/` hochladen. Die URL lautet:
`https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase53/`

1. Website öffnen.
2. Seed `2027` beibehalten.
3. **Lernkurve testen** antippen.
4. **Ergebnisse kopieren** antippen und den Bericht in ChatGPT einfügen.

## Persönliches Erfahrungsgedächtnis

Über **25 Welten dazulernen** werden Taktikergebnisse und beobachtete Rohstoffmuster ausschließlich auf dem iPhone unter `lernbot7.phase53.decisions.v1` gespeichert. Die einzelne Welt lässt sich mit **Erlernte Taktik** spielen. Die separate reproduzierbare Lernkurve benutzt diesen persönlichen Speicher ausdrücklich nicht.

## Dateien

- `index.html` – Benutzeroberfläche
- `style.css` – Design
- `main.js` – Bedienung und Kopieren
- `world.js` – Original-Weltgenerator aus Phase 5.2
- `agent53.js` – Entscheidungen und Handlungserklärung
- `memory52.js` – beobachtete Rohstoffstatistiken aus Phase 5.2
- `sim53.js` – getrennte Trainings-, Validierungs- und Testläufe, persönliches Erfahrungsgedächtnis
- `package.json` – Modulkonfiguration für lokale Tests

Alle Berechnungen laufen im Browser, ohne Cloud-API. Der JavaScript-Code wird nicht automatisch verändert.
