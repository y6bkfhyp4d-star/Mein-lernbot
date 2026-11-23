# NERYX – kostenloser GitHub-Codeprüfer

## Status
Zwei getrennte Prüfwege, ohne bezahlte Abhängigkeiten oder automatische Änderungen:

1. **Statischer GitHub-Actions-Check:** Läuft für neue Pull Requests auf `main` automatisch. Keine KI und kein API-Schlüssel notwendig. Auswertung in GitHub Actions → Job Summary. Die Heuristiken geben nur Hinweise; grüne Tests ersetzen keine Codeprüfung.
2. **Gemini-KI-Prüfung:** Nur nach **manuellem** `workflow_dispatch` auf **`main`**. Erfordert das GitHub-Repository-Secret `GEMINI_API_KEY`. Die KI wird nicht ohne Schlüssel aufgerufen. Das Modell ist `gemini-3.5-flash-lite` über die Gemini Developer API; kostenlos nur innerhalb des tatsächlich verfügbaren Free-Tier-Kontingents. Keine kostenpflichtige Ersatz-API, kein automatischer Retry.

## Einrichtung – erst nach geprüfter Übernahme dieses Workflows in main
1. Unter [Google AI Studio](https://aistudio.google.com/apikey) einen Gemini-API-Key für ein **Free-Tier-Projekt ohne aktivierte kostenpflichtige Abrechnung** erstellen. Vor Nutzung das [offizielle Preismodell](https://ai.google.dev/gemini-api/docs/pricing) kontrollieren; Free-Tier-Modelle, Quotas und regionale Verfügbarkeit können sich ändern.
2. GitHub → `Mein-lernbot` → **Settings → Secrets and variables → Actions → New repository secret**. Name: exakt `GEMINI_API_KEY`. Wert direkt dort eintragen, niemals in Dateien, Chat, PR oder Logs.
3. GitHub → **Actions → NERYX free read-only code reviewer → Run workflow**. Branch `main` auswählen, als `pr_number` die Nummer eines offenen PR gegen `main` eingeben. Report unter dem betreffenden Workflow-Lauf → **Job summary** lesen.

**Wichtige Kostenwarnung:** Dieses Skript kann nicht feststellen, ob ein Nutzer bei Google Abrechnung aktiviert hat. Eine absolut kostenfreie Nutzung kann nur das *Free-Tier-Google-Projekt ohne kostenpflichtige Billing-Option* absichern. Wenn Quota/Modellzugriff fehlt: Workflow schlägt fehl, **kein Pay-Fallback**. Nutzer prüft Preismodell und Billing selbst.

## Sicherheit und Grenzen
- GitHub Actions `contents: read`, `pull-requests: read`. **Kein** Push, keine PR-Kommentare, kein Merge, kein Release, keine Dateiänderung, keine eigenständige Selbstoptimierung.
- **Gemini-Secret ausschließlich** bei manuellem Auslösen des Jobs auf `refs/heads/main`; PR-Code wird nicht ausgecheckt/ausgeführt. Github-API liefert nur begrenzte Diffs.
- Höchstens **30 Dateien**, maximal **12.000 Diff-Zeichen** und **5.000 pro Datei**. Nur bestimmte Code-/Workflow-Endungen; Namen mit Hinweisen auf Secrets und Diff-Inhalte mit typischen Schlüsselmustern werden **nicht** an Google gesendet. Ausgelassene Dateien werden gezählt und müssen manuell geprüft werden.
- **Rest-Risiko:** Musterfilter können private Informationen übersehen; nie geheime oder personenbezogene Inhalte in PR-Diffs einchecken. Auf dem kostenlosen Gemini-Tier können Eingaben zur Verbesserung von Google-Produkten genutzt werden. Keine vollständige Vertraulichkeitsgarantie.
- KI-Ausgaben sind Empfehlungen ohne Ausführung, ohne Gewähr auf Vollständigkeit. Besonders sicherheitskritische Änderungen müssen weiterhin von dir selbst geprüft werden.
- Der statische Check untersucht nur einzelne Diff-Muster und kann Fehler übersehen; keine neue verpflichtende KI-Approve-Regel im GitHub-Ruleset.
- Ein `workflow_dispatch`-Workflow ist normalerweise **erst nach Aufnahme in den Default-Branch `main`** über GitHub Actions verfügbar. Ein Draft-PR allein aktiviert den echten Gemini-Workflow noch nicht.
- Ein späterer GitHub-`main`-Merge ist eine separate menschliche Freigabe; Vercel-Git-Deployments sind gemäß eingecheckter `vercel.json` deaktiviert. GitHub Pages kann `main` automatisch veröffentlichen.

## Tests
`python3 -m unittest discover -s eval/tests -p 'test_neryx_code_reviewer.py' -v`

Die Tests benötigen keine Google-API, kein Internet und keine Abrechnung.

## November 2026: Gemini-Modell aktualisiert

Der manuelle API-Test lieferte HTTP 404 für `gemini-2.5-flash-lite`; für neu eingerichtete Projekte ist dieses Modell nicht zuverlässig nutzbar. Der Reviewer nutzt jetzt `gemini-3.5-flash-lite`, das Google als Free-Tier-Modell listet. Dies ist zunächst eine Code-/CI-Korrektur; ein erfolgreicher Live-Aufruf mit dem im GitHub-Secret gespeicherten Schlüssel muss anschließend **einmal manuell** belegt werden. Keine automatische kostenpflichtige Ausweichroute oder Wiederholung.
