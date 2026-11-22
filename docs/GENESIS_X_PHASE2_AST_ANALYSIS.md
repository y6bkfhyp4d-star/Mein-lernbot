# GENESIS X – Phase 2 / Paket AST 2.1

**Status: isolierter PR-Vorschlag, keine Einbindung in die iPhone-App oder den produktiven LernBot.**

## Was tatsächlich neu ist
- `eval/genesis-ast/analyzer.mjs` analysiert JavaScript mit dem **echten Acorn-AST-Parser** statt Regex als Quellparser.
- Für Syntax- und Risikobefunde: `rule`, `severity`, `file`, `line`, `column`, `message`, `suggestion`, `confidence`.
- Inventar: benannte `function`-Deklarationen, statische und wörtliche dynamische Modul-Imports, direkt erkennbare Aufrufe.
- AST-Prüfungen: direkter `eval()`-Aufruf, `new Function()`, `innerHTML`-Zuweisung, `localStorage.clear()`, `document.write()`; zusätzlich mögliche Private-Key-Header.
- Syntaxfehler mit echter Parserposition; keine Ausführung der eingescannten Quelle.
- Dateizugriff explizit, max. 100 Dateien, max. 2 MB je Datei, `.js/.mjs/.cjs`, Symlink-Auflösung und Projektordner-Grenze.
- JSON nur in stdout, **keine Änderung an Repository oder Nutzerdaten**.

## Kostenlos und isoliert
- Der kostenlose Open-Source-Parser `acorn` ist im Unterordner `eval/genesis-ast` exakt auf `8.15.0` gepinnt.
- Nur der neue CI-Job installiert ihn mit `--ignore-scripts` und nur lesenden GitHub-Berechtigungen.
- GitHub Actions nutzt die bestehende externe npm-Registry während des Checks; **keine Offline-Garantie für die Entwicklungstests**. Laufende PWA und `modules/code-diagnose.js` werden nicht verändert.
- Die fünf bisherigen Pflichtchecks bleiben unangetastet. `genesis-ast` ist zunächst nur ein zusätzlicher Test und muss positiv geprüft werden, bevor er verpflichtend wird.

## Nutzung im isolierten Modul
```bash
cd eval/genesis-ast
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
npm test
node analyzer.mjs analyzer.mjs
```

## Grenzen
- Dies ist **keine vollständige Scope- oder Datenflussanalyse**. Doppelte Funktionen werden derzeit nur nach Block gruppiert; Arrow-Funktionen, Closures, importierte Aliase und Shadowing werden noch nicht semantisch verknüpft.
- Direkter AST-Aufruf bedeutet nicht, dass ein Ziel zur Laufzeit tatsächlich auf die erwartete globale Funktion verweist.
- Keine generierte Codeausführung, keine autonom ausgeführten Optimierungen, keine Merges oder Deployments.
- Parser-Abhängigkeit ist derzeit versionsfixiert, aber noch **ohne Lockfile/Integritäts-Hash**. Dieser Punkt muss vor Produktions-/Pflichtcheck-Einsatz nachgezogen werden.
- Fehlende getrennte Reviewer-Identität, GitHub-Actions-Standardrechte und die schreibberechtigten Forschungsworkflows bleiben ein separates Sicherheits-Thema.

## Abnahme
1. Alle fünf bisherigen Pflichtchecks müssen grün sein.
2. Neuer Job `genesis-ast` muss seine sieben Node-Tests bestehen.
3. Keine Codeänderung an `app.js`, `index.html`, `sw.js` oder produktiven Modulen.
4. PR bleibt bis zur bewussten Übernahme getrennt.
