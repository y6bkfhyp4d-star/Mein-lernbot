# LernBot 7.0 – Phase 7.5: Automatisch und einfach lernen

## Auf dem iPhone installieren

1. Im GitHub-Ordner `evolution` die Datei `phase75/README.md` erstellen und mit **Commit changes** speichern.
2. Alle Dateien aus dem ZIP **direkt** in `evolution/phase75/` hochladen. Keine zusätzlichen Unterordner anlegen.
3. Die bestehende Phase 7.0 und ihre Datei `.github/workflows/lernbot-phase70.yml` **nicht ändern**. Sie recherchiert weiterhin über GitHub Actions.
4. Öffnen: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase75/`
5. **Wissen laden & prüfen** drücken (beim Öffnen wird dies bereits automatisch versucht). Danach **Ergebnisse kopieren** drücken und den Bericht in ChatGPT einfügen.

## Was automatisiert ist

Phase 7.5 liest `../phase70/knowledge.json` (die Ergebnisse der bestehenden GitHub Actions). Sie gewinnt mit dem originalen Phase-7.4-Extraktor einfache Faktenkandidaten, ordnet geeignete Klassifikationen **vorläufig** einer symbolischen Logik zu, berechnet transparente Schlussketten und zeigt mögliche unterschiedliche Beschreibungen. **Keine manuelle Freigabe jedes Faktenkandidaten erforderlich.** Die automatisch erzeugten Aussagen werden weder als bestätigt noch als unabhängig geprüft ausgegeben.

## Was nicht automatisiert ist

- Phase 7.5 kann nicht zuverlässig feststellen, ob Wikipedia inhaltlich recht hat. Mehrere Wikipedia-Seiten sind keine unabhängigen Quellen.
- Textmuster können semantisch falsche Kategorien erzeugen. Daher sind die Regeln für automatische Schlussfolgerungen eingeschränkt.
- Das System erkennt Fehler **nicht** von selbst als wahr oder falsch. Es zeigt Unklarheiten; ein echtes Feedback- und Korrekturverfahren muss erst entwickelt werden.
- Die früheren Q-Learning-Dateien bleiben zur Rückverfolgbarkeit im ZIP, sind aber nicht mit Wikipedia-Fakten zum Transferlernen verbunden.
- Ein geöffneter Tab führt keine Hintergrundarbeit aus. Der separate GitHub-Actions-Workflow von Phase 7.0 ist weiterhin für regelmäßige Wissenssammlung zuständig.

## Technische Tests

`node auto75-test.mjs`, `node extract74-test.mjs`, `node reasoning-test.mjs`, `node smoke-test.mjs`.
