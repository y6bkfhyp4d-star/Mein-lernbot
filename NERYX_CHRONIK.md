# NERYX – Entwicklungschronik vom LernBot bis GENESIS X

**Stand: 22. November 2026 · Archiv- und Übergabedokument · keine Release-Freigabe**

> **Leitidee:** NERYX soll **die Weiterentwicklung der bestehenden „Mein LernBot“-App** sein, keine zweite, dauerhaft getrennte KI. Der bereits vorhandene Chat, das persönlich antrainierte Wissen, Aufgaben, Gedächtnis, Diagnosen und die iPhone-PWA müssen zusammenbleiben. Ein eigenes Sprachmodell und GENESIS X werden kontrolliert ergänzt, nicht über alte Funktionen gestülpt.

## Quellen und Beleggrenzen

Diese Chronik wurde aus dem GitHub-Repository, den bereits im Projekt enthaltenen Architektur- und Integrationsberichten sowie den früheren Chat-Übergaben und wieder auffindbaren Gesprächsinhalten erstellt. Besonders relevant:

- `NERYX_MASTER_STATUS.md` – aktueller technischer Stand, Release-Regeln und die PR-Kette.
- `NERYX_ARCHITEKTUR.md` – Bestandsaufnahme des aktiven Codes und der `evolution/`-Historie vom 18.11.2026.
- `NERYX_INTEGRATION_AUDIT.md` – Integration und aktive Module vom 19.11.2026 samt nachfolgenden Nachträgen.
- Überlieferte Übergabe `NERYX_PROJEKTUEBERGABE.md/.txt` vom 17.11.2026 – frühere Chat-Ereignisse, iPhone-Bildschirmtests, Produktentscheidung, Design und Risiken.
- `evolution/neryx/README.md` – eigenständiger WebLLM-Prototyp mit Schnittstelle zur ursprünglichen App.
- GitHub-Draft-PRs #19 bis #44 samt einzelnen GitHub-Actions-Ergebnissen.

**Wichtige Grenze:** Das ist eine gut belegte, ausführliche Rekonstruktion, aber **kein wortgetreues Archiv jeder Chat-Nachricht** und keine vollständige semantische Prüfung aller historischen Repository-Dateien. Wenn mehrere frühere Zusammenfassungen voneinander abweichen, entscheiden aktuelle Code- und Testbelege über den technischen Ist-Stand. Angaben zu älteren Implementierungen sind nicht automatisch Zusicherungen über die heutige Produktfunktion.

**Begriffsschlüssel für Aussagen:**
- **[Wunsch]**: geforderte Eigenschaft, nicht automatisch implementiert.
- **[Entwickelt]**: Code/Entwurf in Chat oder Repository erstellt; ohne gesonderten Nachweis keine Garantie, dass er aktiv läuft.
- **[Haupt-App]**: in der aktiven Haupt-Anwendung laut Integrations-/Architekturbericht eingebunden; tatsächlicher iPhone-Test bleibt gesondert.
- **[Experiment]**: separater Forschungscode, nicht Teil des Hauptchats.
- **[Geprüft]**: konkret belegter Test mit begrenzter Aussagekraft.

---

## A. Ursprung und Produktvision

### A1. Ein kostenloser LernBot auf dem iPhone

Der Ausgangspunkt war ein persönlicher Chatbot, der ohne dauerhaften kostenpflichtigen KI-Dienst funktioniert. Der Nutzer entwickelte und pflegte die App auf dem iPhone über GitHub und später Vercel. HTML, CSS und JavaScript standen im Mittelpunkt; Wissen wurde lokal gespeichert.

Frühe Kernwünsche:
- Fragen beantworten und von Nutzereingaben lernen.
- Neue Fakten mit strukturierten Kategorien speichern und wiederfinden.
- Bereits gelehrtes Wissen möglichst nicht vergessen.
- Chats und verschiedene Funktionen in einer benutzbaren Mobiloberfläche vereinen.
- Mit möglichst wenig Kosten und ohne vorausgesetzte OpenAI-API arbeiten.
- Code eigenständig prüfen können: ein separates Diagnosewerkzeug sollte erkennen, was in vorhandenen Dateien fehlt oder kaputt ist, und brauchbare Reparaturprompts erzeugen.

Die Daten gehörten nicht GitHub, sondern dem jeweiligen Browser-/PWA-Speicher. Der zentrale Schlüssel `meinLernBot.v1` blieb deshalb früh eine wichtige Kompatibilitätsvorgabe.

### A2. Warum der LernBot später „NERYX“ hieß

Am 17.11.2026 wurde **NERYX** als Name für die künftige gemeinsame KI festgelegt. Nicht beabsichtigt war eine dauerhaft getrennte zweite App. Die experimentelle Seite `evolution/neryx/` war eine Station auf dem Weg zu einem gemeinsamen Produkt.

Das Ziel war ausdrücklich anspruchsvoller als ein regelbasierter Chat: klassische LernBot-Funktionen, eigenes lokales Sprachmodell, Problemwerkzeuge, Kontext, Prüfung, Dokumente, Aufgaben und ein modernes Design sollten zusammenwachsen. Dieser Zielzustand ist ein **[Wunsch]**, nicht rückwirkend ein Beleg für vorhandene allgemeine KI.

---

## B. Die frühen LernBot-Versionen

### B1. LernBot 3.1: Multi-Brain und Code-KI (Anfang November 2026)

**[Entwickelt]** Der frühe Quellcode trug die Bezeichnung `LERNBOT 3.1 – MULTI-BRAIN-SYSTEM` mit acht Modulen. Dazu gehörten lokale Frage-Antwort-Wissensverarbeitung, Lernbefehle, einfache Ähnlichkeitssuche, Sicherheitsantworten, Import/Export und ein zunehmend größeres Code-Diagnosemodul.

Die damals übermittelten Quelldateien zeigten bereits den Grundkonflikt, den wir später immer wieder gelöst haben: Eine neue Fassung sollte **die alten Fähigkeiten behalten**, statt ein elegantes, aber funktional kleineres System neu zu schreiben.

### B2. LernBot 6.0: Drei Teile, ein gemeinsamer Speicher

Am 09.11.2026 wurden umfangreiche LernBot-6.0-Fassungen in **drei nacheinander eingefügten JavaScript-Teilen** erarbeitet. Die Teile waren ursprünglich als eine `app.js` innerhalb einer gemeinsamen IIFE gedacht:

1. Kern, Datenspeicher, Gedächtnis und Wissensbank.
2. Weitere Analyse-, Agenten- und Datenfunktionen.
3. Chat, Befehle, Dateien und Benutzeroberfläche.

**[Entwickelt]** Genannt wurden unter anderem:
- Fakten, Fragen/Antworten, Kategorien, Aliasbildung und unterschiedliche Fragearten.
- Langzeitgedächtnis und Beziehungen zwischen Wissenseinträgen.
- Wissensgraph, Projekte, Aufgaben, Dokumente und Snapshots.
- Auditprotokolle, Agentenstatistik, Code-Labor und Berichte über mögliche Verbesserungen.
- Rechercheideen und Import-/Exportfunktionen; **nicht** jede erwähnte Recherche war eine funktionierende echte Internetrecherche.
- Dunkles, violettes mobiles Layout, Sidebar/Drawer und Menüeinträge.
- Schutz vor unlesbaren oder beschädigten Browserdaten, Sicherung vor Migration und ein Mechanismus, der verlustreiches Speichern verhindern sollte.

**Konkrete damalige Störungen:** doppelt geschachtelte `(() => {`-Wrapper, Menüs ohne Klickfunktion, nicht gefundene DOM-IDs/Fallback-Elemente, alte Antworten nach Updates, GitHub-Verwechslungen zwischen `README` und `app.js`, mögliche doppelte Event-Handler. Diese Risiken begründen bis heute die Vorsicht vor Komplettüberschreibungen.

### B3. LernBot 6.0 „Paket 1“ und konkrete Wissenstests (14.11.2026)

**[Entwickelt und dialogisch ausprobiert]** Die Neufassung führte dynamische Kategorien, besseres Umlaut-Folding (`ä/ae`, `ö/oe`, `ü/ue`, `ß/ss`), unterschiedliche Frageformulierungen und zusammengesetzte Begriffe ein. Speicherstrukturen aus `meinLernBot.v1` sollten erhalten bleiben.

Zwei konkrete Beispiele aus der Entwicklung:
- `Okapi: Fellfarbe – rotbraun` sollte als frei benannte Eigenschaft korrekt gespeichert und später auf `Welche Fellfarbe hat das Okapi?` beantwortet werden.
- `Mars: Durchmesser – 6.779 Kilometer` wurde als Fakt gelernt. Die Varianten `Wie groß ist der Marsdurchmesser?`, `Welchen Durchmesser hat der Mars?`, `Wie groß ist der Durchmesser des Mars?` und `Was beträgt der Durchmesser vom Mars?` ergaben in dem dokumentierten Test dieselbe Antwort.

**[Geprüft im Gespräch]** Diese Beispiele zeigen einen lokalen Erfolg bei genau diesen Eingaben. Sie beweisen keine allgemeine semantische Sprachverarbeitung. Paket 2 (Synonyme, Gesprächskontext, Rückfragen, Fakten korrigieren/löschen, Konflikterkennung) war teilweise **geplant** und muss pro Teil anhand des tatsächlich übernommenen Codes beurteilt werden.

### B4. Der „Meisterprüfer“ für Quellcode

Der Nutzer wollte ein eigenes Werkzeug außerhalb der großen `app.js`, das **Dateien ansieht, Fehler benennt und einen konkreten Reparaturprompt formuliert**. Der Vergleich war ein Meister, der die Arbeitsqualität kontrolliert.

**[Entwickelt]** Hieraus gingen separate Code-Diagnose-Ansätze hervor, später im aktiven Aufbau u. a. `modules/code-diagnose.js`. Die Verfahren waren zunächst statisch/regelbasiert; eine echte allgemeine Code-KI, die beliebige Programme versteht und sich selbst sicher ändert, war nicht nachgewiesen.

### B5. Äußeres Erscheinungsbild und Bedienung

Das historische Layout verwendete Near-Black/Violett (`#11111a`, `#a78bfa`, `#8b5cf6`). Der Nutzer wollte später Gemini **als Design-Spezialisten** für Animationen, eigene Icons und hochwertige Oberflächenentwürfe einsetzen, nicht zwingend eine kostenpflichtige Gemini-API im laufenden Chat.

**[Wunsch/Designvorgabe]** futuristischer NERYX-Orb, SVG-Icons, Glow/Glassmorphism, flüssige Übergänge und Chat-Mikrointeraktionen – **ohne** iPhone-Akku-/GPU-Überlastung, Accessibility-Verlust oder Defekte an bestehenden DOM-IDs und Menüs. Der vollständige finale Designumbau ist nicht durch diese Chronik als abgeschlossen belegt.

---

## C. Die Forschungsphasen vor GENESIS X

### C1. Frühe Phasen 3.x: Regeln, Modelle und Fähigkeiten

**[Experiment]** Unter `evolution/phase3...` wurden regelbasierte Modell-/Strategie- und Portfolio-Ideen ausprobiert. Die Bezeichnungen einzelner Experimente sind keine verlässliche Bestätigung von nachgewiesener allgemeiner Intelligenz. Vor Nutzung im Produkt die aktuellen Dateien und Tests öffnen.

### C2. Phasen 5.0 bis 6.2: Gedächtnis, Agenten und simulierte Verbesserung

**[Experiment]** Das Repository dokumentiert unter `evolution/phase50...phase62` Entwicklungsansätze zu Gedächtnis, Agenten, Weltzuständen, Simulationen und Reinforcement-Learning-bezogenen Mechanismen.

Wichtig: „Agent“, „Weltmodell“, „Reinforcement“ oder „Selbstverbesserung“ sind hier Namen für konkrete experimentelle Systeme. Daraus folgt nicht, dass NERYX sich wie ein großes neuronales Modell aus freien Interaktionen neu trainiert.

### C3. Phasen 7.0 bis 7.13: Forschung, Wissen und Qualitätskontrolle

**[Experiment/teilweise CI-geprüft]** Unter `evolution/phase70...phase713` wurden Planung, Strategien, Gedächtnis-/Wissensarbeit, Wikipedia-basierte Recherche, Aussageextraktion, Widerspruchskontrollen und Qualitätsauswertung weiter aufgebaut.

Für Phase 7.13 wurde ein erfolgreicher GitHub-Actions-Lauf berichtet; der ausdrücklich verwendete Abschlussstatus lautete:

`technisch_abgeschlossen_mit_offenen_wahrheitsfragen`

Die überlieferte Auswertung enthielt:

| Messung | Ergebnis |
| --- | ---: |
| Reale Aussagen geprüft | 9 |
| Reale strukturelle Prüfhinweise | 0 |
| Explizite Widerspruchspaare | 0 |
| Synthetische Fälle | 13 |
| Synthetische Fehler erkannt | 6 |
| Synthetische Fehler übersehen | 1 |
| Synthetische Fehlalarme | 1 |
| Online-Nachrecherchen | 3 |
| **Unabhängig bestätigte Aussagen** | **0** |
| **Bestätigte autonome Sachkorrekturen** | **0** |

Diese Phase stellte technische Strukturen bereit. Sie lieferte **keinen gesicherten Beweis**, dass NERYX selbstständig zuverlässige Fakten entdeckt oder Fehler in der realen Welt korrekt repariert.

### C4. Alte Dateiduplikate und Architekturarbeit (18.11.2026)

Die frühere Architektur-Bestandsaufnahme untersuchte einen Repository-Stand mit 802 Dateien und ca. 3,19 MB. Dabei wurden viele byteidentische Kopien über historische Phasen hinweg festgestellt: 549 Dateipfade in 83 identischen Gruppen; die überzähligen Kopien betrugen rechnerisch ca. 1,68 MB. Das ist ein **historischer Messstand**, keine heutige garantierte Dateizahl.

Die wichtige Schlussfolgerung war: Ähnlich aussehende Module nicht blind löschen. Alte Testseiten können relative Pfade und historische API-Formen voraussetzen. Erst Abhängigkeiten prüfen, dann vorsichtig konsolidieren.

---

## D. NERYX als lokales Sprachmodell auf dem iPhone (17.–19.11.2026)

### D1. Der eigenständige WebLLM-Zwischenprototyp

**[Entwickelt]** In `evolution/neryx/` entstand eine separate Browseroberfläche mit `index.html`, `app.js`, `client.js`, `README.md`, Verbindungstest und optionalem Python-Proxy. Das Experiment nutzte `@mlc-ai/web-llm` und ein quantisiertes offenes **Qwen2.5-0.5B-Instruct**-Modell; eine größere 1.5B-Klasse wurde ebenfalls als Option diskutiert.

Wichtige Unterscheidung:
- Das **Anwendungsgerüst** wurde eigens entwickelt.
- Die Modellgewichte stammen aus einem bestehenden Open-Weight-Sprachmodell.
- Ein optionaler Python-/llama.cpp-Proxy läuft nicht auf GitHub Pages automatisch.
- Das Paket durfte nicht stillschweigend die bestehende `app.js` ersetzen.

### D2. Tatsächlich beobachtete iPhone-Tests

**[Beobachtet in früheren Nutzer-Screenshots laut Chat-Übergabe]** Der Nutzer öffnete die separate NERYX-Seite auf dem iPhone. Die Oberfläche zeigte nach Modellladen „Modell geladen. Du kannst chatten.“ beziehungsweise „Bereit“; das Modell erzeugte reale deutsche Textantworten.

**Die Qualität war damals jedoch schlecht:**
- Bei einer Selbstvorstellung kamen unverständliche Formulierungen.
- Bei einer Okapi-Frage entstanden erfundene Begriffe.
- `12 m² × 150 ml/m²` wurde mit falscher Einheit beantwortet; korrekt sind **1.800 ml = 1,8 Liter**.
- Bei abblätternder Wandfarbe antwortete das Modell teils mit unpassendem Sprach-/Wörterbuchkontext.

**Einordnung:** Das belegt einen tatsächlichen Modellstart und fehlerhafte Ausgaben in damaligen Tests. Es belegt weder allgemeine Brauchbarkeit noch automatisch die genaue Fehlerursache. Ein sauberer Benchmark für Prompting, Chatvorlagen, Tokenkontext und Modellgröße blieb offen.

### D3. Integration in die ursprüngliche NERYX-Haupt-App

**[Haupt-App laut Integrationsbericht 19.11.]**
- `modules/system-hub.js`: zusammengeführte Zugriffe wie `Systemstatus`, `Problem lösen:`, `Weg planen:`.
- `modules/local-model-bridge.js`: optionaler, ausdrücklich zu aktivierender Zugriff auf das lokale Sprachmodell mit `Sprachmodell laden`, `KI fragen:`, `KI-Modus an/aus`, `Sprachmodell trennen`.
- Vorhandenes Wissen und deterministische Werkzeuge sollten Vorrang vor unsicheren Modellformulierungen erhalten; ein neues kostenpflichtiges API-Backend wurde dafür nicht vorausgesetzt.

**[Haupt-App laut späterem Bericht]** Ein spezialisierter `modules/math-verifier.js` fing einen eng begrenzten Wandflächen-Fall ab. Bei fehlenden Angaben (unterschiedliche Wände, Türen/Fenster) sollte er Rückfragen stellen. Er war **kein** allgemeiner mathematischer Wahrheitsprüfer.

Später kam `modules/orchestrator.js` als zentralere Aufrufstelle hinzu. „NERYX“ sollte **das ganze System** bezeichnen, Qwen lediglich ein austauschbares Sprachmodell. Die älteren unabhängigen Chat-Listener blieben ein bekanntes Architekturproblem.

---

## E. Sicherere Antworten, Tests und reale Produktgrenzen (18.–21.11.2026)

### E1. Kontrollierte Problemlösungsmodule

**[Haupt-App laut Repositorybericht]** Für Zahlenregeln, Zahlenfolgen, begrenzte mehrstufige Mathematik und Rasterwege wurden eigene Module ergänzt, etwa `modules/neryx-reasoner.js`, `modules/rule-patterns.js`, `modules/capability-test.js`. Diese Systeme wählen aus **bekannten Operatoren/Regeln**. Sie ersetzen keine allgemeine offene Mathematik oder symbolische Forschung.

### E2. Lern-, Kontext- und Bedeutungsarbeit

**[Haupt-App laut Repositorybericht]** Unter `modules/` entstanden bzw. wurden eingebunden: `learning-coordinator`, `learning-hub`, `learning-lab`, `auto-learning`, `learning-evaluation`, `learning-audit`, `context-learning`, `word-learning`, `meaning-links`, `meaning-benchmark`, `topic-learning`, `personal-learning-test`, `conversation-math`, `batch-test`.

Die wesentliche Veränderung war der Wechsel von „erfinde eine Antwort aus Wortähnlichkeit“ zu „prüfe, welcher Teil nachweislich aus gespeichertem Wissen oder einem eng definierten Tool folgt“. Persistentes Lernen und semantisches Verstehen sind dabei unterschiedliche technische Aufgaben.

### E3. Dokumentenbeantwortung, Review, Gegenproben

**[Entwickelt und teilweise integriert]** Dokument-Relevanzfilter, Antwort-Vollständigkeitskontrollen und `genesis-gegenprobe`-/`genesis-2`-/`genesis-3`-Module sollten vermeiden, dass verwandte Wörter als gesicherte Antworten ausgegeben werden. Das war ein ernst zu nehmender Fortschritt in der Architektur – aber keine unabhängige Wahrheitsgarantie.

### E4. Synthetische L1-Baseline und Frozen-Konzept

**[Gemessen 19.11.]** Die erste dokumentierte synthetische L1-Suite hatte 21 Fälle aus sieben erfundenen Dokumenten. Ergebnis **14/21 bestanden**, sieben Fehler, darunter Suchgrenzen bei Paraphrasen/Mehrthemenfragen und eine nicht erkannte Schritt-Aufforderung. Die bekannten Fehler wurden später einzeln klassifiziert; niemand durfte sie durch stilles Ändern der Soll-Erwartungen schönrechnen.

**Frozen:** Für einen fairen unabhängigen Test wurden eine geheime, separat erstellte Aufgabenbasis und ein SHA-256-gebundener Runner vorgesehen. Laut Statusdokument war das Frozen-Seal **noch nicht aktiv**; kein heimlich vorhandener Gesamterfolg darf behauptet werden.

### E5. Browser, PWA und Datenverträglichkeit

**[Geprüft in späteren CI-Läufen]** Chromium/WebKit-Browser-Smokes kontrollierten Start, Service-Worker-Kontrolle und Offline-Caches. Die derzeitige NERYX-App verwendete in den geprüften Läufen das Cache-Paket `neryx-offline-v4` mit 42 Startdateien.

**Daten:** `meinLernBot.v1`, Präfix `meinLernBot.v1.sicherung.`, `meinLernBot.feedback.v1`, `neryx.chat.v1` und andere Schlüssel sind wichtige Grenzen. Eine neue Domain oder Neuinstallation kann den lokal gespeicherten Bestand vom alten Ursprung trennen. GitHub-Commits und Vercel-Builds sind **keine iPhone-Datenbackups**.

---

## F. GENESIS X (Forschung vom modularen Vergleich bis zum Worker)

### F1. Forschungs-Module 0.1–1.0

**[Experiment]** Die Entwicklung begann mit einem begrenzten Vergleich bekannter Rechen-/Regelstrategien und wurde um numerische Werkzeuge, Boolesche Regeltests, Routing, Ketten, Verifikation, geprüfte Ketten, Diagnosen, Forschungszyklus und Fassade erweitert.

Die genaue Bezeichnung und Version der **zehn** Module stehen in `NERYX_MASTER_STATUS.md`. Die späteren Audits verdeutlichten: Ein internes `execution_checked` sagt etwas über Ausführungskonsistenz, aber nicht über Wahrheit im Alltag aus.

### F2. Audit-Härtung und Wiederverwendungsschutz

**[Experiment + CI]** PR #29–#38 prüften und korrigierten u. a. Status-Manipulation, Vertrauensgrenzen, Abhängigkeitsversionen, lückenhafte Daten, die Trennung von `truth` und der Auswahlstrategie, Chain-Artefakt-Herkunft, Audit-Wiederverwendung und Null-Eingaben.

Sitzungsgebundene Audit-Ledger sind kein Schutz über App-Neustarts hinweg; eine same-origin Forschungsfunktion ist kein geheimes Prüfverfahren.

### F3. Vollständige Regression und Browser-Tests

**[Geprüft]**
- PR #39: 587/587 Tests auf voller Forschungsbasis und 587/587 auf einer temporären `main`-Kopie (kein echter Merge).
- PR #40: reale isolierte Chromium/WebKit-Ausführung sowie unveränderte NERYX-Offline-Smokes.
- PR #41: nur Prüfmetadaten liefernde Integrationsvorlage; 595/595 Node-Tests.
- PR #42: eigenständiger Worker und streng begrenzter Client, Chromium/WebKit erfolgreich.
- PR #43: **14 Dateien** im isolierten Test-Service-Worker-Cache; **neue** Worker-Ausführung nach Offline-Neustart in Chromium/WebKit erfolgreich.
- PR #44: temporäre Kompatibilitätsvariante des bestehenden NERYX-Service-Workers. Mit vollständig geladenem GENESIS X: **55** Cache-Dateien, davon **13** experimentelle; Worker läuft offline. Mit absichtlich fehlendem Forschungsmodul: **42** App-Dateien, **0** experimentelle; normale App läuft weiterhin offline. **595/595** Node-Tests, Schutz produktiver Dateien erfolgreich.

Detaillierte Links und konkreter Forschungs-Branch in `NERYX_MASTER_STATUS.md`.

**Wichtig:** Bei #44 wurde `sw.js` nicht verändert, sondern im Test eine **im Arbeitsspeicher erzeugte Variante** ausgeliefert. GENESIS X ist deshalb nicht in der aktuellen Live-App aktiviert. Linux-WebKit ist nicht physisches iPhone-Safari.

---

## G. Vercel, Veröffentlichungen und geplanter Zusammenbau

### G1. Was derzeit veröffentlicht wurde

- Ursprünglich GitHub Pages, später zusätzlich Vercel.
- Vercel-Projekt `mein-lernbot`, Team `pierags`, Produktionsdomain `mein-lernbot.vercel.app`.
- `vercel.json` enthält `"git": {"deploymentEnabled": false}`: keine automatische Git-Veröffentlichung.
- Am 22.11.2026 wurde die **Dokumentations-Preview** aus PR #45 / Branch `neryx/master-status-vercel-preview-2026-11-22` bei Vercel **READY**: https://mein-lernbot-hwf5tmlpd-pierags.vercel.app, Commit `2c83035971ce9bd188fc9223e813b4939f7ce84e`. Das war **kein produktiver GENESIS-X-Release**.

### G2. Was noch nicht freigegeben ist

1. GENESIS-X-PR-Stack kontrolliert auf aktuellen `main` abgleichen, ohne ältere Funktionen zu überschreiben.
2. Wirklich unabhängige Qualitätsmessung, keine Testdatennachjustierung.
3. Nachweis der Funktionskompatibilität des gesamten Chat-Routings und der iPhone-PWA.
4. Datenschutz, Speicher-/Import-/Export- und Update-Verträglichkeit vor jeder Produktionseinführung.
5. Auch die **Designwünsche und LernBot-6.0-Langzeitfunktionen** bei der Integration berücksichtigen.
6. Neue Vercel-Preview des **integrierten** Kandidaten testen; erst dann nach ausdrücklicher Nutzerfreigabe produktiv veröffentlichen.

**Keine automatische Produktion:** Das Wort „Weiter“ oder „Mach fertig“ autorisiert, dieses Dokument fertigzustellen, nicht das Merge aller Experimente nach `main` oder ein Production-Deployment.

---

## H. Entscheidungsregister: Was ist was?

| Funktion/Idee | Historische Einordnung | Heute notwendiger Beleg |
|---|---|---|
| Lokal gespeicherte Fragen/Fakten, Chat, Export/Import | LernBot-Kern, [Haupt-App] | Datenschema/Export/Import auf iPhone testen |
| Dynamische Kategorien und Mars-/Okapi-Varianten | LernBot 6.0 Paket 1, [im Chat ausprobiert] | Aktuelle Haupt-App mit denselben Tests prüfen |
| Wissen, Gedächtnis, Aufgaben, Agenten, Codeanalyse | LernBot 6.0 und NERYX-Module | Aktive Modulpfade, UI-Befehle, Konflikte prüfen |
| Futuristisches Gemini-Design mit Orb/Icons | [Wunsch], teils Entwürfe | Kein vollendetes Design ohne Browserabnahme behaupten |
| Phase-5-/6-Simulation und Selbstverbesserung | [Experiment] | Eigenständige messbare Wirkung nötig |
| Phase 7.13 Wissen/Recherche | [Experiment], technische CI | Wahrheit/autonome Korrektur weiterhin unbestätigt |
| Lokales Qwen-WebLLM | [iPhone-Modellstart beobachtet], später Bridge | Konkrete Sprachqualität, Kontext und Gerätelimits messen |
| Zahlen-, Raster- und begrenzte Flächenwerkzeuge | [Haupt-App laut Audit] | Begrenzte Operatoren plus negative Fälle testen |
| L1 14/21 und Frozen | [Gemessen]/[noch nicht aktiviert] | Unabhängige, unveränderte Holdout-Aufgaben |
| GENESIS X 1.0 | [Experiment], 595/595 Regressionen in PR #44 | Keine Produktfreigabe oder selbstständige Wahrheit ableiten |
| GENESIS X Worker und Offline-Overlay | [Geprüft in Linux-Browsern] | Echter iPhone-Test und kontrollierte Produktionsintegration |
| Vercel-Preview PR #45 | [READY] | Nur Dokumentationsstand, kein GENESIS-X-Release |

---

## I. Was für neue Chats dauerhaft gilt

1. **Erst** `NERYX_MASTER_STATUS.md` und **diese** `NERYX_CHRONIK.md` lesen, dann `NERYX_ARCHITEKTUR.md` und `NERYX_INTEGRATION_AUDIT.md`; bei Codefragen tatsächliche Dateien und GitHub-HEAD prüfen.
2. NERYX ist die Fortsetzung von Mein LernBot. Die getrennte WebLLM-Demoseite ist ein Zwischenschritt, kein neues Hauptprodukt.
3. iPhone-freundlich und kostenbewusst entwickeln; nicht ohne Erlaubnis kostenpflichtige Modelle/APIs hinzufügen.
4. Alte Daten inklusive `meinLernBot.v1` und Backups bewahren; keine PWA-Neuinstallation ohne erfolgreich getestete Sicherung.
5. Einen überprüfbaren Entwicklungsschritt nach dem anderen; GitHub-Draft-PRs, Tests und präzise Branch-/SHA-Angaben.
6. Experiment, aktiv eingebunden und real getestet klar unterscheiden. Jeder später hinzugefügte Abschnitt bekommt Datum, Belege und offen bleibende Risiken.
7. **Kein Merge nach main und kein Live-Deployment ohne ausdrückliche Freigabe.**

**Pflegehinweis:** Neue Funktionen nachweisorientiert ergänzen; vergangene Fehlversuche und offene Qualitätsgrenzen nicht aus der Chronik entfernen. Diese Geschichte dokumentiert die tatsächliche Entwicklung, nicht bloß eine Wunschliste.
