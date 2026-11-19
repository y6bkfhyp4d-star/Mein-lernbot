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
    'app.js', 'sw.js', 'modules/code-diagnose.js', 'modules/genesis-gegenprobe.js', 'modules/genesis-2.js', 'modules/genesis-3.js', 'modules/neryx-reasoner.js', 'modules/rule-patterns.js', 'modules/learning-lab.js', 'modules/auto-learning.js', 'modules/capability-test.js',
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
    'zentrale-ki.js','diagnose-ki.js','antwort-ki.js','modules/code-diagnose.js','modules/genesis-gegenprobe.js','modules/genesis-2.js','modules/genesis-3.js','modules/neryx-reasoner.js','modules/rule-patterns.js','modules/learning-lab.js','modules/auto-learning.js','modules/capability-test.js']) {
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
  assert.ok(sw.includes("fetch(req, {cache:'no-store'})"));
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
  assert.match(lab.feedback('30'),/Feedback übernommen/);
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
