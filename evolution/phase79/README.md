# Mein LernBot 7.0 – Phase 7.9

**Verbesserte Faktenextraktion mit Qualitätskontrolle.** Vollständige Originalaussagen, dokumentierte Ablehnungsgründe, direkter Vergleich mit Phase 7.8 auf **denselben frisch abgerufenen Artikeln**. Keine unabhängige Wahrheitsprüfung.

## Installation (iPhone / GitHub Pages)

1. Im Repository in `evolution` `phase79/README.md` erstellen und committen.
2. **Alle Dateien aus dem ZIP-Pfad `evolution/phase79/` direkt in `evolution/phase79/` hochladen.** Keine zweite Ebene `evolution/phase79/evolution/phase79` erstellen.
3. Separat die Workflow-Datei `.github/workflows/lernbot-phase79.yml` in den **echten** Repo-Ordner `.github/workflows` hochladen, NEBEN den anderen `.yml`-Dateien. Wird sie bei geöffnetem Workflow-Ordner erstellt, nur `lernbot-phase79.yml` als Dateinamen eingeben, nicht erneut `.github/workflows/`.
4. GitHub Actions → LernBot 7.0 - Qualitaetspruefung 7.9 → Run workflow → main → Run workflow.
5. Website `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase79/`. `Wissen laden & prüfen` → `Ergebnisse kopieren`.

## Was 7.9 leistet

- Nutzt bestehende **Phase-7.7-Recherchefragen**; alte Phasen bleiben unabhängig erhalten.
- Liest bei jedem Lauf bis zu vier genaue Themenartikel (kein Blindvertrauen in fremde Suchtreffer).
- Akzeptiert nur kurze **abgeschlossene Sätze mit Satzendzeichen** und eindeutigem Satzanfang; speichert das **volle Originalzitat**, ohne die Definition zu kürzen.
- Unterstützt `ist`, `sind`, `bezeichnet`, `beschreibt`, `umfasst`, `bedeutet` und `stellt ... dar` bei klarer Struktur.
- Blockiert erkennbar unsichere, negierte oder mehrdeutige Fälle und berichtet Ablehnungsgründe. Eine als vollständig erkannte Aussage ist noch nicht als wahr bestätigt.
- Vergleicht **7.8 und 7.9 auf denselben Seiten im selben Lauf**. Die alten Ergebnisse vom anderen Tag sind kein fairer Vergleich.
- Kein Sprachmodell, keine unabhängige Quellenverifikation, keine bestätigte autonome Sachkorrektur.

## Tests

`python3 -m unittest discover -s evolution/phase79 -p 'test_research79.py'`

`node evolution/phase79/review79-test.mjs`

Die `research79.json` ist absichtlich leer. Echte Zahlen entstehen erst im GitHub Workflow. Ältere 7.7-, 7.6-, 7.0- und Labor-Module bleiben erhalten.
