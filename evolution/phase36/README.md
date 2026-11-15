# LernBot 7.0 – Phase 3.6

Eigenständige Forschungsphase. Lade `index.html`, `main.js`, `model.js`, `style.css` direkt in `evolution/phase36/` hoch. Frühere Phasen nicht überschreiben.

## Konzept

- 15 Material/Aktions-Kombinationen.
- Ein optionaler verdeckter Wechsel nach Experiment 45 verändert zwei Kombinationen.
- Die Strategie **Hypothesenprüfung** legt bei einer unerwarteten Abweichung von mindestens 6 °C (nach mindestens zwei Messungen) eine Hypothese an und prüft genau denselben Fall ein zweites Mal.
- Stützt die zweite Messung die Abweichung, wird die alte Regel für diesen Fall zurückgesetzt. Andernfalls wird die Hypothese verworfen.
- Der Benchmark testet 12 deterministische Welten (9 verändert, 3 stabil), jeweils 120 Experimente pro Strategie.

## Grenzen

Das ist eine vereinfachte regelbasierte Simulation, keine autonome allgemeine KI. Eine wiederholte Abweichung belegt keine kausale Ursache. Die Welt enthält keine Messgeräusch-Simulation. Der Vergleich ist wegen unterschiedlicher Aktionsauswahl nicht vollständig gepaart; Ergebnisse mit verschiedenen Seeds prüfen.
