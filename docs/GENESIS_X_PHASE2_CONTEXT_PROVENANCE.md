# GENESIS X – Phase 2: Kontextabhängige Provenienz konservativ sperren

**Basis:** main `80a43dd77e338d005b88c7b2a918193886cb55ab` (22.11.2026).  
**Geltungsbereich:** isolierter Analyzer unter `eval/genesis-ast/`. Keine Änderungen an produktivem `app.js`, Modulen, GitHub-Schutz oder Deployment.

## Ausgangsproblem

Der Datenfluss-Analyzer ignorierte `ThisExpression` und `Super` als Eingaben; auch Parameterdefaults, Destructuring und Rest-Parameter waren nicht ausdrücklich eingeschränkt. So konnte eine Funktion wie `function f(x){return x+this.value;}` fälschlich als einfacher Herkunftspfad betrachtet werden. Das ist eine **falsch positive Klassifikation des Berichtsstatus**, kein Nachweis, dass Code zur Laufzeit sicher oder unsicher ist.

## Begrenzte Korrektur

- Receiver-bezogene Ausdrücke (`this`, `super`, `new.target`) erhalten `unknown:receiver-context`; die bestehende Korrelation verweigert damit die eingeschränkte Evidenzfreigabe.
- Nichttriviale Parameterbindungen (`AssignmentPattern`, Destructuring, Rest) führen zu `complex-parameter-binding-not-tracked`.
- Eine neue feste Seed-Suite mit **3 erwarteten eingeschränkt berichtsfähigen** und **9 erwarteten manuell prüfpflichtigen** Fällen überprüft Positiv- und Negativverhalten; zusätzlich wird Nichtausführung geprüft.
- Das gesamte Produkt bleibt unverändert. Keine neue Schreib-, Ausführungs-, Merge- oder Netzwerkfähigkeit.

## Abnahme und Grenzen

Vor Freigabe: sämtliche sechs CI-Jobs und die neue Seed-Suite prüfen. Die Tests müssen die Erwartungen anhand der unveränderten Vorgaben überprüfen, ohne Ergebnisse nachträglich passend zu machen. Reale GitHub-Actions-Läufe sind gesondert nachzuweisen.

Die Seed-Suite ist **kein unabhängiger Holdout** und deckt nur einfache künstliche Beispiele ab. Sie beweist weder die im Masterplan geforderten 90 % auf einem unabhängigen Fehlerkorpus noch allgemeine JavaScript-Semantik, Präzision, Recall oder Angriffssicherheit. Auch Getter, Proxies, Aliasbildung, Closures, asynchrones Verhalten und komplexe Kontrollpfade bleiben relevante Einschränkungen. **Keine automatische Codeänderung oder Einbindung in NERYX erlaubt.**

**Danach:** Unabhängigen Seed-/Holdout-Korpus für echte Fehlerbefunde erstellen; anschließend einzelne verbleibende falsch positive Evidenzberichte gezielt minimieren.
