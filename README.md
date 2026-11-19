# NERYX

## Fachliche Begriffsabgrenzung (19.11.2026)

Nach einem echten iPhone-Test antwortete Qwen auf die Frage nach Hypothese und Messung mit unsinnigen Temperaturbeispielen. Der alte Vollständigkeitscheck erkannte nur den fehlenden Malerbezug und zeigte dennoch den schlechten Modelltext.

Deshalb prüft `modules/answer-review.js` **speziell bei dieser ausdrücklich erfragten Begriffsabgrenzung** nun auch Minimalmerkmale: eine prüfbare Vermutung/Annahme oder klar testbare Wirkungsbehauptung, ermittelte Messwerte beziehungsweise eine messbare Größe und ein konkretes Malerbeispiel (Wand/Beschichtung + messbarer Aspekt).

Wenn nach genau einem Ergänzungsversuch die zentralen Begriffe nicht nachvollziehbar getrennt sind, verwirft `modules/orchestrator.js` die Modellantwort und zeigt `NERYX · FACHLICHE KONTROLLE` mit den fehlenden Merkmalen. Bei weniger grundlegenden Lücken bleibt der `VOLLSTÄNDIGKEITSHINWEIS` erhalten. Frühere Lernspeicher und das Sprachmodell selbst werden nicht umgeschrieben.

**Grenze:** Diese begrenzten Regeln sind keine zuverlässige allgemeine semantische Qualitäts- oder Wahrheitsprüfung. Ein auswendig gelerntes Fachbeispiel beweist weder Verständnis noch AGI. Für unbekannte Themen bleiben Antworten des kleinen Sprachmodells ungeprüft.

## Plan A – Antwort-Vollständigkeitskontrolle 1.0 (19.11.2026)

Neues Modul: `modules/answer-review.js`, **vor** `modules/orchestrator.js` geladen.
Bei frei formulierten Antworten prüft NERYX erkennbare, ausdrücklich verlangte Bestandteile:
ein Beispiel (auch „Beispiels“), nachvollziehbare Einzelschritte sowie ein ausdrücklich gewünschter
Malerhandwerksbezug. Bei der Musterfrage zu Hypothese und Messung werden auch die beiden Begriffe geprüft.

Fehlt ein Bestandteil, sendet NERYX **einmal** eine konkrete Ergänzungsaufforderung an das lokale Qwen.
Danach zeigt es entweder die Antwort als **unverifiziert** oder kennzeichnet weiterhin
fehlende Bestandteile mit `VOLLSTÄNDIGKEITSHINWEIS`. Offensichtlich sehr kurze
Anweisungen können weiterhin ganz abgelehnt werden.

Diese einfachen Heuristiken können fehlende Aspekte übersehen und korrekt formulierte
Antworten fälschlich als unvollständig markieren. Sie **prüfen keine Wahrheit** und
garantieren weder das Verständnis eines Beispiels noch fachliche Richtigkeit.
Es werden dabei keine Lernspeicher verändert und keine zusätzlichen Downloads gestartet.

Testfrage: `NERYX lösen: Erkläre mir den Unterschied zwischen einer Hypothese und einer Messung anhand eines Beispiels aus dem Malerhandwerk.`

NERYX ist die Weiterentwicklung von **Mein LernBot**: eine installierbare Web-App (PWA) für das iPhone mit lokalem Wissensspeicher, regelbasiertem Lernkern und optionalen Forschungs-/Sprachmodell-Experimenten.

**App:** https://y6bkfhyp4d-star.github.io/Mein-lernbot/

## Qwen automatisch bei Bedarf laden (19.11.2026)

NERYX lädt Qwen nun **nicht beim Öffnen der App**, sondern erstmals bei einer unbekannten Frage im Hauptchat, bei `NERYX lösen: ...` oder bei `KI fragen: ...`.
Der vorhandene Faktenbestand und die deterministischen Fachwerkzeuge antworten ohne Sprachmodell-Start.
Der erste Modellaufruf kann wegen der nötigen WebLLM-/Modellinitialisierung Zeit brauchen; innerhalb einer aktiven Sitzung wird ein bereits geladenes Modell wiederverwendet.
Beim Schließen, Neuladen oder durch iOS-Speicherfreigabe kann die WebGPU-Sitzung verloren gehen; die nächste entsprechende Frage lädt erneut.
Wenn WebGPU/Download fehlschlägt, zeigt NERYX den Fehler, die übrigen Funktionen bleiben nutzbar. Kein Modelltraining oder Speicherüberschreiben.
## Plan A, Stufe 2 – begrenzte Werkzeugsteuerung (19.11.2026)

Die gemeinsame KI-Steuerung in `modules/orchestrator.js` ist jetzt auf **Version 2.0**.

- Zuerst überprüfbare Rechen-/Planungsmodule, dann passende lokale Wissensantworten.
- Bei unbekannten Fragen kann das explizit geladene Qwen ein Werkzeug vorschlagen.
- Whitelist: Zahlenfolgen, Zahlenregeln, Rasterwege und Wandflächen.
- Die Werkzeugargumente müssen wörtlich in der Nutzerfrage vorkommen. Ein Modell darf keine Zahlen hinzufügen, Daten verändern oder Code ausführen.
- Rechenergebnisse stammen vom jeweiligen Fachmodul, Modellformulierungen bleiben als unverifiziert gekennzeichnet.
- Vor dem Modellstart kann `Sprachmodell wählen: 1,5B` oder `Sprachmodell wählen: 0,5B` ausgeführt werden. Die Auswahl geht über eine geprüfte `SET_MODEL`-Bridge an den vorhandenen WebLLM-Prototyp. Kein Modell lädt automatisch.
- 1,5B kann auf iPhones wegen GPU-Speicher scheitern. In dem Fall auf 0,5B zurückwechseln.

**Integrationstest:**

```text
Stapeltest:
KI-Systemstatus
NERYX lösen: 2=5, 4=9; 7
NERYX lösen: Setze die Folge 2,4,8,16 fort
```

Die Test-Suite wurde um isolierte Schutztests für erfundene Werkzeugargumente, Modellvorrang und Auswahl erweitert. Ein erfolgreicher iPhone-Start von Qwen 1,5B ist damit **nicht** nachgewiesen.

## Plan A – NERYX als gemeinsames KI-System (19.11.2026)

Mit `modules/orchestrator.js` gibt es jetzt **eine zentrale Aufrufstelle**
für bereits vorhandene Fähigkeiten. Qwen bleibt ein austauschbares,
lokal gestartetes Sprachmodell – **NERYX ist das gesamte System**.

- `NERYX lösen: FRAGE` prüft zuerst bekannte, kontrollierbar berechenbare
  Aufgaben (Wandfläche, Zahlenregeln, Zahlenfolgen und über den
  bestehenden Befehl `Weg planen:` auch Rasterplanung).
- Danach versucht die Zentrale eine eindeutige lokale Wissensantwort
  aus vorhandenem NERYX-Wissen. Bloß verwandte Stichwörter gelten nicht
  als gesicherte Antwort.
- Nur wenn kein passender deterministischer oder lokaler Treffer besteht,
  kann das **vorher vom Nutzer geladene** Qwen-Modell antworten.
  Die Modellantwort bleibt ausdrücklich *ungeprüft*.
- Die ursprünglichen Befehle, darunter `KI fragen:` für den direkten
  Modelltest, bleiben erhalten. Das System lädt das Modell nicht
  automatisch und verschickt keine privaten gespeicherten Informationen
  als Prompt an Qwen.
- `KI-Systemstatus` zeigt die tatsächliche Verfügbarkeit.
  Eine aktive Schnittstelle beweist keine umfassende allgemeine Intelligenz.

Einfügetest (gesamter Block auf einmal):

```text
Stapeltest:
KI-Systemstatus
NERYX lösen: 2=5, 4=9; 7
NERYX lösen: 2,4,8,16
```

Anschließend **einzeln** testen:
`NERYX lösen: Was ist ein Okapi?`
und nach `Sprachmodell laden` beispielsweise
`NERYX lösen: Was ist der Unterschied zwischen einer Hypothese und einer Messung?`.
Der letzte Fall ist eine ungeprüfte Qwen-Antwort, kein automatisch
verifizierter Fakt und kein Gewichts-Nachtraining.

**Grenze:** Der neue Router beherrscht nicht beliebige Textaufgaben,
Werkzeugaufrufe durch das Sprachmodell oder autonomes Handeln.
Anstatt eine neue Parallel-KI zu erstellen, erweitert Plan A die
überprüfbare Verbindung der bestehenden Komponenten schrittweise.

## Aktuelle Integrationsprüfung (19.11.2026)

Der Bestand und die Grenzen der Zusammenführung stehen in
[`NERYX_INTEGRATION_AUDIT.md`](NERYX_INTEGRATION_AUDIT.md).

**Neu eingebunden in den normalen Hauptchat:** ein gemeinsamer
Systemstatus, ein enger Problemlöse-Router für die bereits existierenden
Rechen- und Planungsoperatoren sowie eine **freiwillig zu startende**
Verbindung zum bestehenden WebLLM-Prototyp über `client.js`.

```text
Stapeltest:
Systemstatus
Problem lösen: 2=5, 4=9; 7
Problem lösen: 2, 4, 8, 16
Weg planen: 000;010;000
Fähigkeitstest
Sprachmodell Status
```

Der Testblock ist lesend und lädt **kein** externes Modell.
Zum gesonderten Test des Sprachmodells: `Sprachmodell laden`,
`KI fragen: ...`, optional `KI-Modus an`, später
`KI-Modus aus` und `Sprachmodell trennen`.
Die Bibliothek/Modellgewichte müssen zunächst heruntergeladen werden;
WebGPU-/iPhone-Kompatibilität ist nicht bestätigt.

**Nicht behauptet:** dass alle historischen Evolutionsphasen oder
sämtliche vorhandenen Interceptor-Skripte bereits in eine einzelne
universelle Laufzeit umgebaut wurden. Bestehende Speicher und
`window.LernBotBridge` bleiben unverändert.

## Aktuelle Haupt-App

| Datei | Zweck |
| --- | --- |
| `index.html` | Chat-Oberfläche, Sidebar und Einbindungen |
| `app.js` | Lernkern, Fakten, Erinnerungen, Aufgaben, Chat, Import und Export |
| `*-ki.js` | Zusatzmodule für Aufgaben, Wissen, Gedächtnis und Diagnose |
| `modules/code-diagnose.js` | Code-Prüfwerkzeug |
| `manifest.webmanifest`, `sw.js` | iPhone-PWA, Cache und Aktualisierung |
| `api/chat.js` | Separate Server-API mit externem KI-Anbieter (nicht automatisch Teil des Hauptchats) |

`evolution/` enthält **historische Entwicklungs- und Forschungsphasen**. Insbesondere `evolution/neryx/` ist ein WebLLM-Prototyp, der **noch nicht in die Haupt-App integriert** ist. Mehr Phasen bedeuten nicht automatisch mehr Funktionen in der Haupt-App.

## Persönlicher Lerntest 1.0 – echte lokale Vorher-Nachher-Messung

Neues Modul `modules/personal-learning-test.js`. Anders als synthetische
Lern-Demos prüft dieser Test die **aktuelle reale** Sprachklassifikation
unter Verwendung deiner eigenen gespeicherten Trainingsbeispiele und
Bedeutungsbrücken. Er verwendet zwölf vorher festgelegte, zurückgehaltene
Formulierungen, die NERYX nicht als Trainingsdaten speichert.

1. `Persönlichen Lerntest starten`: Ausgangsstand und Zuordnungen
   einfrieren; Testphrasen zunächst nicht anzeigen
2. Mit **eigenen** `Beispiel lernen: ... | ...`-Aufgaben oder bestätigten
   `Bedeutung lernen: ... = ...`-Verknüpfungen trainieren
3. `Persönlichen Lerntest auswerten`: Genau dieselben zurückgehaltenen
   Aufgaben erneut durch das aktuelle Modell schicken und Vorher/Nachher
   vergleichen
4. `Persönlicher Lernstand` zeigt einen laufenden Versuch;
   `Persönlichen Lerntest abbrechen` löscht nur die Prüfnotiz

Der komplette Ablauf ist auch in **einer Stapel-Nachricht** erlaubt:

```text
Stapeltest:
Persönlichen Lerntest starten
Beispiel lernen: Wir erhöhen die Zahl um fünf | 2,7,12,17,22
Beispiel lernen: Die Zahl wird jeweils um fünf erhöht | 4,9,14,19,24
Persönlichen Lerntest auswerten
```

Die zwei Trainingseinträge sind dauerhaft gespeichert und werden nicht
als Prüfaufgaben verwendet. Wenn die Zahlenfolgen bereits gespeichert
sind, kann NERYX sie als Duplikate abweisen; neue, unterschiedliche
Trainingsfolgen benutzen. Eine echte persönliche Messung hängt immer
vom bisherigen lokalen Lernstand ab.

Das Einfrieren und Auswerten schreibt ausschließlich die Prüfnotiz
`neryx.learning.personaltest.v1`; bestehende Lern-Datenbanken bleiben
unverändert. Ohne eine tatsächlich geänderte Lernbasis verweigert
die Auswertung eine Fortschrittsbehauptung. Falls eine konkrete
Prüfphrase anschließend direkt als Trainingsbeispiel gespeichert
wird, wird sie von beiden Messergebnissen ausgeschlossen.

**Grenzen:** Kleine, vorab festgelegte Beispielmenge, keine verblindete
externe Prüfung. Der Test beweist keine generelle KI-Fähigkeit.
Mehr Einträge oder höhere Unterstützung bedeuten nicht automatisch
bessere Antworten. Er misst nur korrekt zugeordnete mathematische
Strategie-Kategorien anhand bekannter Testlabels.

## Stapeltest 1.0 – mehrere Prüfungen in einer Nachricht

Neues Modul `modules/batch-test.js`. NERYX verarbeitet 2–12 erlaubte
Testbefehle nacheinander und gibt die einzelnen Antworten als einen
zusammenhängenden Bericht zurück. Ein Stapel kann mit
`Stapeltest:` eingeleitet oder als mehrzeilige Nachricht mit
ausschließlich erlaubten Prüf-Befehlen gesendet werden.

Beispiel:

```text
Stapeltest:
Beispiel prüfen: Die Werte mal zwei nehmen | 5,10,20,40
Bedeutung lernen: mal zwei nehmen = verdoppeln
Ja, Bedeutung speichern
Beispiel prüfen: Die Werte mal zwei nehmen | 5,10,20,40
Bedeutungstest
```

Unterstützt werden die aufgeführten Sprach-/Bedeutungsprüfungen und
lesende Lern-Diagnosen. Andere Befehle (etwa Löschen, Datenimport,
Programmanpassungen) werden nicht als Stapel zugelassen. Der komplette
Stapel wird vor Ausführung geprüft. Die explizite Bestätigungszeile
bleibt erforderlich und wird nicht von NERYX erfunden.

Der Stapel selbst speichert nichts zusätzlich; nur ausdrücklich
bestätigte Einzelbefehle können ihre gewohnten Datenänderungen vornehmen.
Normale Chatnachrichten bleiben unberührt.

## Bedeutungsbrücke 1.1 und größerer Sprachtest

Neue Module `modules/meaning-links.js` und
`modules/meaning-benchmark.js`. Die Bedeutungsbrücke erweitert die
bestehende `modules/word-learning.js` um ausdrücklich bestätigte
Wort-/Ausdrucksverknüpfungen, ohne alte Trainingsbeispiele zu ändern.

Chat-Beispiel:

1. `Bedeutung lernen: mit zwei multiplizieren = verdoppeln`
2. `Ja, Bedeutung speichern` (oder `Bedeutung abbrechen`)
3. `Beispiel prüfen: Mit zwei multiplizieren | 5,10,20,40`
4. `Bedeutungsstand` für den gespeicherten Stand
5. `Bedeutungstest` für die isolierte größere Prüfung

Die Brücke fügt beim Klassifizieren Merkmale des bestätigten Ausdrucks
hinzu. Sie wendet nur genau erkennbare Wortfolgen an, keine beliebigen
Synonyme, und ignoriert Verneinungen direkt vor dem Ausdruck. Bereits
widersprüchlich zugeordnete Formulierungen werden nicht still
überschrieben. Die Brücken werden unter `neryx.learning.meanings.v1`
gespeichert, mit expliziter Nutzerbestätigung.

Der **Bedeutungstest** prüft acht synthetische Trainingsformulierungen
gegen 24 vorher festgelegte andere Formulierungen, darunter unbekannte
und verneinte Ausdrücke. Er simuliert zwei explizit vorgegebene
Bedeutungsbrücken und vergleicht Vorher/Nachher, inklusive
Fehlzuordnungen und unbeantworteten Aufgaben. Dieser Test ist ein
**reproduzierbarer Funktionstest mit bekanntem Aufgabenbestand**,
kein blinder unabhängiger Test oder Beleg allgemeinen Sprachverstehens.
Er liest und überschreibt keine privaten Lernspeicher.

## Lernkontrolle 1.0 – Fortschritt statt nur Speicherstand

Neues isoliertes Modul `modules/learning-audit.js`. Chatbefehl:
`Lernkontrolle`.

Der Bericht zeigt drei verschiedene Arten von Evidenz:

1. **Synthetische Sprachmuster-Prüfung** mit vier vorher festgelegten
   Trainingsphrasen und vier getrennten Testphrasen/-folgen.
   0/4 ohne Trainingsbeispiele und 3/4 mit Trainingsbeispielen
   im ersten Modul-Selbsttest. Eine bisher nicht abgedeckte Formulierung
   (`mit zwei multiplizieren`) bleibt ausdrücklich ohne Vorhersage.
2. **Retrospektive Prüfung der auf dem Gerät gespeicherten
   Sprachbeispiele:** Jedes Beispiel wird der Reihe nach vollständig
   aus der Trainingsmenge entfernt; NERYX prüft, ob die übrigen
   Beispiele sein Label vorhersagen. Diese Beispiele sind **nicht
   unabhängig neu**, da sie Teil der bisherigen Lernhistorie waren.
   Kleine Bestände können deshalb wenig oder keine Treffer erlauben.
3. **Vorher/Nachher-Vergleich vorhandener mathematischer
   Strategien** über die frühere isolierte Lernprüfung mit
   zurückgehaltenen Zahlenfolgen. Er kann auch null Verbesserung
   oder Verluste zeigen.

Die Vergleiche sind reproduzierbar, lokal, ohne zusätzliche APIs.
Es werden keine vorhandenen Lernwerte, Fakten oder Nutzerdaten
überschrieben; die neue Lernkontrolle führt keine Speicher-Schreibzugriffe
durch. Sie ist **kein Beweis allgemeiner Denkfähigkeit oder
domänenübergreifender Generalisierung** und bewertet keine externe
Wahrheit von Sachfakten.

## Aktiver Lernkoordinator 1.0 – Fragen über bestehende Speicher abgleichen

Neues Modul `modules/learning-coordinator.js`. Bei normalen, eindeutig
zuordenbaren Fachfragen (z. B. `Wozu dient Testmaterial A?`,
`Wo lebt ein Okapi?`) vergleicht NERYX **vor** der bisherigen
Antwortlogik die zugehörigen Fakten aus Hauptwissen und Themenlernen.
Wenn dieselbe normalisierte Aussage in einem oder beiden Speichern
ohne erkennbaren Widerspruch vorhanden ist, nennt er die Antwort
zusammen mit ihrer Herkunft. Wenn Werte abweichen oder ein gespeicherter
Konfliktstatus besteht, gibt er ausdrücklich keine sichere Antwort,
sondern nennt die konkurrierenden Aussagen und verweist auf
`Lernquellen: THEMA`. Der explizite Befehl
`Lernentscheidung: Wozu dient Testmaterial A?` zeigt auch bei
unbekannten Fragen, ob eine Koordination möglich war.

**Schutzgrenzen:** Kein automatisches Korrigieren, Überschreiben,
Löschen, Synonym-Raten, Wahrheitsprüfen oder Trainings-Update.
Unbekannte Fragen bleiben beim bisherigen Dialog-/Themenlernen.
Verglichen werden nur klar zuordenbare Themen und Eigenschaften;
nicht erkannte Widersprüche sind möglich.
Die persönlichen Daten und alle lokalen Schlüssel bleiben unverändert.

## Lernzentrale 1.0 – Herkunft, Lernstände und Konflikte

Neue Datei `modules/learning-hub.js`. Sie ist eine **rein lesende**
gemeinsame Ansicht auf die vorhandenen Lernspeicher, keine Migration
und keine Zusammenlegung von personenbezogenen Daten.

Chatbefehle:

- `Lernzentrale`: zählt Fakten im Hauptwissen, bestätigte Themenantworten,
  Sprachlern-Beispiele, Kontext-Hinweise und Mathe-Rückmeldungen.
- `Lernquellen: Okapi`: zeigt passende Einträge mit Speicher und Herkunft.
  Nutzerbestätigt heißt ausdrücklich **nicht extern verifiziert**.
- `Lernkonflikte`: vergleicht gleiche normalisierte Themen und
  Eigenschaften aus Hauptwissen und Themenlernen und zeigt
  abweichende Werte. Der vorhandene Konfliktstatus des Hauptwissens
  wird ebenfalls berücksichtigt.

Der Vergleich ist absichtlich konservativ. Er erkennt nur ausdrücklich
vergleichbare Fakten und ist **kein Beweis**, dass andere Formulierungen
übereinstimmen oder dass konfliktfreie Aussagen stimmen.
Einträge mit historischen, bereits aufgelösten Alternativen werden
nicht allein deswegen als neuer Konflikt gewertet.

Es gibt **keine automatische Wahrheitsentscheidung, keine
Gewichtsübertragung zwischen Modulen und keine Datenmutation**.
Die gespeicherten Daten unter `meinLernBot.v1` und allen bisherigen
Lernspeicher-Schlüsseln bleiben unangetastet.

## Themenlernen 0.1 – bestätigte Antworten über viele Wissensgebiete

Neue Datei `modules/topic-learning.js`. NERYX nutzt sie ergänzend
zum bestehenden Wissensspeicher und **nur wenn die bisherige Antwort
keine passende Information enthält**. Das Modul erkennt einige
beziehungsbasierte Frageformen unabhängig vom Fachgebiet, zum Beispiel
`Wo lebt ein Okapi?`, `In welchem Lebensraum lebt das Okapi?`,
`Was ist Grundierung?`, `Wozu dient Tiefgrund?`,
`Wie verarbeitet man Raufaser?`, `Woraus besteht X?`,
`Welche Farbe hat X?`, `Wie lange muss X trocknen?`.
Andere Fragearten lassen sich vorsichtig als **exakte Frage/Antwort**-
Zuordnung lernen; dabei wird nicht behauptet, andere Formulierungen
hätten dieselbe Bedeutung.

Wenn die Antwort fehlt, kann der Nutzer `Antwort: ...` geben.
Anschließend ist `Ja, speichern` notwendig; `Abbrechen` verwirft
den Lernversuch. Alternativ lässt sich eine konkrete Frage mit
`Themenwissen: Wozu dient Tiefgrund? => Zum Festigen saugender Untergründe`
zur Bestätigung vorschlagen. `Themenlernstand` zeigt die gespeicherten
Einträge. Doppelte/abweichende Angaben werden nicht still überschrieben.

**Wichtig:** NERYX prüft die Wahrheit der Antworten nicht selbst. Er
bewahrt sie als **vom Nutzer bestätigte Angaben** auf und kennzeichnet
sie beim Abruf entsprechend. Das Modul ist kein allwissendes System,
keine freie Domänen-Generalisation, kein neues Sprachmodell und kein
AGI-Nachweis. Unbekannte oder mehrdeutige freie Fragen können auch
weiterhin nicht verstanden werden.

Die Daten werden in `neryx.learning.topics.v1` gespeichert. Der
bisherige Hauptspeicher `meinLernBot.v1` und die bestehenden
Mathe-/Sprachlernspeicher bleiben unverändert. Offene Rückfragen
bleiben nur während der aktuellen Seitensitzung bestehen.

## Natürlicher Mathe-Dialog 0.1 – Fragen ohne Spezialbefehle

NERYX kann jetzt begrenzte **gewöhnliche deutsche Zahlenfolgen-Fragen**
erkennen, z. B. `Was passiert, wenn ich jede Zahl mit zwei multipliziere?`.
Er fragt dann nach mindestens vier konkreten Werten. Die nächste
Chatnachricht `11, 22, 44, 88` wird als Fortsetzung dieser
Frage behandelt und mit den bisher gelernten Wortmerkmalen gelöst.
Alternativ kann die komplette Frage in einer Nachricht stehen:
`Wie geht die Folge weiter: 11, 22, 44, 88, wenn ich jede Zahl mit zwei multipliziere?`.

Bei fehlender Wortzuordnung bittet NERYX um eine bekannte nächste Zahl.
Im unmittelbar folgenden Chatturn akzeptiert er etwa
`Die richtige Zahl ist 112` oder nur `112`, prüft sie anhand
vorhandener mathematischer Verfahren und speichert bei Erfolg ein
neues Wortmuster. `abbrechen` beendet diese Rückfrage.

Das Dialoggedächtnis bleibt bewusst nur während der geöffneten
Sitzung erhalten; dauerhafte Beispiele bleiben im unveränderten
Schlüssel `neryx.learning.wordfeatures.v1` erhalten.
Gewöhnliche Nachrichten ohne klar erkennbare Zahlenfolgenabsicht
werden weiterhin durch den bisherigen Chat verarbeitet.

**Grenze:** Dies ist eine eng begrenzte Erkennung deutscher
Formulierungen mit Zahlenfolgen und bekannten Regeln, kein generelles
Verständnis aller freien Fragen oder selbstständiges Training eines
Sprachmodells.

## Sprachmuster-Lernen 0.3 – Lernen durch überprüfte Korrektur

Wenn NERYX bei `Beispiel prüfen: Jede Zahl wird mit zwei multipliziert | 7, 14, 28, 56`
unsicher ist, kann man in **derselben geöffneten Sitzung**
`Beispielkorrektur: 112` eingeben. NERYX kontrolliert,
ob seine vorhandenen mathematischen Strategien diese nächste Zahl
vorhersagen können. Nur dann speichert er die beschreibenden
Wortmerkmale und die vollständige bestätigte Zahlenfolge.

Bei einer zweiten anderen Aufgabenfolge (z. B. `9, 18, 36, 72`)
und der Korrektur `144` erhält die Formulierung genug unabhängige
Zahlenbeispiele für die Strategie-Auswahl. Der anschließende Test
`Beispiel prüfen: Mit zwei multipliziert man jede Zahl | 11, 22, 44, 88`
kann dann `176` mit geometrischer Strategie liefern.

Ohne vorherige offene Rückfrage oder bei einer Zahl, die zu keiner
unterstützten Strategie passt, wird nicht gelernt. `Beispielkorrektur:
abbrechen` verwirft die Rückfrage. Die wartende Rückfrage liegt nur im
Arbeitsspeicher und geht nach Neuladen verloren; bereits akzeptierte
Trainingsbeispiele bleiben lokal erhalten.

**Grenze:** Das ist kein genereller Synonym-Erkenner.
Die Verbindung entsteht aus wiederholten Wortmerkmalen und
unterschiedlichen bestätigten Zahlenfolgen. Eine falsche Korrektur,
die zufällig zu einer vorhandenen Strategie passt, ist nicht
unabhängig als wahr bewiesen. Es wird kein neuer Algorithmus erzeugt.

## Sprachmuster-Lernen 0.1 – Wortmerkmale aus Zahlenbeispielen

NERYX kann über `Beispiel lernen: Die Zahlen werden verdoppelt | 2, 4, 8, 16, 32`
aus einer vollständigen bekannten Zahlenfolge eine passende der **vorhandenen**
Strategien bestimmen und Wörter aus der Beschreibung als Merkmale speichern.
Mit `Beispiel prüfen: Zahlen schrittweise verdoppeln | 5, 10, 20, 40`
versucht er, die Strategie für neue Zahlen anhand gemeinsamer Wortstämme
aus den gelernten Beispielen zu bestimmen.

`Sprachlernstand` zeigt die Anzahl gespeicherter Beispiele;
`Sprachlerntest` demonstriert eine getrennte Prüfung (2/3 im
Basistest nach vier Übungsbeispielen). Unbekannte Synonyme wie
„multiplizieren“ gegenüber „verdoppeln“ können ohne passende
Übungsbeispiele **nicht** automatisch gleichgesetzt werden.
Unsichere Entscheidungen werden ausdrücklich nicht getroffen.

Der Algorithmus vergleicht vereinfachte Wortmerkmale, keine echten
semantischen Repräsentationen. Wenn mehrere mathematische Modelle
denselben bekannten Folgewert erklären, bevorzugt er das erste
passende einfache Modell. Das ist eine **Modellannahme**, kein Beweis
der beabsichtigten Regel. Trainingsbeispiele werden nur bei
passendem Vorhersageergebnis gespeichert und identische Zahlenfolgen
nicht mehrfach gezählt.

Die Trainingsmerkmale werden unter `neryx.learning.wordfeatures.v1`
getrennt gespeichert; `meinLernBot.v1` und alle anderen
Lern-/Faktenspeicher bleiben unverändert. Weder echte neue
Lösungsalgorithmen noch allgemeine Sprachintelligenz entstehen dadurch.

## Kontextlernen 0.1 – Mehrdeutigkeit und Hinweise

NERYX fragt bei `Muster prüfen: 2, 4, 8, 16 | Hinweis: vervielfachen`
nach der gemeinten Strategie, wenn die Beispiele zu mehreren verschiedenen
Fortsetzungen passen. Mit `Kontext lernen: vervielfachen = geometrisch`
kann ein Hinweis einer der sechs vorhandenen Strategien zugeordnet werden.
Erst ab **zwei gleichgerichteten Zuordnungen** ohne Gleichstand wird
diese Präferenz angewandt; ein anderes Signal wie `interpolation = kubisch`
kann andere Vorhersagen für dieselben Zahlen ergeben. `Kontextlernstand`
zeigt die lokalen Zähler. `Kontextlerntest` simuliert einen Vorher-Nachher-
Vergleich auf anderen Zahlen (0/12 → 12/12 im Basisszenario).

**Begrenzung:** Kontext und gemeinte Strategie werden ausdrücklich
als Beispiele vorgegeben. Wiederholte Angaben zählen als separate
Bestätigungen; die App kann deren Unabhängigkeit nicht prüfen.
Die Testkontexte wurden eigens für die Demonstration konstruiert und
sind keine unbekannten freien Aufgaben. Dieses Verfahren lernt eine
Zuordnung zwischen Texthinweis und **vorprogrammierter** Methode,
nicht neue Algorithmen oder allgemeine Intelligenz. Bei fehlender
Information fragt es nach, statt eine mathematisch eindeutige
Fortsetzung vorzugeben.

Die Kontextzählungen liegen ausschließlich unter
`neryx.learning.context.v1`. Weder der bisherige Datenbestand
`meinLernBot.v1` noch Auto-Lerngewichte, manuelles Lernlabor
oder Modellcode werden bei der Simulation geändert.

## Lernprüfung 0.1 – Vorher/Nachher mit getrennten Testaufgaben

Im Chat mit `Lernprüfung` oder `Lerntest` starten. Der Test erzeugt
12 Trainingsbeispiele sowie 36 andere Prüfbeispiele, deren Eingaben sich
nicht mit den Trainingsbeispielen überschneiden. Geprüft werden zwei
bewusst widersprüchliche Fortsetzungen derselben vier Anfangswerte:
geometrisch oder kubische Interpolation. Die bevorzugte Strategie
wird anhand der Trainingsbeispiele angepasst. Die Prüfergebnisse
werden **vorher und nachher** ausgewertet und in beiden Teilbereichen
getrennt dargestellt.

Das Experiment macht sichtbar, dass eine Präferenzänderung die
Trefferquote in einem Teilbereich verbessern und gleichzeitig in
einem anderen verschlechtern kann. Ein gestiegener Teilwert ist
**kein allgemeiner Lernerfolg**, wenn andere Bereiche darunter leiden.
Der Test ist klein, synthetisch und kennt nur zwei vorgegebene
Fortsetzungsannahmen; er ist kein Nachweis von AGI oder
Fähigkeitsübertragung auf unbekannte Domänen.

Das Experiment verändert keine produktiven Strategiegewichte. Unter
`neryx.learning.evaluation.v1` wird nur der letzte Ergebnisbericht
lokal gespeichert. Die vorhandenen Speicherbereiche für Fakten,
Auto-Lernen und manuelles Lernfeedback bleiben unangetastet.

## Auto-Lernen 0.1 – im normalen Chat (experimentell)

Bei einer klar formulierten Zahlenfolgen-Frage mit mindestens fünf Werten,
z. B. `Was kommt als Nächstes: 2, 4, 8, 16, 32?`, nutzt NERYX
die letzte angegebene Zahl als **zurückgehaltenes Prüfbeispiel**. Er ermittelt
aus den vorherigen Zahlen Vorhersagen mehrerer vorhandener Strategien,
vergleicht sie mit der zurückgehaltenen Zahl und passt nur bei
unterscheidbaren Vorhersagen seine Strategiegewichte an. Anschließend
versucht er, den nächsten Wert vorherzusagen. `Autolernstand`
zeigt die Anzahl und Gewichtungen der automatischen Lernschritte.

Das geschieht ausschließlich für ausdrücklich erkennbare Folgen-Fragen
und nicht für beliebige Nachrichten. Derselbe Zahlenverlauf darf
innerhalb eines begrenzten Verlaufs nicht mehrfach als Trainingsbeispiel
dienen. Bei unpassenden Mustern erfolgt keine Änderung.

Der getrennte Speicher-Schlüssel heißt `neryx.learning.auto.v1`;
bisherige Daten unter `meinLernBot.v1` und die Gewichte des manuellen
Lernlabors bleiben unverändert. Die zurückgehaltene Zahl stammt aus
der **Eingabe des Nutzers**, nicht aus einer unabhängig überprüften
externen Quelle. Dies ist eine begrenzte Form von Lernen aus Beispielen,
kein allgemeines autonomes Lernen und kein AGI-Nachweis.

## Lernlabor 0.1 – Lernen aus Rückmeldungen (experimentell)

Mit `Lernversuch: 2, 4, 8, 16` zeigt NERYX mehrere passende
Fortsetzungen. Über `Lernfeedback: 32` gibst du nach dem Versuch
die gewünschte richtige Fortsetzung an. NERYX belohnt Strategien,
deren Vorhersage passt, und senkt das Gewicht unpassender Strategien.
`Lernstand` zeigt die Strategiegewichte und `Lernvergleich` kontrolliert
vier weitere, fest definierte Aufgaben.

Das Lernlabor verwendet nur die sechs implementierten Musterklassen
(Arithmetik, Geometrie, Quadrat, Wechselmuster, Kubik, Fibonacci).
Es lernt **keine neuen Algorithmen** und prüft das vom Nutzer gelieferte
Feedback nicht gegen die Wirklichkeit. Ungünstiges Feedback kann die
Ergebnisse verschlechtern; ein höherer Gewichtswert beweist keine
wahre oder universelle Regel. Bei nicht unterstütztem Feedback
wird nichts gespeichert.

Erfahrungsgewichte und Zähler liegen separat im lokalen Browser-Speicher
unter `neryx.learning.strategies.v1`. Persönliche Fakten, App-Code und
Modellgewichte werden nicht verändert. Es handelt sich nicht um AGI
oder um einen unabhängigen wissenschaftlichen Lernbenchmark.

## Zahlenmuster 0.2

Die Befehle `Regel lösen: 1=1, 2=4, 3=9; 4` und
`Folge lösen: 2, 4, 8, 16` testen das neue `modules/rule-patterns.js`.
Unterstützt werden lineare und quadratische Zuordnungen sowie arithmetische,
geometrische, quadratische und abwechselnd arithmetische Folgen.
Unpassende oder widersprüchliche Angaben werden abgelehnt.

Dies sind mathematische Hypothesen anhand vorgegebener Modellklassen, kein
autonomes Erlernen beliebiger Regeln. Insbesondere können endlich viele
Beispiele niemals die einzig mögliche Fortsetzung beweisen. Der bisherige
`Fähigkeitstest` misst weiterhin nur die ursprünglichen drei Kategorien.

## Allgemeine Problemlösung – erste experimentelle Stufe

Mit `Fähigkeitstest` (auch `Denktest`) erhält NERYX 36 bei jedem Aufruf
neu generierte Probleme aus drei begrenzten Aufgabenbereichen: lineare Regeln
aus Beispielen ableiten, Wege auf Rastern planen und Rechenoperationen in
mehreren Schritten kombinieren. Die Ergebnisse werden durch getrennte
Sollwertberechnung kontrolliert. Keine privaten Nutzerdaten sind nötig.

Über `Regel lösen: 2=5, 4=9; 7` lässt sich eine passende lineare Regel
im Chat ableiten. Bei widersprüchlichen oder nicht eindeutigen Beispielen
verzichtet das Modul auf eine Behauptung. Die Regel ist nicht notwendigerweise
die einzig mögliche mathematische Fortsetzung.

**Wichtig:** Die generierten Aufgaben und ihre Bewertung sind im öffentlichen
Quellcode einsehbar und testen nur drei bekannte Problemklassen. Auch
100 % in diesem Test belegen keine allgemeine Intelligenz. Das ist eine
Grundlage für weitergehende, unabhängige und überraschende Tests – keine
Integration eines nachtrainierten Sprachmodells.

## GENESIS 3.0 – Verbesserungslabor

Der Chat-Befehl `GENESIS 3` startet zusätzliche Herausforderungen und
vergleicht eine misslungene Frage mit einer bekannten, in einer isolierten
Prüfung erfolgreichen Umformulierung. Die Vorschläge entstehen aus einem
fest definierten Satz von Vorlagen; **es gibt noch keine freie
Code-Generierung oder automatische Modell-Nachtrainierung**.

Die Diagnose verändert weder die gespeicherten Fakten noch die Antwort-KI,
und sie übernimmt keine vorgeschlagene Regel automatisch. Vor einer
tatsächlichen Änderung wären vollständige Regressionstests und
Benutzerfreigabe erforderlich. `GENESIS` und `GENESIS Verlauf` bleiben
unverändert verfügbar.

## GENESIS 2.0 – Erweiterte Gegenprobe

Im Chat startet `GENESIS` die erweiterte Gegenprobe. `GENESIS 1` ruft die alte
Gegenprobe 1.1 auf, `GENESIS Verlauf` zeigt den lokalen Benchmark-Verlauf.

GENESIS 2.0 prüft zusätzliche Frageformulierungen, den Umgang mit unbekannten
Themen und unbekannten Eigenschaften sowie einen **simulierten** widersprüchlichen
Fakt in einer temporären Kopie des Wissens. Der echte Faktenbestand wird dabei
nicht verändert. Für Vergleiche werden ausschließlich Summen, Zeit,
Antwort-KI-Version und eine einfache Prüfsumme des Faktenstands unter
`neryx.genesis.benchmark.v2` im lokalen Browser gespeichert (maximal 20 Läufe).
Die Prüfsumme ist nicht kryptografisch geschützt.

**Grenzen:** Die Tests kennen nur ausgewählte Faktenarten und prüfen lokale
Antwortregeln. Sie beweisen weder die sachliche Wahrheit der Fakten noch
allgemeine Intelligenz. Es findet kein automatisches Training des Sprachmodells
und keine automatische Korrektur persönlicher Fakten statt.

## Neue Funktion: NERYX GENESIS – Gegenprobe

Im NERYX-Chat `GENESIS`, `Gedankenlabor` oder `Gegenprobe` eingeben, oder die Schnellaktion **Gegenprobe** wählen.

Die Funktion führt eine **lokale, rein lesende** Prüfung bestehender Fakten durch. Sie formuliert für bis zu 20 Einträge mehrere Varianten derselben Frage und fragt die vorhandene Antwort-KI. Sie markiert Varianten, bei denen der gespeicherte Wert in der Antwort nicht erkannt wird, sowie unterschiedliche Werte zum selben Thema und derselben Eigenschaft. Daraus entsteht eine Liste von Lernchancen.

**Grenzen:** Der Test prüft Wiederauffindbarkeit/Antwortrobustheit, nicht die Wahrheit eines Fakts. Fehlalarme sind möglich. Keine automatischen Änderungen an Wissensspeicher, Modellgewichten oder Programmcode. Das Verfahren ist eine neue **projektinterne Kombination** bestehender Ideen; weltweite Neuheit lässt sich nicht belegen.

Technik: `modules/genesis-gegenprobe.js`, verfügbar über `window.NERYXGenesis`. Schutztest: `tests/neryx-smoke.test.mjs`.

## Entwicklungsregeln

1. **Keine lokalen Nutzerdaten löschen oder verschieben.** Der Schlüssel `meinLernBot.v1` und die Schnittstelle `window.LernBotBridge` bleiben kompatibel.
2. **Vor größeren Änderungen Datenexport verifizieren.** Safari und die Homescreen-App können unterschiedliche lokale Speicherbereiche haben.
3. **Nicht einfach alte Phasen kopieren oder Module entfernen.** Sie können sich aufeinander beziehen.
4. **Änderungen klein und überprüfbar halten.** Senden, Chat, Aufgaben, Speicher, Menüs und iPhone-PWA nach Änderungen testen.
5. **Nur ein NERYX-Produkt:** Die bestehende Haupt-App wird weiterentwickelt; das Modell ist vorerst experimentell.
6. **Keine ungeprüfte KI-Wahrheit behaupten.** Der Phase-7.13-Abschluss dokumentiert technische Tests, nicht unabhängige Verifikation.
7. **API-Schlüssel niemals ins öffentliche Repository stellen.**

## Tests

Die Haupt-App besitzt statische Schutztests für Skripte, DOM-IDs, Speicher-Schlüssel und Aktualisierungsstruktur:

```bash
node --test tests/neryx-smoke.test.mjs
```

Diese Tests laufen über `.github/workflows/neryx-smoke.yml` bei relevanten Änderungen. Sie ersetzen keine realen Funktionstests in Safari oder auf dem iPhone-Homescreen.

## Architektur und nächste Schritte

Siehe [NERYX_ARCHITEKTUR.md](NERYX_ARCHITEKTUR.md) für den technischen Bestand, erkannte Duplikate, Speichergrenzen und die sichere Vereinfachungsreihenfolge.

**Hinweis zur Historie:** Vor dieser Dokumentation enthielt die Root-`README.md` älteren LernBot-JavaScript-Code. Dieser Originalstand bleibt im Git-Versionsverlauf erhalten; er ist nicht die aktive `app.js`.
