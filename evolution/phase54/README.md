# Mein LernBot 7.0 – Phase 5.4

## Situationsabhängiges Lernen

Die Experimentierwelt und die Missionslogik aus Phase 5.3 bleiben bestehen. Neu ist eine kontextabhängige Auswahl zwischen fünf Suchtaktiken. Ein Kontext besteht aus Landschaft, Missionsphase, bereits erkundeten Feldern und aktuell benötigtem Rohstoff.

### Wie gelernt wird

- Auf Trainingswelten werden fünf Suchtaktiken separat ausgeführt. Jede sieht nur ihre eigenen Beobachtungen.
- Die Missionsergebnisse werden den beobachteten Entscheidungskontexten als **näherungsweise** Lernsignale zugewiesen. Das ist keine eindeutige kausale Bewertung einzelner Aktionen.
- Während einer neuen Mission kann der Agent je nach aktueller Situation eine andere Taktik verwenden.
- Eine neue Strategie wird nur eingesetzt, wenn sie auf 32 getrennten Validierungswelten eine durchschnittliche Verbesserung von mindestens 0,5 Schritten erreicht und keine Mission weniger löst.
- 100 weitere Welten dienen ausschließlich zur Auswertung.
- Trainingstiefen: 0, 10, 25, 50, 100 Welten.

**Wichtig:** Die geprüfte Verbesserung kann auch ausbleiben. In diesem Fall bleibt die Basistaktik aktiv. Eine Verbesserung wird niemals garantiert.

### Installation (nur iPhone)

Dateien aus diesem ZIP direkt unter `evolution/phase54/` hochladen. Keine der älteren Phasen muss verändert werden.

In GitHub innerhalb `evolution` kann die Ordnererstellung über `phase54/README.md` erfolgen. Anschließend alle Dateien ins neue Verzeichnis hochladen.

Website: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase54/`

1. Seed `2027` stehen lassen.
2. **Lernkurve testen** drücken.
3. **Ergebnisse kopieren** drücken und den Text in ChatGPT einfügen.

### Persönliches Gedächtnis

**25 Welten trainieren** sammelt persönliche Lerndaten im lokalen Browser-Speicher unter `lernbot7.phase54.context.v1`. Der reproduzierbare Lernkurvenvergleich ignoriert diesen Speicher. Erlernte Strategien können in der Einzelwelt ausprobiert werden.

### Dateien

- `index.html` – Oberfläche
- `style.css` – violettes mobiles Design
- `main.js` – Benutzeroberfläche und Kopieren
- `world.js` – ursprüngliche 8×8-Welt und Aktionen
- `memory52.js` – Rohstoff-Erfahrungsspeicher
- `agent54.js` – kontextabhängige Entscheidungen
- `sim54.js` – Training, Validierung, Test und persönliches Gedächtnis
- `package.json` – Modulkennung für Node-Tests

Keine kostenpflichtige API, keine automatischen Programmcode-Änderungen. Die Simulation besitzt keine allgemeine KI.
