# GENESIS X – CodeAnalyzer 2.4: erste Datenfluss-Provenienz (read-only)

**Stand:** Unabhängiger, kleiner Prototyp für statische Wert-Herkunft innerhalb einer einzelnen benannten Funktion. Keine automatische Fehlerkorrektur.

## Ziel
Aus Quelltext `function f(input){ const x=input; return x; }` wird ein konservativer Bericht über `input -> x -> return`. Jede Variable wird durch eine Menge möglicher Ursprünge beschrieben. Der Bericht enthält auch Datei, Zeile und Spalte für die einzelnen Ereignisse.

## Bewusst beschränkter Analysebereich
- Nur benannte `function`-Deklarationen auf oberster Programmebene.
- Direkte Parameterbezüge, einfache Variableninitialisierungen, einfache Zuweisungen per `=` und `return`-Ausdrücke.
- Literale tragen keine abhängigen Bezeichner bei.
- Unbekannte Referenzen und Aufruf-Ergebnisse bekommen die ausdrückliche Markierung `unknown:`.
- Kontrollfluss wie `if`, Schleifen, `try` oder `switch` wird **nicht** nachverfolgt. Solche Funktionen erhalten `confidence: partial`; die Analyse darf nicht zur Verhaltensgarantie umgedeutet werden.
- Kein Scope-Schatten- oder Alias-Modell im Datenflussmodul; `eval()`, asynchrone Ereignisse, Seiteneffekte, Properties, Closures und mehrere Dateien sind nicht semantisch gesichert.

## Sicherheit
- Keine Ausführung der untersuchten Quellen (nur Acorn-Parsing).
- Keine Schreiboperationen, Netzwerk-/API-Aufrufe, Git-Commits oder Deployments durch das Datenflussmodul.
- Bestehende Analyzer 2.1, 2.2, 2.3 sowie die produktive iPhone-App werden nicht verändert.
- Der bestehende isolierte `genesis-ast`-Job wird über `npm test` um neun Datenfluss-Tests ergänzt; bestehende fünf Pflichtchecks bleiben unverändert.

## Abnahmekriterium
Alle sechs Prüfjobs grün; zuerst Schutzregeln und Funktionsgrenzen weiter prüfen, dann kontrollierter Merge nach ausdrücklicher Freigabe.

**Nächste Entwicklungsstufe:** Kontrollflussgraph mit Verzweigungen, Definition-Use-Verbindungen mit echter Scope-Auflösung, Funktionsaufrufgraph und Markierung unsicherer/unklarer Quellen. Das System soll weiterhin nicht selbst Dateien verändern.
