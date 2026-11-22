# GENESIS X – Phase 1: aktueller GitHub-Main-Schutz, technische Bestandsaufnahme

**22.11.2026 – Read-only-Audit, keine Änderungen an GitHub-Settings.**
**Quellen:** GitHub REST `/repos/y6bkfhyp4d-star/Mein-lernbot/branches/main`, `/rulesets`, `/rulesets/27848423`, `/pulls/89`, `/commits/6fa2739fa36fe320e84c3080a5225f9564465e93/check-runs`; bestehende Workflows vom geschützten `main`.

## Direkt nachgewiesene Konfiguration

- `main`: `protected:true`; SHA `80a43dd77e338d005b88c7b2a918193886cb55ab`.
- Aktives **Repository-Ruleset 27848423**, Name **NERYX – Main Branch Protection**, Ziel `~DEFAULT_BRANCH`, `enforcement:active`, `bypass_actors:[]`, `current_user_can_bypass:never`.
- Regeln: Branch-Löschung verboten; Non-Fast-Forward-Push verboten; Pull Request vorgeschrieben.
- Verpflichtende GitHub-Actions-Checks (GitHub-Actions-Integration-ID 15368): `integration`, `browsers (chromium)`, `browsers (webkit)`, `genesis-candidate-paths`, `genesis-candidate-paths-trusted`.
- Für die eingefrorene PR #89, Head `6fa2739fa36fe320e84c3080a5225f9564465e93`, waren alle fünf verpflichtenden und zusätzlich `genesis-ast` Checks erfolgreich. PR blieb Draft, `merged:false`; `main` unverändert.
- Die ältere branch-protection-API `/branches/main/protection` liefert mit der verfügbaren GitHub-Integration 403. GitHub-Branch-Response `protection.enabled:false` bezeichnet die ältere Protection-Konfiguration; das **separate aktive Ruleset** erklärt `protected:true`. Die Ruleset-Daten sind unabhängig direkt gelesen.

## Sicherheitslücken / nicht nachgewiesene Ziele

1. **Keine formale menschliche PR-Freigabe erzwungen.** `required_approving_review_count:0`, keine Code-Owner-Review-Pflicht, keine Pflicht zur Review-Auflösung. Eine saubere PR mit grünen Checks könnte ohne zweiten Menschen gemerged werden. Dies ist **keine menschlich abgesicherte Freigabe** für einen KI-generierten Patch.
2. **Trusted-Policy ist nur für `neryx/auto/*` scharf.** Das geschützte `main`-Workflow `neryx-genesis-candidate-trusted.yml` verwendet `pull_request_target` und checkt weder fremden Source-Code aus noch führt er ihn aus – positiv. Es beendet jedoch normale PRs ohne Dateipfad-Prüfung mit Erfolg. Damit kann eine normale PR sensible Pfade ändern, ohne dass **dieser** Check eine menschliche Genehmigung erzwingt.
3. **Der zweite Pfad-Check läuft im PR-Kontext.** Das `pull_request`-Workflow `neryx-genesis-candidate-policy.yml` wird bei normalen PRs ebenfalls als erfolgreich verlassen und ist keine unabhängige Freigabe.
4. Die `integration`-/Browser-Checks laufen aus dem Merge-Kandidaten via `pull_request`. Eine spätere PR kann Workflows verändern, wenn keine separate, unabänderliche Policy das prüft. Das aktive Ruleset benennt Check-**Namen**, nicht unveränderliche Workflow-Dateien oder Test-SHA.
5. Die Workflow-Nachrichten erwähnen „human review“, aber das Ruleset verlangt derzeit **0** genehmigende Reviews. Ein Kommentar in einem Skript ist keine GitHub-Erzwingung.
6. Die nach Masterplan benötigten **zweimaligen negativen Versuche** (direkter Push, Force-Push, Delete, fehlende Checks, Bot-Selbstfreigabe, sensible Pfade, Token-/Workflow-Tampering) wurden nicht ausgeführt. Die Konfiguration kann nachvollzogen werden, ihre Wirksamkeit gegen jeden Angriffsfall ist noch nicht durch solche Tests belegt.
7. `strict_required_status_checks_policy:false`: der PR-Branch muss nicht zwingend auf dem neuesten `main` basieren. Das ist keine direkte Umgehung der benötigten Checks, bleibt aber für parallele Änderungen relevant.

## Empfohlene nächste Schutzentscheidung – vor Phasen 3–6

- Eine **wirklich unabhängige menschliche Review-Pflicht** für generierte Änderungen organisatorisch und technisch festlegen. `required_approving_review_count:1` erfordert einen zulässigen zweiten Reviewer; bei einem Einpersonen-Repository ist zuerst der Freigabeweg zu klären, um keine dauerhafte Blockade einzurichten. Aktuell **nicht** automatisch aktivieren.
- Trusted-Base-Gate auch auf gesperrte Workflow-, Gate-, Release-, Secrets- und Security-Pfade anwenden, und nach der Änderung prüfen, dass der `pull_request_target`-Check tatsächlich am geschützten Stand festgemacht ist. Keine generierte PR darf diese Gates modifizieren.
- Die negativen Schutztests zunächst in **separater, sicher isolierter Test-Repository-Umgebung** mindestens zweimal wiederholen. **Keine riskanten Probe-Pushes/Force-Pushes/Löschungen auf `main`.**
- Keine automatische PR-Merge-Funktion, keine Codegenerierung mit eigenständigem Merge und keine Vercel-Produktionsfreigabe, bevor alle Schutz-Nachweise vollständig sind.

**Beurteilung:** Ruleset und CI-Anforderungen sind aktiv nachgewiesen (**Konfiguration bestanden**); der vollständige negative Phase-1-Schutztest und die unabhängige menschliche Review-Grenze sind **nicht bestanden/nicht verifiziert**. Phase 1 und vollständige Phase 2 nicht als abgeschlossen deklarieren. Der externe AST/SEC-Regel-Holdout-v2-Erfolg ist davon unabhängig und bleibt gültig nur für seinen begrenzten Messgegenstand.
