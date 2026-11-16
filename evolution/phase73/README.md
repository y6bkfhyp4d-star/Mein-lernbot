# Mein LernBot 7.0 – Phase 7.3: Faktenkandidaten und Quellenprüfung

Phase 7.3 ergänzt 7.2 um **konservative Extraktion** von titelbezogenen `ist_ein`-Aussagen aus den automatisch durch Phase 7.0 gespeicherten Wikipedia-Auszügen. Die bisherigen Versionen und der GitHub-Actions-Workflow werden **nicht verändert**.

## Installation am iPhone

1. GitHub-Repository `Mein-lernbot`, Ordner `evolution` öffnen.
2. Falls nötig den Unterordner mit `phase73/README.md` unter **Create new file** anlegen und committen.
3. **Alle 18 Dateien** aus diesem ZIP direkt in `evolution/phase73/` hochladen. Nicht in einen zusätzlichen Unterordner hochladen.
4. Die Website öffnen: https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase73/
5. Auf **Wissen aktualisieren**, dann auf **Kandidaten neu analysieren** tippen.
6. Jeden Kandidaten mit Originalsatz und Wikipedia-Link prüfen. Nur für die symbolische Logik geeignete Kandidaten mit **Textstelle geprüft – für Logik zulassen** markieren.
7. **Manuell geprüfte Aussagen ableiten**, danach **Ergebnisse kopieren**.

## Was das Modul macht

- `extract73.js` erkennt eng gefasste Sätze wie „Das Okapi ist ein Säugetier“ anhand des Artikel-Titels und der Form „ist/war ein(e)“. Formulierungen mit erkennbaren Verneinungen oder Unsicherheitswörtern werden nicht als positive Fakten extrahiert.
- Jedes Ergebnis hat einen Quellennachweis (Artikel-URL, Originalsatz, Erkennungsmuster) und beginnt als **Kandidat**, nicht als bestätigter Fakt.
- Eingestufte Kandidaten (`manuell_geprueft`, `verworfen`) bleiben **nur im Browser-localStorage** erhalten. Diese Entscheidung ist eine Textprüfung, keine unabhängige Faktenermittlung.
- Nur manuell zugelassene Kandidaten werden an das symbolische Logikmodul aus Phase 7.2 übergeben. Schlussfolgerungen erben den unsicheren Status ihrer Prämissen.
- Unterschiedliche Beschreibungen werden angezeigt, ohne sie vorschnell als formale Widersprüche zu behandeln.
- Die Q-Learning-Simulation aus Phase 6.2 läuft weiterhin **getrennt** und verwendet diese Sachinformationen nicht zur Navigation.

## Grenzen

Das System kann aus unstrukturierten deutschen Wikipedia-Artikeln **keine beliebigen Beziehungen** herauslesen. Lange oder komplexe Sätze, Pronomen, Synonyme und semantische Bedeutung werden nicht zuverlässig verstanden. Auch zwei Wikipedia-Artikel sind keine zwei unabhängigen Quellen. **Keine automatische unabhängige Verifikation, kein Sprachmodell, keine AGI, keine automatische Codeänderung.**

Die Phasen-7.0-Datenbank wird dynamisch über `../phase70/knowledge.json` gelesen. Die Testergebnisse hängen daher von den tatsächlich vorhandenen Auszügen ab. Es gibt keine Garantie, dass bei 10 Einträgen ein Kandidat mit diesen engen Mustern gefunden wird.

## Lokale Funktionstests

Im entpackten Ordner mit Node.js ausführen:

```sh
node extract-test.mjs
node reasoning-test.mjs
node smoke-test.mjs
node --check app.js
```

Das ZIP selbst enthält keine GitHub-Workflow-Datei. Der bestehende Workflow aus Phase 7.0 bleibt aktiv.
