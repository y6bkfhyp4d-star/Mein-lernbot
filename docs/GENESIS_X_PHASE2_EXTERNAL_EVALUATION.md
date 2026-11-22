# GENESIS X – Externe Qualitätsabnahme (Vorbereitung)

**Status:** Der getrennte Evaluator ist implementiert, ein unabhängig erstelltes und vorab versiegeltes Holdout-Korpus liegt noch **nicht** vor. Phase 2 bleibt offen.

## Zweck

`eval/genesis-ast/evaluate-external.mjs` bewertet die bestehende, stark begrenzte GENESIS-X-Klassifikation: `eligible-for-limited-report` gegenüber `manual-review-required`. Die Bewertung liefert TP, FP, TN, FN, Precision, Recall, Erkennung der Review-Fälle und Accuracy. Sie misst **keine echten Sicherheitslücken** oder allgemeine Korrektheit.

## Datenformat

Als externe JSON-Datei, **außerhalb des Git-Repositories**:

```json
{
  "schema": 1,
  "cases": [
    {"id": "case_001", "expected": "eligible", "source": "function f(x){return x;}"},
    {"id": "case_002", "expected": "review", "source": "function f(x){return this.x;}"}
  ]
}
```

Ein Fall enthält genau `id`, `expected` und `source`. Erlaubte erwartete Klassen sind `eligible` und `review`. Maximal 500 Fälle mit bis zu 10.000 Zeichen Quelltext pro Fall und insgesamt 2 MB Eingabedatei.

Ausführung im Klon des Projekts (nach Installieren der isolierten Abhängigkeiten):

```sh
node eval/genesis-ast/evaluate-external.mjs /absolute/path/to/external-benchmark.json
```

Die Datei wird nur gelesen; ihr SHA-256-Hash wird zur Auswertung geschrieben. Der Runner gibt lediglich zusammengefasste Kennzahlen und IDs von Parse-/Analyseproblemen aus; den Quelltext druckt er nicht. Parse-/Analysefehler werden vorsichtshalber als `review` gezählt **und separat dokumentiert**. Für unabhängige Abnahme muss eine ausreichend große Zahl valider Fälle vorliegen; fehlerhafte Eingaben sind nicht als Sicherheitsleistung zu zählen.

## Unabhängigkeitsregeln und Freigabegrenzen

1. Den Korpus durch eine von der Implementierung unabhängige Person oder Stelle erstellen und die Erwartungslabels **vor** der ersten Ausführung fixieren. Entstehung, Labels, SHA-256-Hash, Thema und Umfang dokumentieren.
2. Kein Code, der von einem getesteten Modell selbst erzeugt und beschriftet wurde, als unabhängige Ground Truth behandeln.
3. Verschiedene Aufgabenfamilien, auch irreführende Positiv- und Negativfälle, doppelte Namen, Closure-, Getter-, Nebenwirkungs-, Alias-, Kontrollfluss- und Async-Konstrukte berücksichtigen.
4. Ergebnisse und negative Fälle unverändert berichten, nicht nachträglich die Erwartungsschilder anpassen. Korpus nicht für wiederholte Optimierung verbrauchen; Entwicklungsfälle und späteren Holdout trennen.
5. `eligible` bedeutet nur begrenzte Provenienz, niemals Laufzeitsicherheit, semantische Vollständigkeit oder die Erlaubnis zum automatischen Editieren.
6. Die im Masterplan geforderte >=90%-Qualität muss an einer **separat definierten, fachlich passenden Fehlerzielgröße** belegt werden. Die Kennzahlen dieses Evaluators sind kein Ersatz für allgemeine Codefehlererkennung.
7. Kein Schreibrecht des Evaluators auf `main`, Deployment oder Source-Dateien, kein Laden des geprüften Codes.

**Nächster Abnahmeschritt:** Dritten Korpus unabhängig erstellen, versiegeln, einmal blind auswerten, Fehler transparent prüfen. Bis dahin kein Merge allein wegen 30/30 synthetisch grüner Beispiele und keine Aktivierung autonomer Patches.
