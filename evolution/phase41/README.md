# LernBot 7.0 – Phase 4.1: Langzeit-Evolution

## Installation

Die Dateien `index.html`, `main.js`, `model.js`, `style.css` und `README.md` direkt unter `evolution/phase41/` hochladen. Keine der bisherigen Phasen ersetzen.

GitHub Pages: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase41/`

## Test

1. Seed 2027 stehen lassen.
2. Auf **8 Generationen entwickeln und testen** tippen.
3. Ergebnisse für feste und evolutionierte Strategie vergleichen, insbesondere Fehlalarme und erkannte Veränderungen.
4. Optional **Strategie dauerhaft speichern**. Der Champion wird unter `lernbot7.phase41.champion.v1` im lokalen Browser gespeichert und beim nächsten Evolutionslauf als Startkandidat benutzt.
5. Mit anderem Seed erneut prüfen. Ein gespeicherter Champion kann auf neuen Seeds schlechter sein.

## Methodik

30 Trainingswelten bestimmen die Auswahl; 12 Validierungswelten und 36 Testwelten bleiben strikt getrennt. Es werden drei Messrauschstärken (0,8 / 1,8 / 3,0) berücksichtigt. Die Population enthält pro Generation 12 Kandidaten; Eliten, Mutationen, Kreuzungen und neue Zufallskandidaten erhalten Vielfalt. Ein Archiv bewahrt bis zu acht verschiedene Trainingskandidaten. Die Bewertung minimiert den Vorhersagefehler plus Strafen für Fehlalarme und verpasste Veränderungen. Keine Codeänderung, keine externe API, keine tatsächliche allgemeine Intelligenz.

**Hinweis:** Speicherung ist auf den jeweiligen Browser und dessen Website-Speicher beschränkt. Safari-Datenlöschung kann den Champion löschen.
