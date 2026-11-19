# NERYX

NERYX ist die Weiterentwicklung von **Mein LernBot**: eine installierbare Web-App (PWA) für das iPhone mit lokalem Wissensspeicher, regelbasiertem Lernkern und optionalen Forschungs-/Sprachmodell-Experimenten.

**App:** https://y6bkfhyp4d-star.github.io/Mein-lernbot/

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
