# LernBot 7.0 – Phase 5.0: Intelligente Experimentierwelt

Eine **vollständig lokale** und offlinefähige JavaScript-Simulation für iPhone-Safari / GitHub Pages. Keine API, keine Anmeldung, keine externen Bibliotheken.

## Installation

Auf GitHub im vorhandenen Verzeichnis `evolution` einen Ordner `phase50` anlegen (z. B. neue Datei `phase50/README.md`). Alle sechs Dateien direkt unter `evolution/phase50/` hochladen:

- `index.html` – Oberfläche
- `style.css` – dunkles Design
- `world.js` – Welt, Handlungen, Materialien und Regeln
- `agent.js` – Agentenentscheidungen und Erkundung
- `sim.js` – reproduzierbare Simulation und Vergleich
- `main.js` – Benutzeroberfläche und Ergebnis-Kopieren
- `README.md` – Hinweise (siebte Datei)

Die Seite liegt unter `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase50/`.

## Experiment

Der Bot startet auf einer teilweise unbekannten 8×8-Karte. Er muss das Labor aufsuchen und ein weltabhängiges Herstellungsrezept erforschen. Anschließend sammelt er passende Rohstoffe, stellt in der Werkstatt ein Werkzeug her und aktiviert damit am Zielort ein Signalgerät. Die Erkundung nutzt eine Wegsuche, die blockierte Felder umgeht. Er kennt weder Rohstoffpositionen noch Hindernisse, bevor er sie entdeckt.

Der Knopf **24 Welten vergleichen** stellt den planenden Bot einer einfacheren, teils zufällig erkundenden Suchstrategie gegenüber. Beide verwenden dasselbe Aktionsbudget von 180 Schritten pro Welt und denselben Welt-Seed. Mit **Ergebnisse kopieren** kann der Bericht direkt in ChatGPT eingefügt werden.

## Grenzen

Die Programme lernen hier eine Rezeptvorgabe in ihrer jeweiligen Episode, planen mehrere Handlungen und testen bekannte Strategien. Sie sind keine allgemeine künstliche Intelligenz, schreiben keinen JavaScript-Code um und haben noch kein dauerhaftes episodisches Gedächtnis über Welten hinweg. Das wäre eine mögliche Erweiterung in Phase 5.1. Die vereinfachte Welt ist ein kontrollierbarer Entwicklungsprototyp, kein physikalisches Modell.
