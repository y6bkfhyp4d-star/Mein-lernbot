# GENESIS X – geschütztes PR-Gate v2 (ENTWURF)

**Status:** Sicherheitsvorschlag, noch **NICHT** auf `main` aktiv. Kein Freigabesignal für autonome Codeänderungen.

## Bedrohungsmodell und Verhalten

Das alte Trusted-Base-Gate für `main` prüft `neryx/auto/*`-PRs auf `candidates/` und `eval/candidates/`, lässt aber normale PRs unabhängig von geänderten Dateien durch. Das aktive Ruleset verlangt zudem **0** Reviewer. Dieser Entwurf fügt die zweite Schranke hinzu:

- `neryx/auto/*`: nur Kandidaten-Datenpfade, sonst **DENY**. Rename-Quell- und Zielpfad werden geprüft.
- Alle anderen Branches: unsensible Änderungen ohne zusätzliche Genehmigung erlaubt; bei geschützten Dateien (`.github/`, `app.js`, `index.html`, `sw.js`, `vercel.json`, `modules/`, `eval/genesis-ast/`, `eval/tests/`, `scripts/`, `package.json`, `package-lock.json` und `manifest.webmanifest`) nur **PASS**, wenn ein anderer GitHub-*User* mindestens eine `APPROVED`-Review zum **exakten aktuellen HEAD-SHA** hinterlassen hat und dessen letzte formale Review-Entscheidung weiterhin `APPROVED` ist.
- Zustimmung des PR-Autors, veraltete Zustimmung für einen früheren SHA, Bot-Review, `CHANGES_REQUESTED` oder `DISMISSED` statt Zustimmung: **DENY**.
- Leere Datei-Listen, ungültige Pfade, fehlende API-Seiten, API-Fehler oder nicht lesbare Daten: **DENY**. Kein Checkout oder Ausführen von PR-Quellcode.
- `pull_request_target` führt **nur Code des geschützten Basis-SHA** aus; der `actions/checkout`-Schritt pinnt `github.event.pull_request.base.sha`, mit `persist-credentials:false`. GitHub-Token: `contents:read`, `pull-requests:read`.

## Geänderte Dateien

- `.github/workflows/neryx-genesis-candidate-trusted.yml` (ersetzt alten Trusted-Base-Workflow).
- `.github/scripts/genesis_trusted_gate.py` (read-only GitHub-API und Policy-Entscheidung).
- `.github/scripts/test_genesis_trusted_gate.py` (Offline-Negativtests, Szenarien zweimal).
- `eval/genesis-ast/tests/trusted-base-gate.test.mjs` (führt Python-Prüfung in bestehender AST-Test-CI aus).

## Aktivierungs-Blocker und Grenzen

1. **Vor dem Merge geeigneten zweiten Reviewer klären.** Ein selbst genehmigender GitHub-Owner reicht nicht. Der bereits offene PR #89 verändert sensible Analyzer-Dateien und würde **ohne unabhängige aktuelle Review durch dieses Gate blockiert**. Das ist absichtlicher Fail-Closed-Schutz.
2. **Nicht vom Bot mergen lassen.** Bei einem Solo-Repository kann diese Policy legitime sensible PRs dauerhaft blockieren; der zweite Reviewer muss zu diesem Repository berechtigt und verfügbar sein.
3. Die vorhandene Ruleset-Reviewzahl `0` wird durch diesen Workflowschritt **nicht geändert**. Es ist ein eigener verpflichtender Check, der bereits im Ruleset `genesis-candidate-paths-trusted` heißt. Das Ruleset ist an die GitHub-Actions-App gebunden. Vor Aktivierung sicherstellen, dass genau dieser Job am geschützten Basisworkflow hängt und nicht durch eine andere gleichnamige Check-Quelle ersetzt wird.
4. Der Branch-Name ist kein Beweis für die Identität eines autonomen Generators. Auch bei falschem Branch-Namen schützt der Entwurf sensible Pfade durch eine unabhängige Approval-Anforderung; die Sicherheit beliebiger Kandidaten-Daten in freigegebenen Pfaden muss weiterhin durch separate Gates geprüft werden.
5. Die Python-Tests beweisen **Policy-Logik**, keine echte GitHub-Ruleset-Abwehr oder GitHub-Review-Ereigniskette. Vor produktiver Aktivierung zweimalige negative Integrationstests in **separatem isoliertem Test-Repository**, einschließlich Fake-Review, Commitwechsel, umbenannter sensibler Datei, Workflow-Tampering und fehlender Statuschecks.
6. Andere noch nicht aufgeführte Pfade können ebenfalls sensibel sein. Die Pfad-Allowlist/Schutzliste braucht eine abschließende Review; insbesondere ist die Annahme, dass gewöhnliche Dokumente ungefährlich sind, keine allgemeine Sicherheitsgarantie.
7. Die `pull_request_target`-Konfiguration darf niemals PR-Code oder PR-gesteuerte Befehle ausführen. API-Ausgaben sind reine Daten.

**Entscheidung:** Nur als separater Draft-PR zur menschlichen Sicherheitsabnahme; weder `main` verändern noch automatische Freigabe / Merge / Produktion einschalten.

## Security-Review-Nachtrag: unbekannte Pfade und Reviewer-Herkunft

Die ursprüngliche Liste einzelner sensibler Pfade wäre für neu hinzukommende JS-/Build-/Test-Dateien lückenhaft. Der Entwurf wurde **vor Aktivierung** auf eine restriktive Ausnahme-Liste umgestellt: Nur `docs/`, `candidates/` und `eval/candidates/` gelten bei normalen PRs als review-frei; alle übrigen Pfade benötigen die unabhängige Review. Misch-PRs mit nur einer sensiblen Datei benötigen ebenfalls die Review. `neryx/auto/*` bleibt auch bei einer gültigen Review strikt auf die Kandidatendaten-Pfade beschränkt.

Als zusätzliche vorläufige Identitätsprüfung wird nur eine `APPROVED`-Review eines anderen GitHub-`User` mit `author_association` in `OWNER`, `MEMBER`, `COLLABORATOR` akzeptiert, dessen Commit-ID dem aktuellen PR-Head entspricht. **Achtung:** `author_association` beweist keine aktuell gültige Schreibberechtigung und ist keine zweite unabhängige Identitätsprüfung. Diese Grenze ist vor Aktivierung zu bewerten; insbesondere können nicht ausreichend berechtigte Accounts oder Organisationszugehörigkeiten sonst eine Scheinsicherheit erzeugen. Freigabe nur nach Berechtigungsprüfung oder streng bestätigtem Reviewer-Verfahren.

### Kritischer Trigger- und Lifecycle-Hinweis

Der Trusted-Base-Workflow läuft derzeit über `pull_request_target` für `opened`, `synchronize`, `reopened` und `ready_for_review`. **Ein später eingereichter oder zurückgezogener PR-Review triggert diesen Workflow damit nicht automatisch.** Nach einer gültigen neuen Review muss der zuständige Mensch den ursprünglichen Trusted-Base-Check manuell erneut ausführen und anschließend überprüfen, dass der **aktuelle** Check mit **aktueller HEAD-SHA** an `main`-Ruleset gebunden ist. Auch Review-Widerrufe müssen zu einer aktualisierten Blockierung führen; andernfalls kann ein vormals grüner Check fortbestehen.

Ein naiv hinzugefügter `pull_request_review`-Trigger wäre als Ersatz nicht automatisch vertrauenswürdig: GitHub weist auf unterschiedliche Ausführungskontexte für Review-Ereignisse hin; es wäre zunächst zu prüfen, dass Workflow-Code **nicht aus dem PR-Merge-Commit** ausgeführt wird. Das Aktivierungskriterium verlangt ein **automatisch oder verlässlich erneut ausgelöstes und nach Widerruf blockierendes** Check-Gate. Bis zum Nachweis ist der Lebenszyklus **nicht abgeschlossen**, auch wenn alle Offline-Policy-Tests bestehen.

**Keine Aktivierung, kein Merge, keine Änderung an `main`.** Entwurf und Tests dienen ausschließlich der Sicherheitsvorbereitung.
