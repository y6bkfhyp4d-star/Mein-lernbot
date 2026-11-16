# Mein LernBot 7.0 – Phase 7.1: Gemeinsame Wissens- und Experimentieroberfläche

**Wichtig:** Phase 7.0 bleibt unverändert und der bestehende GitHub-Actions-Workflow läuft weiter. Phase 7.1 benötigt **keinen zusätzlichen Workflow**.

## Installation auf GitHub (iPhone)

1. Im Repository den Ordner `evolution` öffnen.
2. Wenn nötig über **Create new file** `phase71/README.md` anlegen und committen.
3. Die ZIP `lernbot-phase71-komplett.zip` entpacken. **Alle Dateien direkt nach `evolution/phase71/` hochladen (nicht `phase71/phase71/`). Auf iOS eventuell mehrere Uploads notwendig; die Struktur muss erhalten bleiben.
4. GitHub Pages öffnen: https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase71/
5. **Wissen aktualisieren** anklicken. Die Anzahl muss zu Phase 7.0 passen.
6. Optional **Experiment starten**, dann **Ergebnisse kopieren** und den Bericht teilen.

## Wo die Verbindung tatsächlich stattfindet

- `app.js` ruft zur Laufzeit `../phase70/knowledge.json` auf und zeigt die immer aktuellen Wissenseinträge, Quellen und Lernläufe.
- `knowledge71.js` stellt eine einfache Suche und einen heuristischen Textbeziehungsgraphen bereit. Quellen werden als **nicht unabhängig geprüft** gekennzeichnet. Es gibt **keine** automatische externe Verifikation.
- Die Dateien `rl62.js`, `agent54.js`, `world.js` usw. beinhalten die tatsächlich übernommenen, unveränderten JS-Simulationsmodule aus Phase 6.2, u.a. Q-Lernen (`rl62.js`), Planer (`agent54.js`), Entscheidungslogik und kontrafaktische Vergleichsmodule. Ein Vergleich von 25 Trainings- und 5/10/20 separaten Testwelten ist über die UI ausführbar. Die Q-Tabelle wird bewusst nicht anhand von Testwelten aktualisiert.
- **Grenze:** Sachwissen und Q-Labor liegen in einer gemeinsamen Oberfläche, aber der Simulations-Agent nutzt die Internetauszüge noch nicht für seine Handlungspolitik. Eine echte domänenübergreifende Repräsentation ist eine spätere Forschungsaufgabe. Das alte LernBot-6.0-localStorage und seine UI werden in 7.1 nicht automatisch migriert.

## Datensicherheit

- Keine Schreibvorgänge in Phase 7.0, keine Änderungen an bisherigen Repository-Dateien.
- Keine Zugangstoken oder kostenpflichtige APIs. Die Seite arbeitet als statische GitHub-Pages-Webseite.
- Bei `fetch`-Fehler prüfen, ob `evolution/phase70/knowledge.json` veröffentlicht ist.
- Das Wissensnetz zeigt nur Wort-/Titel-Erwähnungen, keine verifizierten Beziehungen oder kausale Schlüsse.

## Tests

`node --check app.js` und `node --check knowledge71.js`; `node smoke-test.mjs` testet Datenfilter, Wissenssuche, Beziehungsgraph und die ursprüngliche Simulationslogik. Für Browser auf iPhone nach Veröffentlichung separat testen.
