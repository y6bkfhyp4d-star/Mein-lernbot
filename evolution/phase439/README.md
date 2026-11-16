# Mein LernBot 7.0 – Phase 4.3.9

## Abschlussprüfung von Phase 4

Die Anwendung benutzt unveränderte Originalmodelle aus Phase 4.3.4 sowie die experimentellen Erkennungsregeln aus Phase 4.3.7/4.3.8 R2.

Neu ist `audit439.js`: Es führt eine **blinde** Variante der historischen 4.2-Erkennung aus, die bei Alarmentscheidungen nur geschätztes Messrauschen verwendet. Die originale 4.2-Erkennung wird separat als **nicht blinder, historischer Referenzwert** angezeigt.

### Start

Dateien direkt nach `evolution/phase439/` hochladen und diese URL öffnen:

`https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase439/index439.html`

Danach auf **Abschlusstest mit 108 Welten starten** und anschließend auf **Ergebnisse kopieren** tippen.

### Dateien

- `index439.html`, `style438.css`: Benutzeroberfläche
- `main439.js`: Start, Bericht, Kopieren und TXT
- `audit439.js`: Blindvergleich, Datenaufteilung, Sicherheitsentscheidung
- `model.js`, `portfolio.js`: historische Simulationsmodelle (unverändert)
- `reliability438.js`: experimentelle Zuverlässigkeitsregel
- `guard437.js`, `guard436.js`, `guard434.js`: ursprüngliche Regeln und Abhängigkeiten

### Methodische Grenzen

- Ein Testlauf umfasst 3 Seeds mit je 30 Trainings-, 24 Validierungs- und 36 neuen Testwelten.
- Jede Testwelt erlaubt 90 Messungen inklusive Kontrollen.
- Die simulierten Weltparameter werden nur zur Erzeugung von Messungen und für das spätere Scoring genutzt. Die neue Blindregel bekommt für Alarmentscheidungen eine aus Beobachtungen geschätzte Rauschstärke.
- Das **Portfolio selbst** wurde mit simulierten Rauschlabels trainiert. Deshalb ist der Audit fairer, aber kein vollständig unabhängiges Lernsystem.
- Die Erkennung zählt pro Welt bereits einen passenden Alarm als Erfolg, obwohl in veränderten Welten drei Schlüssel geändert werden.
- Die Strategie wird ausschließlich nach Trainings- und Validierungswerten ausgewählt. Testwerte ändern die Entscheidung nicht.
- Simulation ist keine AGI und keine autonome Veränderung von Quellcode.
