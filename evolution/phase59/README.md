# LernBot 7.0 – Phase 5.9: Entscheidungsanalyse

**Installation:** Alle 10 Dateien direkt nach `evolution/phase59/` hochladen. `index.html` öffnen.

## Inhalt
- Unveränderter Weltgenerator aus Phase 5.8, Q-Agent mit zusätzlicher protokollierter Entscheidungsanalyse.
- Basisplaner, Vorschau ohne Q, Hybrid mit 500 Trainingswelten, und unabhängig validierte Sicherheitsauswahl.
- Trainings-Checkpoints 0/25/50/100/250/500; 32 getrennte Validierungswelten; 100 neue Testwelten.
- Zählt abweichende Bewegungen, Testentscheidungen mit gelernten Q-Zuständen, Q-bedingte Unterschiede in lokalen Vorschauentscheidungen.
- Zeigt Q-Werte, konkrete Entscheidungspunkte und paarweise Missionskosten der drei Strategien.
- Bericht kopieren, JSON kopieren, TXT speichern (iPhone-kompatibel).

## Auswertung und Grenzen
Ein Vergleich gleicher Seeds bedeutet nicht gleiche Messfolgen, weil Agenten unterschiedliche Wege nehmen. Paarweise Ergebnisse beweisen keine kausale Wirkung einer einzelnen Aktion. Q-Zustände und Werte sind aus Beobachtungen gelernt; verborgene Kartenzellen werden nicht als Aktionsinput verwendet. Ohne bestandene Validierung bleibt der Basisplaner aktiv. Dieses Paket verändert Phase 5.8 oder andere Phasen nicht.
