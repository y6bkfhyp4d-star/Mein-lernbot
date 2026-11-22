# GENESIS X – SOLO OWNER MODE (Alternativplan, Entwurf)

**Stand:** 2026-11-23. **Status: DRAFT / NICHT AKTIVIERT.** Ein GitHub-Konto mit einem verantwortlichen Menschen, kein verfügbarer zweiter Reviewer.

## Grundentscheidung

GENESIS X darf Fehler analysieren, Befunde mit Quellen dokumentieren und **inerten JSON-Kandidateninhalt** vorbereiten. Der Assistent darf **weder** selbstständig produktiven Code ändern **noch** eine Freigabe, den Merge, eine Release-Promotion oder eine Veröffentlichung auslösen.

Die maßgebliche menschliche Entscheidung liegt beim Repository-Eigentümer und erfolgt **für jeden einzelnen PR und dessen aktuellen Commit** in der GitHub-Oberfläche. Das ist eine persönliche Freigabe, **keine unabhängige Zweitprüfung**; Phase 1 darf nicht mit „zwei Menschen haben geprüft“ abgeschlossen werden.

## Was GitHub jetzt bereits erzwingt

- Aktives Ruleset `27848423` auf `main`: PR-Pflicht, fünf erforderliche GitHub-Actions-Checks, kein Force-Push oder Löschen des Branches, keine Bypass-Akteure.
- **0** native genehmigende Reviews, `dismiss_stale_reviews_on_push:false`. Der Repository-Eigentümer kann daher bei grünen Checks selbst mergen. Das Ruleset erzwingt derzeit **keine** zusätzliche menschliche Bestätigung außerhalb des normalen PR-Merge-Klicks.
- `genesis-candidate-paths-trusted` auf `main` blockiert Änderungen außerhalb der Candidate-Pfade **nur für Branches mit `neryx/auto/*`**. Bei gewöhnlichen Branch-Namen schützt dieser Check sensible Änderungen nicht zusätzlich.

## Solo-Betriebsmodus: zwei strikt getrennte Wege

### A. Automatische Forschung / Kandidatendaten

1. GENESIS X darf statische Analyse und Berichte liefern sowie aus einer sicheren, gesondert genehmigten Ausführungsumgebung einen PR mit `neryx/auto/*`-Branch **ausschließlich mit inerten Vorschlagsdaten** vorbereiten.
2. Für nicht vertrauenswürdige Candidate-Daten gilt als geplante, vor Aktivierung zu testende Einschränkung: nur `candidates/**/*.json` oder `eval/candidates/**/*.json`; maximale Größen, strenges JSON-v1-Schema, Git-Blob-/Basis-SHA-Kontrolle, keine automatischen Rename/Delete-Aktionen.
3. Keine Tokens mit Push-/Merge-/Admin-/Deploy-Berechtigungen im Agentenprozess. Wird ein PR-Erstellungsdienst benötigt, muss seine Identität und sein minimaler Berechtigungssatz gesondert abgesichert werden; **PR-Erstellung benötigt GitHub-Rechte**, kann aber nicht aus einem ausschließlich `read`-berechtigten Token erfolgen. Kein selbständiges Einschalten.
4. Die Kandidatenverzeichnisse und Inhalte **dürfen von der App, Build-Prozess, Test-Runtime, Worker oder Deploy-Pipeline niemals automatisch ausgeführt, importiert oder als Patch angewandt werden**. Vor Aktivierung der Automatisierung diese Annahme technisch verifizieren.
5. Erfolgreiche Checks bedeuten **„Vorschlag prüfbar“**, nicht „bereit zum automatischen Merge“.

### B. Menschlich erstellte Codeänderungen

1. Ein Code-PR wird **vom Menschen bewusst veranlasst**, nicht allein vom Lernsystem gestartet. Er erhält einen normalen Branch-Namen und wird auf den aktuellen `main`-SHA rebasiert, wenn sich dieser zwischenzeitlich geändert hat.
2. Vor Freigabe müssen mindestens `integration`, `browsers (chromium)`, `browsers (webkit)`, `genesis-candidate-paths` und `genesis-candidate-paths-trusted` an der **aktuellen** PR-SHA grün sein. Zusätzlich alle für die Änderungen spezifischen AST-/Security-Tests prüfen, auch wenn sie noch nicht als required Check im Ruleset erzwungen werden.
3. Der Eigentümer liest den **gesamten Diff**, besonders `.github/workflows`, GitHub-Berechtigungen, `app.js`, `sw.js`, Build-Konfiguration, Datenzugriff, `eval/` und Releases. Bei generiertem Code gilt **zusätzliche manuelle Prüfung**.
4. Eigenverantwortliche Entscheidung explizit mit UTC-Datum, Basis-/HEAD-SHA, getesteten Checks, bekannten Risiken und Rücksetzplan im PR dokumentieren. Ein Kommentar ist **ein Audit-Nachweis, keine technisch erzwungene Genehmigung**.
5. Erst nach der eigens getroffenen Entscheidung darf der **Eigentümer persönlich in GitHub** mergen. Keine `enable_auto_merge`-Funktion, Bot-Merges, Skripte mit Merge-Rechten oder automatische Deploy-Promotion.
6. Nach dem Merge relevante Offline-/Browser-Smoketests und App-Version prüfen. Vercel-Git-Integration kann selbsttätig Deployments erzeugen: **Vor jedem Merge getrennt untersuchen, ob ein Merge nach `main` bereits ein produktives Deployment auslöst**. Die Aussage „Merge ≠ Deploy“ gilt nicht ohne verifizierte Vercel-Einstellungen.

## Vertrauensgrenze und technische Anforderungen vor tatsächlicher Aktivierung

- Die Vorschlagsautomation und ein GitHub-User, der mergen darf, dürfen **nicht dieselbe unkontrollierte Ausführungsidentität** nutzen. Owner-Token, iPhone-GitHub-Session und Recovery-Codes bleiben ausschließlich beim Menschen, nie in LernBot-/Qwen-/Agenten-Logs oder generierten Dateien.
- Das aktive `main`-Ruleset und die erforderlichen Checks dürfen nicht von einem Kandidaten-PR verändert werden; aktuell ist der vertrauenswürdige Pfad-Workflow nur für `neryx/auto/*` scharf. **Eine beliebige Agenten-Identität könnte theoretisch einen normalen Branch-Namen wählen**, solange ihr Schreibzugang das zulässt. **Keine autonome PR-Erstellung**, bevor Identitätsbindung/Tokenberechtigungen und eine unabhängige trusted-base Prüfung dies ausschließen.
- Der bereits vorliegende PR #90 `security/genesis-trusted-base-gate-v2` enthält eine **zwingende Zweitreview-Annahme** und würde mit `required_approving_review_count=0` sensible PRs blockieren. **Diesen PR im Solo-Modus nicht mergen** und sein Sicherheitsniveau nicht stillschweigend als „erfüllt“ erklären. Er bleibt separat als Review-Architektur für einen später verfügbaren zweiten Reviewer.
- Kein Nachweis von GitHub-Live-Negativtests bisher. Eine **isolierte Test-Repositoriumskopie** muss die tatsächliche Blockierung testen: Auto-Branch mit Codeänderung, Auto-Branch mit JSON-/Rename-/Workflow-Manipulation, fehlender required Check, überholter PR-HEAD, direkter Push/Force-Push/Delete, Token-/Workflow-Tampering. Jeder Negativfall mindestens zweimal. Keine destruktiven Tests an `main`.
- Nachweise: Test-Repository-URL, PR-ID, HEAD-/Basis-SHA, UTC, Ruleset-/Token-Snapshot, erwartetes und beobachtetes Verhalten. Fehler führen zu STOP.
- **Besonders wichtig:** Ohne zweiten unabhängigen Reviewer ist das Restrisiko höher. Als Ausgleich: strengere autonome Rechtevergabe, umfassende CI, ein dokumentierter manueller Merge und eine separat geschützte Produktivfreigabe. Das ist eine *alternative* Abnahme, keine Gleichstellung mit der ursprünglich geplanten Zwei-Personen-Freigabe.

## Konkreter Freigabe-Check pro Code-PR (nur manuell)

- [ ] Der PR wurde bewusst vom Eigentümer veranlasst; keine autonome Code-PR.
- [ ] Tatsächlicher Diff und gefährliche Pfade vollständig überprüft.
- [ ] Aktueller HEAD-SHA, Basis-SHA und erforderliche Checks dokumentiert; **keine veralteten grünen Checks**.
- [ ] Sicherheits-/AST-Regressionen bestanden; Fehlalarme und Einschränkungen benannt.
- [ ] Keine unkontrollierten Agenten-Schreib-/Merge-/Deploy-Credentials.
- [ ] Auswirkungen des `main`-Merges auf den produktiven Vercel-Deploy geprüft.
- [ ] Rollback-Möglichkeit und Datensicherung geklärt.
- [ ] Eigentümer hat den konkreten PR manuell zum Merge freigegeben.
- [ ] Nachprüfung des Builds/Deployments und Protokollierung durchgeführt.

## Go / No-Go

**GO für:** Offline-Analyse, Candidate-Schema-Entwicklung, reine Berichtsausgabe, manuell kontrollierte Code-PRs nach den bestehenden Regeln.

**NO-GO für:** autonomes Patchen von `app.js`/Workflows/`main`, autonomes Mergen, automatisches Produktions-Deployen, Bypass von CI oder behauptete Zwei-Personen-Review.

**Phase-1-Status:** `SOLO-DESIGN DOCUMENTED — PRODUCTION SAFETY NOT YET ACCEPTED`. Vor praktischer Aktivierung müssen Live-Negativtests, Rechteisolation, Deploy-Kopplung und eine ausdrücklich vom Eigentümer akzeptierte alternative Risikoentscheidung vorliegen.
