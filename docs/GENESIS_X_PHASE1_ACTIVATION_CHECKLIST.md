# GENESIS X – Phase-1-Freigabegate: kontrollierter Aktivierungsplan

**Stand 23.11.2026 · ENTWURF · KEINE AKTIVIERUNGSFREIGABE**

Referenzen:
- [Sicherheits-PR #90](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/90), Draft-Head `4f546fe8654d57d76dc7fbc4b82f255479bfa117`
- [Kontext-/AST-PR #89](https://github.com/y6bkfhyp4d-star/Mein-lernbot/pull/89), weiterhin getrennt
- GitHub-Ruleset `27848423`, `NERYX – Main Branch Protection`
- `main`-Basis bei Prüfung: `80a43dd77e338d005b88c7b2a918193886cb55ab`

## Stand der Evidenz

| Kontrolle | Zustand | Nachweis/Grenze |
| --- | --- | --- |
| GitHub-Ruleset auf `main` | AKTIV | Pull Request / fünf Statuschecks / keine Bypass-Akteure |
| CI zu PR #90 | GRÜN | AST, Candidate-Policy, Integration, Chromium, WebKit |
| JSON-/Path-/Review-Policy | UNIT-GETESTET | Gegen Mock-API / lokale Szenarien, **nicht** als aktive GitHub-Erzwingung |
| Verpflichtende native Review | **FEHLT** | `required_approving_review_count:0` |
| Automatische Stale-Review-Entwertung | **FEHLT** | `dismiss_stale_reviews_on_push:false` |
| Geeigneter unabhängiger Reviewer | **NICHT NACHGEWIESEN** | Keine zweite berechtigte Person bestätigt |
| Zwei negative echte GitHub-Testläufe | **OFFEN** | Test-Repository nicht eingerichtet / Tests nicht ausgeführt |
| Änderung an `main`, Vercel, Ruleset | **KEINE** | PR #90 bleibt Draft |

## Warum PR #90 jetzt nicht gemergt werden darf

Der vorgeschlagene `pull_request_target`-Workflow prüft aus dem geschützten Basis-Commit eine live nachgewiesene native Genehmigungspflicht. Bei aktivem Ruleset mit Reviewzahl `0` fällt die Prüfung für sensible Änderungen daher absichtlich durch. Die neue `*.py`-Datei ist nur **nach** Aufnahme auf `main` im geschützten Checkout verfügbar; vor dem Merge führt der bereits aktive alte Trusted-Workflow PR #90 aus, **nicht** den neuen Code aus PR #90. Somit beweist ein grüner Trusted-Check auf PR #90 nicht die Live-Wirkung der vorgeschlagenen Änderungen.

Eine Änderung am GitHub-Ruleset oder Merge ohne abgestimmte Reihenfolge kann den eigenen Freigabeweg blockieren. Bestehende 0-Review-Checks sind nicht gleichbedeutend mit unabhängiger menschlicher Freigabe.

## Sicherheits-Abnahme im isolierten Repository

Ein unabhängiger, temporärer Test-Repository-Klon muss den **exakten** Gate-Commit und ein für den Test eingerichtetes Ruleset verwenden. Jede Negativprobe **zweimal** durch echte GitHub-PRs prüfen und Resultate mit PR-URL, HEAD-SHA, UTC-Zeit, Ruleset-Snapshot und erwarteter/beobachteter Aktion festhalten:

1. Erlaubter Kandidat: valide JSON-Datei im Kandidatenordner **mit nachgewiesenem, passenden Blob-SHA und baseSha**; grüner Trusted-Check allein darf den PR nicht automatisch mergen.
2. Negativ: `neryx/auto/*` verändert `app.js`, Gate-/Workflow-Dateien, andere Endungen, gelöscht/umbenanntes JSON. **Deny**.
3. Negativ: fehlendes, falsches, übergroßes oder beschädigtes JSON, duplicate keys, falsches Blob/Base-SHA, fehlende API-Daten. **Deny**.
4. Negativ: normale PR ändert `app.js` ohne unabhängige Review, mit Selbstreview, Bot-Review, Review zu altem Commit, `CHANGES_REQUESTED`, nach Review-Widerruf. GitHub-Merge muss in jedem Fall **blockieren**.
5. Positiv: ein geeigneter zweiter Mensch genehmigt den **exakten aktuellen** Commit einer normalen sensiblen PR; GitHub-Merge bleibt nur bei allen übrigen required Checks zulässig. Kein automatischer Merge.
6. Negativ: Push nach genehmigter Review, veralteter PR-Event-/API-Zustand, Ruleset-/Workflow-Änderung, fehlender Pflichtcheck und PR-Retargeting. **Deny**, erzwungen von GitHub.
7. Berechtigungen: `pull_request_target` darf nur geschützte Base-Quelle ausführen; kein Checkout von PR-Code, keine Schreibberechtigungen, keine übergebenen Secrets an PR-Code.
8. Reviewer-Zuordnung: `author_association` ist keine verbindliche aktuelle Berechtigungsprüfung. GitHub-Permissions / verwendete Reviewer-ID unabhängig bestätigen.
9. Kein Alarm aufgrund bloß grünem Unit-Test oder statischem Workflow-Scan. Abnahme erfordert Beobachtung des **echten Merge-Blockings**.

## Voraussetzungen für Aktivierungsentscheidung

- Einen zweiten GitHub-User mit nachweislich geeigneter **separater** Review-Berechtigung benennen und einen realistischen Review-Ablauf vereinbaren.
- In isoliertem Test-Repository das Ruleset mit **mindestens einer verpflichtenden Genehmigung** und `dismiss_stale_reviews_on_push:true` einrichten, ohne das produktive Repo zu verändern.
- Den neuen Trusted-Base-Workflow im Test-Repository als geschützte Base-Version veröffentlichen; **erst danach** seine tatsächliche Wirkung auf neue PRs prüfen.
- Negativfälle zweimal wiederholen, Protokoll mit SHA und Links sichern. Die Test-Repository-Einstellungen und GitHub-Plan-Fähigkeiten auf das produktive Setup übertragbar verifizieren.
- Dokumentieren, wie Ruleset und Trusted-Workflow **koordiniert** aktiviert werden, ohne eine Sperre des einzigen legitimen Maintainers zu verursachen. Vor Änderungen ist eine ausdrückliche menschliche Freigabe für diese Konfigurationsumstellung erforderlich.
- Danach erst über einen bewussten, manuellen Merge von PR #90 und mögliche Fortsetzung von PR #89 entscheiden. **Kein automatischer Merge und kein Vercel-Deploy**.

## Verbindlicher Stopppunkt

**Bis alle Bedingungen nachgewiesen sind: `Phase 1 = BLOCKED`; kein Fortschritt zu autonomem Patch/PR/Merge/Deploy, keine Behauptung, der neue Schutz sei bereits aktiv.** Die externe 158-Fälle-AST-Holdout-v2-Messung aus Phase 2 ist separat erfolgreich, hebt diesen Stopppunkt aber nicht auf.
