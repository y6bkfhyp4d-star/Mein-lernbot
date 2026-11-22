# GENESIS X #62 – kontrollierte Qwen-Absichtsprüfung

**Forschungs-Draft auf #61. Kein Live-Release.**

Die neue Seite `eval/neryx-genesis-x-62-qwen.html` bindet die bereits vorhandene und unveränderte `modules/local-model-bridge.js` ein. Auf dem iPhone kann der Nutzer **ausdrücklich** „Qwen 2.5 lokal laden“ auswählen. Erst dann kann ein Modell-Download über die bestehende WebLLM-Brücke erfolgen. Ohne diese Betätigung wird kein Modell automatisch gestartet. Ein zweiter Nutzerklick fragt Qwen via `NERYXLocalModel.askRaw` nach einer **rein binären Absicht**: exakt `PRUEFEN` oder `NICHT_PRUEFEN`.

**Sicherheitsvertrag:** Qwen entscheidet ausschließlich über das *Ob* der Forschungsprüfung. Qwen darf **weder Zahlen noch Werkzeuge noch Rechenregeln** an GENESIS X liefern. Die Zahlen stammen ausschließlich aus einem unveränderten Teil der Original-Nutzereingabe. Mindestens fünf eindeutige Zahlenpaare und ein getrennter Probewert werden streng validiert; dann entscheidet der unveränderte NERYX-Planer über den Typ `pairs`. Erst nach `PRUEFEN` ruft die neue Schnittstelle das bestehende `#61`-Entscheidungsgate über `#60` und den echten GENESIS-Worker. Alle Rückgaben sind ausschließlich `{status,route,reviewOnly:true,publishable:false}`.

Die von Qwen generierten Erklärungen, Adressen, Werte, Code, Vorschläge oder Antworten wie `PRUEFEN 999=999` werden ohne Worker-Aufruf verworfen. Die normale NERYX-App bleibt vollständig unberührt. Nutzer können alternativ `GENESIS prüfen: ...` ohne Qwen untersuchen. Eine gewöhnliche Wissensfrage wird nicht an GENESIS X durchgereicht.

## Grenzen und Tests

Die automatischen Tests arbeiten mit **simulierten Qwen-Absichtswerten**, aber echten unveränderten NERYX-/GENESIS-Modulen. Die Browserprüfungen arbeiten mit dem realen GENESIS-WebWorker und der tatsächlichen Forschungsseite; das Qwen-Interface wird dort bewusst ohne Modellgewichte simuliert. Erst der gesonderte iPhone-Praxistest kann einen echten lokalen Qwen-Modellstart belegen.

Kein Cloud-API-Aufruf, kein kostenpflichtiger Anbieter, keine Veränderung an Lernspeichern, bestehendem WebLLM, `main`, PWA, Frozen-Siegel, Browser-Chats oder der normalen Modellsteuerung. **Keine automatisierte Zusammenführung und keine Produktion.**

Der enge Qwen-Wortlaut kann bei einem echten kleineren Modell zu `model_rejected` führen, auch wenn die Anfrage verständlich ist. Das ist eine absichtliche konservative Sperre, kein Beweis für mangelnde Qwen-Fähigkeiten.
