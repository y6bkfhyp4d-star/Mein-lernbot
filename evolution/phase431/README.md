# Mein LernBot 7.0 – Phase 4.3.1

## Was wurde repariert?

Phase 4.3 vergrößerte die Erkennungsschwelle künstlich, wodurch viele echte Änderungen übersehen wurden. Phase 4.3.1 stellt die nachweislich besser funktionierende Entscheidungslogik aus Phase 4.2 wieder her und protokolliert schwache Bestätigungen, ohne die Entscheidungen zu verändern.

**Erwartung:** Die Kennzahlen von Phase 4.3.1 und Phase 4.2 müssen im gleichen Test übereinstimmen. Das ist eine Sicherheitsreparatur, noch keine Leistungssteigerung. Erst danach sollen einzelne Bestätigungsregeln auf separaten Testwelten geprüft werden.

## Installation auf GitHub (iPhone)

Im Repo `Mein-lernbot` im Ordner `evolution` einen neuen Ordner `phase431` anlegen. Die sieben Dateien aus diesem ZIP-Ordner `phase431` direkt unter `evolution/phase431/` hochladen. Alte Phasen nicht löschen.

Website: https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase431/

Die Testwelten dienen nur zur Bewertung. Die Entscheidung verwendet keine wahren Änderungszeiten oder betroffenen Schlüssel. Die bestehende Phase-4.2-Basislogik verwendet bei der internen Messwertverarbeitung weiterhin `w.noise` aus der Simulation; das ist eine bekannte methodische Grenze, die in einer späteren Version getrennt behoben werden sollte.
