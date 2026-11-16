# LernBot 7.0 – Phase 7.0: Autonomer Wissensaufbau

Kostenloser Forschungsprototyp **ohne OpenAI-API und ohne fremdes Sprachmodell**. Ein Python-Skript sammelt bis zu fünf kurze, deutschsprachige Wikipedia-Einleitungsauszüge je Lauf. Es ergänzt begrenzt neue Themen aus verlinkten Artikeln. Die GitHub-Pages-Oberfläche zeigt den Wissensstand an.

**Wichtig:** Dies ist ein automatischer Quellensammler, keine allgemeine KI. Jeder Eintrag ist ausdrücklich **nicht unabhängig überprüft**. Das System darf keine Internetinhalte als Programmanweisungen ausführen. Es verändert keine eigenen Quelldateien und lernt keine neue Sprache.

## Installation auf GitHub (Repository-Hauptverzeichnis)

Alle Pfade sind **relativ zur Repository-Wurzel**, nicht relativ zum Ordner `evolution`:

- `evolution/phase70/index.html`
- `evolution/phase70/style.css`
- `evolution/phase70/app.js`
- `evolution/phase70/knowledge.json`
- `evolution/phase70/topics.json`
- `evolution/phase70/engine.py`
- `evolution/phase70/test_engine.py`
- `evolution/phase70/README.md`
- `.github/workflows/lernbot-phase70.yml` **(muss im Repository-Stamm unter .github liegen!)**

Für die GitHub-Oberfläche auf dem iPhone: `Add file → Create new file`. Im Feld `Name your file` kannst du den ganzen Pfad wie `.github/workflows/lernbot-phase70.yml` eingeben und den Dateiinhalt aus dem ZIP kopieren. Das ZIP wird nicht automatisch entpackt, wenn du es lediglich als ZIP hochlädst.

1. Dateien wie oben einfügen und committen (Standardbranch, meist `main`).
2. GitHub → **Actions** → `LernBot 7.0 – automatisches Wissen` → **Run workflow** (erst nach dem Hochladen verfügbar).
3. Wenn der Workflow keine Änderungen pushen darf, in **Settings → Actions → General → Workflow permissions** die Berechtigung **Read and write permissions** aktivieren; bei eingeschränkten Repositories muss ggf. ein Admin die Freigabe erteilen.
4. Nach einem erfolgreichen Lauf öffne `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase70/`.
5. In der Oberfläche **Ergebnisse kopieren** tippen und den Bericht in ChatGPT einfügen.

## Lernablauf und Einschränkungen

- GitHub Actions führt den Job automatisch **viermal täglich** aus (02:17, 08:17, 14:17, 20:17 UTC). Zeiten können verzögert sein oder Läufe ausfallen. Geplante Workflows laufen nur auf dem Standardbranch; bei öffentlichen Repositories können sie nach 60 Tagen Inaktivität deaktiviert werden.
- Pro Durchlauf höchstens fünf Seiten-Anfragen; API-Zugriff kann scheitern oder eingeschränkt werden. Fehlermeldungen sind in `knowledge.json → runs` sichtbar.
- Python-Standardbibliothek, keine API-Schlüssel, kein kostenpflichtiger Dienst. Bei GitHub gelten jeweils aktuelle Nutzungslimits.
- Datenspeicherung in einem **öffentlichen Repository**: keine privaten Daten in `topics.json` hinterlegen. Automatisches Pushen setzt GitHub-Schreibrechte voraus.
- `topics.json` enthält Startthemen, `discovered_queue` enthält neue Themenvorschläge. Wissensspeicher begrenzt auf 150 Auszüge, Warteschlange auf 90 Themen, Verlauf auf 30 Läufe.
- Die Webseite selbst läuft nur bei geöffnetem Browser; die geplanten Recherchen erfolgen auf GitHub Actions.
- Quellenhinweis: Texte stammen aus der deutschsprachigen Wikipedia. Sie sind mit Original-URL gekennzeichnet; mögliche Lizenzpflichten (CC BY-SA, Namensnennung und Weitergabe unter gleichen Bedingungen) beachten. Für echte Quellenprüfung sollten später mindestens zwei unabhängige Quellen ergänzt werden.
- Erweiterungen in Phase 8.0 sollten *nur in isolierten Tests* experimentieren und Quellcodeänderungen nicht ohne Nutzerfreigabe übernehmen.

## Lokal testen

```bash
python -m unittest discover -s evolution/phase70 -p 'test_*.py' -v
python evolution/phase70/engine.py
```
