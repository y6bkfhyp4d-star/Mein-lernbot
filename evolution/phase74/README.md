# Mein LernBot – Phase 7.4: Erweiterte Faktenextraktion & Satzdiagnose

## Installation (iPhone / GitHub Pages)

1. Im GitHub-Ordner `evolution` die Datei `phase74/README.md` erstellen und committen.
2. Die **20 Dateien dieses Pakets** direkt in `evolution/phase74/` hochladen, ohne weiteren Unterordner.
3. Die ältere Phase 7.0 **nicht ersetzen**. Ihr bereits laufender GitHub-Actions-Workflow sammelt weiter Wissen.
4. Öffnen: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase74/`
5. Auf **Wissen aktualisieren → Kandidaten neu analysieren** tippen. Die neue **Satzdiagnose** steht unter den Kandidaten.
6. **Extraktion testen** zeigt den 10-Fälle-Beispieltest. Danach **Ergebnisse kopieren** und im Chat einfügen.

## Änderungen zu Phase 7.3

- Erkennt mehrere explizite deutsche Satzformen statt nur `X ist ein Y`, z. B. mit Klammerzusätzen, eingeschobenen Wendungen, `gehört zur Familie`, `bezeichnet`, definierende Nominalgruppen und `lebt im`.
- Jede Quelle wird Satz für Satz ausgewertet. Die Diagnose zeigt Anzahl und konkrete Gründe nicht erkannter Sätze.
- Vier Relationen für **Kandidaten**: `ist_ein`, `lebt_in`, `gehoert_zu`, `beschreibung`. Nur `ist_ein` und `lebt_in` gelangen nach manuell geprüfter Textstelle in das bisherige Logikmodul; eine Zugehörigkeit zu einer Familie wird nicht automatisch als transitive `ist_ein`-Relation interpretiert.
- Negationen, ungewisse Formulierungen und mehrdeutige Verknüpfungen werden bewusst nicht extrahiert.
- Kandidaten werden nie automatisch zu geprüften Tatsachen. Die Zustimmung zu einer Textstelle ist **keine unabhängige Wahrheitsbestätigung**.
- Alte Q-Learning-, Wissen-, Logik- und Simulationsmodule bleiben als Originalkopien enthalten und getrennt.

## Tests

- `node extract74-test.mjs`
- `node reasoning-test.mjs`
- `node smoke-test.mjs`

**Keine** neue GitHub-Actions-Datei. **Keine** eigene API und **kein** LLM. Nicht jede Aussage in Wikipedia kann mit diesen Regeln erkannt werden; eine leere Kandidatenliste ist weiterhin möglich. Die Satzdiagnose macht das sichtbar. Feste Ausschnitte aus Phase 7.0 (max. 1600 Zeichen je Eintrag) sind die Eingabe.
