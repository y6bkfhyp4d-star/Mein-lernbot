# GENESIS X 1.0 – Ambiguity-Worker offline über NERYX-Service-Worker

**22. November 2026 – Forschung nach PR #53, nicht produktiv.**

## Ziel

Der getrennte GENESIS-X-Mehrdeutigkeits-Worker hat in Chromium und Linux WebKit online funktioniert. Diese Stufe überprüft, ob sich der **echte bestehende NERYX-Service-Worker** mit einer rein temporären, optionalen Forschungs-Cache-Erweiterung testen lässt und ob NERYX bei einem fehlenden Experimentmodul weiterhin offline startet.

## Implementiert

- `eval/genesis-x-ambiguity-sw-overlay.mjs`: Baut auf dem vorherigen geprüften `eval/genesis-x-sw-overlay.mjs` auf und ergänzt 3 neue Worker-/Gate-/Client-Skripte zu den 13 vorhandenen Forschungsdateien. Die **Originaldatei `sw.js` wird nicht überschrieben**. Für den Testserver wird ausschließlich eine im Speicher erzeugte Variante zurückgegeben.
- `eval/genesis-x-ambiguity-real-sw-offline-smoke.mjs`: öffnet die **vollständige NERYX-Haupt-App** in Chromium beziehungsweise Linux WebKit, wartet auf den bestehenden SW, kontrolliert Cache und UI, schaltet den lokalen HTTP-Server wirklich ab, lädt die App anschließend offline neu und startet erst dann über den explizit nachgeladenen Forschungs-Client den neuen Mehrdeutigkeits-Worker.
- **Positiver Fall:** Alle 16 optionalen Forschungsressourcen werden überprüft und als Gruppe zusätzlich zu den 42 App-Dateien im SW-Cache gehalten – erwartet **58 Cache-Dateien**. Der neue Worker meldet `review_required` bei einem unterscheidbaren zweistufigen Beispiel und `ambiguous` bei den bekannten unterbestimmten Daten, jeweils `publishable:false`. Der Hauptchat bleibt bedienbar.
- **Negativer Fall:** Der Testserver liefert `modules/genesis-x-ambiguity-gate.js` absichtlich nicht aus. Dann darf keine unvollständige Forschungsdatei zwischengespeichert werden: erwartet **42 App-Dateien und 0 Forschungsdateien**. Der Offline-Hauptchat darf dadurch nicht ausfallen.
- Der Test prüft, dass nach Abschalten des Servers **keine zusätzlichen HTTP-Anfragen** eintreffen, keine Rohprognosen über die neue Schnittstelle gelangen, keine Forschungs-Engine-Globals im Hauptfenster sichtbar werden und keine lokalen Nutzerdaten geändert werden.

Die ursprünglichen GENESIS-X-Protokolle bleiben unverändert. Die neue SW-Overlay-Datei ist ausdrücklich nur ein **Testwerkzeug**; ein solcher Cache ist aktuell nicht als Änderung für die reale App in GitHub registriert.

## Qualitäts- und Freigabegrenzen

Erfolgreiche Tests in Linux-WebKit sind kein Nachweis auf einem physischen iPhone mit Safari. Ein Worker ist keine starke Sicherheits-Sandbox für unzuverlässigen Same-Origin-Code. Die interne `review_required`-Rückmeldung prüft nur Konsistenz auf begrenzten öffentlichen Aufgaben, nicht faktische Richtigkeit.

**Kein Merge nach main, kein Vercel-Production-Deployment, keine automatisch aktivierte Forschungsfunktion.** Das Speicherformat `meinLernBot.v1` und der vorhandene Browser-/PWA-Speicher bleiben unverändert.
