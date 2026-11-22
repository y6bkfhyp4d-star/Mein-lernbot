# NERYX – MASTER STATUS / Projektübergabe

**Stand:** 22. November 2026  
**Zweck:** Zentrale technische Übergabe und zuverlässiger Wiederanlauf für neue Chats, Reviews und sichere Vercel-Previews.  
**Repository:** https://github.com/y6bkfhyp4d-star/Mein-lernbot  
**Aktive Domain (nicht durch dieses Dokument veröffentlicht):** https://mein-lernbot.vercel.app  
**WICHTIG:** Diese Datei dokumentiert Zustände und ist keine automatische Freigabe zum Mergen, Deployen oder zum Verändern von Nutzerdaten.

> **Historische Entwicklung vor GENESIS X:** Siehe [NERYX_CHRONIK.md](NERYX_CHRONIK.md) für die detaillierte Entwicklung von LernBot 3.1 und 6.0 über die Phasen 3/5/7, iPhone-WebLLM-Tests, die ersten NERYX-Integrationen bis zu GENESIS X. Die Chronik unterscheidet Wünsche, historische Implementierungen, aktive App-Funktionen und konkret geprüfte Ergebnisse.\n\n## 1. Unveränderliche Projektregeln

- Die **aktive NERYX-App**, die **GENESIS-X-Forschung** und **separate Sprachmodell-Prototypen** nicht miteinander verwechseln.
- Keine Experimentdateien heimlich in `index.html`, `app.js`, `sw.js` oder den aktiven Chat integrieren.
- Vor jedem produktiven Release: genaues Git-Commit, Branch, Vercel-Projekt und Ziel-Environment prüfen; Tests, Offline-Funktion und gegebenenfalls Datenkompatibilität bestätigen. **Kein produktives Deployment oder Merge ohne ausdrückliche Freigabe.**
- `localStorage['meinLernBot.v1']`, Backup-Präfix `meinLernBot.v1.sicherung.`, `meinLernBot.feedback.v1` und andere Nutzerspeicher **nicht löschen oder automatisch migrieren**. GitHub/Vercel enthalten keine Sicherung der iPhone-lokalen Daten.
- Keine Frozen-Fixtures nachträglich anpassen, keine künstliche Erfolgsquote ausgeben. `eval/frozen.seal.json` ist im dokumentierten Stand inaktiv; echte unabhängige Frozen-Evaluation steht aus.
- Kostenpflichtige APIs/Modelle nicht stillschweigend aktivieren. `api/chat.js` ist ein separater optionaler API-Prototyp, nicht automatisch der Standardchat.
- **Codeänderungen in kleinen, reviewbaren Schritten**, erst separate Branches, dann Tests. Vorhandene Funktionen und UI erhalten. Projektentwicklung überwiegend auf iPhone.
- GitHub Actions-Erfolg bedeutet bestandene *spezifische* Tests, nicht automatisch Produktreife, Sicherheit oder allgemeine KI.

## 2. Drei getrennte Entwicklungsbereiche

### A. Aktive NERYX-Haupt-App (`main`)
- Einstieg: `index.html`; Kern: `app.js`; PWA: `sw.js`, `manifest.webmanifest`.
- Hauptfunktionen: regelbasierter Chat, Wissensbank, Gedächtnis, Lernen, Rückmeldungen, Aufgaben, Konflikt- und Diagnosefunktionen; zusätzliche `*-ki.js` und `modules/*`.
- `window.LernBotBridge` verbindet mehrere Funktionen. Es gibt historische unabhängige Chat-Interceptor und eine große `app.js`: Änderungen nur mit Regressionen.
- Weitere aktive/integrierte Komponenten werden in `NERYX_ARCHITEKTUR.md` und `NERYX_INTEGRATION_AUDIT.md` erläutert, darunter `modules/system-hub.js`, `modules/local-model-bridge.js` und begrenzte Reasoner-/Lernmodule.
- PWA-Offline-Cache im dokumentierten Stand: `neryx-offline-v4`. Er cached aktuelle App-Startdateien, **nicht automatisch alle GENESIS-X-Skripte**.
- **Baseline-Fakten:** Synthetische L1-Baseline 14/21, sieben bekannte Fehler; das ist keine allgemeine KI-Messung. Neuere Tests nicht als Verbesserung der 14/21 ausgeben, wenn L1 nicht separat gemessen wurde.

### B. GENESIS X 0.1–1.0 (noch experimentell, auf Draft-PR-Stack)
- **10 Kernmodule:** `modules/genesis-x.js` (0.1), `genesis-x-tools.js` (0.2), `genesis-x-logic.js` (0.3), `genesis-x-router.js` (0.4), `genesis-x-chain.js` (0.5), `genesis-x-verifier.js` (0.6), `genesis-x-verified-chain.js` (0.7), `genesis-x-diagnostics.js` (0.8), `genesis-x-research.js` (0.9), `genesis-x-research-lab.js` (1.0).
- Erweiterung (weiterhin **nur Forschungszweig**): `modules/genesis-x-integration-preview.js`, `genesis-x-worker.js`, `genesis-x-worker-client.js`.
- Tatsächlich nachgewiesene Fähigkeiten: begrenzte Suche über **vordefinierte** arithmetische Operatoren/Boolesche Regeln, Beispiel-Fit, Konsistenzprüfung, isolierte Forschungsdiagnostik. Keine eigenständige Operatorerfindung, keine nachgewiesene globale Generalisierung oder vollständige autonome KI.
- `execution_checked` bestätigt primär rechnerische Konsistenz. `coverage_gain_observed` bedeutet Abdeckung auf aufrufergelieferten Testdaten, **nicht** unabhängig gemessene Wahrheits- oder Intelligenzverbesserung.
- Risiken: gleichartige Auswerter teilen möglicherweise Fehler; öffentliche niedrigere Forschungs-Globals; Audit-Ledger nur im RAM und durch Direktaufrufe/neue Sitzungen umgehbar; Caller-Truth nicht unabhängig; gleiche-origin Worker sind keine Sicherheits-Sandbox; strikte Float-Gleichheit kann unerwartet sein.
- **Keine produktive Verdrahtung der GENESIS-X-Kette in NERYX!** Worker-Client gibt in Tests ausschließlich `publishable:false` und knappe Prüfmetadaten weiter.

### C. Historische Experimente
- `evolution/phase3...`, `phase50...`, `phase70...phase713`: getrennte Forschungsphasen; nicht automatisch produktive Module.
- `evolution/neryx/`: separater lokaler WebLLM/WebGPU-Prototyp mit expliziter Bridge; Hardware-/Safari-Verträglichkeit auf dem tatsächlichen iPhone nicht gesichert.
- Vor Wiederverwendung Altcode auf aktuelle Abhängigkeiten und Speicherpfade prüfen.

## 3. GENESIS-X-Draft-PR-Kette und Evidenz

Die Reihenfolge ist entscheidend: Jeder Forschungs-PR baut auf dem vorigen auf, **nicht direkt auf `main`**.

| PR | Inhalt / Zweck |
| --- | --- |
| [#19–#27](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pulls) | Schrittweiser Aufbau der GENESIS-X-Module 0.2–1.0; #28 zusätzlicher Architekturbericht |
| [#29](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/29) | Reproduktions- und Angriffstests |
| [#30](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/30) | A/B: Fassade / Status pro Modus |
| [#31](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/31) | Erste H-Artefaktprüfung, später nachgeschärft |
| [#32](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/32) | B2: Abhängigkeiten/Versionskontrollen |
| [#33](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/33) | C: lückenhafte Arrays |
| [#34](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/34) | D: Trennung von `truth` und Auswahl |
| [#35](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/35) | Abschluss-Audit (damals 130 GENESIS-X-Tests) |
| [#36](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/36) | H erneut: Router-Auswahl gegen Chain-Artefakte binden |
| [#37](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/37) | Audit-Wiederverwendungs-Ledger pro Sitzung |
| [#38](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/38) | Null-Eingaben und sparse Verifier-Arrays (157 GENESIS-X-Tests) |
| [#39](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/39) | Gesamtintegration auf Forschungsbranch & temporärer main-Kopie: 587/587 je Lauf |
| [#40](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/40) | Echter Chromium/WebKit-Offlinetest, ohne produktive Verdrahtung |
| [#41](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/41) | Nur Prüfmetadaten liefernde Integrationsvorlage; 595/595 Node-Tests |
| [#42](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/42) | Isolierter Worker + Client, Chromium/WebKit erfolgreich |
| [#43](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/43) | Worker-Neustart offline aus **Test-Service-Worker-Cache**, beide Engines erfolgreich |
| [#44](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/44) | Temporäres Overlay des **bestehenden** NERYX-Service-Workers, kein SW-Datei-Commit: Chromium/WebKit mit 55 Cache-Dateien inklusive 13 Forschungsmodule; Fehlschlag-Szenario 42 App-Dateien, 0 Forschungsmodule. 595/595 Node-Tests. |

Letzter geprüfter Forschungs-HEAD am 22.11.2026: `neryx/genesis-x-10-app-sw-overlay-audit` @ `f54ebe088f026044b13bda9506bc93bfa473d84e`.  
Neuester dazugehöriger CI-Lauf: https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45010203807 – 4 Jobs erfolgreich; **Test-Erfolg ist keine Release-Freigabe**.

**Unabhängiger Audit durch Claude:** Die ursprünglichen sechs Reparaturen waren teilweise unvollständig. Besonders das Artefakt-Herkunftsproblem H, mehrfach verwendete Auditdaten, öffentliche Experimentausgaben sowie Null-/sparse-Verhalten wurden nachfolgend behandelt. Claudes eigene Code-Rekonstruktion war nicht bytegenau; die unabhängige Bewertung muss weiterhin gegen Originalcode abgesichert werden.

## 4. Veröffentlichungen, GitHub und Vercel

- Projekt: **Vercel `mein-lernbot`**, GitHub-Verknüpfung `y6bkfhyp4d-star/Mein-lernbot`, Vercel-Team `pierags`. Die Domain `mein-lernbot.vercel.app` gehört zum Projekt.
- **`vercel.json`: `"git": {"deploymentEnabled": false}`**. Daher sind automatische Git-Deployments deaktiviert; geplante Deployments bewusst manuell anstoßen und Ziel nachprüfen.
- **Preview**: einen exakt benannten Nicht-`main`-Branch/Commit mit Vercel `target:preview` deployen, Ergebnisstatus/URL dokumentieren, visuell und mobil testen.
- **Production**: ausdrücklich freigegebener, durchgetesteter `main`-Commit; **nie** durch „Weiter“ oder eine bloße Review-Freigabe automatisch deployen. Produktivdomain und Datenkompatibilität separat prüfen.
- Vercel-Preview-URLs können über Deployment Protection/SSO geschützt sein; das ist kein Build-Fehler.
- Deployment und GitHub-Merge sind getrennte Vorgänge. Ein GitHub-Draft-PR ist kein produktiver Versionsstand.
- **Achtung**: Eine Vercel-Veröffentlichung ist kein Backup von `localStorage` auf dem iPhone. Vor Datenmigration zuerst manuell exportieren und Rücksicherung testen.

## 5. Aktueller Hauptzweig und bewusst offene Aufgaben

Bei Erstellung: `main` @ `0d4e0aa453314320b2afd5136f56b770ccaf129c`. Diesen SHA bei jeder neuen Arbeit erneut abfragen; spätere GitHub-Änderungen sind möglich.

Offen vor GENESIS-X-Produktion:
1. Echte Merge-Kandidatenprüfung gegen **aktuelles** `main` samt Chromium/WebKit und mobilem Safari auf Gerät.
2. Unabhängiger, geheim gehaltener Benchmark und klarer Vertrauensrahmen für externe Referenzdaten.
3. Verbindliches Release-Gate: GENESIS X darf ungeprüfte `candidate`-Ergebnisse nicht als wahre Nutzerantworten veröffentlichen.
4. Browser-/Worker-Speicher- und Ladeverhalten, Quotas, Cache-Invaliderung, Script-Integrität und Rollback.
5. Schutz vor doppelt verwendeten Tests über Neustarts hinweg (nur wenn echte unabhängige wissenschaftliche Auswertung angestrebt wird).
6. Bestandsaufnahme der aktiven Haupt-Chat-Routingprobleme und bekannte L1-Baseline-Fehler; keine pauschalen KI-Verbesserungsbehauptungen.

## 6. Wiederaufnahme in neuem Chat

**Kurzprompt:** „Wir entwickeln NERYX im Repo `y6bkfhyp4d-star/Mein-lernbot`. Lies zuerst `NERYX_MASTER_STATUS.md` und prüfe den aktuellen GitHub- und Vercel-Stand, bevor du irgendetwas änderst. Arbeite einen Schritt pro Antwort, direkt auf separaten Draft-Branches mit Tests. GENESIS X aus PR #19–#44 ist Forschung, nicht automatisch im Hauptchat aktiv. Bewahre `meinLernBot.v1` und Frozen; veröffentliche keine Produktion ohne meine klare Freigabe. Führe nach jedem Schritt den genauen Branch, Commit, CI und Deploy-Status auf.“ 

**Pflege:** Diese Projektakte nach jedem **bedeutenden** Release-/Architekturschritt aktualisieren; Datum, PR, Branch/Commit und belegte CI-Ergebnisse ergänzen. Keine Passwörter, Tokens, Nutzerdaten oder geheimen Frozen-Fragen in der Datei speichern.
