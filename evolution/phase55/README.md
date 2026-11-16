# Mein LernBot 7.0 – Phase 5.5

## Lernen durch Versuch und Irrtum (Q-Learning)

Phase 5.5 baut direkt auf der 8×8-Experimentierwelt und den mehrstufigen Missionen aus Phase 5.4 auf. Die Dateien `world.js`, `agent54.js` und `memory52.js` wurden übernommen. Phase 5.5 besitzt ein eigenes `rl55.js` und eine neue Benutzeroberfläche.

### Neue Mechanismen

- **Q-Learning:** Der Agent lernt Zustands-Aktions-Werte für die Auswahl seiner Erkundungstaktik. Ein Zustand enthält den Missionskontext und einen Energiebereich. Aktionen werden beim Lernen über ε-greedy ausgewählt; nach neuen Beobachtungen erfolgen TD-Updates.
- **Direktes Feedback:** Jede Aktion kostet einen Schritt und Energie. Neu erkundete Felder, gesammelte Rohstoffe, erfolgreiche Forschung, Herstellung und Missionserfolg geben positive Rückmeldungen; Fehlschläge kosten Punkte.
- **Energie:** Startwert 25, Bewegung kostet 1–3, andere Aktivitäten meist 1. Bei wenig Energie legt der Agent automatisch eine Pause ein (11 Energie zurück, 1 Schritt verbraucht). Jedes Experiment nutzt höchstens 180 Aktionen inklusive Pausen.
- **Erfahrungsgedächtnis:** Q-Tabelle und beobachtete Rohstoffstatistiken werden ausschließlich lokal unter `lernbot7.phase55.q.v1` gespeichert. Persönliches Lernen und der reproduzierbare Benchmark sind getrennt.
- **Sicherheitsfreigabe:** Nach jeder Trainingsstufe entscheidet ausschließlich ein eigener Satz von 32 Validierungswelten, ob der Q-Agent mindestens 0,5 Aktionen im Mittel einspart und mindestens ebenso viele Missionen schafft wie die Basis.
- **Lernkurve:** 0, 10, 25, 50, 100 und 250 Trainingswelten gegen 100 davon getrennte Testwelten.
- **Kopieren:** Text, JSON oder TXT per Schaltfläche. Einzelweltbericht ebenfalls kopierbar.

**Wichtige Grenze:** Q-Learning steuert hier die Wahl zwischen fünf vorgegebenen Erkundungstaktiken, nicht jede einzelne Bewegungsrichtung. Die Belohnung entsteht bei den einzelnen ausgeführten Aktionen, wird aber bis zur nächsten Taktikwahl gesammelt. Eine bessere Leistung ist nicht garantiert.

## Installation (iPhone, GitHub Pages)

1. ZIP auf dem iPhone entpacken.
2. In GitHub im Ordner `evolution` mit `phase55/README.md` den neuen Ordner erstellen.
3. Alle **9** Dateien direkt nach `evolution/phase55/` hochladen. **Keine** Unterordner im neuen Ordner anlegen. Bestehende Phasen unverändert lassen.
4. Öffnen: https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase55/
5. Seed `2027` lassen, **Lernkurve testen** auswählen, dann **Ergebnisse kopieren** drücken und den Bericht in ChatGPT senden.

## Dateien

- `index.html`: mobile Oberfläche
- `style.css`: dunkles violettes Design
- `main.js`: Bedienung, Bericht, lokales Speichern und Kopieren
- `world.js`: bestehende Welt und Missionsaktionen
- `agent54.js`: vorhandene fünf Erkundungstaktiken
- `memory52.js`: frühere Rohstoffstatistiken
- `rl55.js`: Energie, Q-Learning, Training, Validierung und Test
- `package.json`: JavaScript-Modulkennung für lokale Tests
- `README.md`: diese Anleitung

Das System funktioniert offline im Browser und braucht keine API. Keine automatische Programmcodeänderung, keine allgemeine KI.
