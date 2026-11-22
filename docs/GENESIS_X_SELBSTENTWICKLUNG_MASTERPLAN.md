# GENESIS X – Masterplan für kontrollierte Selbstentwicklung von NERYX

**Status:** Architektur-/Entwicklungsplan, **keine** fertige Selbstentwicklungsengine.  
**Erstellt:** 22.11.2026  
**Planversion:** 1.0  
**Projekt:** [Mein LernBot / NERYX](https://github.com/y6bkfhyp4d-star/Mein-lernbot)  
**Dokumentationsbasis:** `main` bei `f50fbd9371087722f1a268d3e0cafe232c4a028c` (der Stand kann sich nach der Bestandsaufnahme weiterentwickeln).  
**Wichtig:** Dieses Dokument begründet **keine** Erlaubnis, `main` oder die Produktiv-App ohne ausdrückliche Nutzerfreigabe zu verändern.

> **Leitidee:** GENESIS X soll Probleme im NERYX-Code erkennen, kleine Verbesserungsmodule mit einem Sprachmodell entwerfen, diese unabhängig und isoliert prüfen lassen und **nur überprüfte Vorschläge** einem Menschen zur Freigabe präsentieren. Die KI darf Sicherheitsregeln, Tests oder Produktivcode nicht selbstständig überschreiben.

## 0. Für einen neuen Chat: Sofortüberblick

Wenn ein Chat voll wird, diesen Link übergeben und schreiben:
> „Bitte lies `docs/GENESIS_X_SELBSTENTWICKLUNG_MASTERPLAN.md` im GitHub-Repo `y6bkfhyp4d-star/Mein-lernbot`. Wir entwickeln die **kontrollierte GENESIS-X-Selbstentwicklungsengine** nach diesem Plan. Prüfe zuerst den aktuellen Stand der sechs Phasen und den aktuellen `main`-Commit. Setze ausschließlich den nächsten noch offenen Schritt um, ohne vorhandene Funktionen zu zerstören und ohne `main` bzw. Produktion ohne meine ausdrückliche Freigabe zu verändern. Gib klare Testnachweise an. Der bisherige GENESIS-X-Mathematikprüfer ist **nicht** die Selbstentwicklungsengine.“

**Derzeitiger Phase-Status:** Bestandsaufnahme der Kernarchitektur durchgeführt; **Phase 1 bis 6 noch nicht als abgeschlossen belegt.** Frühere GENESIS-X-Forschungsphasen #60–#65 und die 2026-11-22 veröffentlichte Chat-Anbindung sind ein **separates**, funktionierendes Teilprojekt, aber **kein** Nachweis für automatische Softwareentwicklung.

## 1. Ziel, Abgrenzung und Erfolg

### Gewünschte Fähigkeiten

1. **Selbstanalyse:** Quellen und Schnittstellen aus GitHub inventarisieren; konkrete technische Probleme mit **Datei, Zeile, Schweregrad, Reproduktionshinweis und Vertrauensniveau** melden.
2. **Verbesserungsentwurf:** Nur auf einen eng gefassten Auftrag einen Vorschlag für ein **kleines** JavaScript-Modul oder einen minimalen Patch erzeugen (optional lokales Qwen 2.5, ohne kostenpflichtige API).
3. **Sicherheitsprüfung:** Änderungspfad, Größe, Verbotenes, Syntax, Tests und Berechtigungen durch **vom Generator unabhängige** Regeln prüfen.
4. **Qualitätsprüfung:** Regressionsfreiheit und Verbesserung einer **vorher festgelegten** Messgröße anhand unabhängiger Tests beurteilen.
5. **Vorschlagen statt selbst veröffentlichen:** Ergebnis mit Diff, Bericht, Messwerten und Risiken zur **menschlichen Freigabe** stellen, bei Bedarf als Draft-PR. **Kein Bot-Merge nach `main`.**
6. **Lernledger:** Gescheiterte und erfolgreiche Entwürfe samt Ursachen erfassen, um spätere Aufträge und Vorlagen zu verbessern. **Kein selbstständiges Modelltraining erforderlich**; keine Übertragung von ungesicherten Erfolgsbehauptungen in Fakten.

### Was ausdrücklich **nicht** gemeint ist

- Keine allgemeine autonome KI, kein unbegrenztes Umschreiben des Projekts.
- Keine mathematische Antwortfreigabe ohne unabhängigen Beweis.
- Keine automatische Ausführung generierten Codes in der NERYX-Seite, im gleichursprünglichen Qwen-iFrame oder als beliebige JavaScript-Imports.
- Kein automatisches Abschalten von Tests, Schwellenwerten, Gate-Dateien oder Branch-Schutz.
- Kein Versprechen, dass ein Qwen-0,5B-/1,5B-Modell zuverlässig komplexe Software erstellt.
- Kein Umbau der gesamten `app.js` zur Voraussetzung.

### Minimal brauchbarer Endzustand

Ein begrenzter Auftrag wie „Erstelle ein eigenständiges Formatierungsmodul mit diesen fünf Eingabe-/Ausgabefällen“ führt zu: validiertem Proposal-JSON -> Entwurf -> unabhängiger Sicherheitsprüfung -> reproduzierbaren Tests -> dokumentiertem Qualitätsvergleich -> **Draft-PR oder Vorschau nur zur menschlichen Freigabe**. Bei Fehlern werden Kandidat und Gründe verworfen, nicht heimlich nach `main` geschrieben.

## 2. Verifizierte Bestandsaufnahme und Grenzen

### Bereits vorhanden

- `app.js`: NERYX-Haupt-App als große IIFE mit lokalem Speicher `meinLernBot.v1` und Sicherungen `meinLernBot.v1.sicherung.*`. `codeProposals` und `improvements` sind bereits Datenfelder; **kein** Beleg für autonome Patch-Freigaben.
- `modules/code-diagnose.js`: Browser-Meisterprüfer, der ausgeliefertes HTML/JS/CSS und einige lokale Imports per `fetch` untersucht, Inventar/Befunde und Optimierungsprompt erzeugt; Interface `window.CodeDiagnose`. Begrenzte Regex-/Heuristik-Prüfungen; **kein** AST, kein Diff-Gate, keine verlässlichen Zeilenangaben.
- `modules/local-model-bridge.js` und `evolution/neryx/client.js`: optionale Qwen/WebLLM-Anbindung, vom Nutzer anzufordern; der Connector nutzt ein **gleichursprüngliches nicht-sandboxed iFrame** und `postMessage`.
- `evolution/neryx/index.html` und `evolution/neryx/app.js`: Modell-UI und Modellaufrufe; Herkunfts- und Nachrichtentypprüfung, aber **kein sicherer Ort für generierte Programmausführung**. Gleichursprüngliche iFrames sind keine harte Grenze für `localStorage` und übergeordnete Fenster.
- `modules/genesis-gegenprobe.js`, `modules/genesis-2.js`, `modules/genesis-3.js`: begrenzte Antwort-Gegenproben, Tests und simulierte Verbesserungsvorschläge; **keine** selbstentwickelten JS-Dateien.
- Veröffentlichte GENESIS-X-Chat-Anbindung via `eval/neryx-genesis-x-chat-bridge.js` und Quality Gate: ausschließlich eingeschränkte Qualitätsmeldungen, insbesondere **keine unbewiesenen mathematischen Antworten**. Lazy-Load bei explizitem Chatbefehl; Forschungsteil #60–#65 ist abgeschlossen.
- `eval/tests/`: bei der Bestandsaufnahme 29 Einträge, darunter Node-Regressionsprüfungen und GENESIS-Tests; zusätzlich `tests/`. **Nicht automatisch annehmen, dass alle Tests für neue Kandidaten relevant oder unveränderlich sind.**
- `vercel.json`: `{"git":{"deploymentEnabled":false}}`; Git-basierte automatische Deployments sind deaktiviert. Die Produktion wurde zuletzt explizit veröffentlicht; der tatsächliche gegenwärtige Releaseprozess muss jeweils geprüft werden.
- `sw.js`: Service Worker mit Netzwerk-zuerst-Verhalten und rascher Aktivierung; bei Produktionsänderungen Rollback-Fähigkeit aktiv prüfen.

### Offene Risiken / bestätigte Blocker zum Zeitpunkt der Bestandsaufnahme

- GitHub meldete für `main` `protected:false` und leere Repository-Rulesets. **Vor Start der Engine erneut prüfen**, da Einstellungen außerhalb des Codes geändert werden können.
- Für die neue Engine fehlt eine **wirksame** Pflichtprüfung für PRs nach `main`; bestehende Workflows sind teils an spezielle Feature-Branches und historische SHA-Werte gebunden.
- Generator und Tests dürfen nicht denselben Schutzmechanismus kontrollieren. Ein Workflow im vorgeschlagenen PR-Branch allein ist **keine** unabänderliche Vertrauenswurzel.
- `code-diagnose.js` sieht den deployten Stand, nicht den Kandidatendiff. Manche statische Heuristik kann Fehlalarme erzeugen (z. B. Identifikation von Funktionen nach Namen).
- `new Function(source)` im Browser-Meisterprüfer kompiliert Text, führt ihn bei bloßer Konstruktion nicht aus, ist aber **nicht** der gewünschte Syntax-Prüfmechanismus für untrusted Kandidaten.
- Eingaben aus Recherche, Imports und Modellantworten sind unvertrauter Text; keine dieser Quellen darf Sicherheitsanweisungen überschreiben.
- iOS-Speicher-, Geräte- und WebGPU-Grenzen sind relevant. Große Quellcode-Dumps überschreiten leicht das für kleine Qwen-Modelle nutzbare Kontextfenster.

### Vor jeder Umsetzungsphase erneut prüfen

Aktueller GitHub-`main`-SHA, Regeln/Berechtigungen, relevante CI-Workflows, Tests, verfügbarer Bot-/Owner-Review-Weg, Produktionsstand und ob abweichende Automationen währenddessen neue Commits auf `main` schreiben.

## 3. Zielarchitektur / Vertrauensgrenzen

```text
NERYX-UI / Mensch (beauftragt, sichtet, entscheidet)
                  |
       Aufgaben- & Proposal-Ledger
                  |
    Read-only Analyzer aus Git-Quellen
       (AST/Datei/Zeile/Baseline)
                  |
    Kleine, typisierte Generator-Aufgabe
         -> optional lokales Qwen
         -> nur Text / Proposal JSON
                  |
        Upload in Kandidatenbereich
          (niemals automatisch laden)
                  |
  Unabhängiges, unveränderliches Preflight-Gate
     (Schema, Pfade, Inhalt, Tokens, Limits)
                  |
  Isolierte, nichtprivilegierte Ausführungsprüfung
      + externe, vorab definierte Tests
      + Baseline-/Holdout-Vergleich
                  |
  ERFOLG -> signierter/zuordenbarer Prüfbericht
        -> Draft-PR für menschliche Freigabe
  FEHLER  -> Ablehnung + Grund ins Lernledger
```

**Trennung der Verantwortlichkeiten:**
- **Analyzer:** Liest und meldet; keine Quelltextänderung.
- **Generator-Adapter:** Erzeugt **Daten/Text**, entscheidet niemals über Freigaben.
- **Proposal-Schema/Ledger:** Validiert Ziele, Dateien, Messgrößen, Diff-Basis, Status und historische Ergebnisse.
- **Preflight-Gate:** Feste Allowlist, Parse-/Syntaxregeln, geschützte Pfade, Größen-, Laufzeit- und Ressourcenlimits. Generiertes Material darf diese Regeln nicht ändern.
- **Runner:** Ohne Produktionssecrets und Schreibzugriff auf `main`, nach Möglichkeit ohne Netzwerk; ein gewöhnlicher GitHub-Actions-Job mit Node ist **noch keine Sandbox**. Keine unbegrenzten Ressourcen oder unsicheren Dateimounts.
- **Release:** Nur ein geprüfter Mensch kann bewusst die nächste Produktivfreigabe veranlassen; PR-Erstellung ist **nicht** PR-Merge.

**Kandidatenpfade (Startvorschlag):** `candidates/**` als **nicht geladene Entwürfe** und `eval/candidates/**` für Berichtsdaten. Diese Pfade allein garantieren **keine** Ausführungstrennung. Für später freigegebene produktive Module braucht es einen separaten geprüften Einbauprozess.

**Sicherheitskritische Pfade (Beispiele):** `.github/**`, `app.js`, `index.html`, `sw.js`, `vercel.json`, `modules/local-model-bridge.js`, `eval/frozen.seal.json`, Prüfmodule, Schutz-Workflows, Testkorpora und Konfiguration. Kandidaten dürfen diese nicht verändern. Eine statische Musterliste allein ist keine Sandbox.

## 4. Sechs begrenzte Phasen mit messbaren Kriterien

### Phase 1 – Schutz von GitHub und produktiver Auslieferung (BLOCKER)

**Ziel:** Ein fehlerhafter/bösartiger Generator kann weder `main` noch Schutzregeln oder Produktivdeployments ändern.

**Aufgaben:**
- Aktuelle Repo-/Plan-Berechtigungen und Schutzregeln prüfen; GitHub Ruleset/Branch Protection für `main`, PR-Pflicht, kein Force-Push, kein Löschen, wirksame Pflichtstatuschecks und geeignete Bypass-Regeln.
- **Praktikablen Review-Weg prüfen:** Ein PR-Autor kann seine eigenen Änderungen i. d. R. nicht selbst freigeben. Vor Aktivierung von Reviewpflicht einen tatsächlich funktionierenden Ablauf mit PR-Bot und menschlichem Owner oder anderweitig unterstützter Reviewer-Konfiguration nachweisen; sonst Sperre möglich.
- `CODEOWNERS` für sensible Pfade, falls die aktuelle Repo-Konfiguration Code-Owner-Reviews tatsächlich **erzwingen** kann. CODEOWNERS ohne entsprechende Regel ist nur ein Hinweis.
- GitHub-Actions-Token standardmäßig read-only, keine produktiven Secrets in untrusted Jobs; minimal berechtigter PR-Erzeuger statt Administrator-Token.
- Neuen unabhängigen `pull_request`-Test für `main` planen, mit Basis-Branch-geprüften Schutzregeln und festen Status-Namen. Workflows / Actions zunächst auf gepinnte Commit-SHAs umstellen, soweit möglich.
- Vercel-Produktionsweg und manuelle Freigabe dokumentieren; keine Autopromotion.
- Unveränderten Produktionsstand dokumentieren; Rollback-Weg bereitstellen.

**Wirksamkeitsprüfung:** In einem Wegwerf-Duplikat oder einer sonst sicher isolierten Testumgebung direkte Pushes, Force-Push, Branch-Löschung, PR ohne Checks, Bot-Selbstfreigabe, geschützte Pfadänderung, Bot-Token-Zugriff, Branch-Push ohne Produktivdeployment **negativ** testen. Mindestens zweimal reproduzieren. Dabei unterscheiden, was organisatorisch gefordert und was technisch erzwungen ist.

**Abschluss:** Jeder definierte Schutztest dokumentiert erfolgreich; keine ungeprüfte Bot-Änderung kann `main` oder Produktion erreichen. Repo-Plan-/Rechteeinschränkungen ausdrücklich dokumentieren. **Noch kein Codegenerator starten.**

### Phase 2 – Analyzer 2.0 (read-only)

**Ziel:** Codebefunde reproduzierbar aus einem festgelegten Git-SHA und einer definierten Dateiliste erstellen.

**Aufgaben:** Wiederverwenden des Befundmodells von `modules/code-diagnose.js`, aber Node-basierte Leselogik von UI trennen; AST/Parser für JS statt Regex als alleinige Autorität; `node --check` oder geeigneten Parser für Syntax; Datei, Zeile, Regel-ID, Schwere, Evidenz, False-Positive-Klasse und SHA im JSON-Bericht. Baseline gegen Kandidat differenzieren; Tests für dynamische Script-Referenzen, Modulimports, verschachtelte Funktionsnamen und Kommentare.

**Abschluss:** Mindestens 90 % eines **vorab festgelegten** Seed-Fehlerkorpus erkannt, geringe dokumentierte Falsch-Positiv-Rate, keinerlei Dateischreibvorgänge; identische JSON-Befunde bei zweimaligem Lauf auf demselben SHA.

### Phase 3 – Proposal-Vertrag und Ledger

**Ziel:** Nur präzise, nachprüfbare, kleine Änderungsaufträge zulassen.

**Vorschlagsfelder:** eindeutige ID, Basis-SHA, Problem/Evidenz, erlaubte Pfade, Ziel-API, Anforderungen, erlaubte Abhängigkeiten, maximale Dateigröße, verbotene Effekte, erwartete Tests/Metrik, minimale Verbesserungsschwelle, Status, Generator-Modell/Version, Zeitstempel, Prüfungsergebnis. Unvertraute Texte getrennt von festen Systemregeln kennzeichnen.

**Abschluss:** Fehlerhafte oder unvollständige Beispiele werden zuverlässig abgewiesen; zwei identische Eingaben führen zur gleichen kanonischen Validierung. Die Vorschlagsdaten sind **nicht** ausführbarer Code.

### Phase 4 – Isolierte Ausführung und unabhängiges Gate

**Ziel:** Ungültigen Code sicher abweisen, ohne ihn im Browser-NERYX oder in einer privilegierten CI-Umgebung zu starten.

**Aufgaben:** Pfad- und Schema-Allowlist, geschützte Dateipfade, AST-basiertes Vorab-Gate, Dateigrößen-, Prozess-, Zeit- und Speicherlimits; isolierte Ausführung unter eingeschränkten Berechtigungen, ohne Secrets, Netz und Zugriff auf produktive Daten; Testcode aus vom Generator **nicht editierbaren** Quellen. Verifizieren, dass Runner-Ausbruch, Worker-Limits und Umgebungsprivilegien tatsächlich eingeschränkt sind.

**Schlechte Kandidaten – mindestens:** `eval`, `Function`, Netzwerkanfrage, Speicher-/Dateizugriff, fremder Pfad, Symlink/Pfad-Traversal, Endlosschleife, verändertes Workflow-/Gate-File, manipulierte Tests, unzulässige Imports und übergroße Eingaben.

**Abschluss:** 100 % der **definierten bekannten schlechten Testkandidaten** werden abgewiesen, mindestens drei erlaubte Musterkandidaten werden korrekt akzeptiert, keine Produktionsdatei und keine Secrets sind für Kandidatencode erreichbar. Das ist **kein** absoluter Sicherheitsbeweis.

### Phase 5 – Qwen-Adapter (nur Codeentwurf)

**Ziel:** Lokal kleine Codevorschläge erzeugen, nicht automatisch installieren.

**Aufgaben:** Qwen 2.5 über bestehende Bridge **nur als Textgenerator**; begrenzte Projektkontexte, kurze maschinenprüfbare Aufgaben, strikt begrenztes Ausgabeformat, kein vollständiger App-Dump, Modellantwort ohne Autorität. Die erste Aufgabe sollte ein **eigenständiges, seiteneffektfreies Mini-Modul** betreffen.

**Abschluss:** Mindestens ein realer lokaler Vorschlag wird generiert, durch das unabhängige Gate geprüft, durch externe Tests bewertet und sauber mit Pass/Fail protokolliert. Eine niedrige Erfolgsquote ist **kein** Beweis für Systemfehler; keine automatische Ausführung in der Hauptseite.

### Phase 6 – Draft-PR, Freigabeansicht und Lernledger

**Ziel:** Ergebnisse sichtbar machen und eine kontrollierte Verbesserungsschleife ermöglichen.

**Aufgaben:** Im NERYX-UI nur Bericht, Diff, Quellen, Risiko, Metriken und Vorschlagsstatus anzeigen. GitHub-Integration erstellt – sofern sicher und vom Nutzer autorisiert – nur Draft-PRs unter `neryx/auto/*` mit minimalen Rechten; kein Geheimtoken im iPhone-JavaScript. Der Mensch entscheidet über Merge, Produktionsdeploy und ggf. Rollback. Protokolliert werden Modell, Auftragsart, Befund, Gate-Grund und gemessene Wirkung.

**Abschluss:** GitHub-Schutzversuche zeigen, dass ohne menschliche Freigabe **kein** Engine-Vorschlag `main` oder Produktion verändert; Ergebnisse einschließlich Ablehnungen sind reproduzierbar; der Entwicklungsfortschritt ist messbar.

## 5. Bewertungsregeln für echte Verbesserungen

Ein Vorschlag gilt nur dann als „besser“, wenn:
1. Er **alle** bestehenden relevanten Regressionen besteht und keine Prüfregeln verändert.
2. Er eine **vorher** registrierte Kennzahl auf unabhängigen Tests um die festgelegte Mindestmarge verbessert.
3. Er keine neuen unerlaubten Rechte/Netz-/Speicherzugriffe eingeführt hat.
4. Laufzeit-, Speicher- und Größenbudget eingehalten werden (iPhone gegebenenfalls zusätzlich real messen).
5. Die Ergebnisse auf denselben Eingaben mindestens zweimal reproduzierbar sind.
6. Ergebnisse anhand des genauen Basis-SHA, Kandidaten-SHA, Testversionen und Runner-Versionen nachvollzogen werden können.

**Wichtige Statistikgrenze:** Holdout nicht unbegrenzt zum wiederholten Auswählen nutzen. Auswahlversuche zählen, neue verdeckte Testfälle ergänzen. „0 gefundene Fehler“ ist **kein** Nachweis einer Verbesserung. Generierte Tests allein dürfen niemals über die Freigabe entscheiden.

## 6. Explizite Stoppschilder und Projektgrenzen

**Sofort stoppen**, wenn eine der folgenden Bedingungen eintritt:
- Kein wirksamer Schutz von `main` oder kein zulässiger Review-Weg.
- Der Kandidat will Gate, Workflows, Tests, Ruleset, Service Worker, `app.js` oder andere geschützte Pfade verändern.
- Ein Token/Secret würde in die Browser-App oder in untrusted Runner gelangen.
- Die Sandbox-Isolation ist nur behauptet, nicht nachweisbar.
- Test- oder Messdaten sind manipuliert, Basis-SHA nicht mehr aktuell oder Erfolg nicht reproduzierbar.
- Eine Änderung müsste ungeprüft auf Produktion ausgeführt werden.

**Keine endlose Ausbau-Serie:** Exakt sechs Arbeitsphasen, je ein überprüfbares Abschlussprotokoll; erst nach allen Kriterien wird der erste selbst erzeugte Modulvorschlag im menschlichen Review betrachtet. Danach können neue Ziele separat vereinbart werden, ohne die Grundarchitektur wieder vollständig neu zu entwerfen.

## 7. Dokumentation pro Phase und Fortsetzung nach Chatwechsel

Bei jeder abgeschlossenen Phase dieses Dokument **in einem eigenen Review-PR** mit folgenden Feldern ergänzen:
- Datum; Phase und Status (`offen`, `in Arbeit`, `bestanden`, `blockiert`).
- Vergleichsbasis `main`-SHA, Kandidatenbranch/SHA und PR-Link.
- Änderungen/Dateipfade.
- Welche Tests tatsächlich ausgeführt wurden (Workflow-Run, Ergebnisse und Sicherheits-Negativtests).
- Reale Nutzerprüfung (falls iPhone/Produktion betroffen).
- Offene Risiken und **genau der nächste notwendige Schritt**.

Eine Chatantwort, ein Plantext oder eine KI-Behauptung **ersetzt niemals** einen dokumentierten Testlauf.

### Statusboard (bei jeder Freigabe aktualisieren)

| Phase | Status bei Erstellung | Abschlussnachweis |
|---|---|---|
| 0 – Bestandsaufnahme | Kernbestand geprüft; Grenzen dokumentiert | Dieses Dokument und verlinkte Quelldateien |
| 1 – GitHub-/Release-Schutz | **OFFEN / BLOCKER** | Negative Rechte-/Ruleset-Tests und Review-Weg |
| 2 – Analyzer 2.0 | **OFFEN** | Seed-Korpus + deterministischer JSON-Bericht |
| 3 – Proposal und Ledger | **OFFEN** | Schema-Negativtests |
| 4 – Sandbox und Gate | **OFFEN / BLOCKER** | Isolation + Attack-Korpus |
| 5 – Qwen-Generator | **OFFEN** | Realer begrenzter Modulvorschlag, geprüfter Bericht |
| 6 – Review und Lernen | **OFFEN** | Draft-PR ohne Autonomie-Bypass + Auditspur |

## 8. Relevante GitHub-Dateien und Referenzen

- [NERYX-Hauptanwendung](../app.js)
- [Projekt-Meisterprüfer](../modules/code-diagnose.js)
- [Qwen/WebLLM-Bridge](../modules/local-model-bridge.js)
- [iFrame-Nachrichtenclient](../evolution/neryx/client.js)
- [Modellseite](../evolution/neryx/index.html)
- [Modellsteuerung](../evolution/neryx/app.js)
- [GENESIS 1.1 – Gegenprobe](../modules/genesis-gegenprobe.js)
- [GENESIS 2.0](../modules/genesis-2.js)
- [GENESIS 3.0](../modules/genesis-3.js)
- [GENESIS-X-Chat-Bridge](../eval/neryx-genesis-x-chat-bridge.js)
- [GENESIS-X-Quality Gate](../eval/neryx-genesis-x-64-quality-gate.js)
- [GENESIS-X-Release-Notizen](./GENESIS_X_RELEASE_CANDIDATE.md)
- [Node-Tests](../eval/tests/)
- [Service Worker](../sw.js)
- [Deployment-Konfiguration](../vercel.json)
- [GENESIS-X-Chat-CI](../.github/workflows/neryx-genesis-x-chat.yml)

**Bisheriges fachliches Urteil:** Der vorhandene NERYX-Code bietet nützliche Bausteine für Analyse, Modellkommunikation und Antwort-Gegenproben. Die selbstständig modulerstellende, unabhängig prüfende und kontrolliert optimierende GENESIS-X-Engine **existiert noch nicht**. Das ist der hier dokumentierte Entwicklungsauftrag.

---
**Kurzsatz für den nächsten Chat:** „Unser Masterplan liegt in `docs/GENESIS_X_SELBSTENTWICKLUNG_MASTERPLAN.md` im GitHub-Repo `y6bkfhyp4d-star/Mein-lernbot`. Bitte lies ihn und beginne bei der ersten offenen Phase, aktuell Phase 1 GitHub-Schutz. Schütze `main` und meine öffentliche NERYX-App; ändere Produktion nur nach ausdrücklicher Freigabe.“
