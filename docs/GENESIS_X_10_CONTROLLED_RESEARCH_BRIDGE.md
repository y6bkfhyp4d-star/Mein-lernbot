# GENESIS X – kontrollierte Forschungsbrücke #56

**Stand: 22.11.2026.** Stacked Draft auf #55. **Nicht in main und nicht produktiv.**

## Architektur

Das experimentelle Modul `modules/neryx-genesis-x-research-bridge.js` stellt eine **nur auf ausdrücklichen Aufruf reagierende** API `window.NERYXGenesisXResearchBridge.review(request)` bereit.

Anfragen müssen genau dem strukturierten Schema entsprechen: `{version:1,kind:'research_check',task:{training:[{x,y}],validation:[{x,y}],probes:[x]}}`. Es gibt strikte Grenzen für Anzahl, Zahlenbereich, eindeutige x-Werte, ungefragte Felder und doppelte Proben. Die Eingaben werden als neue, validierte Records erstellt, bevor der separate Ambiguity-Worker-Client aufgerufen wird.

Ergebnis:
- `ambiguous`: mehrere kompatible Rechenwege führen auf Probe-Eingaben zu verschiedenen Ergebnissen.
- `review_required`: keine divergierenden Verhaltensweisen innerhalb des begrenzt geprüften Programmpools gefunden; **keine externe Richtigkeitsbestätigung**.
- `unconfirmed`, `invalid`, `unavailable` und `blocked`: blockiert bzw. nicht bestätigt.

Alle Rückgaben sind **`publishable:false` und `reviewOnly:true`**. Die Brücke gibt weder Rohprogramme, Einzelvorhersagen, Trainingsdaten noch ein als gültig erklärtes Chatresultat heraus. Fehlerhafte, manipulierte oder überraschende Worker-Ausgaben werden blockiert. Kein `eval`, keine API-Kosten, kein Lese-/Schreibzugriff auf `meinLernBot.v1`.

Die Brücke enthält **keinen Anschluss an den produktiven NERYX-Chat**. Sie ist als explizit importierbare Integrationsschnittstelle für zukünftige Reviews gedacht. `eval/neryx-genesis-x-bridge-demo.html` zeigt auf dem iPhone drei begrenzte Beispiele mit explizitem Startknopf und Link zur Haupt-App. Diese Demonstration ist nicht der echte NERYX-Chat.

## Qualitätssicherung

- Node VM prüft Status- und Schemafilter, Nichtveröffentlichung, Ausfälle und dass die API weder Schreiben noch Publizieren unterstützt.
- Browser-Smoke (Chromium und Linux WebKit mit mobilem Viewport) prüft drei reale Forschungsfälle, fehlenden Worker, keine Speicheränderungen, keine Chat-Ansicht und keine Forschungs-Engines im Fenster.
- Gesamtregressionen und die Schutzprüfung für App, Worker-Protokoll, PWA, Frozen, Vercel-Konfiguration.

## Releasegrenze

Es wird **keine** bereits benutzte NERYX-Datei ersetzt. `main`, `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, bestehende Worker und `vercel.json` bleiben unverändert. Die Brücke ist nur ein getrenntes, experimentelles Anschlussmodul und noch keine automatische KI-Hilfe im Hauptchat. Reale Nutzeraufgaben, unabhängige Daten und Safari auf dem physischen iPhone bleiben weitere zu prüfende Faktoren. Nicht nach main mergen oder produktiv veröffentlichen ohne ausdrückliche Freigabe.

## Verifizierte CI- und Preview-Ergebnisse (22.11.2026)

[GitHub Actions #45016322950](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45016322950): **4/4 Jobs erfolgreich**. Vollständige Node-Regression **625/625 bestanden**. Chromium und Linux WebKit prüften alle drei Anfragen `unique`, `ambiguous`, `contradictory`, zusätzlich einen absichtlich fehlenden Worker (`blocked`), `storage:0`, keine Forschungs-Engines im Hauptfenster und keine Chat-Anbindung. Die Protected-File-Prüfung war grün.

**Separates Vercel-Preview-Deployment:** `dpl_5sekrBRspVvidihhyr15pQZkCf4Z`, Commit `ae8954fdcc20dba468779b54f1142b35c45cff4e`, Branch `neryx/genesis-x-10-controlled-research-bridge`, Status **READY**, Target **Preview** (nicht Production).
- https://mein-lernbot-fo7mwidgs-pierags.vercel.app/eval/neryx-genesis-x-bridge-demo.html

Das Projekt erzwingt für nicht öffentliche Deployment-Domains möglicherweise **Vercel-SSO-Anmeldung**. `READY` beweist nur einen erfolgreichen Build, nicht die Browserqualität auf dem persönlichen iPhone. Die Produktdomain `mein-lernbot.vercel.app` ist **nicht umgestellt**.

**Wichtig:** Die NERYX-Forschungsbrücke ist ein **neues optionales Modul**, das in der eigenständigen Testseite aufgerufen wird. Der echte NERYX-Chat wurde noch *nicht* mit der Brücke verdrahtet. Das schützt bestehende Gespräche und gespeicherte Daten.
