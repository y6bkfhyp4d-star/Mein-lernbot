# LernBot 7.0 – Phase 3.1
Eigenständiges Forschungsmodul. Nutzt `../world.js` und `../materials.js` aus Phase 2.1. Diese Dateien dürfen nicht gelöscht oder umbenannt werden.

Lernprinzip: Der Bot speichert die beobachtete Temperaturdifferenz je Material/Aktion und bildet daraus einen Mittelwert als Vorhersage. Die neugierige Strategie bevorzugt weniger erprobte Kombinationen. Acht Holdout-Tests vergleichen den Vorhersagefehler mit Zufall.

Grenzen: Die Weltregeln sind bewusst einfach. Die Vorhersagen sind noch keine allgemeine Kausalintelligenz. Das Modell lernt keine Schäden oder Langzeitfolgen und hat keinen selbstständigen Codezugriff.
