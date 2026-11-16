# LernBot 7.0 – Phase 4.0: Evolution der Lernstrategien

Standalone-Forschungsphase für GitHub Pages. Vier Dateien (`index.html`, `main.js`, `model.js`, `style.css`) direkt in `evolution/phase40/` hochladen. `README.md` ist optional.

## Ablauf

1. Seed 2027 und Messrauschen Normal lassen.
2. Auf **Evolution starten und testen** tippen. Sechs Generationen zu je zehn Strategien werden auf 20 Trainingswelten bewertet.
3. Der beste Trainingskandidat wird auf acht separaten Validierungs- und 24 separaten Testwelten mit Standardstrategie und Zufall verglichen.
4. Optional **Beste Strategie speichern**. Das speichert nur die vier Strategieparameter in `localStorage` unter `lernbot7.phase40.strategies.v1`.
5. **Zurücksetzen** und **Start** führen eine interaktive Simulation mit der gewählten Strategie aus.

## Grenzen

Der Algorithmus verändert vier numerische Parameter, nicht seinen JavaScript-Code. Die Bewertungsfunktion wurde von Menschen festgelegt. Die Testwelten werden nicht für die Auswahl verwendet. Es ist keine allgemeine Intelligenz. `localStorage` kann beim Löschen von Websitedaten verloren gehen.
