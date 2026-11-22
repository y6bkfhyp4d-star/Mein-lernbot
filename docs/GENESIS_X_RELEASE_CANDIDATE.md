# GENESIS X — schlanker Release-Kandidat für NERYX

Ausgangspunkt ist das damalige `main`-Commit `cc0e9876948e4c643686cb2ac08acffe2fe070b3`. Der stark abgewichene Forschungsbranch wird **nicht** direkt mit `main` zusammengeführt.

## Übernommen
- Opt-in GENESIS X im bestehenden NERYX-Chat, nur bei expliziten, eng definierten Formulierungen.
- Die notwendigen GENESIS-Arbeitermodule, die Originaleingabe-/Entscheidungs-/Qualitätsgates und die getrennte Forschungsseite über den Seitenleisten-Link.
- Nachladen von GENESIS-Modulen erst nach ausdrücklichem Chatbefehl; die 39 bestehenden Start-Skripte bleiben unverändert.
- Statusantworten mit `publishable:false`, keine unbewiesenen Zahlenergebnisse.
- GENESIS-Prüfnachrichten werden nicht in den normalen Chatverlauf geschrieben. Normale Nachrichten nutzen weiterhin den bisherigen NERYX-Ablauf.
- Qwen bleibt im Prüflabor optional; kein automatischer Qwen-Start im normalen Chat.

## Grenzen
Eine positive interne GENESIS-Regelprüfung ist kein unabhängiger mathematischer Beweis. Ein lokaler Modellentscheid kann falsch sein. Die für GENESIS beim ersten Aufruf nachgeladenen Dateien sind möglicherweise nicht offline verfügbar. Dieses Release verspricht keine automatische mathematische Antwortfreigabe.

## Freigabe-Gates
1. Vollständige Node-Regressionen inklusive GENESIS-Chat-Tests.
2. Echter NERYX-Webchat in Chromium und WebKit, inkl. tatsächlichem Worker, manipulierten Eingaben, unverändertem Speicher und normalem Hilfebefehl.
3. Diff-Allowlist auf aktuellen Basis-Commit, nur explizit freigegebene Pfade.
4. Separater iPhone-Test gegen genau diesen `main`-basierten Preview-SHA.
5. Nach verifizierten grünen Prüfungen: bewusste Freigabeentscheidung. **Kein automatisches Zusammenführen oder Umschalten der Produktionsdomain.**

Ein neuer `main`-Commit erfordert vor dem Merge einen erneuten Vergleich.
