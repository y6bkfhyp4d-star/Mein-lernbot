# GENESIS X – Phase 2: CodeAnalyzer 2.0 (erste, rein lesende Grundlage)

**Entwicklungsstand:** Erster prüfbarer Prototyp; noch **keine** vollständige AST-Analyse oder automatische Codeverbesserung.

## Ziele und Grenzen
- Eigene JS/MJS/CJS-Dateien auf konkret benannte statische Muster untersuchen.
- Pro Fund: `rule`, `severity`, `file`, `line`, `column`, `message`, `suggestion`.
- Ausgabe als JSON in **stdout**, keine automatischen Schreibzugriffe, Commits, PRs oder Deployments.
- Die gelesene Quelle wird **nicht ausgeführt**. `vm.Script` wird ausschließlich zum nicht ausführenden Syntax-Kompilieren von klassischen JS-Dateien verwendet.
- Nur bis zu 100 ausdrücklich genannte Dateien, nur JS/MJS/CJS, maximal 2 MB je Datei, nur unterhalb des kanonischen Projektverzeichnisses (auch Symlinks geprüft).
- Keine kostenpflichtigen APIs, keine Netzwerkanfragen, keine neue npm-Abhängigkeit.
- Vorhandenes `modules/code-diagnose.js` bleibt unverändert; keine Einbindung in produktive App.

## Nutzung im GitHub-Repo
```bash
node eval/genesis/code-analyzer.mjs app.js modules/code-diagnose.js
node --test eval/tests/genesis-code-analyzer2.test.mjs
```

## Aktuell erkannte Muster
`eval()`, `new Function()`, `innerHTML=`, `localStorage.clear()`, `document.write()`, mögliche Private-Key-Header, mehrfache namensgleiche `function`-Deklarationen. Für klassische .js/.cjs-Dateien zusätzlich eine nicht ausführende Syntaxprüfung. Funde sind **Hinweise, keine bewiesenen Schwachstellen**. Bei Regel `JS006` können verschiedene Scopes denselben Funktionsnamen besitzen. Bei Modulen ist der Syntaxcheck noch nicht implementiert.

## Einschränkungen – wichtig
- Der Maskierer von Strings/Kommentaren ist eine **Heuristik**, kein vollständiger Parser. Template-Interpolationen, Regex-Literale, komplexe Syntax, Scope und dynamische Imports werden noch nicht korrekt semantisch aufgelöst. Der Prototyp kann Fehler übersehen oder Fehlalarme erzeugen.
- **AST-basierte Analyse** ist der nächste separate Entwicklungsschritt: parsergestützte Source-Locations, echte Scope-Analyse, Abhängigkeitsgraph, Mehrdatei-Zusammenhänge und Konfidenzstufen.
- Keine automatische Anwendung von Vorschlägen. Prüfungen und Freigaben bleiben in GitHub erforderlich.
- Fehlende CI-Freigabe-Reviewer und Schreibberechtigungsgrenzen der neun Forschungsworkflows müssen separat weiter abgesichert werden.

## Akzeptanz
`eval/tests/genesis-code-analyzer2.test.mjs` prüft Quellpositionen, harmlose Strings/Kommentare, geheime Schlüsselheader, Nichtausführung, Syntaxdiagnose und Pfadgrenzen. Der bestehende Integrationsjob führt `eval/tests/*.test.mjs` bereits aus. Die drei Dateien dieses PR werden erst nach Prüfung sämtlicher fünf Pflichtchecks gemergt.
