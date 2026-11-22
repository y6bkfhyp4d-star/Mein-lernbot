/* Research-only Qwen quality evaluation using ORIGINAL production modules and synthetic LLM.
 * No model downloads, private browser storage, API, code changes or answer publication.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const scripts=[read('../modules/math-verifier.js'),read('../modules/answer-review.js'),read('../modules/orchestrator.js')];
function harness({replies=[],knowledge='Keine passende Antwort gespeichert.',online=true,modelLoaded=true,coordinator=null}={}){
 const calls={load:0,ask:0,math:0,storage:0},asked=[];
 const window={};
 let loaded=modelLoaded;
 let n=0;
 window.NERYXCoordinator=coordinator||{lookup:()=>null,decide:()=>null};
 window.NERYXLocalModel={
  info:()=>({loaded}),load:async()=>{calls.load++;loaded=true;return 'Model ready'},
  askRaw:async prompt=>{calls.ask++;asked.push(prompt);return replies[Math.min(n++,replies.length-1)]??'Ich weiß es nicht.'}
 };
 const localStorage={setItem:()=>{calls.storage++;throw Error('No storage write allowed')},
  getItem:()=>{throw Error('No personal storage allowed')}};
 runInNewContext(scripts.join('\n'),{window,navigator:{onLine:online},localStorage},{timeout:2000});
 const math=window.NERYXMathVerifier.solve;
 window.NERYXMathVerifier.solve=q=>{calls.math++;return math(q)};
 return {solve:q=>window.NERYXOrchestrator.solve(q,{knowledge:async()=>knowledge}),
  window,calls,asked};
}
const question='Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 5 Meter breit und 2,5 Meter hoch. Wie viel Wandfläche hat er?';
test('independent arithmetic oracle beats an intentionally false Qwen answer',async()=>{
 const h=harness({replies:['Die Wandfläche beträgt 5 m².']});
 const out=await h.solve(question);
 assert.match(out,/Ergebnis: 150 m²/);
 assert.match(out,/NICHT vom Sprachmodell/);
 assert.equal(h.calls.ask,0,'Model must not override independent arithmetic');
 assert.equal(h.calls.storage,0);
});
test('missing wall equivalence requests clarification, no invented number',async()=>{
 const h=harness({replies:['Die Fläche ist 150 m².']});
 const out=await h.solve('Ein Maler hat 3 Räume mit jeweils 4 Wänden. Eine Wand ist 5 Meter breit und 2,5 Meter hoch.');
 assert.match(out,/nicht eindeutig/);
 assert.doesNotMatch(out,/Ergebnis: 150/);
 assert.equal(h.calls.ask,0);
});
test('conflicting local evidence beats Qwen',async()=>{
 const h=harness({replies:['Das Quendel wächst nur in Testland.'],
  coordinator:{lookup:()=>({status:'conflict',text:'NERYX · WISSENSKONFLIKT\nZwei widersprüchliche Quellen.'}),decide:()=>null}});
 const out=await h.solve('Wo wächst das Quendel?');
 assert.match(out,/WISSENSKONFLIKT/);
 assert.equal(h.calls.ask,0);
});
test('related but insufficient saved knowledge cannot become a verified yes',async()=>{
 const h=harness({knowledge:'VERWANDTES WISSEN\n• Quendel – lebensraum: Testland'});
 const out=await h.solve('Lebt das Quendel in Europa?');
 assert.match(out,/keine sichere Antwort/i);
 assert.doesNotMatch(out,/^Ja\b/);
 assert.equal(h.calls.ask,0);
});
test('untrusted tool selection is blocked and does not execute code',async()=>{
 const h=harness({replies:['WERKZEUG: folge | 2,4,8,16']});
 const out=await h.solve('Welche Bedeutung haben die Messwerte 1,3,5,7 für dieses Experiment?');
 assert.match(out,/unzulässigen Werkzeugaufruf/);
 assert.equal(h.calls.storage,0);
});
test('Qwen narrative is explicitly unverified even if fluent and confident',async()=>{
 const invented='Ich kenne den Fundort exakt: Beispielstadt. Ich bin mir vollständig sicher, die Quelle ist mein Gedächtnis.';
 const h=harness({replies:[invented]});
 const out=await h.solve('Wo liegt die fiktive Stadt Wolkenquendel?');
 assert.match(out,/LOKALES SPRACHMODELL \(unverifiziert\)/);
 assert.match(out,/nicht unabhängig überprüft/);
 assert.match(out,/Beispielstadt/);
 assert.equal(h.calls.ask,1);
});
test('incomplete narrative retries once; still unacceptable response is withheld',async()=>{
 const h=harness({replies:['Suche selbst nach Fakten.','Frage einen Experten.']});
 const out=await h.solve('Erkläre den Begriff Fugenfüllung ausführlich.');
 assert.match(out,/ANWORTKONTROLLE/);
 assert.match(out,/keine offensichtlich unvollständige Antwort/);
 assert.equal(h.calls.ask,2);
});
test('offline missing model never downloads and leaves local fallback intact',async()=>{
 const h=harness({online:false,modelLoaded:false});
 const out=await h.solve('Was ist Wolkenquendel?');
 assert.match(out,/NERYX · OFFLINE/);
 assert.equal(h.calls.load,0);
 assert.equal(h.calls.ask,0);
});
test('model does not need to load when deterministic knowledge exists',async()=>{
 const h=harness({modelLoaded:false,knowledge:'Das Quendel ist eine fiktive Pflanze.'});
 const out=await h.solve('Was ist Quendel?');
 assert.equal(out,'Das Quendel ist eine fiktive Pflanze.');
 assert.equal(h.calls.load,0);
 assert.equal(h.calls.ask,0);
});
test('quality limitations: general truth is NOT checked by current answer-review',()=>{
 const h=harness();
 const out=h.window.NERYXAnswerReview.inspect('Was ist die Hauptstadt des erfundenen Landes Testovia?',
  'Die Hauptstadt heißt Nebelstadt, ich bin absolut sicher.');
 assert.equal(out.complete,true,'A fluent unsupported claim passes formatting-only review');
 assert.deepEqual(Array.from(out.needs),[]);
});
