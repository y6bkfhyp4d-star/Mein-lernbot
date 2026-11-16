# LernBot 7.0 – Phase 5.8: Planungsvorschau und Q-Learning

## Installation
Alle Dateien direkt nach `evolution/phase58/` hochladen. `index.html` über GitHub Pages öffnen.

## Funktionen
- Ursprünglicher Weltgenerator und Mission aus Phase 5.7
- Drei-Züge-Vorschau mit ausschließlich bekannten Kartendaten und geschätztem Nutzen
- Q-Hybrid: kurze Vorschau + gelernte Entscheidungswerte, tatsächliche TD-Updates
- Vergleich mit Basis und Vorschau ohne Q
- Training (0, 25, 50, 100, 250, 500), Validierung (32), Test (100) getrennt
- Automatischer Rückfall zur Basis ohne validierten Vorteil
- Persönliches Gedächtnis in `localStorage`, unabhängig vom standardisierten Test
- Bericht/JSON kopieren oder TXT speichern

## Einschränkungen
Die Vorschau ist nur eine Heuristik mit maximal drei Schritten. Sie kennt keine verborgenen Kartenwerte und berechnet keine echten Zukunftsereignisse. Eine höhere Q-Tabelle bedeutet nicht automatisch bessere Leistung. Simulationsdaten sind kein Beweis allgemeiner Intelligenz.
