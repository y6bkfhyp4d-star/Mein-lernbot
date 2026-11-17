# NERYX v0.1 – eigenes KI-System für Mein LernBot

NERYX ist eine **eigene Anwendung und Architektur**, die zunächst ein vorhandenes Open-Weight-Modell als Basismodell verwendet. Es ist *kein* von Grund auf selbst trainiertes neuronales Sprachmodell.

## GitHub Pages: Installation auf dem iPhone

1. Im Repository `Mein-lernbot` zu `evolution` gehen.
2. Ordner erstellen: Dateiname `neryx/README.md` (wenn bereits in `evolution`).
3. `index.html`, `app.js`, `client.js`, `README.md` aus dem Paket **direkt** nach `evolution/neryx/` hochladen. Nicht doppelt verschachteln.
4. GitHub Pages öffnen: `https://y6bkfhyp4d-star.github.io/Mein-lernbot/evolution/neryx/`.
5. `Sprachmodell laden` drücken. Der Download kann sehr groß sein; WLAN und genügend Speicherplatz verwenden.
6. Fragen stellen. `Ergebnisse kopieren` steht oben links in der Steuerung.
7. Optional erst `test-verbindung.html` öffnen und die Verbindung ohne Änderung an LernBot testen.

Das Basismodell ist `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` mit WebLLM (WebGPU). Für ein kleines Modell kann bereits rund 1 GB GPU-Speicher benötigt werden. iOS 26 Safari hat WebGPU-Unterstützung; die tatsächliche Ausführbarkeit hängt vom Gerät, Browser, Speicher und Cache ab. Gegebenenfalls schlägt das Laden fehl. Im lokalen Modus wird der Chattext nicht an einen NERYX-KI-Server gesendet; Modell- und Bibliotheksdateien werden aus externen Quellen geladen.

### Verbindung zu Mein LernBot (gleiche GitHub-Pages-Domain)

Die Verbindung verwendet ein verstecktes iframe und `postMessage`, **keinen eigenen laufenden Backend-Server**. Das Modell läuft im Browser des Nutzers. Es gibt eine Origin-Prüfung gegen Fremdseiten.

In einer ES-Modul-Datei von LernBot:

```js
import { createNeryxClient } from '../neryx/client.js';

const neryx = createNeryxClient({
  url: '/Mein-lernbot/evolution/neryx/'
});

await neryx.load(); // lädt Modell beim ersten Aufruf
const antwort = await neryx.ask('Was ist ein Okapi?');
console.log(antwort);
```

Ist deine bestehende `app.js` ein normales Script, geht es so:

```js
(async () => {
  const { createNeryxClient } = await import('/Mein-lernbot/evolution/neryx/client.js');
  const neryx = createNeryxClient({url:'/Mein-lernbot/evolution/neryx/'});
  await neryx.load();
  const antwort = await neryx.ask('Erkläre Photosynthese.');
  console.log(antwort);
})();
```

**Nicht den kompletten Chat-Handler von LernBot blind überschreiben.** Zuerst mit einem separaten Test-Button anbinden. Ohne Kenntnis der tatsächlich aktuellen LernBot-Dateien wäre eine direkte Integration riskant.

## Optionaler eigener Server

`server/server.py` ist ein kleiner HTTP-Proxy für einen separat laufenden [`llama.cpp`](https://github.com/ggml-org/llama.cpp)-Server. Er führt das Modell **nicht selbst** aus und ist **nicht** für GitHub Pages geeignet.

Auf einem PC/VPS mit llama.cpp und einem passend lizenzierten GGUF-Modell zum Beispiel:

```bash
llama-server -m /pfad/zum/modell.gguf --host 127.0.0.1 --port 8080
export NERYX_ALLOWED_ORIGIN='http://localhost:8000'
python3 evolution/neryx/server/server.py
```

Dazu lokale Webseite mit `python3 -m http.server 8000` starten, in NERYX `Eigener Server` auswählen und `http://127.0.0.1:8787` eingeben. Das funktioniert nur, wenn Browser und Server auf demselben Computer laufen, oder du sichere Netzwerkanbindung mit HTTPS/Authentifizierung einrichtest. Ein öffentlich zugänglicher Backend-Server braucht Authentifizierung, Rate Limits und TLS; der mitgelieferte Beispielproxy soll **nicht öffentlich exponiert** werden.

## Sicherheit und Grenzen

- Kein OpenAI-Konto und kein API-Schlüssel erforderlich.
- Chatverläufe werden in der normalen Oberfläche **lokal im Browser** unter `neryx.chat.v1` gespeichert (nicht auf GitHub). Du kannst den Chat per `Neuer Chat` löschen. Für vollständige Entfernung Browserdaten prüfen.
- Das kleine Modell kann halluzinieren, falsche Antworten geben und ist kein Internet-Recherche-Agent. Es lernt nicht automatisch seine Modellgewichte um.
- Beim ersten Modellstart ist Internet nötig. Browser-Cache kann die Dateien behalten, aber garantierten Offline-Betrieb gibt es noch nicht.
- Bei intensiver Nutzung kann das iPhone heiß werden oder den Tab wegen Speichermangel schließen.
- Quellen und Lizenz: WebLLM https://github.com/mlc-ai/web-llm; Qwen https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct; Modell-Registry https://webllm.mlc.ai/models/ . Beachte die Lizenzen aller eingebundenen Komponenten.

## Dateiliste

- `index.html` – Oberfläche und Design
- `test-verbindung.html` – isolierter Test der LernBot-Brücke
- `app.js` – Chat, Modellstart, Inferenz, Browser-Brücke
- `client.js` – LernBot-Anbindung über postMessage
- `server/server.py` – optionaler Proxy für einen eigenen llama.cpp-Server
- `README.md` – Installationsanleitung
