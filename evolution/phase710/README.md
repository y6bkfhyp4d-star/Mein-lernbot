# LernBot 7.0 – Phase 7.10: Gezielte Titelauflösung

## Ziel
Phase 7.9 erhielt für fünf von sechs Nachrecherchethemen `kein_passender_titel`.
Phase 7.10 fragt deshalb gezielt den **exakten Themen-Titel** der Wikipedia-API ab, statt
sich nur auf die von Phase 7.7 gelieferten Suchergebnislisten zu verlassen.

Die MediaWiki-Antwort muss den gewünschten Titel (auch mit einem Klammerzusatz) oder eine
**explizit bestätigte Weiterleitung** enthalten. Sonst wird der Titel zurückgestellt.
Das bestehende Phase-7.9-Modul prüft die Textstellen weiterhin konservativ.

### Eingaben und Ausgaben
- Input: `evolution/phase77/research77.json` (schon vorhandene Recherchefragen)
- Output: `evolution/phase710/research710.json` mit exakten Quellen, vollständigen Sätzen,
  Zuweisungsgrund, Diagnose, Änderungen, und Vergleich altes/neues Extraktionsverfahren.
- Vorläufer bleiben separat unverändert. **Keine bestätigten Sachkorrekturen** oder
  unabhängigen Wahrheitsbestätigungen.

### GitHub (iPhone)
1. Alle Dateien aus `evolution/phase710/` direkt nach `evolution/phase710/` hochladen.
2. `.github/workflows/lernbot-phase710.yml` ins **Hauptverzeichnis** unter
   `.github/workflows/` hochladen, direkt neben den alten Workflows.
3. Auf GitHub Actions `LernBot 7.0 - Titelabgleich 7.10` öffnen und **Run workflow** wählen.
4. Seite `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase710/` öffnen.
5. **Wissen laden & prüfen**, danach **Ergebnisse kopieren**.

### Tests (offline)
`python3 -m unittest discover -s evolution/phase710 -p 'test_research710.py'`

Die Wikipedia-API wird bei Ausführung des GitHub-Workflows angefragt. Ohne diesen Lauf
sind keine neuen Ergebnisse vorhanden. API-Verfügbarkeit, Wikipedia-Texte und
Erfolgsquoten werden **nicht** vorhergesagt oder erfunden. Alle Resultate sind
unbestätigte Quellenaussagen. Eine erfolgreiche Ausführung garantiert keine Treffer.
