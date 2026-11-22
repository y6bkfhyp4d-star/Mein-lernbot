# GENESIS X – Phase 2: Befundmodell 2.7 (read-only)

**Stand:** 22.11.2026. Implementierung: `eval/genesis-ast/finding-report.mjs`; Tests: `eval/genesis-ast/tests/finding-report.test.mjs`.

## Funktion und Vertrag

`createFindingReport(file,source,{gitSha:null})` verwendet die bereits vorhandenen echten AST-Regeln aus `analyzer.mjs` (etwa `AST000` Syntax, `AST001` eval-Aufruf und `SEC001` mögliche Private-Key-Signatur). Es gibt deterministisches JSON zurück mit:

- `schemaVersion`, `analyzer`, `analyzerVersion`, `mode`, `changesApplied`
- `source.file`, `source.sha256`, `source.bytes`, `source.gitSha` (optional, **nicht automatisch verifiziert**)
- `findings[]` mit `id`, `ruleId`, `severity`, `file`, `line`, `column`, `message`, `evidence`, `confidence`, `falsePositiveClass`, `suggestion`, `verification`
- `summary.total`, `summary.bySeverity` und ausdrücklichen Grenzen.

Ein AST-Treffer ist **nur ein potenzieller Befund**, keine bestätigte Code-Sicherheitslücke. `verification` steht stets auf `manual-review-required`. Die SHA-256-Prüfsumme bindet die Analyse an genau den bereitgestellten UTF-8-Quelltext, `gitSha` ist dagegen nur eine vom Aufrufer angegebene Referenz: Der Bericht behauptet **nicht**, Git-Inhalte anhand dieser SHA ausgelesen zu haben.

## Begrenzte Abnahme

Die Tests prüfen reale AST-Regelfunde, Source-SHA, explizite Syntaxfehler, deterministische Gleichheit, fehlende Quellcodeausführung, Eingabevalidierung und ehrliche False-Positive-Klassen. Es werden keinerlei Quelldateien verändert; das Modul importiert kein `fs`, `vm` oder `child_process`.

## Noch offen vor Phase-2-Freigabe

1. Tatsächlicher SHA-gepinnter Leseweg aus Git und reproduzierbarer Baseline/Kandidatenvergleich.
2. Unabhängig annotierter **Fehler-Befundkorpus** mit mindestens dem im Masterplan geforderten 90%-Seed-Nachweis und dokumentierter Falsch-Positiv-Rate.
3. Fallbasierte Regeln für dynamische Script-Referenzen/Importe, Rauschen und Alias-/Scope-Fehler.
4. Unabhängiger Holdout, einmalig blind evaluiert; nicht die bereits bekannte Claude-Sammlung als neuen Holdout darstellen.
5. Versionen von Parser/Node/Git-Quellen zuverlässig protokollieren und effektive Main-Branch-Schutzkontrollen separat nachweisen.

**Keine automatische Codeänderung, Produktiv-App-Einbindung oder Merge-Freigabe.**
