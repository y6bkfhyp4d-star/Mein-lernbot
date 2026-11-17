# LernBot 7.0 – Phase 7.11

## Sinn
Eine konservative Erweiterung der funktionierenden Phase 7.10. Das System liest die **von Phase 7.7 angelegten** Recherchefragen, löst Wikipedia-Artikel über bestätigte Titel auf und erkennt zusätzliche, eng begrenzte Definitionseinleitungen und die explizite DNA-Kurzform. Es bewahrt vollständige Originalzitate und Links. Das Verfahren prüft **nicht**, ob Wikipedia sachlich stimmt.

## Installation (iPhone / GitHub Pages)
1. Alle Dateien dieses Ordners nach `evolution/phase711/` hochladen (kein zusätzlicher Unterordner).
2. Aus dem ZIP **nur die Datei** `.github/workflows/lernbot-phase711.yml` in den vorhandenen GitHub-Ordner `.github/workflows/` kopieren. Im GitHub-Dateinamenfeld nur `lernbot-phase711.yml` eingeben.
3. Unter GitHub Actions den Workflow starten. Danach `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase711/` öffnen und „Wissen laden & prüfen“ sowie „Ergebnisse kopieren“ drücken.

## Messung
Der letzte Lauf zählt die gleichen, nach Namen aufgelösten Artikel auf beiden Extraktoren. Er misst `old_extractor_same_pages`, `new_extractor_same_pages`, `topics_with_claims`, `claims`, `errors` und `unresolved_topics`. Die Gesamtstatistik der gespeicherten Datensätze ist separat. Doppelte Wiederholungen desselben Themas erhöhen nicht die eindeutige Themenzahl.

## Sicherheit
- Keine Selbstmodifikation, kein Sprachmodell, keine AGI.
- Keine automatische Freigabe als geprüfte Tatsache.
- Keine stillschweigende automatische Korrektur.
- Höchstens sechs Themen pro Lauf und konservative Satzmuster.
- Die älteren Versionen bleiben unverändert.
