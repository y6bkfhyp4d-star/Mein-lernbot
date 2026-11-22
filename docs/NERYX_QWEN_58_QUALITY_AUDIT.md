# NERYX #58 – Unabhängiger Qualitätstest für vorhandenes Qwen-System

**Forschung, kein Live-Release.** Dieser Stacked-Draft baut auf PR #57 auf; der bereits vorhandene Qwen-2.5-WebLLM-Adapter wird **nicht** ersetzt.

## Ziel

Prüfe die **echten Produktmodule** `modules/orchestrator.js`, `modules/math-verifier.js` und `modules/answer-review.js` in einem isolierten Node-VM-Harness. Ein synthetischer, kontrollierter Qwen-Stub liefert bewusst falsche, unvollständige oder unzulässige Antworten. Es werden **keine echten Qwen-Modellgewichte** geladen, keine externen Dienste angesprochen und keine persönlichen Daten genutzt.

Die zehn expliziten Testfälle überprüfen:
- **150-m²-Wandfläche** als vom Modeltext unabhängige numerische Erwartung. Wenn ein hypothetisches Qwen „5 m²“ erfinden würde, muss der Rechenkern Vorrang haben.
- Fehlende Angabe zu identischen Wandgrößen: Rückfrage statt geratenem Ergebnis.
- Konfligierende gespeicherte Belege: kein Sprachmodellaufruf.
- Verwandte Informationen: keine erfundene Ja-/Nein-Bestätigung.
- Nicht zulässige Modell-Werkzeugwahl: ablehnen.
- Flüssige, aber unbelegte Modellantwort: als **unverifiziert** markieren; **nicht** als Wahrheit erklären.
- Wiederholt ungenügende Modellantwort: ablehnen.
- Offline ohne geladenes Modell: keine Downloads; lokale Funktionen bleiben.
- Eindeutiger Wissensfund: Modell nicht starten.
- **Offene Schwäche als Positivtest sichtbar:** die bestehende `answer-review.js` erkennt bei einer freien Frage eine frei erfundene, selbstsichere Faktenbehauptung **nicht** als falsch. `complete:true` beweist nur, dass keine der derzeit definierten formalen Anforderungen fehlte.

## Transparenz und Freigabegrenzen

Diese Suite testet die **realen Orchestrator-/Prüfer-Codepfade**, aber Qwen-Text ist synthetisch. Sie ist weder ein Qwen-Qualitätsscore auf dem echten iPhone noch ein unabhängiger Wahrheitsbeweis. Ein grüner Test darf nicht als „alle falschen Qwen-Antworten werden abgefangen“ beschrieben werden.

Produktive Dateien, bestehende Lernspeicher, Service Worker, Frozen-Siegel, Modellintegrationen und die offiziellen NERYX-Befehle bleiben unverändert. Keine automatischen Modell-Downloads, kein Merge nach `main`, kein Production-Deploy.

**Folgeschritt nach Review:** Blind-Holdout mit ausgewogenen deutschen Fragen aus echten Nutzerkategorien und reproduzierbarem Quellabgleich für Faktenbehauptungen; dann minimalen, separat getesteten Qualitätsfilter vorschlagen. Einen einzelnen bekannten Zahlentyp nicht als allgemeine Mathematikprüfung ausgeben.
