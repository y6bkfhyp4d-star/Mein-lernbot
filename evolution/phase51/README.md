# Mein LernBot 7.0 – Phase 5.1

## Lernen aus vergangenen Welten

Diese Version baut auf dem Experimentierwelt-Code von Phase 5.0 auf. Sie ergänzt drei **öffentlich sichtbare Landschaftstypen**, in denen Rohstofffundorte statistisch unterschiedlich verteilt sind, sowie ein Erfahrungsgedächtnis im lokalen Browser-Speicher. Der Agent kennt keine verborgenen Felder und darf nur aus früheren Beobachtungen Wahrscheinlichkeiten schätzen.

### Dateien
- `index.html` – iPhone-Oberfläche
- `style.css` – Layout
- `main.js` – Bedienung, Kopieren, lokaler Speicher
- `world.js` – 8×8-Simulationswelt mit unterschiedlichen Landschaftstypen
- `agent51.js` – Planung mit/ohne Erfahrungsgedächtnis
- `memory.js` – Lernen aus beobachteten Rohstofffundorten
- `sim51.js` – getrennte Trainings- und Testwelten
- `package.json` – Modulkonfiguration für lokale Tests

### Installation
Lege **alle Dateien direkt in** `evolution/phase51/` deines GitHub-Repositories. Öffne dann:

https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase51/

### Test
1. Seed `2027` stehen lassen.
2. Auf „48 neue Welten vergleichen“ tippen.
3. „Ergebnisse kopieren“ drücken und den Bericht in ChatGPT einfügen.
4. Um ein persönliches Gedächtnis anzulegen: „48 frühere Welten lernen“ verwenden; der Speicher bleibt lokal auf dem Gerät.

**Wichtig:** Der Vergleich verwendet absichtlich ein frisch trainiertes Gedächtnis und nicht die persönlichen gespeicherten Daten, damit Ergebnisse reproduzierbar bleiben. Nicht alle Welt-Seed-Bereiche wurden unabhängig von der Entwicklung betrachtet. Unterschiede in den Schritten sind nicht automatisch ein starker Lernnachweis. Kein Zugriff auf Internet-APIs, keine autonome Änderung von JavaScript.
