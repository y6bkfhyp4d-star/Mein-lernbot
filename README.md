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
