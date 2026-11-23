# GENESIS X Solo – GitHub/Vercel Berechtigungs- und Deployment-Audit

**Stand:** 23.11.2026, reine Read-only-Bestandsaufnahme. **Keine Konfigurationsänderung / kein Deploy.**

## Direkt über verbundene Konten bestätigt

- Vercel-Team: `pierags`, Plan `hobby`. Projekt `mein-lernbot`, ID `prj_R69315mjMWlfAGfluiPn0ZCbOEZc`, über GitHub mit `y6bkfhyp4d-star/Mein-lernbot` verbunden.
- Letztes von der Vercel-API gelistetes Produktionsdeployment: `dpl_Da1BRybT6FEPrKeKPTjU6uSoNMS7`, `READY`, `target=production`, Quelle `main`, Commit `dd338b6d974680e3c112877816c1fba8385245ee`. Es hat den Alias `mein-lernbot.vercel.app` und zusätzliche Vercel-Aliase. **Die von GitHub gelesene aktuelle `main`-SHA (`80a43dd...`) weicht von der SHA dieses zuletzt gelisteten Produktionsdeployments ab.** Das allein belegt nicht, warum die Stände verschieden sind und ob ein neuerer Vorgang aussteht; es muss vor Releases separat geprüft werden.
- Die Vercel-API listet Preview-Deployments (`target=null`) aus den Entwicklungsbranches `neryx/genesis-x-release-candidate`, `neryx/genesis-x-chat-opt-in-preview` etc. mit `READY`. Somit werden Änderungen auf anderen Git-Branches als Preview gebaut. Ob **jeder** Push automatisch oder nur nach externem Trigger deployt wird, lässt sich aus der Historie allein nicht beweisen.
- Projekt-Schutzantwort: `passwordProtection.enabled=false`, `ssoProtection.enabled=true` mit `deploymentType=all_except_custom_domains`. **Aus diesen Feldern allein darf nicht abgeleitet werden, dass jede Preview privat oder jede Produktionsadresse ungeschützt ist**. Die Reichweite des Schutzes ist vor einer Veröffentlichung anhand der tatsächlichen Deployment-Protection-Einstellungen zu prüfen. Bestehende Domain `mein-lernbot.vercel.app` ist verifiziert.
- Aus GitHub `main` gelesene Actions: `neryx-merge-verification.yml` läuft auf `pull_request` und testet Integration sowie Chromium/WebKit; `neryx-genesis-candidate-trusted.yml` läuft aus `pull_request_target`, nur mit Lese-Rechten und verweigert Auto-Kandidaten, die die Pfad-Whitelist verletzen. `neryx-genesis-x-chat.yml` reagiert auf Pushes in einem spezifischen Kandidatenbranch sowie manuellen Workflow-Dispatch. Keiner der geprüften Workflows ist ein ausdrücklich konfigurierter GitHub-Produktions-Deployjob.
- Aktives GitHub-Ruleset `27848423` auf `main`: PR-Pflicht, fünf GitHub-Actions-Kontexte, kein gelisteter Bypass; genehmigende Pflichtreviews `0`. **GitHub-Rechte von GitHub-Benutzern, GitHub-App-Installationen, Branch-Writern oder Vercel-App-Installation wurden nicht als vollständige Berechtigungsliste gelesen.** Deshalb ist eine autonome Code-PR-Berechtigung nicht als ausgeschlossen nachgewiesen.

## Sicherheitsbewertung für Solo Owner

**Wichtiges reales Release-Risiko:** Weil das Vercel-Projekt GitHub-verbunden ist und ein als `production` markiertes Deployment von `main` belegt wurde, muss ein menschlicher Merge auf `main` **wie eine mögliche sofortige Produktionsveröffentlichung** behandelt werden. Die konkrete Git-Autodeploy-Einstellung wurde über die hier sichtbaren Projekt-Daten nicht abschließend verifiziert. Bis zu diesem Nachweis nicht behaupten, ein GitHub-Merge und eine produktive Veröffentlichung seien getrennt.

**Preview-Risiko:** Entwicklungspushes können Vercel-Preview-Deployments erzeugen. Ohne erneute Prüfung der aktuellen Zugriffskontrollen keine vertraulichen Kandidatendaten/Quelltexte oder Test-Secrets in Build-/Preview-Artefakte legen.

**Berechtigungsgrenze:** Agenten/Modelle erhalten weder GitHub-Owner-Session, Zugriff auf ein GitHub-PAT mit `contents:write`, `pull_requests:write` oder `administration` noch Vercel-Deploy-/Promotion-Credentials. Bereits vorhandene Apps/Automations sind auf tatsächliche Rechte zu prüfen, ohne geheime Werte auszulesen.

## Noch offen – vor produktiver Solo-Automation

1. **GitHub:** Schreib-/Merge-Rechte aller GitHub-Apps, Tokens und Workflows nachvollziehen. Falls ein Agent einen PR vorbereiten soll, nur eine getrennte minimal berechtigte App/Identität und serverseitige `neryx/auto/*`-Pfadkontrolle; ohne Freigabe nicht einschalten.
2. **Vercel:** Produktionsbranch, Git-Autodeploy/Preview-Verhalten, Deployment-Protection, manuellen Promotion-/Rollback-Weg und Vercel-Git-App-Berechtigungen anhand der wirklichen Projekt-Settings bestätigen. Keine Änderung ohne Eigentümerentscheidung.
3. **GitHub `main` vs. Vercel Deployment:** Abweichende SHAs erklären; dokumentieren, ob es absichtlich ein historischer Produktionsstand ist oder eine gewünschte, noch nicht bereitgestellte Revision.
4. **Isoliertes GitHub-Testrepo:** Alle erforderlichen Negativtests zweimal **real** ausführen, auch fehlende Checks, Auto-Branch mit unerlaubtem Code, Stale-Review, PR-Retargeting, Direkt-/Force-Push und Delete – ohne destruktive Tests auf `main`.
5. **Manueller Owner-Merge:** Für jeden Code-PR den getesteten Diff, Commit-SHA, erforderliche Checks, Auswirkungen auf Vercel, Rollback und menschlichen Entscheid dokumentieren; **nicht** behaupten, dass dies einer unabhängigen Zweitfreigabe entspricht.

## Kontrollierter Abschluss / aktueller Status

- **Erlaubt:** Read-only-Audit, Offline-Analyse, noch nicht aktivierte Draft-Änderungen und manuell kontrollierte Planung.
- **Nicht freigegeben:** automatisierte Code-Patches, eigenständiger Code-PR-Merge, Vercel-Production-Promotion, GitHub/Vercel-Schutzänderungen.
- **Gate:** `SOLO-PRODUCTION-AUTOMATION = BLOCKED` bis Rechteisolation, verifizierte Deployment-Kopplung und Live-Negativtests vorliegen.

## Nachtrag: Bereits aktive, schreibberechtigte Forschungsworkflows (direkt aus main geprüft)

Die GitHub-Dateien `.github/workflows/lernbot-phase70.yml`, `lernbot-phase76.yml`, `lernbot-phase77.yml`, `lernbot-phase78.yml`, `lernbot-phase79.yml`, `lernbot-phase710.yml`, `lernbot-phase711.yml`, `lernbot-phase712.yml` und `lernbot-phase713.yml` besitzen **`permissions: contents: write`**. Sie sind über `schedule` wiederkehrend sowie über `workflow_dispatch` manuell startbar und verwenden bei `actions/checkout` `ref: main`, `persist-credentials: true`. Diese Automationen sind damit **nicht read-only**.

Die geprüften neun Workflows schreiben über `.github/scripts/research-review-branch.sh`. Die aktuelle `main`-Version des Skripts hat eine **exakte Paar-Allowlist** aus `REPORT_BRANCH` und `REPORT_FILES`, beispielsweise `neryx/research-phase70|evolution/phase70/knowledge.json` und `neryx/research-phase79|evolution/phase79/research79.json`. Vor der Veröffentlichung werden Report-Dateien auf maximal **2.000.000 Bytes** und syntaktisch gültiges JSON geprüft. Beim Publizieren wird der Arbeitsbaum auf den verifizierten `main`-SHA zurückgesetzt, ausschließlich die erlaubten Berichte gestaged und ein Commit zum definierten `neryx/research-phase*`-Branch gepusht; **kein Force-Push und kein Push auf `main`** sind im geprüften Skript vorgesehen. Der Logik zufolge wird ein zusätzlicher Commit mit Eltern `old report` und `main` erstellt.

**Begrenzung dieser Feststellung:** Das ist eine statische Codeprüfung, **kein Nachweis**, dass ein kompromittierter Workflow, Token oder Generatorprozess nicht anders schreiben könnte. Die Jobs erhalten real `contents: write` auf Repository-Ebene, nicht ausschließlich auf erlaubte Branches. Die Berechtigung ist breiter als der Aufrufpfad des Skripts. Ein unter falschen Bedingungen ausgeführter beliebiger Git-/API-Befehl in einem solchen Job könnte versuchen, andere Branches zu verändern; GitHubs aktives Ruleset sollte `main` blockieren, doch Live-Negativtests stehen aus. Auch die importierten JSON-Berichte können problematische Inhalte enthalten; ein JSON-Syntaxcheck beweist keine Vertrauenswürdigkeit.

**Wichtige Korrektur:** Nicht schreiben „NERYX kann aktuell keine automatischen Repository-Schreibaktionen ausführen“. Stattdessen: „Aktive Forschungsworkflows besitzen Write-Tokens, verwenden aber in ihrem geprüften Code eine beschränkte JSON-Review-Branch-Publishing-Logik.“ GENESIS X selbst darf diese Tokens **nicht** übernehmen; eine Isolation der Schreibidentitäten ist noch nicht bewiesen.

### Vor Einführung neuer Solo-Automation

1. Vorhandene `contents:write`-Workflows beibehalten oder reduzieren **nur nach gesonderter Eigentümerentscheidung**. Nicht pauschal deaktivieren: Sie sind Teil der laufenden Forschungsabläufe.
2. Für neue GENESIS-X-Candidate-Jobs zunächst `contents:read` und reine lokale Reports ohne PR-Erstellung. Sollte später ein automatischer Branch-/PR-Writer erforderlich sein, **getrennte kontrollierte Identität**, Repository-Branch-/Pfadgates und dokumentierte Berechtigungen.
3. Negative Testfälle: manipulierte `REPORT_BRANCH`/`REPORT_FILES`-Paare, zusätzliche Stage-Dateien, fremde `main`-SHA und parallele Branch-Updates. Dafür isolierte Offline-/Git-Testumgebung, kein destruktiver Push auf echte `main`.
4. Vollständige GitHub-Actions-Repo-/App-/PAT-Berechtigungen waren in dieser Sitzung nicht abrufbar; GitHubs allgemeiner Actions-Permissions-Endpunkt wurde vom verfügbaren Lesezugang abgewiesen. **Keine Aussage über einen vollständigen Rechtebestand.**

## Offline-Git-Negativtests: realer lokaler Remote (keine GitHub-Schreibzugriffe)

**Teststand:** Commit `9729ab2bf7a9cb746b7e48bfdec169c2a4566dea`, `eval/tests/research-review-branch-isolation.test.mjs` ruft `.github/scripts/test_research_review_branch_isolated.py` auf. Das Python-Skript erzeugt für jede Testgruppe ein temporäres **lokales Bare-Git-Repository** und einen separaten Arbeitsbaum. Alle `git push`-Aufrufe verwenden ausschließlich dieses lokal konfigurierte `origin`. Keine echten GitHub-Repositories oder produktiven Branches werden verändert.

Tests gegen das unveränderte Hauptbranch-Skript `.github/scripts/research-review-branch.sh`:

1. Falscher Report-Branch, Branch/File-Mismatch, Codepfad und Zusatzdateien werden **zweimal je Variante** vor einem Push abgelehnt.
2. Positiver Forschungsbericht: Der erlaubte JSON-Report erreicht ausschließlich `neryx/research-phase70`. Ein absichtlich lokal verändertes `app.js` sowie ein zusätzlicher unversionierter Workflow werden **nicht** in den veröffentlichten Git-Baum übernommen; Remote-`main` bleibt bytegenau bei seiner Basis-SHA.
3. Beschädigtes und übergroßes JSON erreicht keinen Bericht-Branch.
4. Wenn `main` auf dem lokalen Bare-Remote in der Zwischenzeit weitergewandert ist, verweigert das Skript den Publish mit der vorhandenen **stale-main**-Prüfung.
5. `prepare` verwirft ungültige Dateizuordnung und verwahrt neuere, auf `main` bereits geprüfte Berichtsinhalte vor Überschreibung.

**CI-Nachweis:** Integration [Workflow 45114086081](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45114086081): **367/367 bestanden**, einschließlich der neuen lokalen Git-Testgruppe; GENESIS-X-AST und Kandidatenpfadpolicy ebenfalls erfolgreich. Chromium und WebKit waren beim Abruf noch aktiv.

**Keine Freigabe zur Automatisierung:** Es bleibt erforderlich, den Fall einer kompromittierten Write-Token-Identität separat zu betrachten. Die Tests beweisen das Verhalten **dieses Skripts** mit einem lokalen Remote, nicht GitHubs effektive App-/Tokenrechte, die GitHub-Ruleset-Erzwingung oder vollständige Unveränderlichkeit von `main` in der Cloud. Eine zweifache echte GitHub-Negativabnahme und eine Rechteeinschränkung liegen weiterhin nicht vor.

## Erweiterte Negativtests: vergiftete ältere Forschungsbranches

**Teststand:** `7498d747a726542235daf083332338922199d5bc`.

Die unveränderte `main`-Version von `.github/scripts/research-review-branch.sh` wurde zusätzlich mit einem **absichtlich manipulierten, älteren lokalen Forschungsbranch** getestet. Dieser enthielt einen erlaubten JSON-Bericht, aber auch eine gefälschte Änderung an `app.js` sowie eine zusätzliche `.github/workflows/backdoor.yml`.

- `prepare` darf lediglich den erlaubten JSON-Bericht übernehmen; die manipulierte `app.js` und der eingefügte Workflow bleiben ausgeschlossen. Der erlaubte Vorgang wurde zweimal geprüft.
- `publish` muss selbst bei einem bereits vorhandenen kompromittierten Forschungsbranch einen neuen Review-Commit nur aus dem `main`-Baum und dem zugelassenen JSON-Bericht erzeugen. Remote-`main` und die ursprüngliche `app.js` bleiben gleich.
- Liegt auf dem alten Forschungsbranch kaputtes JSON oder ein Report über 2 MB, muss `prepare` scheitern. Jeder Negativfall wird zweimal ausgeführt.
- Alle Git-Remote-Operationen einschließlich Branch-Löschen erfolgten ausschließlich gegen neu angelegte **lokale Bare-Repositories**. Kein Remote zeigt auf GitHub.

**Ergebnis:** GitHub-Actions-Integration-Run [45114332992](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45114332992), **367/367 erfolgreich** (darin sieben Python-Testgruppen des lokalen Git-Publishers). AST und Browserjobs hatten bei der letzten Abfrage noch nicht alle abgeschlossen. Die erste Version der neuen Test-Fixtures schlug wegen falsch escapeter Zeilenumbrüche und eines lokal nicht gelöschten Testbranches fehl; die Test-Fixtures wurden korrigiert und der erfolgreiche Lauf ist der maßgebliche Nachweis.

**Offene Grenze:** Dies beweist weder, dass ein entwendeter `contents:write`-Token keine anderen Branches beschreiben könnte, noch dass GitHub den Schutz in einem echten Cloud-Lauf erzwingt. Für diese Ebene bleibt eine isolierte GitHub-Test-Repository-Abnahme erforderlich.

## GitHub-Identitäten: effektive Rollen und Gegenprobe

Am 23.11.2026 ergaben die lesenden GitHub-Connector-Aufrufe:

- `get_repo` für `y6bkfhyp4d-star/Mein-lernbot`: der **verbundene GitHub-Zugang** besitzt `admin:true`, `push:true`, `pull:true` und `maintain:true`. `get_repo_collaborator_permission` bestätigte für `y6bkfhyp4d-star` die Repository-Rolle `admin`.
- Die GitHub-Verbindung meldete die für diese Sitzung sichtbare Installation `183198037`, `repository_selection: all`; in der über diese Installation abgefragten Repository-Liste war das Projekt enthalten. **Die Installation beschreibt den verbundenen GitHub-App-Zugang, nicht automatisch einen GENESIS-X-Bot-Token oder ein `GITHUB_TOKEN` einer Action.**
- Repository-Metadaten: `allow_auto_merge: false`; das deaktiviert das Repository-Merkmal Auto-Merge, garantiert aber **nicht**, dass keine andere API-Identität eine bewusste Merge-Aktion auslösen könnte.
- Die tatsächlich aus `main` gelesenen neun Forschungsworkflows verwenden als Job-Token `contents: write` mit dem konkreten, geprüften Publish-Skript. Der Trusted-Base-Workflow verwendet ausdrücklich `contents:read` und `pull-requests:read`.
- **Nicht verfügbar/nicht bewiesen:** Vollständige GitHub-App-Installationsberechtigungen, PATs, alle externen Tokens, Live-Ruleset-Wirksamkeit, tatsächliche Berechtigung einer späteren separaten GENESIS-X-Agentenidentität. Ein bereits vorhandener administrativer Connector darf **nicht** als Beleg für die sichere Isolation künftiger Automationen gewertet werden.

### Zusätzliche statische Berechtigungsregression

`eval/tests/genesis-solo-permission-boundary.test.mjs` prüft im Draft-PR #91 konkret die neun Phase-7-Forschungsworkflows auf `contents:write`, einen fest zugewiesenen Report-Branch und Report-Pfad, das gemeinsame Publishing-Skript ohne direkte PR-/Deploy-Aktion sowie den nur lesenden `pull_request_target`-Trusted-Check. Die Solo-Anweisungen müssen ausdrücklich auf einen menschlichen GitHub-Merge und das Verbot von Bot-Merges verweisen.

**Testgrenze:** Das sind statische Regressionen gegen den eingecheckten Workflow-Code. Sie verhindern nicht den Missbrauch eines gestohlenen oder anderweitig erreichbaren Write-Tokens. **Keine Konfiguration geändert.**
