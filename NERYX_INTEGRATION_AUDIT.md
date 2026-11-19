# NERYX – Integrationsprüfung und Zusammenführung (19.11.2026)

## Was tatsächlich untersucht wurde

Der GitHub-Dateibaum auf `main` wurde rekursiv erfasst: **887 Einträge** (Dateien und Verzeichnisse; keine 887 eigenständigen KI-Module). Die aktuellen Wurzeldateien, alle 21 Dateien aus `modules/`, die Haupt-Einbindungen und die für die Integration entscheidenden Quelldateien wurden auf Pfade, Schnittstellen und Zuständigkeiten geprüft. Die Architekturübersicht vom 18.11.2026, der `evolution/neryx/`-WebLLM-Prototyp, der API-Endpunkt und die wichtigsten Denk- und Lernmodule wurden direkt gelesen.

**Abgrenzung:** Nicht jeder der mehreren Hundert historischen Phase-Quelltexte wurde einzeln semantisch geprüft oder auf einem iPhone ausgeführt. Alte Phase-3-, Phase-5- und Phase-7-Experimente bleiben deshalb bewusst getrennt. Weder ein AGI-Nachweis noch ein erfolgreicher iPhone-WebGPU-Modellstart wird behauptet.

## Aktive Haupt-App – gemeinsame Komponenten

| Komponente | Code | Stand |
|---|---|---|
| Hauptchat, Lernen, Daten und PWA | `app.js`, `index.html`, `sw.js` | Aktiv; vorhandene Chatführung und Speicher erhalten |
| Wissensantworten und Konfliktprüfung | `antwort-ki.js`, `konflikt-ki.js`, `modules/learning-coordinator.js`, `modules/learning-hub.js` | Aktiv, regel- und speicherbasiert |
| Weitere 9 Wurzel-Erweiterungen | `gedaechtnis-ki.js`, `agenten-ki.js`, `aufgaben-ki.js`, `wissens-ki.js`, `feedback-ki.js`, `wissensnetz-ki.js`, `zentrale-ki.js`, `diagnose-ki.js` und `antwort-ki.js` | Über Haupt-HTML geladen; nicht einheitlich über denselben Chat-Handler gesteuert |
| Problemlösen | `modules/neryx-reasoner.js`, `modules/rule-patterns.js`, `modules/capability-test.js` | Bereits aktiv; lineare Regeln, Zahlenfolgen, kürzeste Rasterwege, mehrstufige Arithmetik; bewusst eng begrenzte Operatoren |
| Lernmodule | `learning-lab`, `auto-learning`, `learning-evaluation`, `learning-audit`, `context-learning`, `word-learning`, `meaning-links`, `meaning-benchmark`, `topic-learning`, `personal-learning-test` | Aktiv, nicht mit Modellgewichts-Nachtraining verwechseln |
| Dialog und Stapelbefehle | `conversation-math.js`, `batch-test.js` | Aktiv |
| Code- und Gegenproben | `code-diagnose.js`, `genesis-gegenprobe.js`, `genesis-2.js`, `genesis-3.js` | Aktiv; Tests und Diagnosen ersetzen keine externe Wahrheitsprüfung |
| Sprachmodell-Prototyp | `evolution/neryx/index.html`, `app.js`, `client.js` | Eigenständige WebLLM-Oberfläche mit Qwen2.5-Modell und `postMessage`-Bridge; GPU/Modellstart auf iPhone noch zu verifizieren |
| Externe Server-API | `api/chat.js` | Separater OpenAI-Backend-Prototyp; nicht automatisch im Hauptchat aktiv, kann Kosten verursachen |

## Jetzt zusammengeführt

Neu in der produktiven Haupt-App:

1. `modules/system-hub.js`: **Systemstatus** zählt derzeit erreichbare Haupt-Schnittstellen. **Problem lösen:** leitet bekannte Regel- und Zahlenfolgenaufgaben an die bereits implementierten Operatoren weiter. **Weg planen:** ruft die vorhandene Raster-Wegsuche über ein einfaches Eingabeformat auf. Unbekannte Probleme werden nicht als gelöst ausgegeben.
2. `modules/local-model-bridge.js`: Bindet den vorhandenen WebLLM-Prototyp auf derselben Domain erst nach **Sprachmodell laden** über `evolution/neryx/client.js` an. **KI fragen: ...** fragt explizit das lokale Modell. **KI-Modus an** erlaubt bei nachweisbar fehlenden regelbasierten Antworten eine Modell-Ergänzung; gespeicherte Antworten und Fachbefehle haben Vorrang. **KI-Modus aus** und **Sprachmodell trennen** deaktivieren die Ergänzung. Es werden keine API-Schlüssel verwendet und keine vorhandenen Fakten oder Modellgewichte überschrieben.
3. Der bestehende Hauptchat bleibt die einzige zentrale Befehls-Einstiegsstelle für diese neuen Funktionen. Es wurden **keine zusätzlichen Click-/Submit-Interceptor** für sie angelegt.

## Zum Ausprobieren

```text
Systemstatus
Problem lösen: 2=5, 4=9; 7
Problem lösen: 2, 4, 8, 16
Weg planen: 000;010;000
Sprachmodell Status
Sprachmodell laden
KI fragen: Erkläre den Unterschied zwischen Addition und Multiplikation.
KI-Modus an
KI-Modus aus
Sprachmodell trennen
```

Die bestehende separate Sprachmodell-Oberfläche liegt unter
`https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/neryx/`.
**Wichtig:** Ein Sprachmodell-Bibliotheksdownload ist erforderlich; WebGPU und Speicher können die Ausführung auf dem iPhone verhindern. Der Modell-Prototyp wurde **nicht** hier auf dem echten Gerät gestartet. Ein mit Modell erzeugter Text ist keine sachlich geprüfte Quelle.

## Risiken und nächste Grenzen

- In der Haupt-App existieren noch mehrere unabhängige ältere Chat-Listener. Diese ohne Regressionstests zu ersetzen wäre riskanter als ihr vorläufiger Erhalt.
- Einige historische Forschungsphasen enthalten technische Experimente, aber keine gleichwertigen fertig integrierten Fähigkeiten.
- Der WebLLM-Prototyp verwendet eine kleine Modellklasse. Qualität, deutsche Sprachfähigkeit und Speicherbedarf sind auf dem echten iPhone zu prüfen.
- PWA-/Browser-Caches können alte Skripte liefern. Vollständiger Offline-Modellstart ist nicht gewährleistet.
- Persönliche Browser-Speicher sind vom GitHub-Repository getrennt; keine Schema-Migration oder Datenlöschung ausgeführt.
- Die Node-Smoke-Tests wurden um die neue Integration erweitert. Ein vollständiger CI-Durchlauf und iPhone-End-to-End-Test sind gesondert zu bestätigen.

## Daten-Verträglichkeit

Unverändert: `meinLernBot.v1`, alte Sicherungs-Schlüssel, `neryx.learning.*`, `window.LernBotBridge` und die bisherigen Fachbefehle. Die neue Zentrale legt keinen neuen dauerhaften Speicher an; der lokale Sprachmodelladapter verwaltet seinen Ladezustand nur in der aktuellen Browsersitzung.

## Nachtrag: Geprüfte Rechenoperationen mit lokaler KI verbinden (19.11.2026)

Der iPhone-Test bestätigte, dass WebLLM tatsächlich lädt. Eine reale
Textaufgabe zur Wandfläche beantwortete Qwen 2.5 0,5B jedoch falsch
(5 m² statt 150 m²) und erfand einen unpassenden Rechenweg.

Als gezielte Integrationskorrektur wurde `modules/math-verifier.js`
eingebaut und über `index.html` vor der lokalen Modell-Bridge geladen.
Er erkennt einen **eng abgegrenzten Fall**: Anzahl Räume × Wände pro
Raum × Breite und Höhe je Wand, in Metern. Dabei muss klar sein, dass
alle Wände dieselben Maße haben. Fenster, Türen oder verschiedene
Wandmaße lösen eine Rückfrage statt einer erfundenen Berechnung aus.
Das Ergebnis hat Vorrang vor dem Sprachmodell – ausdrücklich auch bei
`KI fragen: ...` und im normalen Hauptchat. `Fläche berechnen: ...`
ist ein weiterer expliziter Einstieg.

Wichtig: **Keine allgemeine Mathematikverifikation**. Bei unbekannten
Textaufgabentypen kann das Sprachmodell weiterhin unzutreffende
Antworten geben. Sie gelten nicht als verifiziert.

## Plan A – NERYX als gemeinsames KI-System (19.11.2026)

Mit `modules/orchestrator.js` gibt es jetzt **eine zentrale Aufrufstelle**
für bereits vorhandene Fähigkeiten. Qwen bleibt ein austauschbares,
lokal gestartetes Sprachmodell – **NERYX ist das gesamte System**.

- `NERYX lösen: FRAGE` prüft zuerst bekannte, kontrollierbar berechenbare
  Aufgaben (Wandfläche, Zahlenregeln, Zahlenfolgen und über den
  bestehenden Befehl `Weg planen:` auch Rasterplanung).
- Danach versucht die Zentrale eine eindeutige lokale Wissensantwort
  aus vorhandenem NERYX-Wissen. Bloß verwandte Stichwörter gelten nicht
  als gesicherte Antwort.
- Nur wenn kein passender deterministischer oder lokaler Treffer besteht,
  kann das **vorher vom Nutzer geladene** Qwen-Modell antworten.
  Die Modellantwort bleibt ausdrücklich *ungeprüft*.
- Die ursprünglichen Befehle, darunter `KI fragen:` für den direkten
  Modelltest, bleiben erhalten. Das System lädt das Modell nicht
  automatisch und verschickt keine privaten gespeicherten Informationen
  als Prompt an Qwen.
- `KI-Systemstatus` zeigt die tatsächliche Verfügbarkeit.
  Eine aktive Schnittstelle beweist keine umfassende allgemeine Intelligenz.

Einfügetest (gesamter Block auf einmal):

```text
Stapeltest:
KI-Systemstatus
NERYX lösen: 2=5, 4=9; 7
NERYX lösen: 2,4,8,16
```

Anschließend **einzeln** testen:
`NERYX lösen: Was ist ein Okapi?`
und nach `Sprachmodell laden` beispielsweise
`NERYX lösen: Was ist der Unterschied zwischen einer Hypothese und einer Messung?`.
Der letzte Fall ist eine ungeprüfte Qwen-Antwort, kein automatisch
verifizierter Fakt und kein Gewichts-Nachtraining.

**Grenze:** Der neue Router beherrscht nicht beliebige Textaufgaben,
Werkzeugaufrufe durch das Sprachmodell oder autonomes Handeln.
Anstatt eine neue Parallel-KI zu erstellen, erweitert Plan A die
überprüfbare Verbindung der bestehenden Komponenten schrittweise.


## Plan A, Stufe 2 – begrenzte Werkzeugsteuerung (19.11.2026)

Die gemeinsame KI-Steuerung in `modules/orchestrator.js` ist jetzt auf **Version 2.0**.

- Zuerst überprüfbare Rechen-/Planungsmodule, dann passende lokale Wissensantworten.
- Bei unbekannten Fragen kann das explizit geladene Qwen ein Werkzeug vorschlagen.
- Whitelist: Zahlenfolgen, Zahlenregeln, Rasterwege und Wandflächen.
- Die Werkzeugargumente müssen wörtlich in der Nutzerfrage vorkommen. Ein Modell darf keine Zahlen hinzufügen, Daten verändern oder Code ausführen.
- Rechenergebnisse stammen vom jeweiligen Fachmodul, Modellformulierungen bleiben als unverifiziert gekennzeichnet.
- Vor dem Modellstart kann `Sprachmodell wählen: 1,5B` oder `Sprachmodell wählen: 0,5B` ausgeführt werden. Die Auswahl geht über eine geprüfte `SET_MODEL`-Bridge an den vorhandenen WebLLM-Prototyp. Kein Modell lädt automatisch.
- 1,5B kann auf iPhones wegen GPU-Speicher scheitern. In dem Fall auf 0,5B zurückwechseln.

**Integrationstest:**

```text
Stapeltest:
KI-Systemstatus
NERYX lösen: 2=5, 4=9; 7
NERYX lösen: Setze die Folge 2,4,8,16 fort
```

Die Test-Suite wurde um isolierte Schutztests für erfundene Werkzeugargumente, Modellvorrang und Auswahl erweitert. Ein erfolgreicher iPhone-Start von Qwen 1,5B ist damit **nicht** nachgewiesen.
