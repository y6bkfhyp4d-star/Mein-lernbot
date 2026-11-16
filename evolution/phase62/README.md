# LernBot 7.0 – Phase 6.2: Kontrolliertes Experimentieren

Eigenständiges, kostenloses JavaScript-Experiment für GitHub Pages und Safari auf dem iPhone. Übernimmt Weltgenerator, 180-Aktionen-Mission, Planer und Q-Training aus Phase 6.1.

## Installation

Im GitHub-Repository unter `evolution` die Datei `phase62/README.md` erstellen und committen. Danach **alle 12 Dateien aus diesem ZIP** unmittelbar in `evolution/phase62/` hochladen (ohne weiteren Unterordner).

Website: https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/phase62/

## Was neu ist

- Kontrollierte, epsilon-basierte Trainings-Exploration aus Phase 6.1 bleibt erhalten.
- Für tatsächliche Q-Alternativen wird **retrospektiv** der aktuelle Zustand kopiert, einmal die Basisaktion und einmal die Q-Alternative ausgeführt und danach jeweils mit dem identischen Basisplaner bis zum Missionsende fortgefahren.
- Der Simulator führt die vollständige Welt als **Umgebung**; der weiterlaufende Agent sieht ausschließlich beobachtete Zellen. Die Offline-Zukunft darf niemals die aktuelle Entscheidung oder das Q-Training beeinflussen.
- Berichte zählen Erfolge, Schritte, Energie und Pausen je Branch sowie gemeinsame Validierung und Testwelten. Keine behaupteten Verbesserungen, wenn die Freigabe fehlt.
- Die Proben sind bewusst auf maximal zwei echte Alternativen pro Episode begrenzt, damit der Safari-Test handhabbar bleibt.

## Methodik und Einschränkungen

Die Offline-Gegenprobe ist eine *Diagnose*, kein lernendes Weltmodell. Sie verwendet die echte, unveränderte, verborgene Simulator-Welt zum Ausführen beider unabhängigen Folgepfade. Das ist für eine retrospektive Gegenprobe zulässig, aber eine echte Live-KI könnte unbekannte zukünftige Informationen nicht im Voraus berechnen. Im Live-Agenten fließen diese Offline-Daten nirgendwo ein. Vergleiche bis Missionsende gelten nur für den untersuchten Zustand mit anschließend identischer Basispolitik, nicht automatisch für den dauerhaft eingesetzten Q-Agenten. Checkpoints nach 0/25/50/100/250/500 Trainingswelten, Validierung auf 32, danach Test auf 100 separaten Welten. Nur nach mindestens 0,4 Aktionen Verbesserung bei gleichbleibender Missionsquote wird freigegeben.
