# NERYX – kontrollierte Vercel-Veröffentlichungen

## Entwicklungsablauf

- Entwicklung und Pull Requests laufen über GitHub; die vorhandenen NERYX-CI-Tests bleiben unverändert.
- GitHub Pages veröffentlicht `main` automatisch.
- Vercel bleibt mit dem GitHub-Repository verbunden, erstellt durch `vercel.json` aber **keine automatischen Git-Deployments** mehr (weder Preview noch Produktion).
- Die bereits veröffentlichte Vercel-Produktionsseite wird dadurch **nicht gelöscht oder automatisch geändert**.

## Manuelles Release

1. Aktuellen `main`-Commit ermitteln und den vollständigen NERYX-Haupt-App-Testlauf (94 Tests), die Integrationstests sowie Chromium und WebKit für **genau diesen Commit** überprüfen.
2. Sicherstellen, dass das Vercel-Deployment-Limit wieder freigegeben ist. Bei laufender Sperre **nicht wiederholt Builds starten** und kein kostenpflichtiges Upgrade voraussetzen.
3. Nur nach ausdrücklicher Release-Freigabe ein **einmaliges** Deployment vom festgelegten Git-Commit für das bestehende Vercel-Projekt `mein-lernbot` auslösen. Dabei den exakten SHA als Git-Quelle verwenden, keine ungeprüfte aktuelle Branch-Spitze.
4. Deployment und Produktions-Alias `mein-lernbot.vercel.app` auf Status READY und den **exakten Release-SHA** kontrollieren; auf der öffentlichen Seite einen Funktionscheck durchführen.
5. Bei Problemen keine weiteren automatischen Versuche; die vorherige funktionierende Produktionsversion ist der Rückfallpunkt.

**Wichtig:** `git.deploymentEnabled: false` unterdrückt Git-basierte Automatik-Builds. Ein manuelles Deployment über Vercel-API/CLI ist weiterhin vorgesehen. Ein expliziter Release muss separat autorisiert werden; diese Konfiguration löst keinen Release aus.

Dokumentation: https://vercel.com/docs/project-configuration/git-configuration
