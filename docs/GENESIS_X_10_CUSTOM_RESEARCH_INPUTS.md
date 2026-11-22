# GENESIS X #57 – freie Zahlenbeispiele in einer getrennten Forschungsansicht

**22.11.2026 · Stacked Research-Draft nach #56 · keine Live-Integration**

## Umsetzung

`eval/neryx-genesis-x-custom-input.html` und `eval/neryx-genesis-x-custom-input-ui.js` bilden eine neue optionale Oberfläche, in der Nutzer eigene numerische Trainingsdaten, Validierungsdaten und getrennte Probe-Eingaben eingeben können.

Das Format ist bewusst einfach und iPhone-kompatibel: eine Zeile `x;y` je Trainings-/Validierungsbeispiel (Dezimalkomma erlaubt), eine Zeile `x` je Probe. Drei bis 15 Trainings-, zwei bis zehn Validierungszeilen und eine bis sechs Proben werden erlaubt. Doppelte x-Werte, Überschneidung mit Proben, NaN/Infinity, ungültige Notation, zu viele Eingaben und Zahlen außerhalb der bestehenden Worker-Grenzen werden **vor** dem Forschungsauftrag verworfen.

Die Oberfläche setzt weiterhin nur das strikt validierte `NERYXGenesisXResearchBridge.review({version:1,kind:'research_check',task})` aus #56 ein. Intern geprüfte, mehrdeutige und nicht bestätigte Aufgaben erhalten ausschließlich einen **deutschen Prüfstatus**. Es gibt keine Rechenergebnisse, Rohprogramme, Datenspeicherung, Internet-Recherche oder automatische Übergabe an den NERYX-Chat. Auch `review_required` ist **keine** extern verifizierte Wahrheit.

## Testkonzept

Der neue mobile Browser-Test gibt Daten **in die Textfelder** ein und kontrolliert nicht nur die drei schon bekannten Typen, sondern auch selbst gewählte Zahlen mit Dezimalkomma, fünf bewusst ungültige Eingaben, den vollständigen Verzicht auf Worker-Aufrufe bei ungültigem Format, sowie einen absichtlich entfernten Worker. Chromium und Linux WebKit werden unabhängig getestet. Die bisherige Node-Regression und die Protected-File-Prüfung laufen erneut.

## Grenzen

Die mathematische Suchfunktion bleibt auf die sechs ursprünglichen Operatoren, die Konstanten 0–3 und höchstens zwei Schritte begrenzt. Ein `ambiguous` ist ein Ergebnis eines begrenzten Suchraums und konkreter Probe-Eingaben. Die Seite ist kein freier KI-Chat.

Keine Änderung an `main`, `index.html`, `app.js`, `sw.js`, `meinLernBot.v1`, vorhandenen Forschungsmodulen oder dem Vercel-Produktionsdeployment. Nur ein neuer Forschungszweig mit eigenständiger Seite; kein Mergen oder Deployment in Produktion ohne ausdrückliche Freigabe.

## Ausgeführte Tests und opt-in Teststand

[GitHub Actions #45017236765](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45017236765) – **4/4 Jobs erfolgreich**.

- Gesamt-Regressionen: **625/625** bestanden, keine Fehler.
- Chromium: 4 gültige frei eingegebene Szenarien, 5 lokal abgewiesene ungültige Szenarien, fehlender Worker `blocked`, `localStorage:0`, keine Chat-Anbindung.
- Linux WebKit: dieselben Ergebnisse.
- Schutzprüfung: keine Änderungen an aktiver App, existierenden Forschungsmodulen oder Frozen.

**Separates Preview Deployment – READY, Target Preview, kein Production-Deploy:**
- Deployment `dpl_2ruULuHvN5K6VwVVMyU24LKMz13E`
- Commit `7639e42a4ea0f9616726d6cb2233ca92deb03b26`
- Forschungsformular: https://mein-lernbot-ksynkvbvz-pierags.vercel.app/eval/neryx-genesis-x-custom-input.html

Vercel-SSO-Schutz kann eine Anmeldung erfordern. Browserautomatisierung ist kein Ersatz für einen manuellen Safari-Test auf dem iPhone. Die Produktdomain wurde nicht verändert.
