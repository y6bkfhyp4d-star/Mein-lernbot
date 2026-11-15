# LernBot 7.0 – Phase 3.5

Eigenständige Browser-Simulation mit unbekanntem Wechselzeitpunkt und teilweise stabilen Welten. Keine Änderungen an Phase 3.4 oder LernBot 6.0.

## Installation

Vier Dateien (`index.html`, `main.js`, `model.js`, `style.css`) direkt in `evolution/phase35/` auf GitHub hochladen. `README.md` ist optional.

## Versuch

Seed 2027, Strategie „Fehlergesteuert + Detektor“, Start. Die Simulation läuft maximal 110 Schritte. Mit „12 Welten vergleichen“ wird ein deterministischer Benchmark gestartet. Für andere Resultate Seed ändern.

## Methodische Grenzen

Der Bot sieht nur einzelne Messungen. Der Auswertungsfehler über alle 15 Kombinationen ist nur für die UI/den Benchmark. Der Detektor erhält keinen Wechselzeitpunkt. Die Welt ist künstlich und folgt einfachen linearen Regeln. Der Benchmark enthält neun veränderte und drei stabile Welten. „Eingefroren“ nutzt den tatsächlichen Wechselzeitpunkt als Kontrollbedingung und ist keine realistische Agentenstrategie. Die 12 Welten sind nicht statistisch unabhängig im strengen Sinn. Alarmmeldungen können falsch sein oder ausbleiben.
