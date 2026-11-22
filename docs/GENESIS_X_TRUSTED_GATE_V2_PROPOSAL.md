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
