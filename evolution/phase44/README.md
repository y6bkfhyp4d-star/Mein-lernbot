# Mein LernBot 7.0 – Phase 4.4

**Stabile Abschlussversion der Phase 4**. Unabhängiger Ordner, der ältere Phasen nicht verändert.

## Installation auf GitHub (iPhone)

Im bestehenden Ordner `evolution` zuerst `phase44/README.md` anlegen; danach **alle Paketdateien direkt** nach `evolution/phase44/` hochladen. Kein zweiter Unterordner.

Website: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase44/index44.html`

Seed `2027` wählen, Test starten, **Ergebnisse kopieren** drücken und den Bericht in ChatGPT einfügen.

## Was neu ist

- Eigenschaftsgenaue Bewertung: drei geänderte Material/Aktion-Kombinationen pro veränderter Welt, jede einzeln gewertet.
- Wiederholte, zu frühe und falsche Alarme gelten ausdrücklich als Fehlalarme.
- Blind-Basis, fixer Hybrid und fünf Prüfregeln im Vergleich.
- Sicherheitsentscheidung: Experiment nur bei besseren Ergebnissen auf **Training und Validierung**. Testdaten werden nicht zur Auswahl benutzt.
- Neue Test-Seed-Bereiche, 90 Messungen je Welt inklusive Kontrollmessungen.
- Bericht direkt kopieren, JSON kopieren oder TXT speichern.

## Enthaltene Dateien

- `index44.html`: Startseite
- `main44.js`: Bedienung, Bericht, Kopier- und Exportfunktion
- `audit440.js`: Auswahl und Eigenschaftsbewertung
- `blind440.js`: blinde Referenzerkennung
- `model.js`, `portfolio.js`: originale Simulationsmodelle
- `guard437.js`, `guard436.js`, `guard434.js`, `reliability438.js`: Testregeln und Abhängigkeiten
- `style438.css`: iPhone-Design
- `package.json`: Modulkonfiguration für lokale Node-Syntax- und Simulationstests
- `README.md`: diese Anleitung

## Grenzen

Die Detektorentscheidungen nutzen geschätztes, nicht tatsächlich verborgenes Rauschen. Das Portfolio wurde historisch mit bekannten simulierten Rauschlabels trainiert. Dieselben simulierten Welttypen und Regeln wurden bereits für die Entwicklung verwendet; neue Seeds allein machen daraus noch keine unabhängige Realweltvalidierung.

Die Erkennungsquote pro Welt zählt bereits einen richtigen Alarm als Erfolg. Die neue **Eigenschaftsquote** misst zusätzlich, wie viele der drei geänderten Eigenschaften erkannt werden. Keine selbstständige Codeänderung und keine allgemeine künstliche Intelligenz.
