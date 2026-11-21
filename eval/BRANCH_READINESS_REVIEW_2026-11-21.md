# NERYX – Branch-Readiness-Prüfung (2026-11-21)

## Umfang und Quellen
- Repository: y6bkfhyp4d-star/Mein-lernbot
- Hauptzweig: main
- Entwicklungszweig: neryx/s2-retrieval-scoring
- GitHub Compare-API: Status `diverged`, 228 Commits voraus, 57 zurück, 94 geänderte Dateien zum Zeitpunkt der Abfrage.
- Erfolgreicher letzter Corpus-GitHub-Actions-Lauf: https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/44905894620
- Der Lauf bestätigt 20 Korpustests und 306 bestehende Evaluationstests mit 0 Fehlern und 0 TODOs. Keine Freigabe für einen Merge.

## Freigabeblocker
1. **Branches divergiert:** Ein direkter Merge würde weit mehr als die drei GAP-Fixes betreffen. Die 57 Commits auf main seit dem gemeinsamen Vorfahren müssen zuerst berücksichtigt werden. Ob echte Git-Mergekonflikte vorliegen, wurde nicht mit einem Probe-Merge geprüft.
2. **Gesprächskontext wird bei „Neuer Chat“ nicht vollständig zurückgesetzt (Codebefund):** `app.js` definiert `neryxLastSubject`; `clearChat()` leert die Oberfläche und setzt `context`, aber nicht `neryxLastSubject`. Möglicher Themenübertrag in einen neuen Chat. Der Nutzerweg wurde noch nicht über einen realen Browser bestätigt.
3. **Unterschiedliche Service-Worker-Strategien:** `main/sw.js` setzt auf Netzwerk-frisch und nur HTML-Fallback (`neryx-recovery-v2`); der Entwicklungszweig enthält Offline-Skript-Caching (`neryx-offline-v4`). Vor Übernahme sind Migration, Aktualisierung und Offline-Verhalten im Browser zu prüfen.
4. **Begrenzter Testumfang:** Corpus-Harness verwendet Node `vm` mit deaktiviertem DOM-Start und In-Memory-Storage. Er prüft den tatsächlichen `routeAnswer` und vier echte Lern-/Antwortmodule, aber weder UI-Menü/„Neuer Chat“ noch echten Service Worker, Browser-Speicher oder Browser-Upgradepfad.

## Positiv nachgewiesen
- GAP-001: Nahrungs-Folgefrage sowie fehlendes Thema/Wissen und Konflikt getestet.
- GAP-002: „Und sein Lebensraum?“ mit bekanntem Kontext, ohne Kontext, nach Themenwechsel und bei Konflikt getestet.
- GAP-003: „Und was ist mit seinem Lebensraum?“ mit klärender Rückfrage nach Themenwechsel getestet.
- Andere bereits vorhandene Evaluationsprüfungen laufen auf dem Entwicklungszweig erfolgreich.

## Empfohlene Reihenfolge – einzelne kontrollierte Schritte
1. `clearChat()` im isolierten Harness gezielt als Nutzeraktion zugänglich machen und einen fehlschlagenden Regressionstest für den alten Themenbezug hinzufügen. Anschließend minimalen Fix vornehmen.
2. Prüfen, wie sich die 57 neueren main-Commits auf App, Module, Service Worker und Deployment auswirken; nur danach eine passende Integrationsstrategie wählen.
3. Browser- und Service-Worker-Tests inklusive Update/Migration durchführen.
4. Erst nach grünen Tests und Review gezielt integrieren; `main` bis dahin unverändert lassen.

## Grenzen der Aussage
Diese Prüfung ist eine statische Quellcode- und Branch-Differenzprüfung plus Betrachtung vorhandener CI-Ergebnisse. Es fand kein vollständiger lokaler Browserlauf und kein Probe-Merge statt. Eine reine erfolgreiche CI-Ausführung beweist nicht, dass alle App-Funktionen korrekt sind.


## Nachprüfung: Abgleich der 57 main-Commits (21.11.2026)

Die vorherigen Angaben zu `clearChat()` und CI beschreiben den damaligen Stand. Inzwischen ist der Kontext-Reset im Entwicklungszweig behoben und durch zwei zusätzliche Korpustests verifiziert: https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/44906296904 (22 Korpustests + 306 bestehende Tests, 0 Fehler).

**GitHub-Vergleich jeweils ab dem gemeinsamen Vorfahren `1571258dbc254f6885620aaa8cbbf1a1f71515ba`:**
- `main`: 57 zusätzliche Commits, **11** geänderte Dateien, ausschließlich unter `evolution/`.
- `neryx/s2-retrieval-scoring`: zum Zeitpunkt der Prüfung 234 zusätzliche Commits, **96** geänderte Dateien.
- **Schnittmenge der seit diesem Vorfahren geänderten Dateipfade: 0.** Es sind damit keine direkten Dateipfad-Überschneidungen der beiden Änderungsreihen nachgewiesen.
- Die elf main-Dateien befinden sich unter `evolution/phase70/`, `phase710/`, `phase711/`, `phase712/`, `phase713/`, `phase76/`, `phase77/`, `phase78/` und `phase79/`. Beispiele sind `knowledge.json` und Forschungs-/Audit-JSON.
- Statische Stichprobe: `index.html`, `app.js` und `sw.js` des Entwicklungszweigs enthalten keinen direkten Verweis auf `evolution/`. Das ist kein vollständiger Abhängigkeitsbeweis.

**Einordnung:** Ein klassischer Konflikt an identischen bearbeiteten Dateipfaden ist nach diesem Vergleich nicht zu erwarten. Ein tatsächlicher Probe-Merge wurde jedoch nicht ausgeführt; semantische, Laufzeit- und Deploy-Risiken bleiben. Vor allem die unterschiedlichen Service-Worker-Strategien erfordern separate Browser- und Upgrade-Tests. Die Branch-Divergenz alleine ist deshalb kein nachgewiesener Dateikonflikt, aber ein Anlass zu kontrollierter Integration.

**Nächster sicherer Einzel-Schritt:** Browser-/Service-Worker-Upgradeverhalten auf einer isolierten Testumgebung prüfen. Noch kein Merge in `main`.


## Browser-Offline-Nachprüfung (21.11.2026)

- Neuer GitHub-Actions-Workflow: `.github/workflows/neryx-browser-offline.yml` (Ubuntu 24.04, temporäres Playwright/Chromium, lokaler HTTP-Server, leerer Browser-Speicher).
- Echter Chromium-Test: https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/44907839734 — erfolgreich; 40 Cache-Einträge, Offline-Neustart der tatsächlichen `index.html`, Service-Worker-Kontrolle und vorhandene Chat- und Senden-Elemente.
- Dabei wurde ein Browser-Installationsproblem sichtbar: parallele `fetch()`-Antworten für App-Skripte wurden vor dem Cache-Schreiben nicht vollständig gelesen; der Worker blieb im Zustand `installing`.
- Minimaler Fix in `sw.js`: Jede Skriptantwort wird über `await response.clone().text()` vollständig übertragen, bevor die bereits vorhandene Cache-Staging-Logik fortgesetzt wird.
- Bestehender Scoring-Contract-CI nach Fix: https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/44907839781 — erfolgreich.
- Einschränkung: Kein echter iOS-WebKit-Test, kein händisches Durchspielen aller Chat-Funktionen, kein Live-Update unter Benutzerbedingungen und kein Probe-Merge nach `main`.

**Integrationsentscheidung weiterhin ausstehend:** Ein Browser-Offline-Smoke ist nun bestanden, ersetzt jedoch weder den WebKit-Test auf dem iPhone noch einen kontrollierten Merge-/Deployment-Check.

## WebKit-Engine-Prüfung (21.11.2026)

- Derselbe reale Browser-Smoke `eval/browser-offline-smoke.mjs` kann jetzt zwischen Chromium und WebKit per `NERYX_BROWSER` wählen.
- GitHub-Workflow `.github/workflows/neryx-browser-offline.yml` führt beide Engines in getrennten Jobs auf Ubuntu 24.04 aus: https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/44908372896.
- Chromium war auch nach dieser Erweiterung erfolgreich.
- Im ersten WebKit-Lauf https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/44908226049 installierte sich die App, aber eine `page.goto`-Navigation nach `context.setOffline(true)` scheiterte mit „WebKit encountered an internal error“. Das ist ohne weiteren Nachweis kein bestätigter Fehler in NERYX.
- Der WebKit-Test wurde deshalb auf das Abschalten des lokalen HTTP-Servers anstelle des Browser-Offline-Schalters umgestellt. **Bei Erstellung dieser Notiz lag noch kein erfolgreicher WebKit-Abschluss dieser Wiederholung vor.** Das WebKit-Ergebnis bleibt daher offen.
- Kein iOS-/Safari-Test auf echter Hardware; kein Merge nach `main`.

**Freigabestatus:** Browsergrundfall in Chromium verifiziert, WebKit-/iOS-Kompatibilität noch nicht freigegeben.
