# GENESIS X – Phase 2: Fester synthetischer Qualitätsbenchmark

**Stand:** 22.11.2026. **Zweck:** Messung einer bewusst engen Frage: Erkennt GENESIS X, wann einfache Datenherkunft **nicht** für eine begrenzte Berichterstattung freigegeben werden darf?

## Vorab festgelegte Messung

`eval/genesis-ast/tests/quality-benchmark.test.mjs` enthält **30 feste, vor der Testausführung beschriftete Einzelfälle**:
- 8 Fälle `eligible`: syntaktisch einfache Rückgaben/Variablen ohne Aufruf, Zweig oder unbekannten Empfänger.
- 22 Fälle `review`: unter anderem `this`, `new.target`, Default-Parameter, Destructuring, Rest, Aufrufe, unbekannte Werte, Schleifen, Property-Getter/Proxy-Risiko, Mutationen und `await`, ternäre/kurzschließende Ausdrücke sowie Async-/Generator-Funktionen.

Der Evaluator berechnet TP, FP, TN, FN und berichtet Precision, Recall der eingeschränkt berichtsfähigen Fälle sowie die Erkennung manuell prüfpflichtiger Fälle. **FP = gefährlich optimistischer Bericht**: Ein vorher als `review` markierter Fall erhält unberechtigt den Status `eligible-for-limited-report`.

Die beiden Test-Schranken sind `FP = 0` für diese Beispiele und `TP >= 7` von 8, um das triviale „alles zurückhalten“ zu verhindern. Der Workflow protokolliert alle Fehlfälle. Keine Soll-Labels aufgrund des Testergebnisses anpassen; bei Fehlern den Analyzer separat korrigieren oder den Grund einer vorab beschlossenen Fehlklassifikation dokumentieren.

## Wesentliche Grenzen

**Dies ist ausdrücklich KEIN unabhängiger oder geheimer Holdout.** Die Beispiele wurden für den bekannten Analysten von derselben Entwicklungsrunde verfasst. 30 kurze künstliche Fälle beweisen weder echte Codequalität noch Security, generelle Wahrheitsprüfung oder die im Masterplan geforderte >=90%-Erkennung eines unabhängig kuratierten realen Seed-Fehlerkorpus. Die Ausgabe `eligible` ist lediglich ein begrenzter Provenienz-Bericht, niemals ein Garant für reine oder sichere Ausführung.

Der festgelegte Korpus lässt sich anhand des Git-Commits reproduzieren. Für eine unabhängige Abnahme muss eine dritte Partei reale Fehlerfälle vorab kennzeichnen und sie ohne nachträgliche Schwellenanpassung auswerten. Bis dahin bleibt **Phase 2 offen**.

**Betriebsgrenze:** Keine Ausführung der untersuchten Quelltexte, kein produktiver Code, keine WebLLM-Automation, kein GitHub-Merge, kein Vercel-Deployment.
