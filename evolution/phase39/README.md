# LernBot 7.0 – Phase 3.9

Separate Forschungsphase unter `evolution/phase39/`. Keine Änderungen an früheren Phasen.

## Test
1. `index.html` über GitHub Pages öffnen.
2. Seed 2027, Messrauschen Normal.
3. `Trainieren und 24 Welten testen` antippen.
4. Vergleiche die feste Grenze 3,50 mit der auf 32 Trainingswelten gewählten Grenze auf 24 getrennten Testwelten.

Die Zielgröße ist MAE + 0,055 × Fehlalarme + 0,18 × verpasste Veränderungen. Sie ist eine bewusste Festlegung, keine allgemein optimale Zielfunktion. Bei anderer Gewichtung oder anderen Seeds kann ein anderer Grenzwert besser sein. Der Detektor kennt die Rauschstärke als Simulationsparameter. Es gibt keine automatische Codeänderung, kein neuronales Netz und keinen Internetzugriff.
