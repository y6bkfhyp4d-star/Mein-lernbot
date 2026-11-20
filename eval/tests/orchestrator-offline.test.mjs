import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../../modules/orchestrator.js',import.meta.url),'utf8');
function harness({online=false}={}){
 let loads=0,asks=0;
 const window={NERYXLocalModel:{
  info:()=>({loaded:false}),load:async()=>{loads++;return 'would load'},
  askRaw:async()=>{asks++;return 'fake response'}
 }};
 const navigator={onLine:online};
 runInNewContext(source,{window,navigator},{filename:'modules/orchestrator.js'});
 return {solve:window.NERYXOrchestrator.solve,stats:()=>({loads,asks})};
}
test('Moin und Hallo bekommen lokale Antworten, unabhängig vom Netzwerk',async()=>{
 for(const online of [true,false]){
  const h=harness({online});
  for(const word of ['Moin','Hallo','Guten Morgen','Hi!']){
   assert.match(await h.solve(word,{knowledge:async()=> 'Zu diesem Thema habe ich noch keine passenden Informationen gespeichert.'}),/Ich bin NERYX/);
  }
  assert.deepEqual(h.stats(),{loads:0,asks:0});
 }
});
test('Unbekannte Frage lädt im Offline-Modus kein Sprachmodell',async()=>{
 const h=harness({online:false});
 const result=await h.solve('Warum glänzt der Mond?',{knowledge:async()=> 'Keine passende Antwort gespeichert.'});
 assert.match(result,/NERYX · OFFLINE/);
 assert.deepEqual(h.stats(),{loads:0,asks:0});
});
test('Online-Modellpfad bleibt für nicht geklärte Fragen verfügbar',async()=>{
 const h=harness({online:true});
 const result=await h.solve('Warum glänzt der Mond?',{knowledge:async()=> 'Keine passende Antwort gespeichert.'});
 assert.match(result,/Automatischer Modellstart fehlgeschlagen/);
 assert.deepEqual(h.stats(),{loads:1,asks:0});
});
test('Bekannte Antworten haben offline weiterhin Vorrang',async()=>{
 const h=harness({online:false});
 assert.equal(await h.solve('Was ist das Okapi?',{knowledge:async()=> 'Das Okapi ist ein Säugetier.'}), 'Das Okapi ist ein Säugetier.');
 assert.deepEqual(h.stats(),{loads:0,asks:0});
});
