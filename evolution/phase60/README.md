# LernBot 7.0 – Phase 6.0: Lernende Entscheidungsarchitektur

Diese Phase führt den Stand aus Phase 5.9 mit demselben Weltgenerator und derselben Mission fort. Alle Dateien liegen flach in `evolution/phase60/` und laufen als statische ES-Module auf GitHub Pages.

**Installation:** In GitHub im Ordner `evolution` die Datei `phase60/README.md` anlegen (Commit), dann alle elf Dateien aus der ZIP **direkt** in `evolution/phase60/` hochladen. Kein Unterordner `phase60/phase60/`.

**Start:** https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase60/

**Neue Aufteilung:** `agent54.js` liefert den klassischen Planer; `rl60.js` verwaltet Weltaktionen, Q-Tabelle, Training und die kurze Planungsvorschau; `decision60.js` entscheidet mit sichtbaren Sicherheits- und Erfahrungsregeln, ob eine Q-Empfehlung angenommen wird; `diagnose60.js` führt getrennte Validierungs- und Testvergleiche durch; `main.js` stellt den Bericht dar.

**Wichtig:** Ein akzeptierter Q-Vorschlag auf einem einzelnen Schritt beweist noch keine gute oder insgesamt schnellere Strategie. Der Test zeigt deshalb sowohl die experimentelle Architektur als auch das ausschließlich anhand von Validierung ausgewählte aktive Modell. Gewertet werden Erfolge und Aktionen, Fehlschläge kosten 180 Aktionen. Keine versteckten Kartendaten als Entscheidungseingabe.
