# GENESIS X – CodeAnalyzer 2.3: dateiübergreifende Abhängigkeitsübersicht

**Status:** isolierter read-only Prototyp, noch nicht mit der NERYX-App verbunden.

Der neue Baustein `eval/genesis-ast/dependency-graph.mjs` nutzt den bestehenden Acorn-Parser und arbeitet ausschließlich mit **explizit übergebenen JavaScript-Quelldateien**. Er führt kein fremdes Skript aus, ruft kein Netzwerk auf, verändert keinen Quellcode und löst fehlende Imports **nicht automatisch durch Zugriff auf weitere Dateien** auf.

## Ergebnisse
- AST-erkannte `import`-Anweisungen, wörtliche `import()`-Ausdrücke sowie `export ... from` und `export * from`.
- Datei-/Zeilenposition, Typ und Status jeder Abhängigkeit.
- Erlaubte relative Modulreferenzen werden nur zu den ausdrücklich übergebenen Dateien aufgelöst.
- Externe Pakete, unbekannte dynamische Imports, nicht übergebene Dateien, mehrdeutige extensionlose Referenzen und Pfade außerhalb des Projektordners bleiben klar markiert.
- Zyklen in den **nachgewiesenen** Referenzen werden erkannt.
- `impact[datei]` enthält andere übergebene Dateien, die diese Datei direkt oder indirekt importieren. Das sind **potenzielle** Auswirkungen, keine Aussage über tatsächliche Laufzeitwirkungen.

## Start (innerhalb `eval/genesis-ast`)
```sh
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
npm test
node dependency-graph.mjs analyzer.mjs scope-analyzer.mjs dependency-graph.mjs
```

`buildDependencyGraph({'main.mjs':'import "./lib.mjs";','lib.mjs':'export const x=1;'})` erlaubt Analyse ausdrücklich bereitgestellter Quelltexte ohne weitere Dateizugriffe.

## Bewusste Grenzen
- Kein allgemeiner Resolver für Node-`exports`, Import Maps, Bundler-Aliase, CommonJS-`require` oder TypeScript.
- Extensionlose Imports werden nur gegen explizit bereitgestellte Kandidaten abgeglichen; bei mehreren Treffern ist das Ergebnis `ambiguous`.
- Ein statisch sichtbarer Import ist nicht zwingend eine tatsächlich zur Laufzeit ausgelöste Ausführung.
- Fehlende Dateien werden **nicht** als fehlerhafte Dateien bezeichnet; sie sind außerhalb der expliziten Eingabemenge.
- Keine Änderung der Produktivdateien `app.js`, `index.html`, `sw.js` und `modules/code-diagnose.js`.
- AST-Parserversion weiterhin kostenfrei, aber das Paket hat noch kein Integritäts-Lockfile. Für streng reproduzierbare Lieferketten vor einer produktiven Einbindung nachziehen.
- Bereits bestehender Workflow `genesis-ast` entdeckt die Tests in `tests/*.test.mjs` automatisch, die fünf Pflichtchecks bleiben unverändert.

## Freigabe
Vor Merge müssen die fünf bisherigen Pflichtchecks und der zusätzliche `genesis-ast`-Test bestehen; der Pull Request bleibt bis zur bewussten Freigabe getrennt von `main`. Eigenständige GENESIS-X-Codeänderungen bleiben abgeschaltet.
