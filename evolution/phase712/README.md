# LernBot 7.0 – Phase 7.12

Fortsetzung der bisherigen LernBot-Module. **Neu:** automatische, vorsichtige Prüfung der Quellenbehauptungen aus Phase 7.11 auf Strukturprobleme und unsichere Formulierungen. Kein semantischer Wahrheitsbeweis und keine autonomen Korrekturen.

## Bedienung
1. Im Browser `evolution/phase712/` öffnen.
2. Oben **Wissen laden & prüfen** drücken.
3. Direkt daneben oben **Ergebnisse kopieren** drücken. Kein Herunterscrollen mehr.

## Installation
In `evolution/phase712/` alle Dateien dieses Ordners hochladen. `__pycache__` nicht hochladen. Workflow-Datei `lernbot-phase712.yml` separat direkt in `.github/workflows/` speichern.

## Datenfluss
Phase 7.11 schreibt den Textbericht `research711.json` in ihrem eigenen Ordner. Phase 7.12 übernimmt den aktuellen Bericht per Workflow, wertet die Aussagen aus und schreibt `audit712.json`. Alle Aussagen bleiben Quellenbehauptungen und werden durch die Prüfung nicht zu bewiesenen Fakten.

## Einschränkungen
Der Prüfer erkennt einfache Strukturprobleme, keine logischen/inhaltlichen Widersprüche im freien Text. Die Selbsttests nutzen synthetische Beispiele. Ein grüner GitHub-Haken bedeutet technische erfolgreiche Ausführung, nicht sachliche Fehlerfreiheit.
