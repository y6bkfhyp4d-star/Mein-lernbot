# LernBot 7.0 – Phase 4.2

## Installation auf GitHub Pages (iPhone)

Alle fünf Dateien **direkt** nach `Mein-lernbot/evolution/phase42/` hochladen:

- `index.html`
- `style.css`
- `model.js`
- `portfolio.js`
- `main.js`

**Nicht** den ZIP-Ordner `phase42` zusätzlich in `phase42` legen. Keine alten Phasen ersetzen.

Nach dem Commit öffnen:
https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase42/

## Ablauf

1. Seed auf 2027 lassen und **Trainieren und 36 Welten testen** drücken.
2. Die vier Strategien bei `UNBEKANNTER TEST` vergleichen: Fehler, Entdeckungen, Fehlalarme, Verzögerung.
3. Mit anderen Seeds wiederholen.
4. Optional **Strategien speichern**: speichert bis zu acht Varianten in diesem Browser. Sie werden beim nächsten Training als Kandidaten berücksichtigt.

## Grenzen

Die Evolution optimiert festgelegte Parameter. Es ist kein Sprachmodell und keine selbstständige Code-Änderung. Das Trainingsverfahren kennt die Rauschstufen, aber die Laufzeitstrategie schätzt Rauschen aus 30 eigenen frühen Messungen. Das kann sich nachteilig auswirken; die Ergebnisse sind keine garantierte Verbesserung.
