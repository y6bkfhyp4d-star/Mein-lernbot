# Mein LernBot 7.0 – Phase 7.8

**Aus Recherchetreffern nachvollziehbare Faktenkandidaten gewinnen.** Diese Version baut auf den Originalmodulen der Phase 7.7 auf. Die alten Phasen bleiben unverändert. Kein kostenpflichtiger API-Schlüssel nötig.

## Installation am iPhone

1. Öffne dein Repo und gehe in `evolution/`. Erstelle dort mit **Create new file** `phase78/README.md` und Commit.
2. Entpacke die ZIP-Datei und lade **die Dateien aus `evolution/phase78/` direkt nach `evolution/phase78/`**. Kein zusätzlicher verschachtelter Ordner.
3. **Wichtig:** Die Workflow-Datei aus dem ZIP gehört **direkt** nach `.github/workflows/lernbot-phase78.yml` im Repository-Hauptverzeichnis, NEBEN `lernbot-phase70.yml`, `lernbot-phase76.yml` und `lernbot-phase77.yml`. Beim Anlegen im bereits geöffneten Ordner `.github/workflows` **nur** `lernbot-phase78.yml` als Dateinamen eingeben. Nicht `.github/workflows/` nochmals eintippen.
4. Commit, dann GitHub Actions → „LernBot 7.0 – Faktenextraktion 7.8“ → Run workflow → main → Run workflow.
5. Seite: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase78/`. Tippe „Wissen laden & prüfen“, dann „Ergebnisse kopieren“.

## Was 7.8 kann und was nicht

- Nutzt den **bestehenden** 7.7-Recherchebericht mit Suchtreffern als Eingang, analysiert bis zu drei passende Artikel pro Lauf.
- Ruft von Wikipedia nur Seiten ab, deren Titel **genau** zur gesuchten Frage passt; anderen Treffern werden keine Behauptungen zum Thema zugeschrieben.
- Erkennt sehr einfache `X ist ein/e ...`-Aussagen, speichert Originalsatz, Link, und Status **unbestätigte Quellenbehauptung**.
- Kennzeichnet Unterschiede zwischen vorheriger und neuer Extraktion als **Änderungshinweis**, nicht als bestätigte Fehlerkorrektur.
- Kein Sprachmodell, keine unabhängige Verifikation, keine vollautomatische Bewertung der Wahrheit, kein autonomes Selbst-Programmieren.
- Ältere 7.7-Suche, 7.6-Wikimedia-Prüfung, 7.0-Recherche und historische Q-Learning-Module bleiben unberührt.

## Tests

`python3 -m unittest discover -s evolution/phase78 -p 'test_research78.py'`

`node evolution/phase78/review78-test.mjs`

**Hinweis:** Erst nach einem erfolgreich ausgeführten Workflow mit aktuellen Treffern zeigt die Website neue extrahierte Aussagen an. Die mitgelieferte `research78.json` ist absichtlich leer und enthält keine erfundenen Online-Ergebnisse.
