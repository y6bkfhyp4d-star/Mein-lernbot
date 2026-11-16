# LernBot 7.0 – Phase 4.3.8 R2 (überarbeitet)

Diese Version prüft neue Regeln erst auf **30 Trainings-** und **24 Validierungswelten** pro Durchlauf. Nur wenn sie gegenüber der Basis die geforderten Grenzen erreichen, wird die neue Regel für den anschließenden Test ausgewählt. Sonst bleibt die historische Basismethode aktiv. Der Test besteht aus **36 weiteren Welten pro Durchlauf**, drei Durchläufen und damit **108 Testwelten insgesamt**. Alle 90 Messungen je Welt zählen zum Budget.

## Installation auf dem iPhone

Alle 11 Dateien dieses Pakets flach in `evolution/phase438/` auf GitHub hochladen, einschließlich `index438.html`. Es darf kein zusätzlicher Unterordner entstehen. Die älteren Phasen werden nicht verändert.

Startlink: https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase438/index438.html

Auf **Training & 108 Testwelten starten** tippen; danach **Ergebnisse kopieren**, **JSON kopieren** oder **TXT speichern** verwenden.

## Wichtige Hinweise

- `model.js` und `portfolio.js` stammen unverändert aus dem früheren Projekt. Die historisch vorhandene Funktion `step()` in `model.js` benutzt das tatsächliche Simulationsrauschen für ihre Entscheidung. Darum ist die Basis keine vollständig verblindete Erkennung und ihr Vergleich zu neuen Methoden hat diese Einschränkung.
- Die neue Erkennungslogik verwendet Messungen zur Schätzung des Rauschens. Die simulierte Wahrheit wird nur zum Erzeugen und Bewerten der Messwerte verwendet.
- Die Sicherheitsauswahl kann bei unbekannten Welten weiterhin schlechter abschneiden: Validierung bietet keine Garantie.
- Die Testmetrik „erkannt“ bewertet mindestens eine korrekt erkannte Änderung **pro Welt**, nicht alle drei veränderten Materialeigenschaften.
- Die Rechenläufe sind deterministisch; die Testwelten werden nicht zur Auswahl der Prüfregel verwendet.
- Dies ist eine Simulation und keine selbstständig ihren Programmcode verändernde KI.
