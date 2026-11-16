
# LernBot 7.0 – Phase 4.3.4

## Intelligente Kontrollmessungen

Phase 4.3.4 entwickelt die aktive Sicherheitsprüfung aus Phase 4.3.3 weiter.

### Ziele
- Verdächtige Messungen nach Priorität bewerten
- Fehlalarme reduzieren
- Echte Veränderungen möglichst zuverlässig erkennen
- Zusätzliche Kontrollmessungen gezielt einsetzen
- Verschiedene Strategien auf unbekannten Testwelten vergleichen

### Dateien
- index434.html – Benutzeroberfläche
- main434.js – Teststeuerung und Ergebnisse
- guard434.js – Neue Kontrolllogik
- style434.css – Design

### Abhängigkeiten
- model.js
- portfolio.js

### Testverfahren
Die Simulation vergleicht verschiedene Erkennungsstrategien unter unterschiedlichen Rauschbedingungen.

Jede Testwelt hat ein begrenztes Messbudget von 90 Beobachtungen.

### Wichtig
Die Simulation arbeitet lokal im Browser und benötigt keine externe KI-API.

Der LernBot optimiert seine Entscheidungsregeln, verändert aber nicht selbstständig seinen JavaScript-Quellcode.

### Status
Phase 4.3.4 – Bereit zum Testen
