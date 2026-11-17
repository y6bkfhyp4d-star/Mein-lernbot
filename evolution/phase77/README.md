# LernBot 7.0 – Phase 7.7: Gezielte Nachrecherche

Phase 7.7 übernimmt die **Originalmodule aus Phase 7.6**, nutzt das aktuelle Archiv der laufenden Phase 7.0 und ergänzt einen Nachrecherche-Agenten. Dieser sammelt nicht beliebig viele neue Texte, sondern erstellt offene Fragen und sucht gezielt **bis zu drei** ergänzende Wikipedia-Treffer pro automatischem Lauf.

## So installieren (iPhone)

1. In GitHub im Ordner `evolution` die Datei `phase77/README.md` anlegen (Commit changes).
2. **Alle Dateien aus `evolution/phase77/` im ZIP direkt in `evolution/phase77/`** hochladen. Nicht den verschachtelten ZIP-Ordner.
3. Im Repository-Hauptverzeichnis **`.github/workflows/lernbot-phase77.yml`** aus dem ZIP hochladen (oder vollständigen Inhalt in gleichnamige Datei kopieren). **Phase-7.0- und Phase-7.6-Workflows nicht verändern.**
4. GitHub → Actions → `LernBot 7.0 - Nachrecherche 7.7` → **Run workflow → main → Run workflow**.
5. Nach grünem Haken die Website öffnen: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase77/`. Nur **„Wissen laden & prüfen“ → „Ergebnisse kopieren“**.

Die Online-Recherche braucht den Workflow, nicht dein eingeschaltetes iPhone. Der automatische Zeitplan ist in UTC angegeben; die Läufe können sich verzögern. Beide vorigen Workflows laufen unabhängig weiter.

## Was der Agent wirklich macht

- Nutzt die vorhandenen Titel und Wikidata-Statusanzeigen, um einfache offene Fragen zu generieren.
- Stellt gezielte Suchanfragen an die deutsche Wikipedia und speichert Treffer, URLs und Kurztexte in `research77.json`.
- Speichert bei API-Problemen einen Fehlerstatus statt erfundener Ergebnisse; keine einzelnen Faktenbestätigungen mehr nötig.
- Die Suche findet **Recherchehinweise**, keine geprüften Antworten; keine unabhängigen Quellen, keine automatische sachliche Fehlerkorrektur.
- Das alte Q-Learning-Labor bleibt als Datei erhalten, ist jedoch nicht mit diesen Nachrecherchen trainiert.

## Tests

`python3 -m unittest discover -s evolution/phase77 -p 'test_research77.py'` und `node evolution/phase77/research77-test.mjs`; daneben die beibehaltenen Originaltests aus Phase 7.6.
