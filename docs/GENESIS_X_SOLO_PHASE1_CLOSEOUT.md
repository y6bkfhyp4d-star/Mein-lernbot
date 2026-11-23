# GENESIS X SOLO – Phase-1-Abschlussprotokoll und Go/No-Go

**Datum:** 2026-11-23. **Betrieb:** Einzelentwickler, kein zweiter Reviewer verfügbar.
**Gesamtentscheidung: NO-GO für autonome Codeänderung, automatischen Merge und Production-Deploy.**
**Teilabschluss: lokale Publisher-Isolation, statische Berechtigungsregression und bestehende CI sind nachgewiesen.**

## 1. Nachweise – zum Abschluss direkt geprüft

- Sicherheits-Draft-PR [#91](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/91) auf Branch `security/genesis-solo-owner-plan`; Referenz-HEAD vor diesem Abschlussdokument: `7b459c08c6c2a75e68b746763154d2668fc73056`. Kein Merge.
- Alle GitHub-Actions-Runs dieser Referenz erfolgreich:
  - [AST 45114946805](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45114946805): Erfolg.
  - [Candidate paths 45114946857](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45114946857): Erfolg.
  - [Merge verification 45114946924](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45114946924): Erfolg, inklusive Integration sowie Chromium/WebKit.
- Konkret gemessene **379/379 Integrationsfälle** auf Test-Commit `853b472e2415cdc96a5280ec0b7314809b0a2bb6`, [Run 45114882528](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45114882528). Enthalten: acht Testgruppen mit realem Git-Publisher gegen **temporäre lokale Bare-Remotes**, darunter zweifach überprüfte Non-Fast-Forward-Race-Negativfälle.
- Bestehende neun `lernbot-phase*`-Forschungsworkflows laufen geplant/manuell mit `contents: write`; das tatsächlich geprüfte Skript `.github/scripts/research-review-branch.sh` besitzt feste Branch-/Dateipaar-Allowlist, publiziert nur JSON-Reports zu `neryx/research-phase*` und nutzt **keinen** Force-Push.
- Der verbundene GitHub-Zugang hat `admin` und `push` auf dem Repository; **diese Identität ist nicht identisch mit einem künftigen Agenten-GITHUB_TOKEN**. Die gesamte Installations-/PAT-Berechtigungslage ist nicht belegt.
- Aktives Ruleset `27848423` verlangt aktuell **0** genehmigende Reviews, `dismiss_stale_reviews_on_push:false`. Das schließt ein Zwei-Personen-Approval für Solo-Arbeit nicht ein.
- Vercel-Projekt `mein-lernbot` ist mit diesem GitHub-Repository verknüpft; es gibt ein bereitgestelltes Production-Deployment von `main` und Preview-Builds von anderen Branches. Ein Merge auf `main` muss daher als **möglicher unmittelbar produktiver Release** behandelt werden. Konkrete Git-Autodeploy-Einstellungen und die SHA-Abweichung zum zuletzt bekannten Production-Deployment müssen vor Release geprüft werden.

## 2. Was als abgeschlossen gilt

1. **Offline-Publisher-Tests: PASS.** Falsche Branches/Dateien, JSON-Fehler und Übergröße, manipulierte Vorgängerbranches, veralteter Main-Stand, konkurrierende Schreibvorgänge und fremde Dateien wurden isoliert getestet.
2. **Statische Workflow-/Token-Scope-Regressionen: PASS.** Sie kontrollieren die eingecheckten neun Forschungsworkflow-Konfigurationen, nicht die Rechte missbrauchter Tokens.
3. **CI für Draft-PR #91 auf Referenz-HEAD: PASS.** Dies ist eine Testaussage, **keine Produktionsfreigabe**.
4. **Solo-Verantwortlichkeit definiert:** GENESIS X kann Code untersuchen und inerte Vorschläge vorbereiten. Nur der Eigentümer darf einen **bewusst veranlassten** Code-PR nach vollständiger Prüfung manuell mergen.
5. **Sicherheitsentwürfe getrennt:** PR #90 erfordert zwingend eine unabhängige zweite Review und bleibt ohne zweiten Reviewer **unmergebar als empfohlene Solo-Lösung**. PR #91 ist der alternative dokumentierte Solo-Prozess, noch nicht in `main` aktiviert.

## 3. Technisch nicht ausführbare Cloud-Abnahme

Der in dieser Sitzung verbundene GitHub-Connector stellt **keine Funktion zum Erstellen eines neuen GitHub-Repositories** bereit und erlaubt **keine Änderung/Erstellung von Rulesets**. Deshalb wurde trotz ausdrücklicher Bitte um Abschluss **kein isoliertes GitHub-Test-Repository angelegt** und keine umfassende isolierte Cloud-/Ruleset-Negativtestserie oder Admin-Permissions-Prüfung gestartet. Ein vorhandenes produktives Repository ist **kein** zulässiger Ersatz dafür.

Nur nach Einrichtung des isolierten Test-Repositorys:
- Eigene Test-Identität mit minimalen Rechten, **ohne** Zugriff auf das produktive NERYX-Repository; echte GitHub-Token-/Branchrechte separat dokumentieren.
- Schutzregeln und verpflichtende Check-Kontexte explizit für **das Test-Repository** einrichten; Statuschecks und tatsächliche Merge-Sperre prüfen.
- Zweimal testen: Agenten-Branch mit `app.js` statt Kandidaten-JSON, Workflow-Tampering, abweichende Erweiterung, beschädigte JSON-Daten, geänderter PR-HEAD, fehlender required Check, direkte-/Force-Push- und Delete-Versuche.
- Reproduzierbare Evidenz für jeden Fall: Test-Repo-URL, Test-PR, Zielbranch, exakte SHA, Statuschecks, UTC-Zeit, erwartete/beobachtete GitHub-Aktion.
- Echte Tokens nie im Chat, in generierten Dateien oder in CI-Logs ausgeben. Keine derartigen Tests gegen produktives `main`.
- Die *konkreten Vercel-Projekt-Einstellungen* prüfen, ob `main` ein Production-Git-Branch mit automatischen Deployments ist, bevor ein Merge freigegeben wird.

## 4. Go-/No-Go-Matrix

| Handlung | Entscheidung | Grund |
|---|---|---|
| Code lesen, Sicherheitsbefunde dokumentieren | GO | rein lesend |
| Inerte JSON-Vorschläge manuell prüfen | GO | keine automatische Ausführung |
| Bestehende Forschungspublisher weiter wie bisher betreiben | UNVERÄNDERT | bestehende `main`-Workflows nicht bearbeitet |
| Neues autonomes Code-PR-Schreibrecht für GENESIS X | NO-GO | Cloud-Token-/Identitätsisolation nicht belegt |
| Autonomer Merge, `main`-Push, Production-Promotion | NO-GO | Mensch und CI müssen unabhängig handeln |
| Merge von #90 für Solo-Modus | NO-GO | zweite Review fehlt; natives Ruleset 0 Review |
| Merge von #91 ohne eigene Diff-/Release-Abnahme | NO-GO | Dokumentation ist keine technische Erzwingung |
| Aktives Ruleset oder Vercel-Konfiguration ohne separate Freigabe ändern | NO-GO | Schutz-/Produktionsänderung |

## 5. Abschließende Stop-Regel

**Phase 1, lokal: ABGESCHLOSSEN. Phase 1, Cloud/Produktions-Sicherheit: BLOCKED.**

Es ist nicht nötig, in dieser Sitzung beliebig weitere Offline-Tests anzuhängen. **Erst** ein wirklich isoliertes GitHub-Test-Repository und die belegten vollständigen Cloud-Ergebnisse können den verbleibenden Freigabestatus aufheben. Keine grüne CI und kein Dokument dürfen diesen fehlenden Nachweis als bestanden umetikettieren. `main`, bestehende produktive GitHub-Rulesets und Vercel bleiben unverändert.

## 6. Ergänzung: Echte GitHub-Token-Negativprobe (teilweiser Cloud-Nachweis)

**Datum:** 2026-11-23. **Entwurf-Commit des erstmals geprüften Workflows:** `05a0f1c45db430e6f8386ca2609c16fb8ad2342b`.
**Live-Run:** [NERYX merge candidate verification #45115396190](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45115396190); Job **`solo-token-readonly-negative` erfolgreich**.

Da kein neues Repository mit den vorhandenen GitHub-Tools angelegt werden kann, wurde **ausschließlich in Draft-PR #91** ein bewusst eingegrenzter `pull_request`-Job ergänzt. Er läuft **nur, wenn PR-Nummer 91** geprüft wird, mit `permissions: contents: read`, ohne Checkout von PR-Code und ohne andere Geheimnisse. Er stellt zunächst einen erfolgreich authentifizierten `GET /repos/{repo}` sicher und sendet dann einen `POST /repos/{repo}/git/refs` für den zufällig laufgebundenen Testbranch. Die angegebene SHA ist `000…000` (40 Nullen) und bezeichnet kein gültiges Git-Objekt; so ist eine echte Branch-Erstellung ausgeschlossen, selbst wenn Schreibberechtigungen unerwartet vorhanden wären.

**Originales GitHub-Actions-Protokoll:** `Read-only Actions token write probe HTTP 403` sowie `PASS: GitHub refused Git-ref creation by read-only Actions token`. Bei HTTP 422 oder jeder anderen Antwort würde der Job absichtlich **FAIL** ausgeben, weil ein bloß ungültiger Payload keine Berechtigungsverweigerung beweist.

**Aussage:** Der Token **dieses** gesonderten PR-Jobs durfte zur Laufzeit keine Git-Referenz erstellen. GitHub hat dies mit HTTP 403 abgelehnt. Das ist eine echte Cloud-Antwort und nicht bloß ein Offline-Mock.

**Grenze:** Für die neun bestehenden Forschungsworkflows mit `contents:write`, für die GitHub-Administratorverbindung, für künftige Agentenidentitäten, native GitHub-Branchschutzregeln oder das erforderliche Merge-Blocking wurde **keine** entsprechende Live-Berechtigungsabnahme durchgeführt. Die Token-Prüfung ersetzt nicht die geplante isolierte Test-Repository-Abnahme. **Auto-Code-Merge und Production-Deploy bleiben NO-GO.**

## 7. GitHub-Live-Negativprobe erweitert: Dateiänderung ebenfalls gesperrt

**Test-Commit:** `1458f8a1c0676abf7bc7345418d37f214d135668`; [GitHub Actions 45115811513](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45115811513), Job `solo-token-readonly-negative`: **success**.

Der auf Draft-PR #91 beschränkte `pull_request`-Job mit `permissions: contents: read` hat nun **zwei echte, unabhängige GitHub-API-Schreiboperationen** negativ getestet:

1. `POST /repos/{repo}/git/refs` zum Anlegen eines Branches mit ungültiger Objekt-SHA: **HTTP 403**.
2. `PUT /repos/{repo}/contents/docs/GENESIS_X_SOLO_OWNER_MODE.md` auf dem PR-Branch mit einer absichtlich falschen aktuellen Blob-SHA: **HTTP 403**.

Die absichtlich ungültigen SHA-Werte sind eine zusätzliche Sicherung gegen tatsächliche Schreibänderungen. Die *Interpretation* des Tests beruht jedoch ausschließlich auf **HTTP 403**, nicht auf dem ungültigen Wert; HTTP 409/422 wäre als nicht bewiesene Rechteverweigerung gescheitert.

**Grenze unverändert:** Dies gilt nur für den explizit leseberechtigten PR-Token, nicht für die neun `contents: write`-Forschungstokens, Owner-App-Rechte oder native Ruleset-Bypass-Sicherheit. Deshalb weiterhin **NO-GO** für autonome Codeänderungen, Merges und Production-Deployments. Es wurden kein Branch, keine Datei auf `main`, kein Ruleset und keine Vercel-Produktionskonfiguration geändert.

## 8. GitHub-Live-Negativtest: verbotener Auto-Kandidatenpfad

**Datum:** 2026-11-23. **Testbranch:** `neryx/auto/solo-path-negative-20261123`, SHA `34f1c7a830906351d024ee5cf745f2f76eec82df`. **Test-PR:** [#92](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/92), ausschließlich eine ungefährliche Dokumentationsdatei `docs/GENESIS_X_SECURITY_NEGATIVE_PROBE_20261123.md` außerhalb der zulässigen `candidates/`-Pfade. Keine Code-/Workflow-Änderung.

**Tatsächliche GitHub-Ergebnisse:**
- [Candidate-policy Run 45116045773](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45116045773): `genesis-candidate-paths` scheiterte **erwartet** mit `DENIED: prohibited path: docs/GENESIS_X_SECURITY_NEGATIVE_PROBE_20261123.md`.
- [Trusted-base Run 45116045762](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45116045762), Ereignis `pull_request_target` aus `main`: `genesis-candidate-paths-trusted` scheiterte **erwartet** mit `DENIED: auto-candidate attempted disallowed path` für dieselbe Datei. Keine Ausführung von PR-HEAD-Code.
- GitHub meldete für PR #92 `mergeable_state: blocked`. **Der PR wurde anschließend geschlossen, `merged:false`**. `main` blieb unverändert.

**Aussage:** Ein `neryx/auto/*`-PR mit nur einer unerlaubten `docs/`-Datei wird im echten Repository von **beiden** bestehenden Candidate-Sicherheitschecks erkannt, und sein Merge war blockiert. Dies ist **ein** echter Negativfall, noch keine vollständige zweifache Cloud-Abnahme sämtlicher Umgehungen. Ein anders benannter Branch oder ein kompromittierter `contents:write`-Token ist dadurch nicht geprüft. Insbesondere bleibt die Frage einer Identitätsbindung für alle Auto-Agenten offen. Kein Auto-Merge/Production-Deploy erlaubt.

**Wichtiger Unterschied zur früheren Aussage „keine Cloud-Tests“:** Diese ist inzwischen überholt: Ein leseberechtigter PR-Token wurde zweimal per GitHub-API negativ getestet (Branch-Erstellung und Dateiänderung je HTTP 403), und ein echter Auto-Branch-Dateipfadverstoß wurde durch zwei GitHub-CI-Gates verweigert. Die **vollständige** Cloud-Rechte- und Ruleset-Abnahme bleibt dennoch offen.

## 9. Sicherheitslücke entdeckt: Kandidatenordner erlaubte `.js`; Draft-Fix getestet

**Negativer GitHub-Live-Test:** [Draft-PR #93](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/93) auf `neryx/auto/solo-extension-negative-20261123`, SHA `06bf9023b5a5a1199ef1ec06ff721ba47fd7015a`. Er enthielt nur eine harmlose Kommentar-Datei `candidates/GENESIS_X_EXTENSION_NEGATIVE_PROBE_20261123.js`.

**Beobachtetes Ergebnis der bestehenden `main`-Gates:** [Candidate policy 45116307098](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45116307098) und [Trusted-base policy 45116307208](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45116307208) wurden **beide erfolgreich** abgeschlossen. Das ist in diesem Negativtest eine **Sicherheitslücke**, weil die Checks nur `candidates/` bzw. `eval/candidates/` als Präfix zuließen, ohne auf `.json` und Dateistatus zu prüfen. Der GitHub-PR-Zustand `mergeable_state: blocked` entstand bei einem Draft-PR und darf **nicht** als Beweis für einen File-Type-Check gelten. PR #93 wurde **geschlossen, nicht gemergt**.

**Korrektur ausschließlich im Draft-PR #91 vorgeschlagen:**
- `.github/workflows/neryx-genesis-candidate-policy.yml`: liest `git diff --name-status -z --no-renames` und akzeptiert nur neue/geänderte Dateien (`A`/`M`) mit strengem Pfad `candidates/**/*.json` oder `eval/candidates/**/*.json`. Dateiendungen `.js`, Umbenennung/Löschung, versteckte oder sonstige Pfade werden abgewiesen.
- `.github/workflows/neryx-genesis-candidate-trusted.yml`: read-only GitHub-PR-Dateiliste lässt nur Status `added`/`modified` und denselben JSON-only-Pfad zu; Umbenennungen werden abgewiesen. Weiterhin **kein** Checkout/Execute des PR-HEADs.
- `eval/tests/genesis-candidate-json-only.test.mjs`: acht zusätzliche lokale Git-Diff-Szenarien, darunter positive JSON-Pfade und negative JS-/Fake-JSON-/Delete-Fälle.
- `eval/tests/genesis-trusted-policy.test.mjs`: Regressionen an die verschärfte Trusted-Policy angepasst.

**CI-Beleg:** [Integration 45116637985](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45116637985) des Test-Commits `ad405ee093467508dd7a2a2d1134a647b06b4435`: **387/387 bestanden**. Dies belegt den lokalen vorgeschlagenen Policy-Code, **nicht** eine bereits live wirksame Trusted-Base-Änderung.

**Wichtig:** `pull_request_target` liest seinen Workflow aus `main`; das verschärfte Trusted-Gate in Draft #91 **wird erst wirksam, wenn der geänderte Workflow nach menschlicher Freigabe auf `main` gelangt**. Bis dahin besteht die im Live-Test #93 beobachtete JSON-only-Lücke im tatsächlichen Trusted-Check weiter. **Kein eigenmächtiger Merge, kein automatisches Deploy und keine Behauptung einer schon behobenen Produktionslücke.** Es fehlen weiter eine vollumfängliche GitHub-Token-/Ruleset-Abnahme und die Verifikation der Vercel-Publishing-Kopplung.
