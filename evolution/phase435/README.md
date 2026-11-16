# LernBot 7.0 – Phase 4.3.5

## Installation auf GitHub Pages (iPhone)

Diese fünf Dateien **direkt** in `Mein-lernbot/evolution/phase435/` hochladen:

- `index435.html`
- `main435.js`
- `model435.js`
- `style435.css`
- `README.md`

**Nicht** noch einen zusätzlichen `phase435`-Unterordner anlegen, wenn du bereits in `evolution/phase435/` bist.

Seite öffnen:
`https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase435/index435.html`

## Bedienung

1. **Training & Test starten** drücken.
2. **Ergebnisse kopieren** drücken und die Ausgabe im Chat einfügen.
3. Optional **JSON kopieren** für vollständige maschinenlesbare Resultate oder **TXT speichern**.

## Was wird getestet?

Ein eigenständiges deterministisches Testmodell mit drei Alarmstrategien (Basis, empfindlich, geschützt). Die geschützte Strategie verlangt stärkere Bestätigung, unterdrückt Wiederholungsalarme und begrenzt Kontrollmessungen. Alle Strategien bekommen dieselben Messwerte, und die verborgene Weltwahrheit wird erst bei der Auswertung verwendet. Drei Rauschstufen und getrennte Test-Seeds sind enthalten.

**Wichtig:** Dies ist eine neue, eigenständige Simulation. Sie ersetzt nicht die Originalalgorithmen von Phase 4.2 oder 4.3.4. Ihre Vergleichswerte dürfen nicht als identische Implementierung der alten Phasen ausgegeben werden. Für einen echten direkten Regressionstest bitte deren vollständige Quelldateien bereitstellen. Training/Validierung werden als separate Welten erzeugt, die Strategien sind hier aber fest und werden nicht trainiert.
