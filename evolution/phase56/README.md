# Mein LernBot 7.0 – Phase 5.6

## Q-Learning mit einzelnen Aktionsentscheidungen

Diese Phase baut direkt auf der virtuellen Welt von Phase 5.5 auf. Der Agent kann im Q-Modus die Empfehlung eines bestehenden Basisplaners übernehmen oder stattdessen eine der vier Richtungen wählen beziehungsweise bei Bedarf pausieren. Q-Werte werden nach **jedem ausgeführten Schritt** auf Basis beobachtbarer Rückmeldungen aktualisiert. Die KI liest keine nicht entdeckten Felder für ihre Entscheidungen.

## Enthaltene Dateien

- `index.html` – Weboberfläche
- `style.css` – iPhone-freundliches Design
- `main.js` – Bedienung, Testlauf, Copy/JSON/TXT
- `rl56.js` – Q-Lernen und Auswertung
- `world.js` – Originalwelt und Missionsmechanik aus Phase 5.5
- `agent54.js` – bestehender Planer als sichere Handlungsempfehlung
- `memory52.js` – erlernte Rohstoffstatistiken
- `package.json` – JavaScript-Module
- `README.md` – diese Anleitung

## Installation auf GitHub

1. Im Repository im Verzeichnis `evolution` eine Datei namens `phase56/README.md` erstellen und speichern. Dadurch entsteht `phase56`.
2. Alle neun Dateien aus der ZIP **direkt in `evolution/phase56/`** hochladen. Keine weitere Ordnerebene erzeugen.
3. Öffnen: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase56/`.
4. Seed 2027 beibehalten, **Lernkurve testen** wählen, dann **Ergebnisse kopieren** und den Bericht in ChatGPT einfügen.

## Testmethode

- Trainingswelten: 0, 25, 50, 100, 250, 500
- 32 getrennte Validierungswelten pro Testphase, 100 Testwelten
- Je Welt maximal 180 Aktionen, inklusive Ruhepausen
- Der gelernte Agent wird nur freigegeben, wenn er auf den Validierungswelten mindestens gleich viele Missionen löst und im Mittel 0,4 Aktionen spart.
- Testwelten haben keinen Einfluss auf die Freigabe.
- Das persönliche Gedächtnis wird separat gespeichert und beeinflusst den reproduzierbaren Vergleich nicht.

**Grenzen:** Das Q-Learning wählt freie Richtungen, aber nutzt den bisherigen Planer als Referenz. Die Strategie muss deshalb nicht besser als dieser Planer sein. Die Missionen stammen aus demselben Generator wie vorherige Phasen. Erfolge auf diesen Welten belegen keine allgemeine KI und keine autonome Änderung des Quellcodes.
