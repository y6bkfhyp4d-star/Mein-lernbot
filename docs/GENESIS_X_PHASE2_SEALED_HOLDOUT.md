# GENESIS X Phase 2 – versiegeltes externes Fehler-Holdout

**Status:** Prüfwerkzeug implementiert, **noch kein echter unabhängiger Holdout eingereicht oder bewertet**. Ohne unabhängige Ground Truth darf keine Phase-2-Freigabe behauptet werden.

## Getrennt vom Provenienz-Benchmark

`eval/genesis-ast/evaluate-finding-holdout.mjs` misst **konkrete, vorab erwartete AST-/SEC-Regel-IDs** statt nur `eligible`/`review`. Er arbeitet ausschließlich lesend, führt keinen Testquellcode aus und verwendet das vorhandene `finding-report.mjs`.

Beispiel für einen externen JSON-Korpus:

```json
{"schema":1,"purpose":"AST-rule-detection","cases":[
 {"id":"case_01","expected":"AST001","source":"eval(input);"},
 {"id":"case_02","expected":null,"source":"const x = 1;"}
]}
```

Ein Dateiaufruf erfordert einen **absoluten Pfad außerhalb des Repositories** und den **vor der Auswertung festgehaltenen SHA-256 der Originaldatei**:

```sh
node eval/genesis-ast/evaluate-finding-holdout.mjs /absolute/path/holdout.json --expect-sha256 <64-hex-sha256>
```

SHA-Mismatch, unvollständige Analyse, verfehlte Kennzahl oder zu kleine Stichprobe führen zu Exit-Code 2. SHA-Prüfung verhindert nachträgliche stille Änderung der Datei; **sie beweist nicht**, wer die Labels vergeben hat oder dass der Korpus blind entstanden ist.

Der CLI-Runner verlangt standardmäßig **mindestens 29 positive und 59 negative Fälle**, Recall mindestens 90 % und beobachtete FPR maximal 5 %. Dies sind **operative Mindestgrößen, keine statistische Garantie** für eine Obergrenze der unbekannten realen Fehlerrate. Bei einer echten Signifikanzforderung sind Stichprobenplanung und Konfidenzintervall vorab fachlich festzulegen.

Ausgabe: TP, FP, TN, FN, Recall, FPR, IDs und Regeln nicht erkannter oder unerwarteter Treffer, Zahl ausgeschlossener Fälle, `complete`, `sampleSizeMet`, `pass` und tatsächlicher Corpus-SHA. Keine Quelltexte in der Ergebnisausgabe. Nicht interpretierbare/fehlerhafte Schemas werden abgelehnt.

## Blindheits- und Vertrauensgrenzen

1. Ein unabhängiger Reviewer definiert die Testfamilien, beschriftet Fälle und dokumentiert vor dem ersten Lauf die Regeln und die Originaldatei-SHA.
2. Der Reviewer behält die Fälle bis zur Abnahme zurück. **Die Entwickler sehen sie vor dieser einmaligen Prüfung nicht.**
3. Änderungen am Analyzer nach Sichtung des Holdouts erfordern **neues, unverbrauchtes** Testmaterial für eine erneute blinde Bewertung.
4. Nur bekannte, feste AST-Regel-IDs sind im Schema zulässig. Tests, die völlig andere echte Codefehler erwarten, dürfen nicht passend zu vorhandenen Regeln umbeschriftet werden: Das wäre eine künstliche Einengung der Ground Truth.
5. `minRecall` und `maxFalsePositiveRate` sind hier feste Entwicklungs-Grenzen. Die für den Masterplan fachlich zulässige Abnahme muss vorher schriftlich bestätigt werden.
6. Keine Selbst- oder Produktivfreigabe: Phase 1 Branchschutz, erweiterter Fehlerkorpus, weitere Rule-Familien und unabhängiger Review bleiben erforderlich.

## Sicherheit

GitHub CI testet den Runner nur mit bekannten künstlichen Inputs. Die externen JSON-Testdateien gehören nicht in den Quell-PR und werden nicht automatisch aus dem Netzwerk geladen. Die Parseranalyse von fremdem Text findet in einem beschränkten Testprozess statt; sie ist **keine nachweislich isolierte Sandbox**. Sehr tiefe AST-Eingaben oder Parser-Ressourcenprobleme bleiben eine gesonderte Robustheitsfrage.

**Phase 2 bleibt offen.**
