# NERYX – Frozen V1 / Scoring-Spezifikation v1 (S6)

Status: **Entwurf festgeschrieben, Implementierung ausstehend**. Diese Spezifikation ist eine Vorgabe für zukünftige Auswerter, **kein Nachweis**, dass NERYX diese Fähigkeiten heute besitzt. Nichts versiegeln, bevor alle vorgesehenen Prüfschritte abgeschlossen sind.

## 1. Zweck und Geltungsbereich

- Die Frozen V1 ist dem Entwickler/den beteiligten KI-Assistenten bekannt. Sie dient als **Regression/Baseline**, ausdrücklich **nicht** als geheimes Holdout oder Generalisierungsnachweis.
- Zwei separate, nicht öffentliche Dateien: Fixture (`schema:1`, `fixtureId:fx-frozen-v1`, `claims`) und Suite (50 Items). Beide werden unverändert nach Bytes gehasht. Keine Testfragen, Claims, Antworten oder Trefferlisten in öffentliche CI-Protokolle ausgeben.
- Der bestehende `eval/run-l1.mjs`-Dev/Regression-Test mit 21 Fällen bleibt vollständig erhalten; Baseline: **14 pass, 7 bekannte Fehler**.
- Kein echter Nutzerspeicher, keine externen Quellen, keine LLM-Recherche im isolierten Test.
- Das derzeitige `eval/frozen.seal.json` bleibt `active:false` bis zur gesonderten Freigabe.
- Regeln dürfen nach dem Siegel nicht aufgrund von Frozen-Ergebnissen verändert werden. Jede spätere Scoring-Änderung ist eine neue protokollierte Version.

## 2. Vorbedingungen

1. JSON, Referenzen und Feldtypen strikt validieren; unbekannte Testfelder/Layer als Fehler behandeln.
2. Claims werden für Retrieval **ohne zusätzliche Suchsignale** abgebildet: `{id: claim.id, title: '', content: claim.text}`. Ursprüngliche Fixture-Metadaten (`origin`, `conflicts`, `validity`) für spätere Bewertungen separat über Claim-ID verfügbar halten.
3. Ergebnisse der einzelnen Prüfdimensionen getrennt halten. Eine nicht implementierte Dimension ist `not_evaluated`, niemals `pass` oder `fail`.
4. Ein Item erhält erst `fully_evaluated: true`, wenn **sämtliche** für es vorgesehenen Prüfdimensionen bewertet wurden. Für teilbewertete Items keinen Gesamtpass behaupten.
5. Mit `pass`, `fail`, `review`, `not_evaluated` arbeiten. `review` zählt **nicht** als bestanden.
6. Alle ausgehenden Berichte aggregieren: Dimension, Kategorie, Anzahl ausgewertet/bestanden/fehlgeschlagen/Review/nicht ausgewertet sowie Total. Keine Item-ID oder Goldantworten aus Frozen ausgeben.

## 3. Retrieval (L1)

- `sufficient`: `mustInclude` (nicht leer) vollständig getroffen, `mustExclude` vollständig vermieden, zusätzlich Rauschbudget maximal `mustInclude.length + 3` eindeutige Treffer unter `rank(..., 10)`. Die geforderten Treffer müssen in den tatsächlich zurückgegebenen Top-10 liegen.
- `none`: keine Treffer; falls `mustInclude` vorhanden, ist die Erwartung ungültig.
- `any`: eigenständige **noise_guard**-Prüfung. Alle zurückgegebenen IDs müssen in `allowOnly` liegen, zusätzlich `mustExclude` beachten. Eine leere Liste kann die Rauschkontrolle bestehen, **ist aber kein positiver Wissensabruf**. `any` darf nie in die positive Retrieval-Trefferquote eingehen.
- `hit` ist nur für alte Dev-Items erlaubt; bestehende L1-Semantik unverändert erhalten.
- Keine impliziten Erfolge bei fehlenden Erwartungen, unbekannten Verdicts oder leeren positiv geforderten Treffermengen.
- Fehlende Merkmalsinformation bei einer bekannten Entität betrifft getrennt **Retrieval-Rauschkontrolle** und **Antwortverweigerung**. Aus Retrieval allein folgt keine korrekte Antwort oder Abstention.

## 4. Antwortmodus und Konzepte (L2, noch nicht implementiert)

- `mode: answer`: aufrufbarer Orchestrator muss eine substanzielle Antwort abgeben. Floskeln, bloßes Wiederholen der Frage und bloßes „weiß ich nicht“ genügen nicht.
- `mode: abstain`: explizite, sachlich passende Zurückhaltung, **ohne** unbelegte konkrete Antwort. Ein generisches „Ich weiß nichts“ ohne Bezug kann je nach Situation `review` sein. Angaben, die die fehlende Eigenschaft raten oder erfinden, sind `fail`.
- `concepts`: Jedes angegebene Konzept muss semantisch im Antworttext vorkommen; mindestens eine der `anyOf`-Varianten oder ein als gleichwertig nachgewiesener Ausdruck. Nicht bloß ungeschützter Substring. Negationen und Einbettung zählen (z. B. „nicht 7“ ist keine positive Behauptung von 7).
- Zahlen/Konzepte: Wortgrenzen, Unicode-Normalisierung (ä/ae usw.), Kommas als Dezimaltrennzeichen, Zahlwort-Normalisierung. „8 Stunden“ darf nicht in „18 Stunden“ matchen; „2 l“ nicht in „2 Lagen“.
- Zahlen aus **Frage und freigegebener Evidenz** sind grundsätzlich zulässig. `numbersFromEvidenceOnly` verbietet *neu erfundene quantitative Behauptungen*, nicht die korrekte Wiederholung der Frage. Bei Rechnungen dürfen hergeleitete Ergebnisse vorkommen, sofern Rechenschritte/Inputs sie belegen.
- `forbidden` bezeichnet im Auswerter eine **unerlaubte Sachbehauptung**, nicht das bloße Auftreten eines Wortes. „Kein Euro-Preis bekannt“ ist nicht dasselbe wie ein erfundener „Preis: 49 Euro“. Bei Unsicherheit `review` statt automatischer Bestrafung.
- Bei widersprüchlichen Goldclaims nicht eine Variante als einzig wahr ausgeben; siehe Abschnitt 7.

## 5. Solver (separater L2-Adapter)

- `expect.exact: {value, tol, unit}`: numerische Differenz `abs(actual-expected) <= tol` **nach** gültiger Einheitennormalisierung; nur endliche Zahlen. Insbesondere `tol=1e-9` begrenzt IEEE-754-Rundungsfehler; `tol=0` ist für exakt-ganzzahlige Ergebnisse zulässig.
- Einheit nicht ignorieren: Quadrate (`m2`), Volumen (`m3`), Liter (`l`), Stückzahlen und Verpackungen sinnvoll parsen und dimensional prüfen. Ein numerisch zufällig richtiger Wert mit falscher Einheit ist kein Pass.
- Für `minuten_seit_mitternacht` eine Antwort im Uhrzeitformat nach **24-Stunden-Uhr** in Minuten ab 00:00 umwandeln. Beispiele für zulässige Ausgaben: `12:20`, `12:20 Uhr`, `12.20 Uhr`, `12 Uhr 20` → 740. **Dezimalstunden sind keine Uhrzeitantwort.**
- Nur die **als Endergebnis** bezeichnete Uhrzeit bewerten, nicht eine aus der Frage zitierte Startzeit. Mehrere widersprüchliche Endzeiten: `review` (kein Pass). Nicht parsebar: `fail` oder `review` mit begründetem Parser-Status, nie implizit korrekt.
- Antwortformat und Parsing werden zuerst gegen unabhängige Dummy-Fälle inklusive Negativ-/Grenzfällen geprüft, nicht gegen Frozen kalibriert.

## 6. Grounding / Satz-Verifier (noch nicht implementiert)

- Den vom Item vorgesehenen `input.draft` in Sätze unterteilen, in derselben Reihenfolge wie die Goldlabels. Satzgrenzen/Abkürzungen konsistent mit Validator festlegen; unklare Segmentierung ergibt `review`, nicht stilles Verschieben.
- `supported`: Satz ist durch freigegebene Evidenz gedeckt.
- `contradicted`: Evidenz widerspricht der behaupteten Aussage **explizit**.
- `unsupported`: Evidenz reicht für eine sachliche Aussage nicht, ohne dass ein expliziter Gegenbeleg vorliegt.
- `unverified`: Der Satz stützt sich nur auf als ungeprüft markierte Nutzerherkunft und darf nicht als bestätigter Fakt ausgegeben werden.
- Bei konkurrierenden Labels die dokumentierte Priorität **unverified vor unsupported** für ausschließlich ungeprüfte Nutzerbelege; `contradicted` hat bei eindeutigem Gegenbeleg Vorrang. Gemischte Quellen und ungelöste Widersprüche nötigenfalls `review`.
- Das vorhandene `NERYXAnswerReview.inspect().complete` ist **kein** semantischer Grounding-Verifier und darf nicht als Ersatz genutzt werden.
- Bewertet werden alle Sätze, nicht nur „irgendein Label erkannt“. Ein fehlendes, zusätzliches oder falsch positioniertes Label ergibt kein Pass.

## 7. Widersprüche

- `conflictSurfaced: true` verlangt eine explizite Kennzeichnung des tatsächlichen Widerspruchs, der beiden konkurrierenden Aussagen/Quellen und der Unmöglichkeit, ohne weitere Evidenz einen eindeutigen Wert zu wählen.
- Bloß beide Zahlen aufzulisten reicht nicht. Eine Antwort „4, nicht 7“ ist **fail**, auch wenn beide Zahlen als Zeichenfolgen vorkommen.
- `conflicts`-Referenzen in der Fixture werden symmetrisch geprüft. Die Konfliktkennung dient dem Auswerter, darf aber nicht als versteckter Text-Hinweis in die Retrieval-Suchanfrage gelangen.

## 8. Quellenstatus

- `statusWording: hedged` erfordert ein klar erkennbares Attributions-/Unsicherheitssignal wie „laut Nutzerangabe“, „angeblich“, „nicht bestätigt“. Das muss sich **auf den konkreten Standort-/Inhaltsclaim** beziehen.
- Der Auswerter erhält `origin: user` separat aus dem Fixture-Claim. `rank()` liefert selbst keine Herkunftsdaten; das ist eine **offene Integrationsanforderung**. Die Statusprüfung darf bis zu ihrer Umsetzung nicht als ausgewertet gelten.
- Das bloße Echo eines Claims oder der Frage darf kein Pass sein; eine unbestätigte Nutzerangabe nicht ohne Vorbehalt als Fakt darstellen.

## 9. Testqualität, Schutz vor Tricks und Änderungsregeln

- Dummy-Mutationstests vor der echten Ausführung: Null-Gate, Alles-Gate, Gold-Gate; Positiv-/Negativ-/Grenzfälle für Solver, Konzepte, Grounding, Widerspruch, Status.
- Unterschiede zwischen `evaluated`, `not_evaluated` und `review` als eigene Zähler. Keine Nenner-Verwechslung: Retrieval-Quote, Noise-Guard-Quote und vollständig bewertete Gesamtitems strikt getrennt.
- Ergebnisse nicht anhand der Frozen-Itemantworten nachjustieren. Änderungen an Auswertern/Suite/Fixture mit Begründung, Code-Revision und SHA-256 dokumentieren.
- Erster echter Frozen-Lauf nur nach expliziter Freigabe; keine unbemerkten Tests als Entwickleroptimierung.

## 10. Freigabekriterien

- L1-Baseline: **14/21** und identische Einzelergebnisse gegenüber S1.
- Validator überprüft Datenformat, Feldtypen und sämtliche Referenzen; Integrations-/Dummytests bestanden.
- Soll-Zahlen pro Prüfdimension aus der **validierten** Suite ableiten bzw. im späteren Siegel fixieren; bei Abweichung harter Fehler.
- Beide Dateihashes und der Hash **dieser unveränderten Scoring-Spezifikation** werden erst nach der letzten inhaltlichen Kontrolle in ein versioniertes Siegel eingetragen.
- Vorher bleibt `active:false`; vorhandene noch nicht implementierte Prüfdimensionen verhindern jede Behauptung, 50/50 Tests seien bestanden.

**Status S6:** Spezifikation dokumentiert; kein Scoring-Auswerter implementiert, kein Frozen-Lauf ausgeführt, kein Siegel aktiviert.
