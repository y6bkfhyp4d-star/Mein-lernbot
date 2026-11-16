# LernBot 7.0 – Phase 6.1: Prüfbare Entscheidungen

Diese Phase übernimmt den **Weltgenerator, die Mission und das Training aus Phase 6.0**. Ziel ist **Messqualität**, nicht ein behaupteter Leistungssprung.

## GitHub Pages Installation

Im Repository in `evolution` die Datei `phase61/README.md` anlegen, committen, danach **alle elf Dateien** dieses ZIP direkt in `evolution/phase61/` hochladen. `index.html` muss direkt im Ordner liegen.

Website: https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase61/

## Neu

- Q-Vorschläge = angenommene + abgelehnte Vorschläge, geprüft je Checkpoint und im finalen Test.
- Annahme wird getrennt ausgewiesen als **identische physische Bewegung** (Q-Alias zum Basisweg) oder **wirkliche Richtungsabweichung**.
- Kandidatenwahl, Q-Follow-Wert, Q-Alternativwert, Abstand, Trainingsbesuche und Ablehnungsgrund stehen im Bericht.
- Gegenprobe für ausgewählte Entscheidungen: Basisaktion und Alternativaktion auf **vollständig getrennten Kopien desselben Startzustands**. Nur die unmittelbare Wirkung (Position, Kosten, Beobachtung) wird gemessen – kein behaupteter langfristiger Ursacheffekt. Die Gegenprobe wird **nicht** von der Politik gelesen und beeinflusst keine Entscheidung.
- Der auffällige Checkpoint 250 hat einen eigenen Bilanzabschnitt.

## Methodik

32 Validierungswelten, 100 getrennte Testwelten bei Standardwerten, Seed 2027. Auswahl nur anhand Validierung. Der Simulator kennt die vollständige Welt; das Planungs- und Lernsystem benutzt nur den bereits bekannten Ausschnitt. Die zusätzliche Gegenprobe erfolgt ausschließlich nach der Aktionswahl in separater Diagnosekopie. Ein gutes lokales Ergebnis ist kein Beweis für allgemeine Intelligenz.
