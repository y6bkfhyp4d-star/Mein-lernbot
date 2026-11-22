# GENESIS X #60 – optionale Verbindung zum bestehenden NERYX-Planer

**Forschung, kein Live-Release. Basierend auf #59.**

## Integration ohne Änderung der Haupt-App

`eval/neryx-genesis-x-routed-research.js` nimmt **nur nach ausdrücklichem Aufruf** eine exakt formatierte `GENESIS prüfen:`-Zeichenkette entgegen. Es verwendet die **bereits vorhandene** Methode `NERYXOrchestrator.plan(expression)` zur Typprüfung. Nur `type:'pairs'` wird akzeptiert. **Weder `NERYXOrchestrator.solve` noch Qwen** werden aufgerufen.

Beispiel: `GENESIS prüfen: 0=2, 1=3, 2=4, 4=6, 7=9; 10`.

Die Nachricht muss fünf bis dreizehn verschiedene `x=y`-Paare und genau eine getrennte Probeeingabe enthalten. Die **ersten drei** Paare sind Training, alle übrigen zwei bis zehn Paare sind **separat benutzerseitig vorgegebene Validierung**. Keine Testwerte werden aus Vorhersagen eines Modells erfunden. Nur endliche Zahlen in den vorhandenen GENESIS-Grenzen, kein Syntax- oder Code-Evaluieren, keine zusätzlichen Befehle, keine Dopplungen. Als Paare-Trennzeichen ist ein Komma und für Dezimalstellen ein Punkt erlaubt; das ist absichtlich enger als der eigenständige #57-Formularmodus.

Nach der Typ- und Zahlenprüfung geht ein versionierter `research_check` an die **bestehende #56-Forschungsbrücke** und dann über den tatsächlichen Worker an das bestehende Mehrdeutigkeits-Gate. Die öffentliche Antwort besteht ausschließlich aus `{status, reviewOnly:true, publishable:false}`; Kandidaten, interne Programme und Prognosen werden verworfen. Unbekannte oder ausgefallene Abhängigkeiten führen zu `invalid`, `unavailable` oder `blocked`.

## Getrennte iPhone-Seite

`eval/neryx-genesis-x-routed-research.html` mit `eval/neryx-genesis-x-routed-ui.js` ist der **einzige** UI-Einstieg für #60. Das echte `modules/orchestrator.js` wird auf der Testseite eingebunden, um nur dessen Planer zu verwenden. Das Seite enthält weder `app.js` noch Qwen-/WebLLM-Bibliotheken, `window.LernBotBridge`, `localStorage` oder produktive Chat-Ereignisbehandlung. **Die Haupteingabe in NERYX versteht diesen Testbefehl noch nicht.**

## Schutz und Prüfungen

Der Node-Regressionstest nutzt echte Planner-/GENESIS-Implementierungen und eine simulierte Worker-Nachrichtengrenze. Chromium und Linux WebKit prüfen die reale iPhone-artige Eingabeseite und echte Web Worker, negative Daten, fehlenden Worker und das Ausbleiben von Browser-Speicherzugriffen. Das Gesamtregressionspaket läuft zusätzlich. Kein Release, Merge, Produktionsdeployment, persönlicher Speicherzugriff oder Änderung an vorhandenen Modulen.

Grenzen: GENESIS X sucht nur nach beschränkten numerischen Programmen; `review_required` bedeutet **nicht**, dass eine Formel wahr oder die von Qwen ausgegebene Antwort bestätigt ist. Ein echter Safari-Test auf dem iPhone ist separat nötig.
