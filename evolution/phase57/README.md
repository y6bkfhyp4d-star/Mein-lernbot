# LernBot 7.0 – Phase 5.7

Stabilisiertes Q-Learning: vereinfachte Zustände, überarbeitetes Belohnungssystem und gespeicherte Trainings-Checkpoints.

## Installation
Alle neun Dateien in `evolution/phase57/` legen. Anschließend `index.html` über GitHub Pages öffnen.

## Test
Seed `2027` lassen und „Lernkurve testen“ tippen. Über „Ergebnisse kopieren“ den Bericht übernehmen.

## Bewertung
Die Modelle nach 0, 25, 50, 100, 250 und 500 Trainingswelten werden ausschließlich auf getrennten Validierungswelten zur Freigabe geprüft. Bestes zugelassenes Checkpoint wird erst danach auf 100 Testwelten ausgewertet. Kein Testwelten-Leak in die Auswahl. Gleichbleibender Missionsgenerator aus Phase 5.6.

## Grenzen
Nur lokale JavaScript-Simulation, kein allgemeines KI-System. Ein größerer Speicher oder zusätzliche Q-Updates garantieren keinen Vorteil. Die persönliche Gedächtnisfunktion bleibt getrennt vom Vergleich.
