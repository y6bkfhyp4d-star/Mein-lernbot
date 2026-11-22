# GENESIS X 1.0 — mehrstufige Programme und Mehrdeutigkeits-Gate

**22. November 2026 · Forschungs-Draft nach PR #51 · keine Live-Veröffentlichung**

## Ausgangslage

GENESIS X Composer 0.2 wählt das **erste** deklarative Programm, das auf den gegebenen Trainings- und Validierungszeilen ausreichend gut passt. Es betrachtet **nicht** automatisch alle Alternativprogramme und erklärt einen ausgewählten Kandidaten daher nicht als eindeutig. Deshalb prüfen wir im externen Audit zwei Fragen:

1. Lässt sich mit **zwei Schritten** eine zusammengesetzte Rechenfunktion finden, die auch an zuvor nicht vorgelegten Probe-Eingaben stimmt?
2. Wenn **mehrere** zulässige Programme die gegebenen Daten ungefähr erklären, aber bei neuen Eingaben **verschiedene Vorhersagen** machen, erkennt ein separates Gate diese Mehrdeutigkeit und verhindert vorschnelle Antwortfreigabe?

## Implementierter Test

- `eval/genesis-x-multistep-oracle.mjs`: unabhängige Testimplementierung aller 6 bekannten Einzelschritt-Operatoren, ausführbare Zwei-Schritt-Programme und begrenzte Enumeration für eine **separate** Prüfung möglicher Alternativen. Keine GENESIS-X-Imports.
- `eval/genesis-x-multistep-ambiguity-audit.mjs`: lädt nur den bestehenden `genesis-x-tools.js`-Composer in einen Node-VM-Kontext ohne Zugriff auf lokale Nutzerdaten, Netz oder DOM. Zwei Aufgaben: `x² + 2` und `3x + 2`, jeweils 3 Trainings- und 2 Validierungsbeispiele. Die zusätzlichen 3 Probe-Sollwerte je Aufgabe bleiben außerhalb der Forschungs-VM.
- Das separate Gate sucht auch nach anderen zulässigen Programmen (1–2 Schritte, Konstanten 0, 1, 2, 3). Stimmen mehrere im angegebenen numerischen Toleranzfenster überein, bewertet es die **Funktionsergebnisse bei separat definierten Eingaben**, nicht nur verschiedene Quellcode-Kombinationen.
- Ein absichtlich unterbestimmter Fall mit sehr eng gruppierten x-Werten nahe 0 lässt `x+2` und die konstante 2 innerhalb der verwendeten Toleranz ähnlich aussehen, obwohl sie bei x=10 verschiedene Werte liefern. Erwartet wird `ambiguous`, **nicht** Antwortfreigabe. **Wichtig:** Dieser Status stammt vom *externen Evaluations-Gate*, nicht vom bisherigen GENESIS-X-Composer selbst. Der ursprüngliche Composer liefert bei diesem Fall weiterhin einen `candidate`.
- Neue Unit-Tests prüfen die getrennte Nachrechnung, Operatorgrenzen, zwei-Schritt-Kandidaten sowie die Erkennung von mehrdeutigen Daten.

Alle erzeugten Prüfberichte enthalten lediglich aggregierte Status-/Zählerangaben und `publishable:false`. Die Rohprogramme, Vorhersagen und Sollwerte werden nicht an die NERYX-Haupt-App übermittelt.

## Grenzen und nächste Schritte

Dies misst **begrenzte zweistufige Rechenprogramme**, nicht freie Problemfindung, neue Operatoren oder allgemeine KI. Sowohl Trainingsdaten als auch Referenzprüfungen sind öffentlich und synthetisch; es ist **kein** geheimer Frozen-Test. Die externe Ambiguitätsprüfung ist noch nicht über den produktiven Worker-Client integriert; sie ist ein **Testschutz**, keine behauptete neue Fähigkeit des Hauptchats.

Eine spätere reale Integration sollte ein echtes Nichtwissen-Statussignal in einer vereinheitlichten, geprüften Schnittstelle einbauen, bevor irgendwelche Kandidatendaten veröffentlicht werden. Dazu wären zusätzliche Sicherheits-/iPhone-Tests nötig.

**Nicht nach `main` mergen, keine produktive Vercel-Veröffentlichung ohne ausdrückliche Nutzerfreigabe.**

## CI-Nachweis vom 22.11.2026

[GitHub Actions #45014370044](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45014370044) hat **alle drei Jobs erfolgreich abgeschlossen**.

- Zwei zusammengesetzte Regeln (`x²+2` und `3x+2`) wurden als Programme mit **exakt zwei Schritten** ausgewählt und auf **6/6 bislang nicht vorgelegten Probe-Eingaben** unabhängig nachgerechnet.
- Der absichtlich unterbestimmte Datensatz führte beim bisherigen GENESIS-X-Composer zu `candidate`, beim separaten Ambiguitäts-Gate dagegen zu **`ambiguous`**: **21** passende Programme, die auf den Probe-Eingaben **8** verschiedene Ergebnisverläufe erzeugten. Keine Freigabe (`publishable:false`).
- Vorheriger Regel-Unterscheidungstest (#51) erneut erfolgreich.
- Vollständige NERYX-/GENESIS-X-Node-Regression **616/616 bestanden**.
- App-, Forschungsmodul-, Service-Worker- und Frozen-Schutzprüfung bestanden.

**Grenze:** Die entscheidende Mehrdeutigkeitsbehandlung existiert derzeit nur im **externen Test-Gate**. Sie ist noch nicht in die reguläre GENESIS-X-Worker-Schnittstelle oder den NERYX-Live-Chat integriert. Die Probe-Eingaben sind öffentliche künstliche Aufgaben, keine unabhängige Sealed-Evaluation.
