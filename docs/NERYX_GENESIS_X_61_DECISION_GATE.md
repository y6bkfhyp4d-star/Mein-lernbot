# GENESIS X #61 – gemeinsame Evidenzentscheidung

Der neue `eval/neryx-genesis-x-61-decision-gate.js` führt **nur in einer separaten Forschungsansicht** drei streng getrennte Wege zusammen:

1. **Eng definierte Wandfläche:** Der unveränderte `NERYXOrchestrator.plan` erkennt die Wandflächenaufgabe; der bestehende `NERYXMathVerifier.wallArea` ermittelt die Maße. Die unabhängige #61-Grenzprüfung multipliziert Anzahl × Breite × Höhe erneut und vergleicht mit den zurückgegebenen Werten. Nur bei vollständiger Übereinstimmung wird ein Wert in m² als **begrenztes, deterministisch nachgerechnetes Ergebnis** angezeigt; weiterhin `publishable:false` im Forschungs-Vertrag.
2. **GENESIS-Formularanfrage:** Die bereits vorhandene #60-Route und die #56-Worker-Brücke liefern nur `ambiguous`, `review_required`, `unconfirmed`, `invalid`, `blocked`, `unavailable`. Keine Zahlen, Programme, Kandidatennamen oder Vorhersagen gelangen nach außen. Selbst ein gefundener Kandidat ist keine unabhängig bestätigte Regel.
3. **Andere Sprach-/Wissensfragen:** `unverified`. Keine Qwen-Anfrage, kein erfundener Wahrheitsnachweis. Andere vorhandene Fachwerkzeuge gelten in #61 noch **nicht** als unabhängig verifiziert.

Für fehlende Identitätsangaben bei Wandflächen wird `needs_clarification` statt einer geratenen Zahl zurückgegeben. Unerwartete Daten oder fehlende Abhängigkeiten führen zu einem fail-closed-Status.

## Sicherheits- und Integrationsgrenze

Alle neuen Dateien liegen unter `eval/`, hinzu kommen nur `docs/` und ein isolierter GitHub-Workflow. Bestehende Dateien, Modellgewichte, Service Worker, lokale Daten, Frozen-Siegel und der produktive Chat bleiben unverändert. **Kein Merge in main, kein Produktions-Deploy, kein automatischer Agent.** Die Forschungsversion dient lediglich dem Prüfen einer künftigen Entscheidungsstrategie.

Node-VM-Prüfungen testen die echten, unveränderten fachlichen Module; zusätzliche Chromium-/Linux-WebKit-Tests testen die tatsächliche Worker-Grenze in einer iPhone-artigen Ansicht. Ein erfolgreicher Linux-WebKit-Test ersetzt noch keinen Test auf Safari/iOS.
