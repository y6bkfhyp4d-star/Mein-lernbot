# NERYX × GENESIS X — gemeinsame Forschungsintegration

Diese Integration führt die Forschungsstufen #60 bis #65 in **einem einzigen Einstiegspunkt** zusammen, ohne sie in den normalen Chat oder in die Produktion zu übernehmen.

## Bedienung
- In der NERYX-Seitenleiste auf **GENESIS X · Prüflabor** klicken.
- Die Forschungsseite unter `eval/genesis-x-integrated.html` bietet drei Schaltflächen: Qwen manuell laden, Qwen und GENESIS gemeinsam prüfen, GENESIS ohne Qwen prüfen.
- Die Auswertung gliedert sich in Originaleingabe, Qwen-Abstimmung, GENESIS-Status und **gesperrte Antwortfreigabe**.

## Architektur
1. Expliziter Nutzerauftrag mit strikt zulässigem Zahlenformat (#60, #63)
2. Numerische Originaldaten ohne Verarbeitung modellgenerierter Werte
3. Optionales Qwen-Modell für eine auf Intent begrenzte Einschätzung (#62)
4. Interner Worker mit Regel-/Mehrdeutigkeitsprüfung (#60–#61)
5. Status-basierter Qualitätsbericht (#64)
6. End-to-End-Sicherheitsregressionen (#65)

Diese Phasen sind keine eigenständigen neuen Denkfähigkeiten und keine allgemein bewiesene mathematische Lösungsmaschine.

## Sicherheits- und Rolloutgrenzen
- Kein Auto-Load des Qwen-Modells, keine API-Gebühren.
- Forschungsseite lädt nicht `app.js`; keine Speicherung durch das GENESIS-Prüflabor.
- Der gewöhnliche NERYX-Chat wird nicht automatisch über GENESIS geroutet.
- Keine ungeprüften mathematischen Antworten, `reviewOnly:true`, `publishable:false`.
- Geschützte Anwendungsmodule bleiben unverändert. `index.html` enthält nur den Link zum Labor.
- **Main und Produktionsdomain werden nicht verändert.** Eine Freigabe zur Produktion benötigt eine eigene Entscheidung und erneute Integrationstests.

## Qualitätsnachweise
Node-Regressionssuite, Chromium/WebKit-Browserintegration mit echtem Worker und synthetischer Qwen-Stimme, GitHub-Dateischutz, zusätzlicher manueller iPhone-Test der Vorschauseite.

## Offene Grenzen
Die korrekte Klassifikation durch das lokale Qwen-Modell ist nicht garantiert; bei den bisherigen iPhone-Tests gab es Falschnegativ-Ergebnisse. Der Statusbericht darf deshalb niemals als mathematischer Beweis interpretiert werden.
