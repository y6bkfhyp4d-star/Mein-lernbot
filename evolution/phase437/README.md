# LernBot 7.0 – Phase 4.3.7

Rauschabhängige Hybridstrategie mit Trainings-/Validierungs-/Testtrennung und kopierbaren Ergebnissen.

## Installation

Alle **9 Dateien** unmittelbar in `evolution/phase437/` hochladen. Danach `index437.html` öffnen. Keine älteren Ordner verändern.

## Dateien

- `index437.html` – Oberfläche
- `main437.js` – Tests und Kopierfunktion
- `guard437.js` – Hybridstrategie
- `guard436.js` – Vergleichsstrategie
- `guard434.js` – ursprüngliche Vergleichsstrategie
- `model.js` – Originalmodell
- `portfolio.js` – Originalportfolio
- `style437.css` – Design

Die Hybridstrategie nutzt ausschließlich gemessene Werte für ihre Alarm- und Rauschauswahl. Die unveränderten Vergleichsstrategien behalten ihre bisherige Implementierung; im alten `model.js` wird die wahre Rauschstärke bei der Alarmberechnung verwendet. Die 4.3.6-Vergleichsregel ist fest eingestellt und nicht identisch mit der früheren pro-Seed-Strategieauswahl. Die Simulation kennt die Wahrheit nur zur Erzeugung der Messungen und zur Auswertung. Keine Garantie, dass 4.3.7 besser als 4.2 ist.
