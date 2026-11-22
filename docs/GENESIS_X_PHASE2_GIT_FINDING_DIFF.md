# GENESIS X – Phase 2: Git-Commit-basierter Befundvergleich 2.8

**Status:** Read-only-Prototyp, keine Phase-2-Freigabe.  
**Implementierung:** `eval/genesis-ast/git-finding-diff.mjs`.  
**Regressionstests:** `eval/genesis-ast/tests/git-finding-diff.test.mjs`.

## Vertrag

`compareGitFindings({root,baseSha,headSha,files})` akzeptiert nur zwei vollständige 40-stellige SHA-1-Commit-IDs und eine ausdrückliche Liste von 1–20 relativen JS/MJS/CJS-Dateien.

- Ein echter, lokal vorhandener Git-Commit wird mit `git rev-parse --verify <SHA>^{commit}` validiert.
- Für **jede ausdrücklich angegebene Datei** wird aus beiden Commits der echte Blob gelesen (`git cat-file` und `git show`), mit Größenlimit und ohne Check-out.
- `finding-report.mjs` analysiert die **unveränderten Commit-Inhalte**; Quelltext-SHA-256 und tatsächlicher Git-Commit-SHA bleiben im jeweiligen Bericht erhalten.
- Der Diff unterscheidet `added`, `removed`, `unchanged`. Ein Befund, dessen Zeile sich nur verschoben hat, wird anhand gleicher Regel-ID, Schwere und Meldung weitergeführt.
- Der Vergleich ist rein lesend und verändert weder Index noch Working Tree, keine Ausführung des Quellcodes.

## Grenzen und ehrliche Interpretation

Der Vergleich erfolgt **regel- und meldungsbasiert**, nicht über eine bewiesene AST-Knotenidentität. Wenn mehrfach die gleiche Warnung im selben File vorkommt, ist eine falsche Zuordnung möglich. Daher sind die Ergebnisse Hinweise für einen Reviewer, **keine gesicherten Aussagen über behobene Schwachstellen**.

Die bereitgestellten Commit-SHAs müssen bereits lokal erreichbar sein. Es wird **kein Fetch**, kein Netzwerkzugriff, keine GitHub-API, kein Checkout, kein Patch und kein Merge ausgeführt. Wenn eine Datei in einem der Commits fehlt oder zu groß ist, bricht der Vergleich ab; Rename-/Create-/Delete-Handling ist noch nicht implementiert.

Die Ausführung benötigt Git im Node-Laufzeitumfeld. Dieser Git-Reader bleibt im **isolierten Entwickler-/CI-Werkzeug**, nicht im iPhone-NERYX-Browser.

## Abnahmekriterien des begrenzten Schritts

Testen: reproduzierbare Berichte für echte temporäre Git-Commits, unveränderte Quellbytes, deterministische Zuordnung über verschobene Zeilen, Ablehnung ungültiger SHAs/Pfade, kein Working-Tree-Schreiben und keine Ausführung des untersuchten Codes.

**Weiterhin offen für Phase 2:** unabhängiger Fehler-Benchmark mit >=90%-Kriterium, dokumentierte False-Positive-Rate, mehr Quelltypen und Datei-Änderungstypen, vollständige Metadaten und separater GitHub-Schutz-Nachweis. Claudes bereits untersuchter Korpus darf nicht als neuer blinder Holdout gelten.

## Zusätzlicher Abschlusscheck: gleiche SHA, identisches JSON

`tests/git-finding-diff.test.mjs` prüft seit dem nächsten Commit explizit, dass bei `baseSha===headSha` zwei aufeinanderfolgende `JSON.stringify(compareGitFindings(...))`-Ergebnisse **byteidentisch** sind. Die Prüfung validiert außerdem unveränderte Git-Commit-IDs, identische SHA-256 der Quelltexte, keinen neu hinzugekommenen/entfallenen Befund sowie unveränderten Working-Tree-Inhalt und Git-Status.

**Aussagegrenze:** Das gilt für das festgelegte lokale Test-Repository mit den definierten Dateien. Es belegt noch keine automatische Reproduzierbarkeit in beliebigen Umgebungen, mit abweichenden Node-/Acorn-Versionen oder zusätzlichen Dateien.

## Phase-1-Schutz: gesonderter Nachweis erforderlich

GitHub-Repo-Metadaten zeigen `main` als Standardbranch und `allow_auto_merge:false`. Daraus folgt **nicht**, dass `main` geschützt ist. Der wirksame Schutz gegen direkte Pushes, Force-Pushes, Umgehung von Pflichtchecks und Bot-Selbstfreigabe ist weiterhin **nicht bestätigt**. Bis ein getrenntes negatives Schutztestprotokoll existiert, darf Phase 1 nicht als abgeschlossen oder die spätere Selbstentwicklung als freigegeben gelten.
