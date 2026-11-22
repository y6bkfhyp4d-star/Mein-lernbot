# GENESIS X – CodeAnalyzer 2.6: Kontrollfluss und Datenfluss zusammenführen

**Status:** Isolierter read-only Prüfbaustein, nicht produktiv in der iPhone-App eingebunden.

Der neue `flow-correlation.mjs` verbindet die bisher getrennten Ergebnisse von `control-flow.mjs` (2.5) und `dataflow-analyzer.mjs` (2.4), ohne analysierten Code auszuführen.

## Entscheidungspolicy
Ein Bericht mit **eingeschränkten, ausdrücklich unverbindlichen Herkunftshinweisen** entsteht nur für einfache, lineare, benannte Funktionen mit genau einer Rückgabe, ohne unbekannte Wertquellen, Kontrollfluss-/Datenflussbegrenzungen oder unmodellierte Seiteneffekte.

- `eligible-for-limited-report`: Eine einfache mögliche Wertkette darf für **menschliche Durchsicht** gezeigt werden.
- `manual-review-required`: Die Analyse kennt Grenzen (z. B. Verzweigungen, Schleifen, fremde Funktionsaufrufe oder unbekannte Variablen). Kein Herkunftsbeweis wird geliefert.
- `unavailable`: Quelltext konnte nicht verlässlich geparst werden.

**Keine Stufe erlaubt eine autonome Quellcodeänderung.** Selbst `eligible-for-limited-report` ist kein Sicherheitsurteil und beweist keine vollständige Funktionssemantik.

## Grenzen
- Keine Pfadanalyse innerhalb von `if`/Loops und keine Datenfluss-Zusammenführung an Verzweigungen.
- Keine interprozedurale Analyse, Alias- oder Property-/Heap-Analyse.
- Der bereits bestehende Datenfluss-Prototyp bildet ebenfalls nicht sämtliche Seiteneffekte ab.
- Die Verknüpfung erfolgt zunächst anhand von Funktionsnamen – gleichnamige Funktionen werden nicht sicher unterschieden. Für produktive Nutzung müssen stabile AST-Funktionsidentitäten und vollständige Scope-Prüfung ergänzt werden.
- Die neue `flow-correlation.test.mjs` wird automatisch im bereits existierenden isolierten `genesis-ast`-CI-Job ausgeführt. Die fünf bisherigen Pflichtchecks und der Branch-Schutz werden nicht verändert.

## Go/No-Go
Nur nach sechs erfolgreichen Prüfschritten, Prüfung sämtlicher PR-Dateien und bewusster menschlicher Freigabe mergen. Keine automatische Implementierung, Installation in der App, Berechtigungsänderung oder Veröffentlichung.
