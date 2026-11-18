# NERYX – Code-Bestandsaufnahme (18.11.2026)

**Zweck:** Technische Orientierung und sichere Vereinfachung. Keine bestehenden Benutzerdateien, Module oder Speicherstände gelöscht.

## 1. Abgrenzung und Methode

- GitHub-`main` vollständig als **Dateibaum** erfasst (802 Dateien, ca. 3,19 MB).
- Duplikate anhand **identischer Git-Blob-SHAs** ermittelt, nicht nur anhand von Dateinamen.
- Aktiven Einstieg (`index.html`), Lernkern (`app.js`), 11 Zusatzmodule sowie PWA/API und den NERYX-Prototyp inspiziert.
- Die wichtigsten späten Phase-7-Dateien und der Abschlussbericht geprüft.
- **Nicht** jeder historische Quelltext aller 802 Dateien wurde einzeln semantisch auditiert; keine Aussage über vollständige Testabdeckung oder iPhone-Laufzeitsicherheit.

## 2. Aktive Haupt-App

| Datei | Aufgabe | Hinweise |
| --- | --- | --- |
| `index.html` | Oberfläche, mobile Sidebar, Script-Einbindung | 12 externe Skripte einschließlich `modules/code-diagnose.js` |
| `app.js` | Chat, Befehle, Wissens- und Gedächtnisoperationen, Import/Export, `window.LernBotBridge` | Großer Einzelkern; Änderungen müssen Syntax und Kompatibilität prüfen |
| `antwort-ki.js` | Regelbasierte natürlichsprachige Antworten | Wird bei freien Fragen durch `intelligentAnswer()` verwendet |
| `konflikt-ki.js` | Konfliktprüfung und Befehle | Fängt Chat-Ereignisse teilweise ab |
| `gedaechtnis-ki.js` | Speicherabfragen und Gedächtnisanalyse | Bridge-Abhängigkeit |
| `agenten-ki.js` | Lernplanung und Agenten-Ausgaben | Eigener Chat-Interceptor |
| `aufgaben-ki.js` | Aufgabenverwaltung / bestätigte Änderungen | Bridge-Abhängigkeit |
| `wissens-ki.js` | Wissensanalyse | Liest Fakten |
| `feedback-ki.js` | Nutzerbewertungen | Eigener Speicher `meinLernBot.feedback.v1` |
| `wissensnetz-ki.js` | Wissensbeziehungen | Liest Fakten |
| `zentrale-ki.js` | Mehrere Analysen bündeln | Liest Bridge und Modulantworten |
| `diagnose-ki.js` | Diagnose und Fehlermeldungen | Prüft Speicher und Module |
| `modules/code-diagnose.js` | Quellcodeanalyse/Meisterprüfer | Separates Diagnosewerkzeug |
| `sw.js`, `manifest.webmanifest` | PWA-Start, Cache/Update, Installationsmetadaten | iOS-Homescreen-Updates separat testen |
| `api/chat.js` | Serverlose OpenAI-API, falls separat bereitgestellt | Nicht automatisch an Haupt-Chat angeschlossen; API kann Kosten verursachen |

### Daten – nicht anfassen

- Hauptspeicher: `localStorage['meinLernBot.v1']`
- Sicherungen: Schlüssel mit `meinLernBot.v1.sicherung.`
- Feedback: `meinLernBot.feedback.v1`
- Experimenteller NERYX-Chat: `neryx.chat.v1`
- Öffentliche Bridge: `window.LernBotBridge`; ihre Methoden-/Datenformate vor Umstrukturierung testen.
- Die Daten existieren *auf dem jeweiligen Gerät/App-Speicher*, nicht automatisch im öffentlichen GitHub-Repository.

## 3. Experimentbereiche

- `evolution/phase3...` frühe Modell-/Regel- und Portfolio-Experimente.
- `evolution/phase50...phase62` Agenten-, Welt-, Simulations-, Gedächtnis- und Reinforcement-Learning-Experimente.
- `evolution/phase70...phase713` Wissenssammlung, Recherche, Extraktion, Qualitätsprüfung, Abschlusstests und GitHub-Actions-Workflows.
- `evolution/neryx/` eigenständiger WebLLM-/WebGPU-Prototyp mit `client.js`-Bridge, **noch nicht automatisch Teil der Haupt-App**.

Das Phase-7.13-Ergebnis bezeichnet sich als `technisch_abgeschlossen_mit_offenen_wahrheitsfragen`: Strukturtests, aber **keine unabhängige Faktenverifikation oder bestätigte autonome Korrektur**.

## 4. Reale Duplikate

Von 802 Dateien (ca. 3.189.171 Bytes) gehören 549 Dateipfade zu 83 Gruppen mit exakt gleichem Blob-Inhalt. Die **zusätzlichen identischen Kopien** haben zusammengerechnet ca. **1.681.401 Bytes** (geschätzt auf Basis der Dateigrößen).

Beispiele: `world.js`, `memory52.js`, `agent54.js`, `rl62.js`, `model.js` erscheinen in vielen Phasen identisch.

**Nicht direkt löschen:** Alte HTML-Seiten/Tests können relative Pfade voraussetzen. Git speichert identische Blobs zudem intern bereits effizient. Bereinigung erst nach einer Abhängigkeitsprüfung und mit Archiv-/Migrationsplan.

## 5. Wichtigste technische Risiken

1. **Viele Chat-Interceptor-Listener:** Mehrere Module registrieren unabhängig `click`, `submit`, `keydown` und nutzen teils `stopImmediatePropagation()`. Das kann unerwartete Prioritäten und Fehler erzeugen.
2. **Monolithische `app.js`:** Viele Verantwortlichkeiten in einer Datei, riskant für große Text-Ersetzungen.
3. **Unvollständige Integration:** Die Haupt-App ruft `evolution/neryx/client.js` derzeit nicht auf. OpenAI-Backend und experimentelles Lokalmodell sind getrennte Wege.
4. **Mehrere Speicherbereiche:** Backup/Import muss zwischen Hauptwissen, Feedback und experimentellen Chatdaten unterscheiden.
5. **Offline-Zusage:** Der derzeitige Service Worker bevorzugt frisches JavaScript aus dem Netz; vollständiger Offline-Start ist dadurch nicht garantiert. Nicht „vollständig offline“ behaupten, bevor getestet.
6. **Veraltete Referenzen:** `README.md` in der Wurzel enthält offenbar historischen JavaScript-Code statt einer gewöhnlichen Installationsdokumentation; Dokumentationsstand und aktueller Code dürfen nicht verwechselt werden.
7. **Tests vor Code-Änderungen:** Frühere syntaktische Störung hatte den Senden-Button lahmgelegt. Neue statische Schutztests sind deshalb wichtig, aber ersetzen keine iPhone-End-to-End-Tests.

## 6. Vereinfachungsplan – risikogestaffelt

**A. Jetzt (ohne Umbau):** Smoke-Tests zu Dateisyntax, zentralen DOM-IDs, Modulpfaden, Speicher-Key und Event-Handlern. Datenstand exportieren und nachweislich lesbar halten.

**B. Danach:** Für jede aktive Chat-Erweiterung unterstützte Befehle und Listener dokumentieren; ein gemeinsames Kommando-Routing planen. Umstellung schrittweise und mit iPhone-Regressionstests.

**C. Anschließend:** Lernkern in logisch getrennte Module auslagern (Speicher, Wissen, Chat, UI), *ohne* die Speicherstruktur, die globale Bridge oder Befehle zu ändern.

**D. Erst nach Vergleich:** Historische Experimente archivieren; nur zusammengehörige Versionen konsolidieren und relative Importpfade vorher testen.

**E. Sprachmodell separat:** WebLLM-Lade- und Kontexttests auf dem iPhone, dann optional als ein Modus in **der bestehenden Haupt-App** integrieren. Antworten kennzeichnen, keine falschen Sicherheits- oder Wahrheitsversprechen.

## 7. Neu eingeführte Regressionstests

- `tests/neryx-smoke.test.mjs`
- `.github/workflows/neryx-smoke.yml`

Zum lokalen Prüfen mit Node 22: `node --test tests/neryx-smoke.test.mjs`.

Diese Tests prüfen Syntax und statische Kompatibilitätsmerkmale. Das Ergebnis eines GitHub-Actions-Laufs und tatsächliches iPhone-Verhalten müssen separat bestätigt werden.
