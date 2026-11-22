# GENESIS X 1.0 – Unterschiedliche Rechenregeln und sicheres Nichtwissen

**22.11.2026 · Forschungszweig nach PR #50 · keine Live-Integration**

## Zweck

Die vorherigen Tests (#49–50) fanden bei bekannten Beispielen zu `y=x+2` und `y>b` richtige Resultate. Diese nächste Prüfung soll eine andere Eigenschaft testen: Kann der bereits existierende begrenzte numerische Composer **verschiedene** Regeln aus getrennten Beispielen unterscheiden und bei einer Aufgabe **ohne passende Regel** nicht einfach irgendetwas behaupten?

## Exakt geprüfte Behauptungen

- Vier klar unterschiedliche Ein-Schritt-Funktionen: `x+2`, `3*x`, `x*x`, `-x`.
- Je drei Trainingsdaten, zwei Validierungswerte und drei **außerhalb der Trainings-/Validierungspunkte** gehaltene Probeeingaben; **12 unabhängige Ausführungskontrollen**.
- Das ausgewählte deklarative Programm wird **außerhalb des GENESIS-X-Codes** durch einen separaten einfachen Operator-Interpreter nachgerechnet. Die Probe-Sollwerte werden dem Composer nicht übergeben.
- Zwei explizite Negativkontrollen: `x^3` bei `maxSteps:1` (nicht durch einen erlaubten Einzelschritt darstellbar) und eine zu einer linearen Regel widersprüchliche Validierungszeile. Erwartet wird jeweils `unconfirmed` und `selected:null` – also **kein erfundener Kandidat**.
- Die Tests kontrollieren zusätzlich fehlgeformte Programme, Division durch Null, unzulässige Operatoren und die Trennung von Probe-Sollwerten.

**Technische Abgrenzung:** Die Schwierigkeit wird absichtlich auf vorab definierte Operatoren (`add`, `subtract`, `multiply`, `divide`, `square`, `negate`) und `maxSteps:1` begrenzt. Das System darf über mehrere Schritte größere Ausdrücke herstellen, aber dieses Experiment misst ausdrücklich nur die eingegrenzte Ein-Schritt-Suche. Es gibt keine Aussage über neue mathematische Operationen, Sprachverständnis, autonomes Lernen oder beliebige Logikprobleme.

## Ausführung

- `eval/genesis-x-rule-challenges.mjs`: statische öffentlich prüfbare Szenarien und externer Interpreter.
- `eval/genesis-x-rule-discrimination.mjs`: lädt original `modules/genesis-x-tools.js` in einen separaten Node-VM-Kontext mit blockierten Speicher-/Netzwerkzugriffen und vergleicht gezielt die einzelnen Resultate und Negativkontrollen.
- `eval/tests/genesis-x-rule-discrimination.test.mjs`: zusätzliche Unit-Tests der Trennung von Trainings-/Probe-Eingaben und des externen Interpreters.
- GitHub Actions: Regeltest, vorheriges #50-Gegenproben-Audit, gesamte Regression und Schutzprüfung der Produktions- und Moduldaten.

Alle Forschungsausgaben sind **nur Prüfmetriken**, `publishable:false`. Die Quelle enthält keine geheimen Frozen-Aufgaben und ist kein unabhängiger Blindbenchmark.

## Freigabegrenze

**Selbst vollständig erfolgreiche Tests erlauben keine Live-Veröffentlichung.** `main`, Produkt-`app.js`, `index.html`, `sw.js`, GENESIS-X-Module und Frozen bleiben unverändert. Kein Zugriff auf iPhone-Speicher, kein Vercel-Deployment, keine Verknüpfung zum Live-Chat.

## Tatsächliche CI-Ergebnisse (22.11.2026)

[GitHub Actions #45014000273](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45014000273) — **alle drei Jobs erfolgreich**.

- **Vier verschiedene Rechenregeln erkannt:** `x+2`, `3*x`, `x*x` und `-x`, jeweils **3/3** bisher nicht als Trainings-/Validierungsbeispiele verwendete Proben korrekt. Insgesamt **12/12** Probe-Ausgaben passend.
- **Zwei Nichtwissen-Fälle korrekt behandelt:** kubische Regel bei auf einen Einzelschritt begrenzten Operatoren und widersprüchliche Validierungsdaten; jeweils `unconfirmed` und kein ausgewählter Kandidat.
- Wiederholung der PR-#50-Gegenproben: **30/30** passend.
- Gesamter Node-Regressionstestbestand: **610/610** bestanden, keine Fehlschläge.
- Geschützte produktive Dateien und Forschungs-Module unverändert.

**Grenze:** Dies ist eine synthetische, öffentlich bekannte Ein-Schritt-Aufgabenfamilie, keine unabhängige versteckte Blindprüfung. Es wurde kein generelles eigenständiges Entdecken völlig neuer Operatoren und keine offene Problemlösefähigkeit nachgewiesen.
