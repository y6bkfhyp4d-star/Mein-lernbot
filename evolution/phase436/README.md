# Mein LernBot 7.0 – Phase 4.3.6

**Adaptive Sicherheitsentscheidung und kopierbare Ergebnisse**

## Start

Öffne `index436.html` auf GitHub Pages unter
`https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase436/index436.html`.

## Installation

Alle **8 Dateien** aus diesem Paket direkt nach `evolution/phase436/` hochladen; keinen weiteren Unterordner anlegen.

- `index436.html` – Website
- `main436.js` – Bedienung, Ergebnisanzeige, Kopierfunktion und TXT-Export
- `guard436.js` – neue Erkennungs- und Kontrolllogik
- `guard434.js` – originale Phase-4.3.4-Erkennung zum Vergleich
- `model.js` – unverändertes Originalmodell der Phase 4.3.4
- `portfolio.js` – unveränderte Strategieauswahl der Phase 4.2 / 4.3.4
- `style436.css` – iPhone-Design
- `README.md` – diese Anleitung

## Änderungen

- Gleichmäßige Kalibrierung der 15 Material-Aktion-Kombinationen (je 2 Beobachtungen)
- Messrauschen wird aus Beobachtungen geschätzt, nicht aus dem verborgenen Weltzustand ausgelesen
- Verdacht löst eine gezielte Kontrollmessung aus; Referenz bleibt bis zur Entscheidung stabil
- Höchstens ein Alarm pro Kombination und Welt
- Begrenzte Kontrollmessungen, weiterhin exakt 90 Beobachtungen je Welt
- Strategieauswahl auf getrennten Trainingswelten; finale Testwelten werden nicht für die Auswahl verwendet
- Direkter Vergleich mit unveränderter Phase 4.2 und Phase 4.3.4 auf **denselben neuen Testwelten**
- „Ergebnisse kopieren“, „JSON kopieren“ und „TXT speichern“

## Test

Seed `2027` stehen lassen, dann „Training & 108 Welten testen“ drücken. Danach „Ergebnisse kopieren“ auswählen und in ChatGPT einfügen.

## Einschränkungen

Das Projekt ist eine deterministische Simulation, keine echte autonome KI. Die Ergebnisse sind nur für die simulierten Welten gültig und müssen auf weiteren unabhängigen Seeds geprüft werden. Originalcode in Phase 4.2 und 4.3.4 bleibt unverändert. `model.js` nutzt für die Original-Phase-4.2-Alarmberechnung die tatsächliche simulierte Rauschstärke; das ist eine methodische Einschränkung des ursprünglichen Vergleichs.
