# LernBot 7.0 – Phase 4.3.3

Eigenständiges Experiment mit aktiver Kontrollmessung bei unsicheren Alarmen. Die Bestätigungsprüfung kostet eine reguläre Beobachtung. Das Portfolio stammt aus Phase 4.2, wird aber für jeden Seed neu trainiert. Ein zusätzlicher Mindestquotient wird ausschließlich auf separaten Trainingswelten ausgewählt und auf Validierungs- und Testwelten geprüft.

## Installation

Alle sieben Dateien direkt in `evolution/phase433/` hochladen, nicht in einen zweiten Unterordner. Start: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase433/`.

## Grenzen

Das ist ein experimenteller Algorithmus, nicht garantiert besser als Phase 4.2. Die Messsimulation kennt den wahren Weltzustand nur zur Erzeugung der Beobachtungen und zur Auswertung. Der Agent verändert seinen Quellcode nicht. Der Parameter `ratio=0` deaktiviert die Zusatzprüfung. Die Auswahl des Parameters erfolgt ausschließlich auf neuen Policy-Trainingswelten; die zuvor zur Entwicklung verwendeten Seeds sind keine unabhängige Bestätigung.
