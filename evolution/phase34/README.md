# LernBot 7.0 – Phase 3.4

Installiere alle vier Webdateien in `evolution/phase34/` auf GitHub Pages.

Die simulierte Welt ändert nach 30 Experimenten ihre Heiz- und Kühlparameter. Der Agent bekommt keine explizite Mitteilung über die neuen Materialwerte. Die Alarmprüfung ist in diesem Prototyp allerdings erst nach dem festgelegten Wechselzeitpunkt aktiviert (eine methodische Einschränkung). Ein Alarm wird nur ausgelöst, wenn vier der letzten sechs beobachteten Nicht-Berührungs-Fehler im Mittel mehr als 3 °C betragen. Die Lerngewichte werden durch fortlaufende Gradienten-Updates angepasst. Ein separater Benchmark testet 8 Seeds mit 15 festen Aufgaben und einem eingefrorenen Modell als Kontrollgruppe.

**Grenzen:** Der Algorithmus lernt nur eine lineare Abbildung aus zwei vorgegebenen Materialmerkmalen. Die Veränderungserkennung ist eine feste Schwellenregel, keine frei entwickelte wissenschaftliche Theorie. Der Benchmark vergleicht keine statistische Signifikanz. Der Speicherstand stellt die Zufallsfolge nicht exakt wieder her.
