// NERYX: statische Schutztests der aktiven Haupt-App (keine Nutzerdaten nötig).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const app = read('app.js');

test('Aktive JavaScript-Dateien haben gültige Syntax', () => {
  const files = [
    'app.js', 'sw.js', 'modules/document-gate.js', 'modules/code-diagnose.js', 'modules/genesis-gegenprobe.js', 'modules/genesis-2.js', 'modules/genesis-3.js', 'modules/neryx-reasoner.js', 'modules/rule-patterns.js', 'modules/learning-lab.js', 'modules/auto-learning.js', 'modules/learning-evaluation.js', 'modules/learning-audit.js', 'modules/meaning-benchmark.js', 'modules/batch-test.js', 'modules/context-learning.js', 'modules/word-learning.js', 'modules/meaning-links.js', 'modules/personal-learning-test.js', 'modules/conversation-math.js', 'modules/topic-learning.js', 'modules/learning-hub.js', 'modules/evidence-contract.js', 'modules/learning-coordinator.js', 'modules/capability-test.js', 'modules/local-model-bridge.js', 'modules/system-hub.js', 'modules/math-verifier.js', 'modules/orchestrator.js', 'modules/answer-review.js', 'modules/orchestrator.js',
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
    'zentrale-ki.js','diagnose-ki.js','antwort-ki.js','modules/code-diagnose.js','modules/genesis-gegenprobe.js','modules/genesis-2.js','modules/genesis-3.js','modules/neryx-reasoner.js','modules/rule-patterns.js','modules/learning-lab.js','modules/auto-learning.js','modules/learning-evaluation.js','modules/learning-audit.js','modules/meaning-benchmark.js','modules/batch-test.js','modules/context-learning.js','modules/word-learning.js','modules/meaning-links.js','modules/personal-learning-test.js','modules/conversation-math.js','modules/topic-learning.js','modules/learning-hub.js','modules/learning-coordinator.js','modules/capability-test.js','modules/local-model-bridge.js','modules/system-hub.js','modules/orchestrator.js','modules/answer-review.js']) {
    assert.ok(html.includes('src="' + file + '"'), 'Modul fehlt: ' + file);
  }
});

test('Nutzerdaten-Schlüssel und Bridge bleiben kompatibel', () => {
  assert.ok(app.includes("KEY='meinLernBot.v1'"), 'Lokaler Speicher-Schlüssel');
  assert.ok(app.includes('window.LernBotBridge=Object.freeze('), 'Modulschnittstelle');
  assert.ok(app.includes("bind(UI.send(),'click'"), 'Senden-Handler');
  assert.ok(app.includes('function transaction('), 'Transaktionsbasierte Datenspeicherung bleibt vorhanden');
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
  assert.ok(app.includes('function transaction('), 'Transaktionsbasierte Datenspeicherung bleibt vorhanden');
});

test('PWA behält die Installation bei und registriert den Update-Dienst', () => {
  assert.ok(html.includes("serviceWorker.register('./sw.js'"));
  const sw = read('sw.js');
  assert.ok(sw.includes('skipWaiting()'));
  assert.ok(sw.includes('clients.claim()'));
  assert.match(sw,/fetch\(\s*req\s*,\s*\{\s*cache\s*:\s*['"]no-store['"]\s*\}\s*\)/);
});


test('GENESIS erkennt Widersprüche und beschädigt keine Fakten', () => {
  const { runInNewContext } = requireVm();
  const window = {};
  runInNewContext(read('modules/genesis-gegenprobe.js'), {window});
  const before = [{subject:'Mars',property:'durchmesser',value:'6779 km'},
    {subject:'Mars',property:'durchmesser',value:'1234 km'}];
  const snapshot = JSON.stringify(before);
  const result = window.NERYXGenesis.examine(before, () => ({text:''}));
  assert.equal(result.conflicts, 1);
  assert.equal(JSON.stringify(before), snapshot);
  const unique = [{subject:'Mars', property:'durchmesser', value:'6779 km'}];
  const success = window.NERYXGenesis.examine(unique,
    () => ({text:'Der Durchmesser von Mars beträgt 6779 km.'}));
  assert.equal(success.checked, 3);
  assert.equal(success.passed, 3);
  const failure = window.NERYXGenesis.examine(unique, () => ({text:'Unbekannt'}));
  assert.equal(failure.passed, 0);
  assert.equal(failure.problems.length, 3);
  const wrongNumber = window.NERYXGenesis.examine(
    [{subject:'Mars',property:'durchmesser',value:'6779 km'}],
    () => ({text:'16779 km'}));
  assert.equal(wrongNumber.passed, 0, 'Teilzahl darf kein richtiger Treffer sein');
  const thousands = window.NERYXGenesis.examine(
    [{subject:'Mars',property:'durchmesser',value:'6.779 Kilometer'}],
    () => ({text:'Der Durchmesser beträgt 6779 Kilometer.'}));
  assert.equal(thousands.passed, 3, 'Gleichwertige Tausender-Schreibweise');
  const repeated = window.NERYXGenesis.examine(
    [{subject:'Mars',property:'durchmesser',value:'6779 km'},
      {subject:'Mars',property:'durchmesser',value:'6779 km'}],
    () => ({text:'6779 km'}));
  assert.equal(repeated.checked, 3, 'Identische Fakten nur einmal prüfen');
  assert.ok(app.includes("n==='genesis'"));
  assert.ok(html.includes('data-msg="GENESIS"'));
});

function requireVm() {
  return {runInNewContext};
}

test('Antwort-KI erkennt Satzzeichen und GENESIS testet die echten Antworten', () => {
  const window = {};
  const console = {log() {}};
  runInNewContext(read('antwort-ki.js'), {window,console});
  runInNewContext(read('modules/genesis-gegenprobe.js'), {window});
  const facts = [{subject:'Okapi', property:'definition', value:'ein Säugetier'}];
  const answer = q => window.LernBotAntwortKI.answer(q, {facts,documents:[],context:{}});
  assert.match(answer('Erkläre Okapi.').text, /Säugetier/);
  const result = window.NERYXGenesis.examine(facts,answer);
  assert.equal(result.passed, 3);
  assert.equal(result.checked, 3);
});

test('GENESIS erklärt leere Faktenbank statt falscher Entwarnung', () => {
  const window = {
    LernBotBridge: {
      getFacts: () => [],
      getTasks: () => [{id:'task1'}],
      getMemories: () => [{id:'memory1'}]
    },
    LernBotAntwortKI: {answer: () => null}
  };
  runInNewContext(read('modules/genesis-gegenprobe.js'), {window});
  const message = window.NERYXGenesis.report();
  assert.match(message, /Keine strukturierten Fakten/);
  assert.match(message, /Aufgaben: 1/);
  assert.match(message, /Erinnerungen: 1/);
  assert.doesNotMatch(message, /Keine Probleme in den getesteten Varianten erkannt/);
  assert.doesNotMatch(message, /LERNCHANCEN/);
});

test('GENESIS nennt unbekannte Fakten-Eigenschaften als Grund', () => {
  const window = {LernBotBridge:{
    getFacts: () => [{subject:'Mars',property:'temperatur',value:'-60 Grad'}]},
    LernBotAntwortKI:{answer:()=>null}};
  runInNewContext(read('modules/genesis-gegenprobe.js'), {window});
  assert.match(window.NERYXGenesis.report(), /keine passenden Fragevorlagen/);
});

test('GENESIS: Okapi-Aussehen wird über unterschiedliche Fragen erkannt', () => {
  const window = {}, console = {log() {}};
  runInNewContext(read('antwort-ki.js'), {window, console});
  runInNewContext(read('modules/genesis-gegenprobe.js'), {window});
  const facts = [{subject:'Okapi',property:'aussehen',
    value:'schwarz-weiße Streifen an den Beinen'}];
  const answer = q => window.LernBotAntwortKI.answer(q, {facts,documents:[],context:{}});
  assert.match(answer('Wie sieht Okapi aus?').text, /Streifen/);
  const r = window.NERYXGenesis.examine(facts, answer);
  assert.equal(r.checked, 2);
  assert.equal(r.passed, 2);
});

test('GENESIS 2: schwere Fragen, Nichtwissen und Konflikt ohne Faktenänderung', () => {
  const window = {}, console = {log() {}};
  runInNewContext(read('antwort-ki.js'), {window, console});
  runInNewContext(read('modules/genesis-2.js'), {window});
  const facts = [
    {subject:'Mars',property:'durchmesser',value:'6.779 Kilometer'},
    {subject:'Okapi',property:'aussehen',value:'schwarz-weiße Streifen an den Beinen'}
  ];
  const before = JSON.stringify(facts);
  const r = window.NERYXGenesis2.examine(facts,
    (q,db) => window.LernBotAntwortKI.answer(q,{facts:db,documents:[],context:{}}));
  assert.equal(r.facts, 2);
  assert.equal(r.unknown.checked, 2);
  assert.equal(r.unknown.passed, 2);
  assert.equal(r.conflict.checked, 1);
  assert.equal(r.conflict.passed, 1);
  assert.ok(r.paraphrase.checked >= 4);
  assert.equal(JSON.stringify(facts), before, 'GENESIS muss read-only bleiben');
  assert.ok(app.includes("n==='genesis verlauf'"));
  assert.ok(html.includes('src="modules/genesis-2.js"'));
});

test('GENESIS 2: Verlauf lokal separat und nur zusammengefasste Ergebnisse', () => {
  const db = new Map();
  const storage = {
    getItem: key => db.get(key) ?? null,
    setItem: (key,value) => db.set(key,String(value))
  };
  const facts = [{subject:'Mars',property:'durchmesser',value:'6.779 Kilometer'}];
  const window = {LernBotBridge:{getFacts:()=>facts},localStorage:storage};
  window.LernBotAntwortKI = {version:'test', answer:(q,db) => {
    const f = db.facts.find(x=>x.subject==='Mars');
    return q.includes('Testobjekt') ? null : f ? {text:'Der Durchmesser beträgt '+f.value+(f.conflict?' – Widerspruch!':'')} : null;
  }};
  runInNewContext(read('modules/genesis-2.js'), {window,localStorage:storage});
  const result=window.NERYXGenesis2.report();
  assert.match(result,/GENESIS 2.0/);
  const raw=db.get('neryx.genesis.benchmark.v2');
  assert.ok(raw,'Separate Speicherung');
  assert.doesNotMatch(raw,/Mars|Kilometer/,'Keine Faktentexte im Verlauf');
  assert.match(window.NERYXGenesis2.historyReport(),/TESTVERLAUF/);
  assert.equal(db.has('meinLernBot.v1'),false,'Wissensspeicher nicht verändert');
});

test('Antwort-KI 1.7: neue GENESIS-2-Formulierungen und bisherige Fragen', () => {
  const window = {}, console = {log() {}};
  runInNewContext(read('antwort-ki.js'), {window,console});
  runInNewContext(read('modules/genesis-2.js'), {window});
  const facts=[
    {subject:'Okapi',property:'definition',value:'ein Säugetier'},
    {subject:'Okapi',property:'aussehen',value:'gestreifte Beine'},
    {subject:'Okapi',property:'lebensraum',value:'Regenwald'},
    {subject:'Metaanalyse',property:'definition',value:'eine statistische Auswertung'},
    {subject:'Dropdown-Liste',property:'definition',value:'ein Auswahlfeld'},
    {subject:'Mars',property:'durchmesser',value:'6779 Kilometer'}
  ];
  const answer=(q,db=facts)=>window.LernBotAntwortKI.answer(q,{facts:db,context:{},documents:[]});
  for(const [question,expected] of [
    ['Beschreibe, was Okapi ist.','Säugetier'],
    ['Kannst du Okapi definieren?','Säugetier'],
    ['Beschreibe, wie Okapi aussieht.','gestreifte Beine'],
    ['Wo ist Okapi beheimatet?','Regenwald'],
    ['Beschreibe, was Metaanalyse ist.','statistische Auswertung'],
    ['Kannst du Dropdown-Liste definieren?','Auswahlfeld'],
    ['Was ist Okapi?','Säugetier'],
    ['Wie sieht Okapi aus?','gestreifte Beine'],
    ['Welchen Durchmesser hat Mars?','6779 Kilometer']
  ]) assert.match(answer(question)?.text||'',new RegExp(expected),question);
  const oldSnapshot=JSON.stringify(facts);
  const result=window.NERYXGenesis2.examine(facts,answer);
  assert.equal(result.paraphrase.checked,12);
  assert.equal(result.paraphrase.passed,12);
  assert.equal(result.unknown.passed,2);
  assert.equal(result.conflict.passed,1);
  assert.equal(JSON.stringify(facts),oldSnapshot,'Kein Wissen bei Tests verändern');
});

test('GENESIS 3 schlägt bei neuen Fragen geprüfte Umformulierungen vor', () => {
  const window = {}, console = {log() {}};
  runInNewContext(read('antwort-ki.js'), {window,console});
  runInNewContext(read('modules/genesis-3.js'), {window});
  const facts=[
    {subject:'Okapi',property:'definition',value:'ein Säugetier'},
    {subject:'Okapi',property:'lebensraum',value:'Regenwald'},
    {subject:'Mars',property:'durchmesser',value:'6779 Kilometer'}
  ];
  const original=JSON.stringify(facts);
  const r=window.NERYXGenesis3.examine(facts,
    (q,db)=>window.LernBotAntwortKI.answer(q,{facts:db,context:{},documents:[]}));
  assert.ok(r.checked>=3);
  assert.equal(r.passed,r.checked,'Bekannte GENESIS-3-Sprachmuster werden erkannt');
  assert.equal(r.candidates,0,'Keine veralteten Verbesserungsvorschläge');
  assert.equal(JSON.stringify(facts),original,'Originalfakten nicht verändern');
  assert.ok(app.includes("n==='genesis 3'"));
  assert.ok(html.includes('src="modules/genesis-3.js"'));
});

test('GENESIS 3: Unbelegte Vorschläge werden nicht als erfolgreich bezeichnet', () => {
  const window = {};
  runInNewContext(read('modules/genesis-3.js'), {window});
  const r=window.NERYXGenesis3.examine(
    [{subject:'Mars',property:'durchmesser',value:'6779 Kilometer'}],
    ()=>({text:'Dazu habe ich keine Antwort.'}));
  assert.equal(r.validated,0);
  assert.ok(r.suggestions.every(x=>x.status.includes('Nicht bestätigt')));
});

test('Antwort-KI 1.8 erkennt Erklär-mir und An-welchem-Ort für mehrere Themen', () => {
  const window = {}, console = {log() {}};
  runInNewContext(read('antwort-ki.js'),{window,console});
  const facts=[
    {subject:'Okapi',property:'definition',value:'ein Säugetier'},
    {subject:'Okapi',property:'lebensraum',value:'Regenwald'},
    {subject:'Mars',property:'definition',value:'ein Planet'},
    {subject:'Metaanalyse',property:'definition',value:'eine Auswertung'}
  ];
  for(const [question,answer] of [
    ['Erklär mir, was Okapi ist.','Säugetier'],
    ['Erkläre mir, was Mars ist.','Planet'],
    ['Erklär mir, was Metaanalyse ist.','Auswertung'],
    ['An welchem Ort lebt Okapi?','Regenwald'],
    ['Was ist Mars?','Planet'],
    ['Wo lebt Okapi?','Regenwald']
  ]) assert.match(window.LernBotAntwortKI.answer(question,{facts})?.text||'',
    new RegExp(answer),question);
});

test('Denkmodul: Regelübertragung, Routenplanung und mehrstufige Operatoren', () => {
  const window = {};
  runInNewContext(read('modules/neryx-reasoner.js'),{window});
  const r=window.NERYXReasoner;
  assert.equal(r.inferRule([[2,5],[4,9],[6,13]],7).result,15);
  assert.equal(r.inferRule([[1,2],[2,7],[3,5]],4),null);
  assert.equal(r.ruleFromText('2=5, 4=9; 7').includes('y = 15'),true);
  assert.equal(r.compose(3,[['multiply',4],['subtract',2],['add',5]]),15);
  assert.equal(r.compose(2,[['divide',0]]),null);
  const route=r.shortestPath([[0,0,0],[1,1,0],[0,0,0]],[0,0],[2,2]);
  assert.equal(route.length,5);
  assert.equal(r.shortestPath([[0,1],[1,0]],[0,0],[1,1]),null);
});

test('Fähigkeitstest: zufällige Probleme mit unabhängigen Sollwerten', () => {
  const window={};
  runInNewContext(read('modules/neryx-reasoner.js'),{window});
  runInNewContext(read('modules/capability-test.js'),{window});
  const test=window.NERYXCapabilityTest;
  for(let seed=1;seed<=30;seed++){
    const report=test.benchmark(seed);
    assert.equal(report.correct,36,'Denkmodul prüft neue Eingaben: '+seed);
    assert.equal(report.total,36);
  }
  const wrong={
    inferRule:()=>({result:0}),
    shortestPath:()=>null,
    compose:()=>0
  };
  const negative=test.benchmark(100,wrong);
  assert.ok(negative.correct<36,'Test erkennt schwaches Modell');
  assert.match(test.report(),/kein|nicht allgemeine Intelligenz/i);
  assert.ok(app.includes("n==='denktest'"));
  assert.ok(app.includes("command(s,'Regel lösen')"));
  assert.ok(app.indexOf("command(s,'Regel lösen')") <
    app.indexOf("if(context.awaiting)"),'Denkbefehl muss vor Themen-Rückfragen laufen');
  assert.ok(html.includes('src="modules/neryx-reasoner.js"'));
  assert.ok(html.includes('src="modules/capability-test.js"'));
});

test('Regel lösen akzeptiert normale und angehängte Doppelpunkte', () => {
  const window = {};
  runInNewContext(read('modules/neryx-reasoner.js'), {window});
  const reasoner = window.NERYXReasoner;
  for (const input of ['2=5, 4=9; 7','2=5, 4=9; 7:','2=5, 4=9; 7 :']) {
    const answer = reasoner.ruleFromText(input);
    assert.match(answer, /y = 15/, input);
  }
  const norm = x => x.toLocaleLowerCase('de').normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g,'').replace(/ß/g,'ss')
    .replace(/ae/g,'a').replace(/oe/g,'o').replace(/ue/g,'u')
    .replace(/[^\\p{L}\\p{N}\\s]/gu,' ').replace(/\\s+/g,' ').trim();
  for(const phrase of ['Regel lösen: 2=5, 4=9; 7','Regel loesen: 2=5, 4=9; 7']) {
    const prefix=phrase.slice(0,phrase.indexOf(':'));
    assert.equal(norm(prefix),norm('Regel lösen'));
  }
});

test('Mustererkennung 0.2 bewahrt lineare Regeln und ergänzt quadratische', () => {
  const window={};
  runInNewContext(read('modules/neryx-reasoner.js'),{window});
  runInNewContext(read('modules/rule-patterns.js'),{window});
  const p=window.NERYXPatterns;
  assert.match(p.solvePairs('2=5, 4=9; 7'),/y = 15/);
  assert.match(p.solvePairs('1=1, 2=4, 3=9; 4'),/y = 16/);
  assert.match(p.solvePairs('1=1, 2=4, 3=9; 4'),/nicht eindeutig bewiesen/);
  assert.match(p.solvePairs('1=1, 1=2, 3=9; 4'),/nur einmal/);
  assert.match(p.solvePairs('1=2, 2=4, 3=13, 4=21; 5'),/Keine passende/);
});
test('Mustererkennung 0.2 erkennt Folgen, verweigert ungeeignete Angaben', () => {
  const window={};
  runInNewContext(read('modules/rule-patterns.js'),{window});
  const p=window.NERYXPatterns;
  assert.match(p.solveSequence('2, 4, 8, 16'),/32/);
  assert.match(p.solveSequence('1, 3, 2, 4, 3, 5'),/4/);
  assert.match(p.solveSequence('3, 6, 9, 12'),/15/);
  assert.match(p.solveSequence('1, 4, 9, 16'),/25/);
  assert.match(p.solveSequence('1, 2'),/Format/);
  assert.match(p.solveSequence('1, 2, wort'),/Format/);
  assert.ok(app.includes("command(s,'Folge lösen')"));
  assert.ok(html.includes('src="modules/rule-patterns.js"'));
});

test('Lernlabor: Rückmeldung ändert spätere Strategie-Auswahl in getrenntem Speicher', () => {
  const db=new Map(), localStorage={
    getItem:key=>db.get(key)??null,
    setItem:(key,value)=>db.set(key,String(value))
  };
  const window={};
  runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
  const lab=window.NERYXLearning;
  assert.equal(lab.ranked([2,4,8,16])[0].next,32,'Vorher geometrisch favorisiert');
  assert.match(lab.proposal('2, 4, 8, 16'),/geometrisch: 32/);
  assert.match(lab.feedback('30'),/Lernfeedback übernommen: 30/);
  assert.equal(lab.ranked([2,4,8,16])[0].next,30,'Nachher kubisch favorisiert');
  assert.equal(lab.ranked([3,6,12,24])[0].next,45,'Erfahrungsübertragung auf andere Folge');
  assert.ok(db.has('neryx.learning.strategies.v1'));
  assert.equal(db.has('meinLernBot.v1'),false,'Persönliches Wissen nicht verändert');
  assert.doesNotMatch(db.get('neryx.learning.strategies.v1'),/2,4,8,16/,'Keine Übungsbeispiele gespeichert');
});

test('Lernlabor: unbelegtes Feedback nicht übernehmen und Nachteile messbar', () => {
  const db=new Map(),localStorage={
    getItem:key=>db.get(key)??null,
    setItem:(key,value)=>db.set(key,String(value))
  },window={};
  runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
  const lab=window.NERYXLearning;
  assert.match(lab.feedback('32'),/Zuerst/);
  assert.match(lab.evaluate(),/4\/4/);
  lab.proposal('2, 4, 8, 16');
  assert.match(lab.feedback('999'),/nicht übernommen/);
  assert.equal(db.size,0,'Unbelegtes Feedback verändert keinen Speicher');
  lab.proposal('2, 4, 8, 16');
  lab.feedback('30');
  assert.match(lab.evaluate(),/3\/4/,'Verschlechterung wird angezeigt');
  assert.ok(html.includes('src="modules/learning-lab.js"'));
  assert.ok(app.indexOf("command(s,'Lernversuch')")<app.indexOf("if(context.awaiting)"));
  assert.ok(app.includes("command(s,'Lernfeedback')"));
});

test('Auto-Lernen: gewöhnliche Folge-Frage trainiert nur einen separaten Strategiezähler', () => {
  const db=new Map(), localStorage={
    getItem:k=>db.get(k)??null,
    setItem:(k,v)=>db.set(k,String(v))
  },window={};
  runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
  runInNewContext(read('modules/auto-learning.js'),{window,localStorage});
  const agent=window.NERYXAutoLearn;
  const question='Was kommt als Nächstes: 2, 4, 8, 16, 32?';
  assert.match(agent.solve(question),/Mögliche nächste Zahl: 64/);
  assert.match(agent.status(),/Automatische Lernschritte: 1/);
  const snapshot=db.get('neryx.learning.auto.v1');
  assert.match(agent.solve(question),/bereits/);
  assert.equal(db.get('neryx.learning.auto.v1'),snapshot,'Wiederholung darf keine Belohnung geben');
  assert.equal(db.has('meinLernBot.v1'),false,'Persönliche Fakten nicht verändert');
  assert.equal(db.has('neryx.learning.strategies.v1'),false,'Manuelles Lernlabor unverändert');
  assert.ok(html.includes('src="modules/auto-learning.js"'));
  assert.ok(app.indexOf('NERYXAutoLearn?.solve(s)')<app.indexOf('if(context.awaiting)'));
});

test('Auto-Lernen: kein Feedback aus ungeeigneten Nachrichten und unklaren Beispielen', () => {
  const db=new Map(),localStorage={
    getItem:k=>db.get(k)??null,
    setItem:(k,v)=>db.set(k,String(v))
  },window={};
  runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
  runInNewContext(read('modules/auto-learning.js'),{window,localStorage});
  const agent=window.NERYXAutoLearn;
  assert.equal(agent.solve('Ich kaufte 2, 4, 8, 16, 32 Äpfel.'),null);
  assert.equal(agent.solve('Was kommt als Nächstes: 2, 4, 8?'),null);
  assert.match(agent.solve('Was kommt als Nächstes: 2, 4, 8, 16, 999?'),/nichts gelernt/);
  assert.equal(db.size,0,'Keine Daten für nicht nachvollziehbares Muster');
  assert.match(agent.solve('Wie geht die Folge weiter: 3, 6, 12, 24, 48?'),/Mögliche nächste Zahl: 96/);
  assert.match(agent.status(),/Automatische Lernschritte: 1/);
});

test('Lernprüfung: getrennte Beispiele weisen Verbesserung und gleichzeitig Regression nach', () => {
  const db=new Map(),localStorage={
    getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))
  },window={};
  runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
  runInNewContext(read('modules/learning-evaluation.js'),{window,localStorage});
  for(const seed of [42,1234,20261119]){
    const r=window.NERYXLearningEvaluation.run(seed);
    assert.equal(r.trainedOn,12);
    assert.equal(r.heldout,36);
    assert.equal(r.trainingOverlap,0,'Keine doppelten Eingaben im getrennten Test');
    assert.equal(r.cubic.before,0);
    assert.equal(r.cubic.after,18);
    assert.equal(r.geometric.before,18);
    assert.equal(r.geometric.after,0);
    assert.equal(r.improvement,0,'Keine falsche allgemeine Verbesserung behaupten');
    assert.equal(r.verifiedGain,false);
  }
  const report=window.NERYXLearningEvaluation.report();
  assert.match(report,/Vor dem Lernen: 18\/36/);
  assert.match(report,/Nach dem Lernen: 18\/36/);
  assert.match(report,/Verbesserung ohne Rückschritt nachgewiesen: Nein/);
  assert.equal(db.has('meinLernBot.v1'),false,'Keine Änderungen am Wissensspeicher');
  assert.equal(db.has('neryx.learning.auto.v1'),false,'Autolernstände bleiben unverändert');
  assert.equal(db.has('neryx.learning.strategies.v1'),false,'Manuelle Lerngewichte bleiben unverändert');
  assert.ok(db.has('neryx.learning.evaluation.v1'));
  assert.ok(html.includes('src="modules/learning-evaluation.js"'));
  assert.ok(app.includes("n==='lernprufung'"));
});

test('Kontextlernen fragt bei Mehrdeutigkeit nach und lernt getrennte Zuordnungen', () => {
  const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
  runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
  runInNewContext(read('modules/context-learning.js'),{window,localStorage});
  const c=window.NERYXContextLearning;
  assert.match(c.solve('2, 4, 8, 16 | Hinweis: vervielfachen'),/Welche Regel ist gemeint/);
  c.learn('vervielfachen','geometrisch');
  assert.match(c.solve('3, 6, 12, 24 | Hinweis: vervielfachen'),/Welche Regel ist gemeint/);
  c.learn('vervielfachen','geometrisch');
  c.learn('interpolation','kubisch');
  c.learn('interpolation','kubisch');
  assert.match(c.solve('3, 6, 12, 24 | Hinweis: vervielfachen'),/geometrisch → 48/);
  assert.match(c.solve('3, 6, 12, 24 | Hinweis: interpolation'),/kubisch → 45/);
  assert.match(c.status(),/Gespeicherte Beispiele: 4/);
  assert.equal(db.has('meinLernBot.v1'),false);
  assert.equal(db.has('neryx.learning.auto.v1'),false);
  assert.equal(db.has('neryx.learning.strategies.v1'),false);
  assert.ok(html.includes('src="modules/context-learning.js"'));
  assert.ok(app.indexOf("command(s,'Muster prüfen')")<app.indexOf('if(context.awaiting)'));
});
test('Kontextlerntest überprüft neue Zahlen und verändert keine bestehenden Gewichte', () => {
  const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
  runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
  runInNewContext(read('modules/context-learning.js'),{window,localStorage});
  const c=window.NERYXContextLearning;
  assert.match(c.experiment(),/Vorher richtig: 0\/12/);
  assert.match(c.experiment(),/Nachher richtig: 12\/12/);
  assert.equal(db.size,0,'Experiment ist nur eine Simulation');
  assert.match(c.learn('bad!','$wrong'),/Format/);
  assert.equal(db.size,0,'Ungültiger Kontext speichert nichts');
  assert.match(c.solve('1, x, 3 | Hinweis: irgendwas'),/Format/);
});

test('Kontext-Rückfrage akzeptiert kurze Antwort als Gespräch statt Wissenssuche', () => {
  const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
  runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
  runInNewContext(read('modules/context-learning.js'),{window,localStorage});
  const c=window.NERYXContextLearning;
  assert.equal(c.reply('geometrisch'),null,'Ohne aktive Rückfrage keine Änderung');
  assert.match(c.solve('2, 4, 8, 16 | Hinweis: vervielfachen'),/Welche Regel ist gemeint/);
  assert.match(c.reply('geometrisch'),/Kontextbeispiel gespeichert/);
  assert.match(c.status(),/Gespeicherte Beispiele: 1/);
  assert.equal(c.reply('geometrisch'),null,'Doppelte Antwort zählt nicht mehrfach');
  assert.match(c.solve('3, 6, 12, 24 | Hinweis: vervielfachen'),/Welche Regel ist gemeint/);
  assert.match(c.reply('geometrisch'),/bevorzugt jetzt geometrisch/);
  assert.match(c.solve('5, 10, 20, 40 | Hinweis: vervielfachen'),/geometrisch → 80/);
  assert.equal(db.has('meinLernBot.v1'),false);
  assert.ok(app.includes('NERYXContextLearning?.reply(s)'));
  assert.ok(app.indexOf('NERYXContextLearning?.reply(s)')<app.indexOf('if(context.awaiting)'));
});
test('Kontext-Rückfrage wird bei Abbruch verworfen und beeinflusst keine anderen Fragen', () => {
  const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
  runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
  runInNewContext(read('modules/context-learning.js'),{window,localStorage});
  const c=window.NERYXContextLearning;
  c.solve('2, 4, 8, 16 | Hinweis: anders');
  assert.match(c.reply('abbrechen'),/abgebrochen/);
  assert.equal(c.reply('geometrisch'),null);
  assert.equal(db.size,0);
  c.solve('2, 4, 8, 16 | Hinweis: anders');
  assert.equal(c.reply('Was ist ein Okapi?'),null);
  assert.equal(db.size,0);
});

test('Sprachmuster-Lernen: Labels aus Zahlen ableiten und Wortstämme übertragen', () => {
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
 runInNewContext(read('modules/word-learning.js'),{window,localStorage});
 const m=window.NERYXWordLearning;
 assert.match(m.experiment(),/Nachher richtig zugeordnet: 2\/3/);
 assert.match(m.teach('Die Zahlen werden verdoppelt | 2, 4, 8, 16, 32'),/geometrisch/);
 assert.match(m.teach('Wir verdoppeln jede Zahl | 3, 6, 12, 24, 48'),/geometrisch/);
 assert.match(m.teach('Die Zahlen werden addiert | 1, 4, 7, 10, 13'),/arithmetisch/);
 assert.match(m.teach('Wir addieren immer drei | 5, 8, 11, 14, 17'),/arithmetisch/);
 assert.match(m.query('Zahlen schrittweise verdoppeln | 5, 10, 20, 40'),/geometrisch → 80/);
 assert.match(m.query('Zahlen weiter addieren | 10, 13, 16, 19'),/arithmetisch → 22/);
 assert.match(m.query('Jede Zahl mit zwei multiplizieren | 4, 8, 16, 32'),/Keine ausreichend sichere/);
 assert.match(m.status(),/Trainingsbeispiele: 4/);
 assert.equal(db.has('meinLernBot.v1'),false);
 assert.equal(db.has('neryx.learning.context.v1'),false);
 assert.ok(html.includes('src="modules/word-learning.js"'));
 assert.ok(app.indexOf("command(s,'Beispiel prüfen')")<app.indexOf('if(context.awaiting)'));
});
test('Sprachmuster-Lernen: Doppeltraining und falsche Beispiele ablehnen',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
 runInNewContext(read('modules/word-learning.js'),{window,localStorage});
 const m=window.NERYXWordLearning;
 assert.match(m.teach('Verdoppeln | 2,4,8,16,32'),/gespeichert/);
 const saved=db.get('neryx.learning.wordfeatures.v1');
 assert.match(m.teach('Andere Worte | 2,4,8,16,32'),/Bereits gespeichert/);
 assert.equal(db.get('neryx.learning.wordfeatures.v1'),saved,'Doppeltraining verändert den Speicher nicht');
 assert.match(m.teach('Verdoppeln | 2,4,8,16,999'),/Nichts gespeichert/);
 assert.match(m.teach('Verdoppeln | 1,2,3'),/Format/);
 assert.match(m.status(),/Trainingsbeispiele: 1/);
 assert.equal(db.size,1,'Nur experimenteller Lernspeicher wird beschrieben');
});

test('Sprachlernstand listet echten Speicher statt Demonstrationsdaten', () => {
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
 runInNewContext(read('modules/word-learning.js'),{window,localStorage});
 const m=window.NERYXWordLearning;
 m.teach('Die Zahlen werden verdoppelt | 2, 4, 8, 16, 32');
 m.teach('Wir verdoppeln jede Zahl | 3, 6, 12, 24, 48');
 const duplicate=m.teach('Wir verdoppeln jede Zahl | 3, 6, 12, 24, 48');
 assert.match(duplicate,/Bereits gespeichert: „Wir verdoppeln jede Zahl“/);
 assert.match(duplicate,/Aktuell 2 unterschiedliche Trainingsbeispiele/);
 const current=m.status();
 assert.match(current,/Unterschiedliche Trainingsbeispiele: 2/);
 assert.match(current,/1\. „Die Zahlen werden verdoppelt“/);
 assert.match(current,/2\. „Wir verdoppeln jede Zahl“/);
 assert.match(current,/Sprachlernprüfung verwendet eigene Demonstrationsdaten/);
 assert.equal(db.has('meinLernBot.v1'),false);
});

test('Sprachlernen: unbekannte Formulierung aus zwei geprüften Korrekturen übernehmen',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
 runInNewContext(read('modules/word-learning.js'),{window,localStorage});
 const m=window.NERYXWordLearning;
 m.teach('Die Zahlen werden verdoppelt | 2,4,8,16,32');
 m.teach('Wir verdoppeln jede Zahl | 3,6,12,24,48');
 assert.match(m.query('Jede Zahl wird mit zwei multipliziert | 7,14,28,56'),/Beispielkorrektur: ZAHL/);
 assert.match(m.feedback('999'),/keiner geprüften Strategie/);
 assert.match(m.status(),/Trainingsbeispiele: 2/);
 assert.match(m.feedback('112'),/Beispiel gespeichert/);
 assert.match(m.query('Jede Zahl wird mit zwei multipliziert | 9,18,36,72'),/Beispielkorrektur: ZAHL/);
 assert.match(m.feedback('144'),/Beispiel gespeichert/);
 assert.match(m.query('Mit zwei multipliziert man jede Zahl | 11,22,44,88'),/geometrisch → 176/);
 assert.match(m.status(),/Trainingsbeispiele: 4/);
 assert.equal(db.has('meinLernBot.v1'),false);
 assert.ok(app.includes("command(s,'Beispielkorrektur')"));
 assert.ok(app.indexOf("command(s,'Beispielkorrektur')")<app.indexOf("if(context.awaiting)"));
});
test('Sprachlernen: Duplikate und abgebrochene Rückmeldungen verändern keine Datensätze',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 runInNewContext(read('modules/learning-lab.js'),{window,localStorage});
 runInNewContext(read('modules/word-learning.js'),{window,localStorage});
 const m=window.NERYXWordLearning;
 assert.match(m.feedback('112'),/Zuerst/);
 m.query('Jede Zahl wird mit zwei multipliziert | 7,14,28,56');
 assert.match(m.feedback('abbrechen'),/abgebrochen/);
 assert.equal(db.size,0);
 m.query('Jede Zahl wird mit zwei multipliziert | 7,14,28,56');
 m.feedback('112');
 const snapshot=db.get('neryx.learning.wordfeatures.v1');
 m.query('Jede Zahl wird mit zwei multipliziert | 7,14,28,56');
 assert.match(m.feedback('112'),/Bereits gespeichert/);
 assert.equal(db.get('neryx.learning.wordfeatures.v1'),snapshot);
});

test('Freier Dialog: Frage, Zahlenfolge und erlernte Sprachmuster',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 for(const path of ['modules/learning-lab.js','modules/word-learning.js','modules/conversation-math.js'])
  runInNewContext(read(path),{window,localStorage});
 const w=window.NERYXWordLearning,c=window.NERYXConversationMath;
 for(const example of ['Die Zahlen werden verdoppelt | 2,4,8,16,32',
  'Wir verdoppeln jede Zahl | 3,6,12,24,48',
  'Jede Zahl wird mit zwei multipliziert | 7,14,28,56,112',
  'Jede Zahl wird mit zwei multipliziert | 9,18,36,72,144'])w.teach(example);
 assert.match(c.respond('Was passiert, wenn ich jede Zahl mit zwei multipliziere?'),/brauche dazu eine konkrete Zahlenfolge/);
 assert.match(c.respond('11, 22, 44, 88'),/geometrisch → 176/);
 assert.match(c.respond('Wie geht die Folge weiter: 7, 14, 28, 56, wenn ich jede Zahl verdopple?'),/geometrisch → 112/);
 assert.equal(c.respond('Was ist ein Okapi?'),null);
 assert.equal(c.respond('Hallo'),null);
 assert.equal(c.respond('Was kommt als Nächstes: 2, 4, 8, 16?'),null);
 assert.ok(html.includes('src="modules/conversation-math.js"'));
 assert.ok(app.includes('NERYXConversationMath?.respond(s)'));
 assert.ok(app.indexOf('NERYXConversationMath?.respond(s)')<app.indexOf('if(context.awaiting)'));
 assert.equal(db.has('meinLernBot.v1'),false);
});
test('Freier Dialog: unbekannte Sprache durch geprüfte Zahlenantwort lernen',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 for(const path of ['modules/learning-lab.js','modules/word-learning.js','modules/conversation-math.js'])
  runInNewContext(read(path),{window,localStorage});
 const c=window.NERYXConversationMath,w=window.NERYXWordLearning;
 assert.match(c.respond('Wie geht die Folge weiter: 7, 14, 28, 56, wenn ich die Zahlen multipliziere?'),/Keine ausreichend sichere Wortzuordnung/);
 assert.match(c.respond('Die richtige Zahl ist 112'),/Beispiel gespeichert/);
 assert.match(c.respond('Wie geht die Folge weiter: 9, 18, 36, 72, wenn ich die Zahlen multipliziere?'),/Keine ausreichend sichere Wortzuordnung/);
 assert.match(c.respond('144'),/Beispiel gespeichert/);
 assert.match(c.respond('Wie geht die Folge weiter: 11, 22, 44, 88, wenn ich die Zahlen multipliziere?'),/geometrisch → 176/);
 const snapshot=db.get('neryx.learning.wordfeatures.v1');
 assert.equal(JSON.parse(snapshot).examples.length,2,'Nur zwei bestätigte Trainingsfolgen wurden gespeichert');
 assert.equal(c.respond('Hallo'),null);
 assert.equal(db.get('neryx.learning.wordfeatures.v1'),snapshot);
 assert.equal(db.has('meinLernBot.v1'),false);
 assert.match(w.status(),/Trainingsbeispiele: 2/);
});

test('Themenlernen: Lebensraum über neue Frageformulierung wiederfinden und dauerhaft speichern',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 runInNewContext(read('modules/topic-learning.js'),{window,localStorage});
 const l=window.NERYXTopicLearning;
 assert.match(l.ask('Wo lebt ein Okapi?'),/noch keine bestätigte Antwort/);
 assert.equal(db.size,0,'Unbestätigte Frage speichert nichts');
 assert.match(l.pendingReply('Antwort: Im Regenwald der Demokratischen Republik Kongo'),/Ja, speichern/);
 assert.equal(db.size,0,'Antwort ohne Einwilligung nicht speichern');
 assert.match(l.pendingReply('Ja, speichern'),/Themenwissen gespeichert/);
 assert.match(l.match('In welchem Lebensraum lebt das Okapi?'),/Im Regenwald der Demokratischen Republik Kongo/);
 assert.equal(db.has('meinLernBot.v1'),false);
 const loaded={};runInNewContext(read('modules/topic-learning.js'),{window:loaded,localStorage});
 assert.match(loaded.NERYXTopicLearning.match('Wo lebt das Okapi?'),/Im Regenwald/,'Neuladen erhält die Information');
 assert.ok(html.includes('src="modules/topic-learning.js"'));
 assert.ok(app.includes('NERYXTopicLearning?.pendingReply(s)'));
 assert.ok(app.includes('NERYXTopicLearning?.match(s)'));
});
test('Themenlernen: Fachgebiete und freie Fragen, aber keine ungeprüften Behauptungen',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 runInNewContext(read('modules/topic-learning.js'),{window,localStorage});
 const l=window.NERYXTopicLearning;
 assert.match(l.beginTeaching('Wozu dient Tiefgrund? => Zur Verfestigung saugender Untergründe'),/Ja, speichern/);
 assert.match(l.pendingReply('Abbrechen'),/abgebrochen/);
 assert.equal(db.size,0);
 l.beginTeaching('Wozu dient Tiefgrund? => Zur Verfestigung saugender Untergründe');
 assert.match(l.pendingReply('Ja speichern'),/gespeichert/);
 assert.match(l.match('Für was verwendet man Tiefgrund?'),/Zur Verfestigung/);
 l.ask('Warum ist der Himmel blau?');
 l.pendingReply('Antwort: Wegen der Streuung von Sonnenlicht');
 l.pendingReply('Ja, speichern');
 assert.match(l.match('Warum ist der Himmel blau?'),/Streuung/);
 assert.equal(l.match('Warum ist das Meer blau?'),null);
 assert.match(l.status(),/Gespeicherte bestätigte Einträge: 2/);
 assert.equal(db.has('meinLernBot.v1'),false);
});
test('Themenlernen: Konflikte nicht überschreiben, kritische Eingaben nicht speichern',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 runInNewContext(read('modules/topic-learning.js'),{window,localStorage});
 const l=window.NERYXTopicLearning;
 l.beginTeaching('Was ist Grundierung? => Ein vorbereitender Anstrich');
 l.pendingReply('Ja, speichern');
 const snap=db.get('neryx.learning.topics.v1');
 l.beginTeaching('Was ist Grundierung? => Eine Farbe zum Essen');
 assert.match(l.pendingReply('Ja, speichern'),/Abweichende Angabe/);
 assert.equal(db.get('neryx.learning.topics.v1'),snap,'Kein stilles Überschreiben');
 assert.match(l.beginTeaching('Heute ist Donnerstag => Hi'),/noch nicht sicher/);
 assert.equal(db.get('neryx.learning.topics.v1'),snap);
});

test('Lernzentrale: vorhandene Lernspeicher read-only zusammenfassen',()=>{
 const db=new Map([
  ['meinLernBot.v1',JSON.stringify({version:6,facts:[{subject:'Okapi',property:'lebensraum',value:'Wald',source:'user'}]})],
  ['neryx.learning.topics.v1',JSON.stringify({version:1,records:[{type:'lebensraum',subject:'okapi',answer:'Wald'}]})],
  ['neryx.learning.wordfeatures.v1',JSON.stringify({version:1,examples:[{phrase:'verdoppeln',type:'geometrisch'}]})],
  ['neryx.learning.context.v1',JSON.stringify({version:1,rules:{verdoppeln:{geometrisch:2}}})],
  ['neryx.learning.strategies.v1',JSON.stringify({version:1,feedback:3})],
  ['neryx.learning.auto.v1',JSON.stringify({version:1,trained:5})]
 ]),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 const snapshot=JSON.stringify([...db]);
 runInNewContext(read('modules/learning-hub.js'),{window,localStorage});
 const hub=window.NERYXLearningHub;
 assert.match(hub.report(),/Hauptwissen: 1 Fakten/);
 assert.match(hub.report(),/Themenlernen: 1 bestätigte Antworten/);
 assert.match(hub.report(),/Sprachlernen: 1 unterschiedliche Zahlenbeispiele/);
 assert.match(hub.report(),/Kontextlernen: 1 Hinweise/);
 assert.match(hub.report(),/Erkannte Wissenskonflikte: 0/);
 assert.match(hub.sources('Okapi'),/Herkunft: user/);
 assert.match(hub.sources('Okapi'),/Nutzer bestätigt, nicht extern geprüft/);
 assert.equal(JSON.stringify([...db]),snapshot,'Lernzentrale darf keine Daten verändern');
 assert.ok(html.includes('src="modules/learning-hub.js"'));
 assert.ok(app.includes("n==='lernzentrale'"));
 assert.ok(app.includes("n==='lernkonflikte'"));
});
test('Lernzentrale: abweichende Angaben aus unterschiedlichen Modulen melden ohne sie zu ändern',()=>{
 const db=new Map([
  ['meinLernBot.v1',JSON.stringify({facts:[{subject:'Testmaterial A',property:'zweck',value:'A',source:'user'}]})],
  ['neryx.learning.topics.v1',JSON.stringify({records:[{subject:'testmaterial a',type:'zweck',answer:'B'}]})]
 ]),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 const snapshot=JSON.stringify([...db]);
 runInNewContext(read('modules/learning-hub.js'),{window,localStorage});
 assert.match(window.NERYXLearningHub.conflictReport(),/testmaterial a \/ zweck/);
 assert.match(window.NERYXLearningHub.conflictReport(),/Hauptwissen \(user\): A/);
 assert.match(window.NERYXLearningHub.conflictReport(),/Themenlernen .*: B/);
 assert.equal(JSON.stringify([...db]),snapshot,'Keine Konfliktlösung ohne Nutzerauftrag');
});

test('Speicherabgleich unterscheidet fehlende Schlüssel, leere Daten und Sicherungen ohne zu schreiben',()=>{
 const db=new Map([
  ['meinLernBot.v1',JSON.stringify({version:6,facts:[]})],
  ['neryx.learning.topics.v1',JSON.stringify({version:1,records:[{subject:'testmaterial a',type:'zweck',answer:'Test'}]})],
  ['neryx.learning.wordfeatures.v1',JSON.stringify({version:1,examples:[{type:'geometrisch',phrase:'multipliziert'}]})],
  ['neryx.learning.auto.v1',JSON.stringify({version:1,trained:1})],
  ['meinLernBot.v1.sicherung.test.123','{}']
 ]),localStorage={
   getItem:k=>db.get(k)??null,
   setItem(){throw Error('Diagnostic must not write')},
   get length(){return db.size},
   key:i=>[...db.keys()][i]
 },window={};
 runInNewContext(read('modules/learning-hub.js'),{window,localStorage,location:{origin:'https://example.test',pathname:'/NERYX/'}});
 const x=window.NERYXLearningHub.diagnostic();
 assert.match(x,/Hauptwissen: 0 Einträge/);
 assert.match(x,/Themenlernen: 1 Einträge/);
 assert.match(x,/Sprachlernen: 1 Einträge/);
 assert.match(x,/Kontextlernen: KEIN SPEICHERSCHLÜSSEL/);
 assert.match(x,/Automatisches Mathe-Lernen: 1 Einträge\/Schritte/);
 assert.match(x,/Hauptwissen-Sicherungen in diesem Speicherbereich: 1/);
 assert.match(x,/https:\/\/example\.test\/NERYX\//);
 assert.ok(app.includes("n==='speicherabgleich'"));
});

test('Aktiver Lernkoordinator: zwei übereinstimmende Wissensquellen ohne Änderungen bündeln',()=>{
 const db=new Map([
  ['meinLernBot.v1',JSON.stringify({facts:[{subject:'Testmaterial A',property:'zweck',value:'Zum Testen',source:'user'}]})],
  ['neryx.learning.topics.v1',JSON.stringify({records:[{subject:'testmaterial a',type:'zweck',answer:'Zum Testen'}]})]
 ]), localStorage={getItem:k=>db.get(k)??null,setItem(){throw Error('Koordinator darf nichts schreiben')}},window={};
 const snapshot=JSON.stringify([...db]);
 for(const path of ['modules/topic-learning.js','modules/learning-hub.js','modules/learning-coordinator.js'])
  runInNewContext(read(path),{window,localStorage});
 const c=window.NERYXCoordinator;
 assert.match(c.decide('Wozu dient Testmaterial A?'),/KOORDINIERTE ANTWORT/);
 assert.match(c.decide('Für was verwendet man Testmaterial A?'),/Übereinstimmende gespeicherte Einträge: 2/);
 assert.equal(c.decide('Was ist eine Banane?'),null);
 assert.equal(JSON.stringify([...db]),snapshot);
 assert.ok(html.includes('src="modules/learning-coordinator.js"'));
 assert.ok(app.includes('NERYXCoordinator?.decide(s)'));
 assert.ok(app.includes("command(s,'Lernentscheidung')"));
});
test('Aktiver Lernkoordinator: widersprüchliche Aussagen aus zwei Quellen nicht als Wahrheit ausgeben',()=>{
 const db=new Map([
  ['meinLernBot.v1',JSON.stringify({facts:[{subject:'Okapi',property:'lebensraum',value:'Regenwald',source:'user'}]})],
  ['neryx.learning.topics.v1',JSON.stringify({records:[{subject:'okapi',type:'lebensraum',answer:'Savanne'}]})]
 ]), localStorage={getItem:k=>db.get(k)??null,setItem(){throw Error('Koordinator darf nichts schreiben')}},window={};
 const snapshot=JSON.stringify([...db]);
 for(const path of ['modules/topic-learning.js','modules/learning-hub.js','modules/learning-coordinator.js'])
  runInNewContext(read(path),{window,localStorage});
 const c=window.NERYXCoordinator;
 const reply=c.decide('In welchem Lebensraum lebt das Okapi?');
 assert.match(reply,/WISSENSKONFLIKT/);
 assert.match(reply,/Regenwald/);
 assert.match(reply,/Savanne/);
 assert.doesNotMatch(reply,/KOORDINIERTE ANTWORT/);
 assert.match(c.pendingReply('Abbrechen'),/abgebrochen/);
 assert.equal(JSON.stringify([...db]),snapshot);
});

test('Lernkontrolle: getrennte synthetische Prüfbeispiele und transparentes Ergebnis',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem(){throw Error('Nur-lesende Lernkontrolle')}},window={};
 for(const path of ['modules/learning-lab.js','modules/learning-evaluation.js','modules/learning-audit.js'])
  runInNewContext(read(path),{window,localStorage});
 const result=window.NERYXLearningAudit.synthetic();
 assert.equal(result.before.total,4);
 assert.equal(result.after.total,4);
 assert.equal(result.overlap,0);
 assert.equal(result.before.correct,0);
 assert.equal(result.after.correct,3);
 assert.equal(result.gain,3);
 assert.equal(result.after.answered,3);
 const missing=result.after.results.find(x=>x.phrase.includes('multiplizieren'));
 assert.equal(missing.predicted,null,'Nicht gelerntes Synonym darf nicht erraten werden');
 assert.match(window.NERYXLearningAudit.status(),/18\/36/);
 assert.equal(db.size,0,'Audit darf keine Daten in localStorage speichern');
 assert.ok(html.includes('src="modules/learning-audit.js"'));
 assert.ok(app.includes('NERYXLearningAudit?.status()'));
});
test('Lernkontrolle: retrospektive Prüfungen lassen ein Beispiel jeweils vollständig weg',()=>{
 const examples=[
  {phrase:'Zahlen werden verdoppelt',type:'geometrisch',tokens:['verdop'],fingerprint:'2,4,8,16,32'},
  {phrase:'Wir verdoppeln Zahlen',type:'geometrisch',tokens:['verdop'],fingerprint:'3,6,12,24,48'},
  {phrase:'Wir verdoppeln die Folge',type:'geometrisch',tokens:['verdop'],fingerprint:'5,10,20,40,80'}
 ];
 const db=new Map([['neryx.learning.wordfeatures.v1',JSON.stringify({version:1,examples})]]);
 const snapshot=JSON.stringify([...db]);
 const localStorage={getItem:k=>db.get(k)??null,setItem(){throw Error('Nur lesen')}},window={};
 runInNewContext(read('modules/learning-audit.js'),{window,localStorage});
 const outcome=window.NERYXLearningAudit.retrospective();
 assert.equal(outcome.total,3);
 assert.equal(outcome.correct,3);
 assert.equal(outcome.answered,3);
 assert.equal(JSON.stringify([...db]),snapshot,'Lernbeispiele dürfen nicht verändert werden');
});
test('Lernkontrolle: keine persönlichen Trainingsdaten erfinden',()=>{
 const localStorage={getItem:()=>null,setItem(){throw Error('Nur lesen')}},window={};
 runInNewContext(read('modules/learning-audit.js'),{window,localStorage});
 const r=window.NERYXLearningAudit.retrospective();
 assert.equal(r.total,0);
 assert.match(r.warning,/kein Sprachlern-Speicher/);
});

test('Bestätigte Bedeutungsbrücke erweitert Sprachlernen ohne bestehende Beispiele zu ändern',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 for(const path of ['modules/learning-lab.js','modules/meaning-links.js','modules/word-learning.js'])
  runInNewContext(read(path),{window,localStorage});
 const w=window.NERYXWordLearning,m=window.NERYXMeanings;
 w.teach('Die Zahlen werden verdoppelt | 2,4,8,16,32');
 w.teach('Wir verdoppeln jede Zahl | 3,6,12,24,48');
 const old=db.get('neryx.learning.wordfeatures.v1');
 assert.match(w.query('Mit zwei multiplizieren | 5,10,20,40'),/Keine ausreichend sichere Wortzuordnung/);
 assert.match(m.propose('mit zwei multiplizieren = verdoppeln'),/Ja, Bedeutung speichern/);
 assert.equal(db.get('neryx.learning.meanings.v1'),undefined,'Nur Vorschlag darf nichts schreiben');
 assert.match(m.reply('Ja, Bedeutung speichern'),/gespeichert/);
 assert.match(w.query('Mit zwei multiplizieren | 5,10,20,40'),/geometrisch → 80/);
 assert.match(w.query('Nicht mit zwei multiplizieren | 5,10,20,40'),/Keine ausreichend sichere Wortzuordnung/);
 assert.equal(db.get('neryx.learning.wordfeatures.v1'),old,'Alte Lernbeispiele dürfen nicht überschrieben werden');
 assert.ok(html.includes('src="modules/meaning-links.js"'));
 assert.ok(app.includes("command(s,'Bedeutung lernen')"));
});
test('Bedeutungsbrücke: Bestätigung erforderlich und widersprüchliche Verknüpfungen werden abgewehrt',()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))},window={};
 runInNewContext(read('modules/meaning-links.js'),{window,localStorage});
 const m=window.NERYXMeanings;
 m.propose('mit zwei multiplizieren = verdoppeln');
 assert.match(m.reply('Bedeutung abbrechen'),/abgebrochen/);
 assert.equal(db.size,0);
 m.propose('mit zwei multiplizieren = verdoppeln');
 m.reply('Ja, Bedeutung speichern');
 const before=db.get('neryx.learning.meanings.v1');
 assert.match(m.propose('mit zwei multiplizieren = addieren'),/andere Zuordnung/);
 assert.equal(db.get('neryx.learning.meanings.v1'),before);
});
test('Bedeutungstest nutzt feste getrennte Beispiele und prüft auch Nicht-Erkennen',()=>{
 const db=new Map(),localStorage={getItem(){throw Error('Benchmark darf keinen Speicher lesen')},setItem(){throw Error('Benchmark darf nicht speichern')}},window={};
 runInNewContext(read('modules/meaning-benchmark.js'),{window,localStorage});
 const x=window.NERYXMeaningBenchmark.run();
 assert.equal(x.training,8);
 assert.equal(x.holdout,24);
 assert.equal(x.before.correct,16);
 assert.equal(x.after.correct,19);
 assert.ok(x.after.answered<=24);
 assert.match(window.NERYXMeaningBenchmark.report(),/festgelegte Prüfphrasen: 24/);
 assert.ok(html.includes('src="modules/meaning-benchmark.js"'));
});

test('Stapeltest: sichere Zeilen werden nacheinander ausgeführt und Bericht geordnet',async()=>{
 const window={};
 runInNewContext(read('modules/batch-test.js'),{window});
 const input='Stapeltest:\nBedeutung lernen: mal zwei nehmen = verdoppeln\nJa, Bedeutung speichern\nBedeutungstest';
 const log=[],result=await window.NERYXBatch.run(input,async line=>{log.push(line);return 'OK '+line});
 assert.equal(log.join('|'),'Bedeutung lernen: mal zwei nehmen = verdoppeln|Ja, Bedeutung speichern|Bedeutungstest');
 assert.match(result,/Befehle: 3/);
 assert.match(result,/3\. Bedeutungstest/);
 assert.ok(html.includes('src="modules/batch-test.js"'));
 assert.ok(app.includes('NERYXBatch?.isBatch(s)'));
});
test('Stapeltest: ungültige Befehle und isolierte Bestätigungen führen nichts aus',async()=>{
 const window={};
 runInNewContext(read('modules/batch-test.js'),{window});
 let calls=0;
 const act=async()=>{calls++;return 'OK'};
 const bad=await window.NERYXBatch.run('Stapeltest:\nBedeutungstest\nFakt löschen: Test: Zweck',act);
 assert.match(bad,/ABGELEHNT/);
 const confirm=await window.NERYXBatch.run('Stapeltest:\nJa, Bedeutung speichern\nBedeutungstest',act);
 assert.match(confirm,/ohne vorangehenden/);
 assert.equal(calls,0);
 assert.equal(window.NERYXBatch.isBatch('Hallo!\nWie geht es dir?'),false);
 assert.equal(window.NERYXBatch.isBatch('Lerne: A: B – C'),false);
});

test('Mehrzeilige Stapeltests bleiben im echten Chat-Eingabefeld erhalten',()=>{
 assert.match(html,/<textarea\s+id="input"[\s\S]*?<\/textarea>/);
 assert.doesNotMatch(html,/<input\s+id="input"/);
 assert.match(app,/bind\(UI\.input\(\),'keydown',e=>\{if\(e\.key==='Enter'&&!e\.shiftKey/);
 assert.match(app,/const s=safe\(input\.value,100000\)/);
 const window={};
 runInNewContext(read('modules/batch-test.js'),{window});
 const message=['Stapeltest:','Beispiel prüfen: Die Werte mal zwei nehmen | 5,10,20,40',
  'Bedeutung lernen: mal zwei nehmen = verdoppeln','Ja, Bedeutung speichern',
  'Beispiel prüfen: Die Werte mal zwei nehmen | 5,10,20,40','Bedeutungstest'].join('\n');
 const result=window.NERYXBatch.parse(message);
 assert.equal(result.lines.length,5);
});

test('Persönlicher Lerntest: feste unbekannte Prüfphrasen und kein erfundener Fortschritt',()=>{
 const db=new Map();
 const localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v)),removeItem:k=>db.delete(k)},window={};
 for(const path of ['modules/learning-lab.js','modules/meaning-links.js','modules/word-learning.js','modules/personal-learning-test.js'])
  runInNewContext(read(path),{window,localStorage});
 const p=window.NERYXPersonalTest;
 assert.match(p.start(),/Zurückgehaltene Prüfphrasen: 12/);
 assert.match(p.start(),/läuft bereits/);
 assert.match(p.finish(),/keine Änderungen/);
 assert.ok(db.has('neryx.learning.personaltest.v1'));
 assert.match(p.cancel(),/Keine Lernbeispiele/);
 assert.equal(db.size,0);
 assert.ok(html.includes('src="modules/personal-learning-test.js"'));
 assert.ok(app.includes('NERYXPersonalTest?.finish()'));
});
test('Persönlicher Lerntest: echte Trainingsänderung auswerten, nur Prüfzustand entfernen',()=>{
 const db=new Map();
 const localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v)),removeItem:k=>db.delete(k)},window={};
 for(const path of ['modules/learning-lab.js','modules/meaning-links.js','modules/word-learning.js','modules/personal-learning-test.js'])
  runInNewContext(read(path),{window,localStorage});
 const p=window.NERYXPersonalTest;
 p.start();
 const train=window.NERYXWordLearning.teach('Wir lernen jede Zahl verdoppeln | 2,4,8,16,32');
 assert.match(train,/Beispiel gespeichert/);
 const out=p.finish();
 assert.match(out,/PERSÖNLICHER LERNFORTSCHRITT/);
 assert.match(out,/Sprachbeispiele: 0 → 1/);
 assert.equal(db.has('neryx.learning.personaltest.v1'),false);
 assert.equal(JSON.parse(db.get('neryx.learning.wordfeatures.v1')).examples.length,1);
});
test('Persönlicher Lerntest: direkt trainierte Prüfphrase nicht als neue Leistung zählen',()=>{
 const db=new Map();
 const localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v)),removeItem:k=>db.delete(k)},window={};
 for(const path of ['modules/learning-lab.js','modules/meaning-links.js','modules/word-learning.js','modules/personal-learning-test.js'])
  runInNewContext(read(path),{window,localStorage});
 const p=window.NERYXPersonalTest;
 p.start();
 window.NERYXWordLearning.teach('Die Folge wird jedes Mal verdoppelt | 2,4,8,16,32');
 const out=p.finish();
 assert.match(out,/Prüfphrasen: 11 \| wegen direktem Training ausgeschlossen: 1/);
});

test('Stapeltest: persönliche Vorher-Nachher-Prüfung mit zwei unterschiedlichen Übungsbeispielen',async()=>{
 const db=new Map(),localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v)),removeItem:k=>db.delete(k)},window={};
 for(const path of ['modules/learning-lab.js','modules/meaning-links.js','modules/word-learning.js','modules/personal-learning-test.js','modules/batch-test.js'])
  runInNewContext(read(path),{window,localStorage});
 const input=['Stapeltest:','Persönlichen Lerntest starten',
  'Beispiel lernen: Wir erhöhen die Zahl um fünf | 2,7,12,17,22',
  'Beispiel lernen: Die Zahl wird jeweils um fünf erhöht | 4,9,14,19,24',
  'Persönlichen Lerntest auswerten'].join('\n');
 const b=window.NERYXBatch,model=window.NERYXWordLearning,p=window.NERYXPersonalTest;
 assert.equal(b.parse(input).lines.length,4);
 const output=await b.run(input,async line=>
  line==='Persönlichen Lerntest starten'?p.start():
  line==='Persönlichen Lerntest auswerten'?p.finish():
  model.teach(line.slice('Beispiel lernen:'.length)));
 assert.match(output,/Vorher richtig: 0\/12/);
 assert.match(output,/Nachher richtig: 2\/12/);
 assert.match(output,/Veränderung: \+2 richtige Zuordnungen/);
 assert.equal(db.has('neryx.learning.personaltest.v1'),false);
 assert.equal(JSON.parse(db.get('neryx.learning.wordfeatures.v1')).examples.length,2);
});

test('Systemzentrale: aktive Problemoperatoren lösen Regeln, Folgen und Raster',()=>{
 const window={};
 for(const file of ['modules/neryx-reasoner.js','modules/rule-patterns.js','modules/capability-test.js','modules/system-hub.js'])
  runInNewContext(read(file),{window});
 const center=window.NERYXSystem;
 assert.match(center.solve('2=5, 4=9; 7'),/y = 15/);
 assert.match(center.solve('2, 4, 8, 16'),/32/);
 assert.match(center.route('000;010;000'),/Schritte: 4/);
 assert.match(center.route('010;111;010'),/Kein freier Weg/);
 assert.match(center.solve('fremdes Problem'),/noch keinen überprüften Lösungsweg/);
 assert.match(center.report(),/SYSTEMZENTRALE/);
 const rule=window.NERYXCapabilityTest.benchmark(123456).domains.rule;
 assert.equal(rule.correct,12);
 assert.equal(rule.total,12);
 assert.ok(html.includes('src="modules/system-hub.js"'));
 assert.ok(app.includes('NERYXSystem?.report()'));
 assert.ok(app.includes('NERYXSystem?.solve(v)'));
 assert.ok(app.includes('NERYXSystem?.route(v)'));
});
test('Sprachmodell-Bridge: Opt-in, kein automatischer Download bei Start und kein ungeprüfter Auto-Modus',async()=>{
 let reads=0,writes=0;
 const window={},navigator={gpu:null},document={baseURI:'https://example.test/Mein-lernbot/',currentScript:{src:'https://example.test/Mein-lernbot/modules/local-model-bridge.js'}};
 runInNewContext(read('modules/local-model-bridge.js'),{window,navigator,document,URL});
 const model=window.NERYXLocalModel;
 assert.equal(model.info().loaded,false);
 assert.equal(model.info().automatic,false);
 assert.match(model.status(),/nicht geladen/);
 assert.match(model.mode(true),/Erst das lokale Sprachmodell/);
 assert.equal(model.shouldFallback('Dazu habe ich keine Antwort'),false);
 assert.match(await model.ask('Was ist ein Okapi?'),/nicht automatisch geladen werden[\s\S]*WebGPU/);
 assert.equal(model.info().loaded,false,'Kein geladenes Modell ohne WebGPU');
 assert.equal(model.info().automatic,false,'Keine unbeabsichtigte Auto-Aktivierung');
 assert.match(await model.load(),/WebGPU/);
 assert.match(model.unload(),/getrennt/);
 assert.equal(reads+writes,0);
 assert.ok(html.includes('src="modules/local-model-bridge.js"'));
 assert.ok(app.includes('NERYXLocalModel?.load()'));
 assert.ok(app.includes('NERYXLocalModel?.ask(v)'));
});
test('Sprachmodell lädt Modellscripte erst bei einem Ladeaufruf',()=>{
 const source=read('modules/local-model-bridge.js');
 assert.match(source,/async function load\(/);
 assert.match(source,/import\(new URL\('client.js',prototypeURL\)\.href\)/);
 assert.match(source,/document\.currentScript\?\.src/);
 assert.doesNotMatch(source,/localStorage\.setItem/);
 assert.match(app,/async function routeAnswer\(/);
 assert.match(app,/return engine\.solve\(s,\{knowledge:intelligentAnswer\}\)/);
 assert.doesNotMatch(app,/NERYXLocalModel\?\.shouldFallback\(original\)/);
});



test('Sprachmodell wird nur bei ungeklärter Online-Frage nachgeladen; lokale Antwort und Offline sperren Download',async()=>{
 const window={};let loads=0,asks=0,loaded=false,knowledgeCalls=0;
 const navigator={onLine:true};
 runInNewContext(read('modules/orchestrator.js'),{window,navigator});
 window.NERYXLocalModel={
  info:()=>({loaded}),
  load:async()=>{loads++;loaded=true;return 'geladen'},
  askRaw:async()=>{asks++;return 'Ein überprüfbares Beispiel erläutert die Frage verständlich und vorsichtig.'}
 };
 const solve=window.NERYXOrchestrator.solve;
 assert.equal(loads,0,'keine Modellladung beim Initialisieren');
 assert.match(await solve('Moin'),/Moin!/);
 assert.equal(await solve('Was ist ein Okapi?',{knowledge:async()=>{knowledgeCalls++;return 'Ein Okapi ist ein Säugetier.';}}),'Ein Okapi ist ein Säugetier.');
 assert.equal(loads,0,'lokales Wissen darf keinen Download auslösen');
 navigator.onLine=false;
 assert.match(await solve('Eine unbekannte Testfrage',{knowledge:async()=>null}),/OFFLINE/);
 assert.equal(loads,0,'offline keine Modellladung');
 navigator.onLine=true;
 assert.match(await solve('Eine unbekannte Testfrage',{knowledge:async()=>null}),/LOKALES SPRACHMODELL \(unverifiziert\)/);
 assert.equal(loads,1,'Online-Fallback lädt erst bei unbekannter Frage');
 assert.equal(asks,1);
 assert.equal(knowledgeCalls,1);
});

test('Systemdiagnose im Stapel: alle Prüfungen ohne Sprachmodell-Download nacheinander ausführbar',async()=>{
 const window={};
 for(const file of ['modules/neryx-reasoner.js','modules/rule-patterns.js','modules/capability-test.js','modules/system-hub.js','modules/batch-test.js'])
  runInNewContext(read(file),{window});
 const input=['Stapeltest:','Systemstatus','Problem lösen: 2=5, 4=9; 7',
 'Problem lösen: 2, 4, 8, 16','Weg planen: 000;010;000','Fähigkeitstest','Sprachmodell Status'].join('\n');
 const parsed=window.NERYXBatch.parse(input);
 assert.equal(parsed.lines.length,6);
 const output=await window.NERYXBatch.run(input,async line=>{
  if(line==='Systemstatus')return window.NERYXSystem.report();
  if(line.startsWith('Problem lösen:'))return window.NERYXSystem.solve(line.slice('Problem lösen:'.length));
  if(line.startsWith('Weg planen:'))return window.NERYXSystem.route(line.slice('Weg planen:'.length));
  if(line==='Fähigkeitstest')return window.NERYXCapabilityTest.report();
  return 'nicht geladen';
 });
 assert.match(output,/Befehle: 6/);
 assert.match(output,/y = 15/);
 assert.match(output,/Mögliche nächste Zahl: 32/);
 assert.match(output,/Schritte: 4/);
 assert.match(output,/FÄHIGKEITSTEST/);
 assert.match(output,/Sprachmodell Status/);
});

test('Rechenprüfer erkennt die Malerfrage und verlangt klare Maße',()=>{
 const window={};
 runInNewContext(read('modules/math-verifier.js'),{window});
 const verifier=window.NERYXMathVerifier;
 const q='Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 5 Meter breit und 2,5 Meter hoch. Wie viele Quadratmeter Wandfläche muss er insgesamt streichen?';
 const exact=verifier.wallArea(q);
 assert.equal(exact.rooms,3);
 assert.equal(exact.walls,4);
 assert.equal(exact.total,150);
 assert.match(verifier.solve(q),/Ergebnis: 150 m²/);
 assert.match(verifier.solve(q.replace('3 Räume','2 Räume')),/Ergebnis: 100 m²/);
 assert.match(verifier.solve(q.replace('Jede Wand','Die Wand')),/nicht eindeutig/);
 assert.match(verifier.solve(q.replace('Jede Wand','Die Wand')+' Jeweils vier Wände sind vorhanden.'),/nicht eindeutig/,'Anzahl pro Raum ist keine Flächen-Gleichheit');
 assert.match(verifier.solve(q.replace('Jede Wand','Alle Wände sind gleich groß. Die Wand')),/Ergebnis: 150 m²/,'Explizite Gleichheit erlaubt Rechnung');
 assert.match(verifier.solve(q+' Fenster abziehen.'),/fehlen hier überprüfbare Angaben/);
 assert.equal(verifier.solve('Was ist ein Okapi?'),null);
});
test('Verifizierte Wandfläche kommt im Hauptchat und KI-Brücke vor ungeprüfter Generierung',async()=>{
 assert.match(app,/const arithmetic=window\.NERYXMathVerifier\?\.solve\(s\);if\(arithmetic\)return arithmetic/);
 assert.match(app,/NERYXMathVerifier\?\.solve\(v\)/);
 const bridge=read('modules/local-model-bridge.js');
 assert.match(bridge,/const verified=window\.NERYXMathVerifier\?\.solve\(s\)/);
 const isolated={};let verifiedCalls=0;
 const noGpu={gpu:null},doc={baseURI:'https://example.test/Mein-lernbot/',currentScript:{src:'https://example.test/Mein-lernbot/modules/local-model-bridge.js'}};
 runInNewContext(read('modules/math-verifier.js'),{window:isolated});
 const realVerifier=isolated.NERYXMathVerifier;
 isolated.NERYXMathVerifier={solve(s){verifiedCalls++;return realVerifier.solve(s)}};
 runInNewContext(bridge,{window:isolated,navigator:noGpu,document:doc,URL});
 const q='Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 5 Meter breit und 2,5 Meter hoch. Wie viel Wandfläche ist zu streichen?';
 const wall=await isolated.NERYXLocalModel.ask(q);
 assert.match(wall,/Ergebnis: 150 m²/);
 assert.doesNotMatch(wall,/LOKALES SPRACHMODELL|WebGPU/);
 assert.equal(verifiedCalls,1,'Bridge fragt zuerst den verifizierten Rechenkern');
 assert.equal(isolated.NERYXLocalModel.info().loaded,false,'Keine Modellladung bei geprüfter Wandfläche');
 assert.equal(isolated.NERYXLocalModel.info().connecting,false,'Kein Download für eine geprüfte Wandfläche');
 assert.match(html, /src="modules\/math-verifier\.js"/);
 assert.match(read('modules/system-hub.js'),/NERYXMathVerifier/);
});

test('Gemeinsame NERYX-KI priorisiert Rechenkern, lokales Wissen, danach optional Qwen', async () => {
 const window={};
 for(const name of ['modules/neryx-reasoner.js','modules/rule-patterns.js','modules/math-verifier.js','modules/system-hub.js','modules/orchestrator.js'])
  runInNewContext(read(name),{window});
 let modelCalls=0, knowledgeCalls=0;
 window.NERYXLocalModel={
  info:()=>({loaded:true}),
  ask:async()=>{modelCalls++;return 'NERYX · LOKALES SPRACHMODELL (unverifiziert)\nModellantwort';}
 };
 const system=window.NERYXOrchestrator;
 const question='Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 5 Meter breit und 2,5 Meter hoch. Wie viel Wandfläche ist zu streichen?';
 assert.match(await system.solve(question,{knowledge:async()=>{knowledgeCalls++;return 'falsch';}}),/Ergebnis: 150 m²/);
 assert.match(await system.solve('2=5, 4=9; 7'),/y = 15/);
 assert.match(await system.solve('2,4,8,16'),/32/);
 assert.equal(modelCalls,0);
 assert.equal(knowledgeCalls,0);
 assert.equal(await system.solve('Was ist ein Okapi?',{knowledge:async()=>{knowledgeCalls++;return 'Das Okapi ist ein Säugetier.';}}),'Das Okapi ist ein Säugetier.');
 assert.equal(modelCalls,0);
 const related=await system.solve('Was bedeutet die fremde Formulierung?',{knowledge:async()=> 'VERWANDTES WISSEN\nMars: Planet'});
 assert.match(related,/VERWANDTES WISSEN/);
 assert.match(related,/keine sichere Antwort/);
 assert.match(related,/KI fragen:/);
 assert.doesNotMatch(related,/LOKALES SPRACHMODELL/);
 assert.equal(modelCalls,0,'verwandte Fakten dürfen keinen Modellstart auslösen');
 assert.match(system.status(),/GEMEINSAMES KI-SYSTEM/);
 assert.match(app,/async function routeAnswer\(/);
 assert.match(app,/return engine\.solve\(s,\{knowledge:intelligentAnswer\}\)/);
 assert.match(html,/src="modules\/orchestrator\.js"/);
});
test('Gemeinsame NERYX-KI verlangt lokales Modell bei unbekannten Fragen und verändert keine Speicher',async()=>{
 const window={},localStorage={getItem(){throw Error('Nicht lesen!')},setItem(){throw Error('Nicht schreiben!')}};
 runInNewContext(read('modules/orchestrator.js'),{window,localStorage});
 assert.match(await window.NERYXOrchestrator.solve('Kannst du ein neues Problem lösen?'),/Kein Sprachmodell verfügbar/);
 assert.equal(window.NERYXOrchestrator.plan('').type,'invalid');
});
test('Stapeltest erlaubt Gesamt-KI-Diagnose und definierte Problembefehle',()=>{
 const window={};
 runInNewContext(read('modules/batch-test.js'),{window});
 const input=['Stapeltest:','KI-Systemstatus','NERYX lösen: 2=5, 4=9; 7','NERYX lösen: 2,4,8,16'].join('\n');
 assert.equal(window.NERYXBatch.parse(input).lines.length,3);
 assert.equal(window.NERYXBatch.parse('Stapeltest:\nKI-Systemstatus\nFakt löschen: Mars: Größe').error.includes('kein erlaubter'),true);
});

test('Gesamt-KI 2.0: natürliche Zahlenfolge wird deterministisch erkannt',async()=>{
 const window={};
 for(const name of ['modules/neryx-reasoner.js','modules/rule-patterns.js','modules/math-verifier.js','modules/system-hub.js','modules/orchestrator.js'])
  runInNewContext(read(name),{window});
 let modelCalls=0;
 window.NERYXLocalModel={info:()=>({loaded:true}),askRaw:async()=>{modelCalls++;return '5';}};
 const result=await window.NERYXOrchestrator.solve('Setze die Folge 2,4,8,16 fort');
 assert.match(result,/32/);
 assert.equal(modelCalls,0);
 assert.match(window.NERYXOrchestrator.status(),/GEMEINSAMES KI-SYSTEM 2\.0/);
});
test('Gesamt-KI 2.0: Modell darf nur originale und erlaubte Werkzeuge ausführen',async()=>{
 const window={};
 for(const name of ['modules/neryx-reasoner.js','modules/rule-patterns.js','modules/math-verifier.js','modules/system-hub.js','modules/orchestrator.js'])
  runInNewContext(read(name),{window});
 const system=window.NERYXOrchestrator;
 const input='Bitte analysiere diese Werte: 2,4,8,16.';
 assert.equal(system.modelSelection('WERKZEUG: folge | 9,18,27,36',input).rejected,true);
 assert.equal(system.modelSelection('WERKZEUG: löschen | alles',input),null);
 assert.equal(system.modelSelection('WERKZEUG: wand | ORIGINAL',input).rejected,true);
 assert.equal(system.modelSelection('WERKZEUG: regel | 2=5, 4=9; 7',input).rejected,true);
 assert.equal(system.modelSelection('WERKZEUG: folge | 2,4,8,16',input).type,'sequence');
 const runs=[];
 window.NERYXLocalModel={
  info:()=>({loaded:true}),
  askRaw:async prompt=>{runs.push(prompt);return 'WERKZEUG: folge | 9,18,27,36';}
 };
 const rejected=await system.solve('Bitte beachte die Werte 2,4,8,16.',{knowledge:async()=>null});
 assert.match(rejected,/unzulässigen Werkzeugaufruf/);
 assert.equal(runs.length,1);
 assert.equal(system.modelSelection('WERKZEUG: weg | 000;010;000','Raster 000;010;000').type,'grid');
});
test('Gesamt-KI 2.0: Modell-Erklärung ist ungeprüft; Fachberechnungen haben Vorrang',async()=>{
 const window={};
 for(const name of ['modules/neryx-reasoner.js','modules/rule-patterns.js','modules/math-verifier.js','modules/system-hub.js','modules/orchestrator.js'])
  runInNewContext(read(name),{window});
 let calls=0,reply='Das ist eine kurze Erklärung.';
 window.NERYXLocalModel={info:()=>({loaded:true}),askRaw:async()=>{calls++;return reply;}};
 const orchestrator=window.NERYXOrchestrator;
 const area='Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 5 Meter breit und 2,5 Meter hoch.';
 assert.match(await orchestrator.solve(area),/Ergebnis: 150 m²/);
 assert.equal(calls,0,'Eine geprüfte Wandfläche darf keinen Modellaufruf auslösen');
 const question='Erkläre den Unterschied zwischen Theorie und Hypothese.';
 const rejected=await orchestrator.solve(question,{knowledge:async()=>null});
 assert.match(rejected,/ANTWORTKONTROLLE/);
 assert.match(rejected,/keine ausreichende Erklärung/);
 assert.doesNotMatch(rejected,/LOKALES SPRACHMODELL \(unverifiziert\)/);
 assert.equal(calls,2,'Unzureichende Antwort wird einmal nachgebessert und dann zurückgewiesen');
 reply='Eine Theorie ist eine umfassendere wissenschaftliche Erklärung, die viele Beobachtungen zusammenfasst. Eine Hypothese ist dagegen eine konkrete, überprüfbare Annahme, die man mit Messungen testen kann. Beispielsweise kann ein Maler zunächst vermuten, dass eine Grundierung die Haftung verbessert; anschließend vergleicht er zwei Testflächen.';
 const explained=await orchestrator.solve(question,{knowledge:async()=>null});
 assert.match(explained,/LOKALES SPRACHMODELL \(unverifiziert\)/);
 assert.match(explained,/nicht unabhängig überprüft/);
 assert.equal(calls,3,'Ausreichende Antwort braucht keinen zweiten Versuch');
 assert.match(await orchestrator.solve('Was ist ein Okapi?',{knowledge:async()=> 'Ein Säugetier.'}),/Säugetier/);
 assert.equal(calls,3,'Bekanntes lokales Wissen hat vor dem Modell Vorrang');
});
test('Modellwechsel 0,5B zu 1,5B ist explizit und lädt kein Modell automatisch',()=>{
 const window={},navigator={gpu:{}},
  document={baseURI:'https://example.test/Mein-lernbot/',currentScript:{src:'https://example.test/Mein-lernbot/modules/local-model-bridge.js'}};
 runInNewContext(read('modules/local-model-bridge.js'),{window,navigator,document,URL});
 const model=window.NERYXLocalModel;
 assert.equal(model.info().loaded,false);
 assert.match(model.selectModel('1,5B'),/1,5B/);
 assert.match(model.status(),/1,5B/);
 assert.equal(model.info().loaded,false);
 assert.match(model.selectModel('0,5B'),/0,5B/);
 assert.match(model.selectModel('7B'),/Nur 0,5B oder 1,5B/);
 assert.match(read('evolution/neryx/client.js'),/selectModel\(model\)/);
 assert.match(read('evolution/neryx/app.js'),/SET_MODEL/);
 assert.match(app,/NERYXLocalModel\?\.selectModel\(v\)/);
});

test('Gesamt-KI: irrelevante gespeicherte Dokumententreffer dürfen Qwen nicht blockieren',async()=>{
 const window={};let calls=0;
 runInNewContext(read('modules/orchestrator.js'),{window});
 window.NERYXLocalModel={info:()=>({loaded:true}),askRaw:async()=>{calls++;return 'Eine Hypothese ist eine prüfbare Annahme.';}};
 const original='IN GESPEICHERTEN DOKUMENTEN:\n• Saturn: definition – Der Saturn ist der sechste Planet unseres Sonnensystems.\nQuelle: Lerninhalt: Saturn';
 const question='Erkläre mir den Unterschied zwischen einer Hypothese und einer Messung anhand eines Beispiels aus dem Malerhandwerk.';
 const answer=await window.NERYXOrchestrator.solve(question,{knowledge:async()=>original});
 assert.equal(calls,1);
 assert.match(answer,/LOKALES SPRACHMODELL \(unverifiziert\)/);
 assert.doesNotMatch(answer,/Saturn/);
 const noModel={info:()=>({loaded:false})};
 window.NERYXLocalModel=noModel;
 const fallback=await window.NERYXOrchestrator.solve(question,{knowledge:async()=>original});
 assert.match(fallback,/Kein Sprachmodell verfügbar/);
 assert.doesNotMatch(fallback,/Saturn/);
});

test('Lazy Loading: Wissens- und Rechenantworten starten Qwen nicht',async()=>{
 const window={};let loads=0,calls=0;
 for(const path of ['modules/neryx-reasoner.js','modules/rule-patterns.js','modules/math-verifier.js','modules/system-hub.js','modules/orchestrator.js'])runInNewContext(read(path),{window});
 window.NERYXLocalModel={
  info:()=>({loaded:false}),load:async()=>{loads++;return 'geladen'},
  askRaw:async()=>{calls++;return 'Modellantwort'}
 };
 assert.match(await window.NERYXOrchestrator.solve('2,4,8,16'),/32/);
 assert.match(await window.NERYXOrchestrator.solve('Was ist ein Okapi?',{knowledge:async()=> 'Das Okapi ist ein Säugetier.'}),/Säugetier/);
 assert.equal(loads,0);
 assert.equal(calls,0);
});
test('Lazy Loading: unbekannte Frage startet Qwen erst bei Anfrage und ruft es danach auf',async()=>{
 const window={};let loaded=false,loads=0,calls=0;
 runInNewContext(read('modules/orchestrator.js'),{window});
 window.NERYXLocalModel={
  info:()=>({loaded}),load:async()=>{loads++;loaded=true;return 'geladen'},
  askRaw:async()=>{calls++;return 'Die Messung liefert einen beobachteten Wert.'}
 };
 const solve=window.NERYXOrchestrator.solve;
 const q='Was ist der Unterschied zwischen einer Hypothese und einer Messung?';
 assert.equal(loads,0);
 const r=await solve(q,{knowledge:async()=> 'IN GESPEICHERTEN DOKUMENTEN:\n• Saturn'});
 assert.match(r,/LOKALES SPRACHMODELL \(unverifiziert\)/);
 assert.equal(loads,1);
 assert.equal(calls,1);
 await solve('Erkläre das noch genauer.',{knowledge:async()=>null});
 assert.equal(loads,1);
 assert.equal(calls,2);
});
test('Lazy Loading: beim Fehlschlag bleibt die lokale KI nutzbar',async()=>{
 const window={};let loads=0;
 runInNewContext(read('modules/orchestrator.js'),{window});
 window.NERYXLocalModel={info:()=>({loaded:false}),load:async()=>{loads++;return 'WebGPU nicht verfügbar'}};
 assert.match(await window.NERYXOrchestrator.solve('Erkläre mir Physik.',{knowledge:async()=>null}),/Automatischer Modellstart fehlgeschlagen/);
 assert.equal(loads,1);
});

test('Antwortkontrolle: freie Frage verwendet keinen verwirrenden Werkzeug-Prompt und korrigiert eine unvollständige Qwen-Antwort',async()=>{
 const window={},prompts=[];let calls=0;
 runInNewContext(read('modules/orchestrator.js'),{window});
 window.NERYXLocalModel={
  info:()=>({loaded:true}),
  askRaw:async q=>{
   prompts.push(q);calls++;
   return calls===1?'Wähle eine Messung anhand eines Beispiels!':
    'Eine Hypothese ist eine überprüfbare Vermutung. Eine Messung liefert überprüfbare Werte. Als Beispiel kann man die Wasseraufnahme einer Wand messen.';
  }
 };
 const q='Erkläre mir den Unterschied zwischen einer Hypothese und einer Messung anhand eines Beispiels aus dem Malerhandwerk.';
 const result=await window.NERYXOrchestrator.solve(q,{knowledge:async()=>null});
 assert.equal(calls,2);
 assert.doesNotMatch(prompts[0],/WERKZEUG:/);
 assert.match(result,/Hypothese ist eine überprüfbare Vermutung/);
 assert.match(result,/unverifiziert/);
});
test('Antwortkontrolle: zweimal schlechte Antwort wird nicht als Erklärung ausgegeben',async()=>{
 const window={};let calls=0;
 runInNewContext(read('modules/orchestrator.js'),{window});
 window.NERYXLocalModel={info:()=>({loaded:true}),askRaw:async()=>{calls++;return 'Wähle eine Messung anhand eines Beispiels!';}};
 const answer=await window.NERYXOrchestrator.solve('Erkläre eine Hypothese.',{knowledge:async()=>null});
 assert.equal(calls,2);
 assert.match(answer,/keine ausreichende Erklärung/);
 assert.doesNotMatch(answer,/LOKALES SPRACHMODELL \(unverifiziert\)/);
});

test('Antwortkontrolle erkennt angefragte Beispiele, Malerbezug und Schrittabfolge ohne Speicherschreiben',()=>{
 const window={},localStorage={getItem(){throw Error('Keine Speicherzugriffe!')},setItem(){throw Error('Keine Speicherzugriffe!')}};
 runInNewContext(read('modules/answer-review.js'),{window,localStorage});
 const review=window.NERYXAnswerReview;
 const q='Erkläre den Unterschied zwischen einer Hypothese und einer Messung anhand eines Beispiels aus dem Malerhandwerk.';
 const raw='Eine Hypothese ist eine überprüfbare Vermutung. Eine Messung liefert Zahlen und Daten.';
 assert.deepEqual([...review.inspect(q,raw).missing].sort(),['Bezug zum Malerhandwerk','konkret gekennzeichnetes Beispiel'].sort());
 const valid='Hypothese: Die Grundierung senkt die Wasseraufnahme einer Wand. Messung: Wir messen das Wasser an der Wand. Beispiel: Mit und ohne Tiefgrund vergleichen.';
 assert.equal(review.inspect(q,valid).complete,true);
 assert.equal(review.inspect('Schreibe eine Erklärung.',raw).complete,true);
 assert.match(review.improvementPrompt(q,raw,['Bezug zum Malerhandwerk']),/Malerhandwerk/);
 assert.match(html,/src="modules\/answer-review.js"/);
});
test('Antwortkontrolle fordert ein fehlendes Malerbeispiel einmal nach',async()=>{
 const window={};let prompts=[];
 runInNewContext(read('modules/answer-review.js'),{window});
 runInNewContext(read('modules/orchestrator.js'),{window});
 window.NERYXLocalModel={info:()=>({loaded:true}),askRaw:async prompt=>{
  prompts.push(prompt);
  return prompts.length===1
   ?'Eine Hypothese ist eine überprüfbare Vermutung. Eine Messung liefert konkrete Werte.'
   :'Eine Hypothese ist eine überprüfbare Vermutung. Eine Messung liefert Werte. Beispiel: Wir messen die Wasseraufnahme einer Wand vor und nach der Grundierung.';
 }};
 const q='Erkläre den Unterschied zwischen Hypothese und Messung anhand eines Beispiels aus dem Malerhandwerk.';
 const answer=await window.NERYXOrchestrator.solve(q,{knowledge:async()=>null});
 assert.equal(prompts.length,2);
 assert.match(prompts[1],/konkret gekennzeichnetes Beispiel/);
 assert.match(answer,/Wasseraufnahme einer Wand/);
 assert.doesNotMatch(answer,/VOLLSTÄNDIGKEITSHINWEIS/);
});
test('Antwortkontrolle kennzeichnet die weiterhin fehlende Anforderung statt Erfolg vorzutäuschen',async()=>{
 const window={};let calls=0;
 runInNewContext(read('modules/answer-review.js'),{window});
 runInNewContext(read('modules/orchestrator.js'),{window});
 window.NERYXLocalModel={info:()=>({loaded:true}),askRaw:async()=>{calls++;return 'Eine Hypothese ist eine überprüfbare Annahme und eine Messung ermittelt Werte oder Zahlen.';}};
 const answer=await window.NERYXOrchestrator.solve('Erkläre Hypothese und Messung mit einem Beispiel aus dem Malerhandwerk.',{knowledge:async()=>null});
 assert.equal(calls,2);
 assert.match(answer,/VOLLSTÄNDIGKEITSHINWEIS/);
 assert.match(answer,/Bezug zum Malerhandwerk/);
 assert.match(answer,/unverifiziert/);
});

test('Fachliche Kontrolle erkennt den aktuellen realen Fehler Hypothese-Messung',async()=>{
 const window={};let calls=0;
 runInNewContext(read('modules/answer-review.js'),{window});
 runInNewContext(read('modules/orchestrator.js'),{window});
 const question='Erkläre mir den Unterschied zwischen einer Hypothese und einer Messung anhand eines Beispiels aus dem Malerhandwerk.';
 const poor='Hypothesche Beispiele:\n1. Erkennt, dass es warm ist\n2. Erkennt, dass es wärmer als 15°C ist\n3. Erkennt, dass es warm sein sollte\nMessung anhand von Beispielen:\n1. Erkennt, dass es warm ist';
 const check=window.NERYXAnswerReview.inspect(question,poor);
 assert.equal(check.complete,false);
 assert.ok(check.missing.includes('prüfbare Annahme oder Vermutung'));
 assert.ok(check.missing.includes('ermittelte Messwerte oder messbare Größe'));
 window.NERYXLocalModel={info:()=>({loaded:true}),askRaw:async()=>{calls++;return poor;}};
 const answer=await window.NERYXOrchestrator.solve(question,{knowledge:async()=>null});
 assert.equal(calls,2);
 assert.match(answer,/FACHLICHE KONTROLLE/);
 assert.doesNotMatch(answer,/Hypothesche Beispiele/);
});
test('Fachliche Kontrolle akzeptiert nachvollziehbare Hypothese mit Messung und Malerbeispiel',()=>{
 const window={};runInNewContext(read('modules/answer-review.js'),{window});
 const question='Erkläre den Unterschied zwischen einer Hypothese und einer Messung anhand eines Beispiels aus dem Malerhandwerk.';
 const answer='Hypothese: Die Grundierung senkt die Wasseraufnahme einer Wand. Messung: Wir messen die Wasseraufnahme an der Wand. Beispiel: Mit und ohne Tiefgrund vergleichen.';
 assert.equal(window.NERYXAnswerReview.inspect(question,answer).complete,true);
});

test('Evidenzvertrag: Alt-Daten bekommen Herkunft, aber niemals automatisch verified',()=>{
 const window={};
 let written=0;
 const localStorage={getItem(){throw Error('Kein Speicherzugriff im Adapter direkt')},setItem(){written++;throw Error('Keine Schreibzugriffe')}};
 const claims=[
  {subject:'okapi',property:'fellfarbe',value:'rotbraun',origin:'Hauptwissen',key:'main',source:'Nutzereingabe',conflict:false,alternatives:[]},
  {subject:'saturn',property:'definition',value:'Planet',origin:'Themenlernen',key:'topics',source:'Nutzer bestätigt',conflict:false,alternatives:[]}
 ];
 window.NERYXLearningHub={collect:()=>({claims,warnings:[]})};
 runInNewContext(read('modules/evidence-contract.js'),{window,localStorage});
 const adapter=window.NERYXEvidence;
 const result=adapter.retrieve('Okapi: Fellfarbe');
 assert.equal(result.total,1);
 assert.equal(result.status,'user_claim');
 assert.equal(result.claims[0].status,'user_claim');
 assert.equal(result.claims[0].source.verifiedExternally,false);
 assert.equal(adapter.retrieve('Hypothese').status,'unknown');
 assert.equal(adapter.retrieve('Okapi').total,1);
 assert.equal(written,0);
 assert.match(adapter.report('Okapi'),/NICHT extern verifiziert/);
 assert.match(app,/command\(s,'Evidenz'\)/);
 assert.match(html,/modules\/evidence-contract.js/);
});
test('Evidenzvertrag: widersprüchliches Wissen bleibt sichtbar statt unbemerkt überschrieben',()=>{
 const window={};
 window.NERYXLearningHub={collect:()=>({claims:[
  {subject:'okapi',property:'fellfarbe',value:'rotbraun',origin:'Hauptwissen',key:'main',source:'Nutzer'},
  {subject:'okapi',property:'fellfarbe',value:'blau',origin:'Themenlernen',key:'topics',source:'Nutzer'}
 ],warnings:[]})};
 runInNewContext(read('modules/evidence-contract.js'),{window});
 const result=window.NERYXEvidence.retrieve('Okapi: Fellfarbe');
 assert.equal(result.total,2);
 assert.equal(result.hasConflict,true);
 assert.match(window.NERYXEvidence.report('Okapi: Fellfarbe'),/Widerspruch/);
});

test('Dokumentfilter: Aufgabenwörter werden ignoriert und Saturn lenkt Hypothesenfrage nicht ab',()=>{
 const window={};
 runInNewContext(read('modules/document-gate.js'),{window});
 const gate=window.NERYXDocumentGate;
 const docs=[
  {title:'Saturn',content:'Der Saturn ist der sechste Planet unseres Sonnensystems und ein Gasriese.'},
  {title:'Hypothese und Messung',content:'Eine Hypothese ist eine überprüfbare Vermutung. Eine Messung ermittelt messbare Werte.'}
 ];
 const q='Erkläre mir den Unterschied zwischen einer Hypothese und einer Messung anhand eines Beispiels aus dem Malerhandwerk.';
 const result=gate.rank(q,docs);
 assert.equal(result.length,2);
 assert.ok(result.every(x=>x.title==='Hypothese und Messung'));
 assert.equal(gate.rank(q,[docs[0]]).length,0);
 assert.equal(gate.rank('Erkläre etwas',[docs[0]]).length,0);
 assert.match(html,/modules\/document-gate.js/);
 assert.match(app,/NERYXDocumentGate\?\.rank\(q,data\.documents,4\)/);
});
test('Dokumentfilter: thematische Ein-Wort-Frage funktioniert ohne irrelevanten Fallback',()=>{
 const window={};runInNewContext(read('modules/document-gate.js'),{window});
 const g=window.NERYXDocumentGate;
 const docs=[{title:'Saturn',content:'Der Saturn ist ein Planet.'}];
 assert.equal(g.rank('Was ist Saturn?',docs).length,1);
 assert.equal(g.rank('Was ist ein Okapi?',docs).length,0);
 assert.equal(g.rank('Vergleiche Saturn und Okapi',docs).length,0);
});

test('L1-Evaluation enthält nur synthetische Testfälle ohne frozen-Selbstbewertung',()=>{
 const fixture=JSON.parse(read('eval/fixtures.json'));
 const suite=JSON.parse(read('eval/suite.json'));
 const ids=suite.items.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(suite.items.length>=20);
 assert.ok(suite.items.every(x=>['dev','regression'].includes(x.suite)));
 assert.ok(suite.items.some(x=>x.suite==='regression'));
 assert.ok(suite.items.some(x=>x.suite==='dev'));
 assert.ok(fixture.documents.every(x=>x.id&&x.title&&x.content));
 assert.match(read('eval/run-l1.mjs'),/runInNewContext/);
 assert.doesNotMatch(read('eval/run-l1.mjs'),/localStorage|indexedDB|getItem\(/);
});
test('L1-Evaluation erkennt ausdrücklich eine bekannte Retrieval-Lücke',()=>{
 const window={};
 runInNewContext(read('modules/document-gate.js'),{window});
 const fixture=JSON.parse(read('eval/fixtures.json'));
 const hits=window.NERYXDocumentGate.rank('Wie lange trocknet Terrafix-K?',fixture.documents,10);
 assert.equal(hits.some(x=>x.id==='fx-d90'),false);
 assert.equal(hits.some(x=>x.id==='fx-d10'),false); // aktuelle lexikalische Grenze offen ausweisen
});

test('L1-Triage: bekannte Fehler bleiben sichtbar, statt als bestanden zu zählen',()=>{
 const suite=JSON.parse(read('eval/suite.json')),issues=JSON.parse(read('eval/known-issues.json'));
 assert.equal(issues.schema,1);
 assert.equal(issues.items.length,7);
 const ids=new Set(suite.items.map(x=>x.id));
 assert.ok(issues.items.every(x=>ids.has(x.id)&&x.reason&&['known_limit','system_defect','test_error','adapter_error'].includes(x.classification)));
 const runner=read('eval/run-l1.mjs');
 assert.match(runner,/knownFailures:knownFailures.length/);
 assert.match(runner,/newRegressions:regressions.length/);
 assert.match(runner,/unexpectedPasses:surprises.length/);
 assert.match(runner,/--all-strict/);
});
test('Frozen-Schema 2 bleibt inaktiv, extern und gegen CI abgesichert',()=>{
 const seal=JSON.parse(read('eval/frozen.seal.json'));
 assert.equal(seal.schema,2);
 assert.equal(seal.active,false);
 assert.equal(seal.version,null);
 assert.equal(seal.itemCount,null);
 assert.equal(seal.claimCount,null);
 assert.equal(seal.files.fixture.sha256,null);
 assert.equal(seal.files.suite.sha256,null);
 const runner=read('eval/run-frozen.mjs');
 const loader=read('eval/frozen-loader.mjs');
 const paths=read('eval/frozen-path-policy.mjs');
 assert.match(runner,/loadFrozen\(/);
 assert.match(loader,/assertFrozenNotCI\(\)/);
 assert.match(loader,/externalFrozenPath\(/);
 assert.match(loader,/seal\.files\.fixture\.sha256/);
 assert.match(loader,/seal\.files\.suite\.sha256/);
 assert.match(paths,/realpathSync\(/);
 assert.match(paths,/Frozen-Testdaten dürfen nicht im Repository liegen/);
 assert.match(paths,/Frozen-Evaluation in CI\/GitHub Actions gesperrt/);
 assert.doesNotMatch(runner+loader+paths,/localStorage|getItem\(|indexedDB/);
});
