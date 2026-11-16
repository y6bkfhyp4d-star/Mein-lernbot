# Mein LernBot 7.0 – Phase 7.2: Logisches Schlussfolgern

Phase 7.2 erweitert Phase 7.1. Die Phasen 7.0 und 7.1 werden nicht verändert; der automatische GitHub-Actions-Workflow bleibt unverändert.

## Installation auf dem iPhone

1. Im Repo `Mein-lernbot` den Ordner `evolution` öffnen.
2. `phase72/README.md` über **Create new file** anlegen, wenn der Ordner noch fehlt, und committen.
3. ZIP entpacken und **sämtliche Dateien direkt nach `evolution/phase72/`** hochladen, ohne einen zweiten Unterordner anzulegen.
4. Die Webseite `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase72/` öffnen und **Wissen aktualisieren** tippen.
5. **Beispiel laden**, **Schlussfolgerungen prüfen**, **Testfragen auswerten**, **Ergebnisse kopieren**.
6. Das unveränderte Q-Labor aus 7.1 bleibt separat bedienbar.

## Neue, echte Funktionen

- `reasoning72.js`: prüft strukturierte Fakten, führt eine begrenzte `ist_ein`-Transitivität aus, erkennt direkte sowie abgeleitete Widersprüche und zeigt Ausgangsfakt-IDs als Belege.
- Vierwertige Antworten: Ja, Nein, Unbekannt und Widerspruch. `Unbekannt` ist keine Verneinung.
- `reasoning-test.mjs`: automatisierte positive, negative, unbekannte und widersprüchliche Testfälle.
- Die Benutzereingaben sind *Annahmen*, keine unabhängig verifizierten Tatsachen.
- Wikipedia-Zitate bleiben in der Phase-7.0-Datenbank als unbestätigte Quellenauszüge. Es gibt **keine automatische Freitext-zu-Fakten-Extraktion** und keine Quellenverifikation. Auch keine versprochene echte semantische Generalisierung.
- Keine Aktualisierung des alten Q-Modells anhand der neuen Fakten: Die Spielwelt und das Sachwissen sind unterschiedliche Domänen.

## Tests

Im Ordner lokal ausführen: `node reasoning-test.mjs` und `node smoke-test.mjs`. Alle JS-Dateien zusätzlich mit `node --check` prüfen. Ein GitHub Pages Browser-Test ist nach dem Hochladen erforderlich.
