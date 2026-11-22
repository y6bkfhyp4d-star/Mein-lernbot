# GENESIS X – Claude-Audit: Triage und gezielte Regressionen (22.11.2026)

**Status:** Phase 2 NICHT freigegeben. Keine Produktionsfreigabe.  
**Basis:** externes Audit zu PR #89, 94 Fälle (92 ausgewertet, 2 ausgeschlossen); Labels vor erster Auswertung festgehalten. Das war keine blinde Holdout-Messung, da der Prüfer den Analyzer-Code bereits gesehen hatte.

## Befunde und Umsetzung

| Befund | Entscheidung | Änderung/Abnahme |
|---|---|---|
| B1: Class-Expression mit Static-Initializer als einfache Provenienz | Hoch, gezielt beheben | `ClassExpression` wird als nicht auflösbare dynamische Herkunft zurückgehalten; Regression für Quoted/Numeric-Key und Methoden |
| B2: Array-/Objekt-Spread kann Iteratoren/Getter ausführen | Mittel, gezielt beheben | `SpreadElement` und vorsichtshalber `in` / `instanceof` als unbekannte Effekte; Regressionen |
| B3: AST-Traversal überspringt `value` | Mittel, gezielt beheben | Allgemeiner AST-Walker folgt jetzt auch `value`-Objekten; Regressionen für Objektmethoden und Klassen |
| B4: Aufruf der CLI über Symlink führt stumm nichts aus | Mittel, gezielt beheben | CLI-Hauptmodulvergleich per `realpathSync`; End-to-End-Test via Symlink |
| B5: Scope-/Hoisting-/Destructuring-Fälle | Separat, niedrig | Noch nicht geändert; isolierte Tests und fachliche Semantikprüfung vor späterer Korrektur |

Die Änderungen sind konservativ: ein `review`-Ergebnis bedeutet **keine** allgemeine Unsicherheit oder konkrete Sicherheitslücke, sondern nur, dass GENESIS X hierfür keine begrenzte einfache Provenienz-Evidenz freigibt. Die Fixes für B1–B4 belegen **nicht** die vollständige JavaScript-Semantik.

## Messdaten aus dem fremden Audit (keine neue Messung)

- Corpus-Datei: `neryx-independent-corpus-v1.json`; SHA-256 laut übergebener und lokal verifizierter Datei: `37ad41bec3043ad10848c169db40cc1d20dace5d7294cc9a1beeb9eb996d5355`.
- 94 Fälle insgesamt, 92 gewertet, 2 ausgeschlossen. Gesamt: TP=35, FP=7, TN=41, FN=9.
- Sichere Ground Truth nach Sidecar: 78 Fälle, TP=35, FP=5, TN=37, FN=1. Fehler wurden bereits zur Diagnose genutzt; **kein unverbrauchter Holdout**.
- Original-Audit lief mit Acorn 8.18.0; Projekt pinnt 8.15.0. Eventuelle Unterschiede sind vor breiter Abnahme getrennt zu prüfen.
- Wiederholtes Tuning auf demselben 94-Fälle-Korpus ist **nicht** als neue unabhängige Erfolgsmessung zulässig.

## Noch ausstehende Phase-2-Abnahme

1. CI des aktuellen Draft-PR-Heads vollständig prüfen; Regressionsfälle und reale Source-Baseline transparent berichten.
2. **Eigentliches Befundmodell:** Für konkrete Codefehler braucht es Regel-ID, Datei, Zeile, Schwere, Evidenz, False-Positive-Klasse und festgelegten Source-SHA; danach reproduzierbaren JSON-Bericht.
3. Git-SHA-basierter Leseweg, Baseline-vs.-Kandidat-Diff und passende Tests (dynamische Script-Referenzen, Modulimports, geschachtelte Strukturen).
4. Einen Seed-Korpus für **Fehlererkennung** und die im Masterplan verlangten >=90 % auf der passenden Größe. Die bisherige `eligible/review`-Quote ersetzt das **nicht**.
5. Unabhängig erzeugten, vorab fixierten, bislang ungesehenen Holdout sowie vorab definierte Schwellen und negatives Gate; ihn nicht in der Trainings-/Korrekturschleife verbrauchen.
6. Unveränderlichkeit der Quellen sowie Berichts-Metadaten (Analyzer-/Parser-/Node-Versionen und SHA) durch Tests absichern.
7. Phase-1-Hauptbranchschutz und unabhängigen Freigabeweg tatsächlich verifizieren, bevor später irgendein Codegenerator aktiviert wird.

**Nächster begrenzter Schritt:** Nach grünem CI das JSON-Befundmodell und dessen deterministische, nur lesende Tests implementieren. Kein automatisches Patchen, Mergen oder Deployen. `main` und Produktion bleiben unangetastet.
