// NERYX: statische Schutztests der aktiven Haupt-App (keine Nutzerdaten nötig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const app = read('app.js');

test('Aktive JavaScript-Dateien haben gültige Syntax', () => {
  const files = [
    'app.js', 'sw.js', 'modules/code-diagnose.js',
    'konflikt-ki.js', 'gedaechtnis-ki.js', 'agenten-ki.js',
    'aufgaben-ki.js', 'wissens-ki.js', 'feedback-ki.js',
    'wissensnetz-ki.js', 'zentrale-ki.js', 'diagnose-ki.js',
    'antwort-ki.js'
  ];
  for (const file of files) {
    assert.doesNotThrow(() => new Script(read(file), { filename: file }), file);
  }
});

test('Inline-Skripte sind syntaktisch korrekt', () => {
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => new Script(match[1]), 'Inline-JavaScript');
  }
});

test('Element-IDs und Skripteinbindungen bleiben erhalten', () => {
  for (const id of ['app','drawer','sidebar-backdrop','main','menu','log','suggestions','bar','input','send','status']) {
    assert.match(html, new RegExp('id="' + id + '"'), 'DOM-ID: ' + id);
  }
  for (const file of ['app.js','konflikt-ki.js','gedaechtnis-ki.js','agenten-ki.js',
    'aufgaben-ki.js','wissens-ki.js','feedback-ki.js','wissensnetz-ki.js',
    'zentrale-ki.js','diagnose-ki.js','antwort-ki.js','modules/code-diagnose.js']) {
    assert.ok(html.includes('src="' + file + '"'), 'Modul fehlt: ' + file);
  }
});

test('Nutzerdaten-Schlüssel und Bridge bleiben kompatibel', () => {
  assert.ok(app.includes("KEY='meinLernBot.v1'"), 'Lokaler Speicher-Schlüssel');
  assert.ok(app.includes('window.LernBotBridge=Object.freeze('), 'Modulschnittstelle');
  assert.ok(app.includes("bind(UI.send(),'click'"), 'Senden-Handler');
  assert.ok(!app.includes('localStorage.clear('), 'Keine Gesamtlöschung');
});

test('NERYX-Namen und Manifest stimmen', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name, 'NERYX');
  assert.equal(manifest.short_name, 'NERYX');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.ok(html.includes('<strong>NERYX</strong>'));
});

test('Aufgaben-Befehl ist eindeutig und die Chat-Verarbeitung bleibt verfügbar', () => {
  assert.equal((app.match(/if\(n==='aufgaben'\)return tasks\(\);/g) || []).length, 1);
  assert.ok(app.includes('async function send()'), 'Senden-Funktion vorhanden');
  assert.ok(app.includes('async function handle(input)'), 'Befehlsverarbeitung vorhanden');
  assert.ok(app.includes("bind($('bar'),'submit'"), 'Formular-Handler vorhanden');
});

test('Datenschutz- und Backup-Basics bleiben unverändert', () => {
  assert.ok(app.includes('function exportData()'), 'Export vorhanden');
  assert.ok(app.includes('function importData(input)'), 'Import vorhanden');
  assert.ok(app.includes('function backup('), 'Sicherung vorhanden');
  assert.ok(app.includes("BP=KEY+'.sicherung.'"), 'Backup-Namensraum unverändert');
  assert.ok(!app.includes('localStorage.clear('), 'Keine gesamte Speicherlöschung');
});

test('PWA behält die Installation bei und registriert den Update-Dienst', () => {
  assert.ok(html.includes("serviceWorker.register('./sw.js'"));
  const sw = read('sw.js');
  assert.ok(sw.includes('skipWaiting()'));
  assert.ok(sw.includes('clients.claim()'));
  assert.ok(sw.includes("fetch(req, {cache:'no-store'})"));
});

