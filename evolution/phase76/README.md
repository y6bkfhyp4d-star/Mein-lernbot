# Mein LernBot 7.0 – Phase 7.6: Automatischer Quervergleich

**Neue Fähigkeiten:** Die Originaldaten aus Phase 7.0 werden wie bisher gelesen. Ein zweiter, optionaler GitHub-Actions-Workflow gleicht bis zu fünf Wikidata-Klassifikationen pro Lauf ab und dokumentiert Änderungen an zuvor gespeicherten Quellentexten. Die Oberfläche bleibt bewusst einfach: **Wissen laden & prüfen** und **Ergebnisse kopieren**.

## Installation auf dem iPhone

1. Im Repository im Ordner `evolution` eine Datei `phase76/README.md` anlegen (Commit changes).
2. Den Inhalt des ZIP-Ordners `evolution/phase76/` direkt nach `evolution/phase76/` hochladen. Nicht die ZIP-Datei selbst hochladen und keinen zusätzlichen Unterordner erzeugen.
3. **Neu für die Online-Überprüfung:** Im **Repository-Hauptverzeichnis** die Workflow-Datei `.github/workflows/lernbot-phase76.yml` aus dem ZIP erstellen bzw. deren Inhalt einfügen. **Die bereits funktionierende Datei `lernbot-phase70.yml` nicht ändern.**
4. Auf GitHub **Actions → LernBot 7.0 – Quellenabgleich 7.6 → Run workflow → main → Run workflow**. Ein grüner Haken bestätigt den technischen Lauf; danach `evolution/phase76/review76.json` kontrollieren.
5. Webseite öffnen: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase76/`. Auf **Wissen laden & prüfen**, danach **Ergebnisse kopieren**.

**Hinweis:** Ohne neuen Workflow funktioniert die Phase-7.5-Faktenextraktion trotzdem. Dann steht „Online-Prüfbericht vorhanden: nein“ bzw. ist das Beispiel-JSON noch leer.

## Sicherheits- und Erkenntnisgrenzen

- **Wikidata und Wikipedia sind beide Wikimedia-Projekte; es sind keine unabhängigen Quellen.** Eine passende `instance of`-Klassifikation (P31) zeigt nur begrenzte Konsistenz an, **keinen Wahrheitsbeweis**.
- Fehlende P31-Matches beweisen keinen Fehler. Die Wiki-Schnittstelle kann zeitweise ausfallen, mehrdeutig sein oder nur eine Teilklassifikation liefern.
- Ein geänderter oder entfallener Quellentext löst eine Markierung und erneute Prüfung aus; **keine eigenständig bestätigte inhaltliche Korrektur** wird behauptet.
- GitHub Actions kann verzögert werden; die geplanten Zeiten sind UTC. Der Workflow kann außerdem manuell gestartet werden.
- Die Q-Learning- und Simulationsmodule aus alten Phasen sind als Originale enthalten, aber sie lernen nicht aus den Internetfakten. Kein Sprachmodell, keine AGI, keine unkontrollierte Codeänderung.

## Tests

`python3 -m unittest -v test_check76.py` (ohne Internet), `node review76-test.mjs`, `node auto75-test.mjs`, `node extract74-test.mjs`, `node reasoning-test.mjs`, `node smoke-test.mjs`. JavaScript-Syntax lässt sich mit `node --check DATEI.js` prüfen.
