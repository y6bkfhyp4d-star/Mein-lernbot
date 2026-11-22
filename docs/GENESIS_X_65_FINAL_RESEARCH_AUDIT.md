# GENESIS X #65 – Finaler Forschungs- und Sicherheitsabschluss

Status: **Forschungsprüfung läuft**. Diese Datei dokumentiert die Prüfkriterien, keine Freigabe für die Haupt-App.

## Umfang
- Entwicklungsreihe #60–#65 mit geprüften #62–#64-Bausteinen.
- Originaleingabe und Freiwilligkeit, lokale Qwen-Absichtserkennung, GENESIS-Worker, Entscheidungs-Gate und Qualitätsbericht.
- Sechs erlaubte, streng begrenzte positive Zahlenformulierungen.
- Nur ein Zahlenpaarblock, mindestens fünf verschiedene Trainingseingaben, ein Prüfwert und begrenzte Zahlenbereiche.

## Unverhandelbare Grenzen
1. Alle verwendeten Zahlen kommen ausschließlich aus der ursprünglichen Nutzereingabe.
2. Qwen liefert nur `PRUEFEN` oder `NICHT_PRUEFEN` und niemals einen numerischen Beweis.
3. Mehrdeutige, unbelegte, ungültige und manipulierte Aufträge dürfen keine mathematische Antwort veröffentlichen.
4. Alle Statusberichte tragen `reviewOnly:true` und `publishable:false`.
5. Die Forschungsseite lädt Qwen nicht automatisch und verwendet nicht `app.js` oder den Hauptchat.
6. Kein Zugriff auf gespeicherte persönliche Daten oder automatischer Wechsel der Vercel-Produktionsdomain.

## Erforderliche technische Nachweise
- Node-Regressionstests inklusive `eval/tests/genesis-x-65-final-audit.test.mjs`.
- Chromium- und WebKit-End-to-End-Tests mit echtem Worker und **simulierten** Qwen-Abstimmungen.
- Vergleich aller Änderungen gegen den vorigen #64-Commit `b5a88b82430d986190f15ac44f9d3ec47cc8d82b`. Geschützte Haupt-App-Dateien dürfen sich nicht ändern.
- Separates, an Commit-SHA gebundenes Vercel-Preview.
- Manueller iPhone-Test mit echtem lokalen Qwen (nicht durch CI ersetzbar).

## Erwartete iPhone-Szenarien
1. Eindeutiger Auftrag: Qualitätsbericht und `Antwortfreigabe: GESPERRT`.
2. Explizit verneinter oder manipulierter Auftrag: `Originaleingabe: abgewiesen`, kein bestätigter GENESIS-Status.
3. Mehrdeutige Eingabe: keine mathematische Freigabe.

## Noch nicht nachgewiesen
- Allgemeine Zuverlässigkeit oder hohe Trefferquote des kleinen Qwen-Modells: wiederholte echte iPhone-Falschnegativ-Einstufung ist bekannt.
- Mathematische Richtigkeit einer allgemeinen GENESIS-Prognose.
- Integration der isolierten Forschungs-PRs in `main` oder Produktions-Vercel.
- Vollständige Prüfung *aller* möglichen Eingaben und Geräte.

## Entscheidungskriterium
**Forschungszyklus im Testumfang abgeschlossen**, wenn die GitHub-Jobs erfolgreich sind und der abschließende echte iPhone-Test keine Regression zeigt. Das bedeutet ausdrücklich **nicht**, dass ein Release zur Haupt-App freigegeben ist.
