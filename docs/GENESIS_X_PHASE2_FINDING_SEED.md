# GENESIS X – Phase 2: vorbeschrifteter AST-Fehler-Seed v1

**Status:** Entwicklungs-Seed für die ausdrücklich im Masterplan geforderte **Fehlererkennung**, nicht der ältere `eligible/review`-Provenienzbenchmark und **kein unabhängiger, versiegelter Holdout**.

## Feste Daten und Messung

- `eval/genesis-ast/seed-findings-v1.json`: 42 vorbeschriftete Fälle, 24 erwartete AST-/SEC-Regelfunde und 18 negative Fälle.
- `eval/genesis-ast/tests/finding-seed.test.mjs`: wertet auf jedem CI-Lauf den unveränderten JSON-Korpus aus und protokolliert Datei-SHA-256, TP/FP/TN/FN, Recall, False-Positive-Rate sowie Fälle mit unerwarteten Regel-IDs.
- Qualitätsgrenzen sind in der Datei vor Ausführung festgeschrieben: `minRecall: 0.90`, `maxFalsePositiveRate: 0.10`.
- Positive Fälle zählen nur dann als erkannt, wenn die **vorab festgelegte Regel-ID** ausgegeben wird; negative Fälle nur, wenn kein AST-Befund ausgegeben wird.

Die Testfälle decken Regel-Familien für Syntaxfehler, dynamische eval/Function-Kompilierung, innerHTML-Zuweisung, localStorage.clear, document.write, dynamische Imports und eine mögliche Private-Key-Signatur ab. Negativfälle prüfen u. a. Kommentare, Stringliterale, sichere Textausgabe und konstante Import-Spezifizierer.

## Grenzen

Es ist bewusst eine **entwicklererstellte, transparente und stark regelgebundene** Stichprobe. Sie ist nicht repräsentativ für alle JavaScript-Fehler; manche AST-Regeln sind Heuristiken und nicht jeder Treffer beweist einen tatsächlichen Bug. Exakte Treffer auf bekannte Muster belegen noch keine allgemeine 90%-Fehlererkennungsquote.

Der bereits bekannte Claude-94er-Provenienzkorpus ist eine **andere Metrik** und wurde hierfür nicht als neu oder geheim ausgegeben. Weitere Fehler nach dem Einfrieren der Seeds werden dokumentiert, nicht durch Änderungen an deren Ground Truth verdeckt.

**Phase 2 bleibt offen** bis zu einer unabhängig spezifizierten Qualitätsmessung, dokumentierter Unsicherheit, lückenlos wiederholbaren Git-Berichten und nachgewiesenen Main-Schutzkontrollen. Keine automatische Änderung oder Produktionsfreigabe.

## Erstes unverändertes Seed-Ergebnis und gezielte Korrektur

Erster gemessener CI-Lauf auf Commit `a6507539db22dba59a9207c949e6cdbae22d0181`: 42 Fälle, **TP=23, FP=0, TN=18, FN=1**, Recall 95,83 %, beobachtete False-Positive-Rate 0/18. Seed-SHA-256: `962c2eca68e3d8aa034046813ce7a41635061dc50c5586b54e3ee6068bc0b9e1`.

Das dokumentierte Fehlbeispiel `P22` verwendet indirektes `eval` als SequenceExpression. Danach wurde **nur der Analyzer** erweitert, sodass die vorhandene Regel `AST001` auch dieses konkrete Muster erkennt; die Seed-Datei und ihre vorab fixierten Labels wurden nicht geändert. Die nachfolgende Wiederholung ist **Regressionstest, kein zweiter unabhängiger Validierungslauf**. Weitere unbekannte JavaScript-Varianten bleiben möglich.
