# GENESIS X – Phase 2: Scope-Analyse 2.2 (isolierter Prototyp)

**Stand:** Nur AST-Auswertung im Testbereich, keine App-Einbindung, kein Code-Ausführen, kein automatisches Ändern oder Mergen.

## Neue Fähigkeiten
- Erfasst deklarierte Variablen und Funktionen (inkl. Parameter, Imports, catch-Variablen und einfachen Destructuring-Bindings).
- Ordnet Identifier-Verweise an die nächstgelegene **statisch erkennbare** Deklaration.
- Erkennt lexikalische Namensüberschattungen und meldet die betroffenen Bindings.
- Unterstützt grundlegendes Function- und `var`-Hoisting sowie Block-, Funktions- und Loop-Scopes.
- Positionen: Datei, Zeile, Spalte; Zuordnung der Referenzen über lokale Binding-IDs.
- Unbekannte Namen werden als `external-or-unresolved` ausgewiesen. **Dies ist keine sichere Fehlermeldung**: Namen können Globals, Browser-APIs oder dynamische Umgebungswerte sein.
- Der Analyzer importiert ausschließlich den bereits isoliert eingesetzten kostenlosen Parser `acorn`. Untersuchte Quellen werden niemals ausgeführt.

## Benutzung
Im Ordner `eval/genesis-ast`:
```bash
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
npm test
```
Programmgesteuert:
```js
import {analyzeScopes} from './scope-analyzer.mjs';
const report=analyzeScopes('example.mjs','const x=1; { const x=2; console.log(x); }');
```
Das Ergebnis enthält `bindings`, `references`, `shadowing` und eine `summary`. Keine Ausgabe in eine Datei.

## Grenzen und Sicherheitsmaßnahmen
- Noch **keine vollständige ECMAScript-Scope-Engine**: insbesondere `this`, private Klassenfelder, komplexe `var`-Hoists aus verschachtelten Blöcken, TypeScript, JSX, dynamische `with`-/`eval`-Semantik und sämtliche Datenflussfragen fehlen.
- Importnamen werden erkannt, aber noch nicht über mehrere Dateien hinweg aufgelöst.
- Referenzen sind Näherungen; kein automatisches Refactoring auf dieser Grundlage.
- Der Parser benötigt im CI weiterhin eine npm-Installation. Das Paket hat noch kein Lockfile mit Integritäts-Hash; vor produktiver Nutzung separat absichern.
- `app.js`, `modules/code-diagnose.js`, `index.html` und `sw.js` bleiben unangetastet.
- Durch `npm test` übernimmt der bestehende isolierte Workflow die neuen acht Tests automatisch. Vor dem Merge sind die fünf Pflichtchecks **und** `genesis-ast` zu verifizieren.

## Nächster Schritt
Nach erfolgreicher Abnahme dieser Basis: präziseres `var`-Hoisting, Import-/Export-Beziehungsgraph, Referenzauflösung über mehrere Dateien, danach Datenflussprüfung.
