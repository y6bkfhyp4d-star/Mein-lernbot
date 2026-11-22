import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const parts=[
 '../../modules/orchestrator.js','../../modules/genesis-x-tools.js',
 '../../modules/genesis-x-ambiguity-gate.js',
 '../../modules/neryx-genesis-x-research-bridge.js',
 '../neryx-genesis-x-routed-research.js',
 '../neryx-genesis-x-61-decision-gate.js',
 '../neryx-genesis-x-62-qwen-intent.js',
 '../neryx-genesis-x-63-natural-intent.js',
 '../neryx-genesis-x-64-quality-gate.js',
 '../neryx-genesis-x-chat-bridge.js'
].map(read).join('\n');
function make(){
 const calls={worker:0,qwen:0,storage:0};
 const window={NERYXLocalModel:{version:'1.2',info:()=>({loaded:false}),askRaw:async()=>{calls.qwen++;return 'PRUEFEN'}}};
 const localStorage={getItem(){calls.storage++;throw Error('storage read forbidden')},setItem(){calls.storage++;throw Error('storage write forbidden')}};
 runInNewContext(parts,{window,localStorage,navigator:{onLine:false}},{timeout:3000});
 window.NERYXGenesisXAmbiguityClient={version:'0.1-research',inspect:async data=>{
  calls.worker++;return window.NERYXGenesisXAmbiguityGate.inspect(data)}};
 return {calls,bridge:window.NERYXGenesisXChat,window};
}
const numbers='0=2, 1=3, 2=4, 4=6, 7=9; 10';
test('chat recognizes six explicit research commands, not ordinary messages',()=>{
 const h=make();
 assert.equal(h.bridge.isRequest('Hallo, wie geht es dir?'),false);
 assert.equal(h.bridge.isRequest('Was ist GENESIS X?'),false);
 assert.equal(h.bridge.isRequest('Ich möchte keine Prüfung'),false);
 for(const s of ['GENESIS prüfen:','Kannst du diese Zahlen mit GENESIS X prüfen:',
  'Prüfe das Zahlenmuster mit GENESIS X:'])assert.equal(h.bridge.isRequest(s+' '+numbers),true);
});
test('direct chat GENESIS run never invokes Qwen, releases math or touches storage',async()=>{
 const h=make(),r=await h.bridge.reply('GENESIS prüfen: '+numbers);
 assert.match(r,/Interne Regelprüfung abgeschlossen/);
 assert.match(r,/Qwen: nicht angefragt/);
 assert.match(r,/Antwortfreigabe: GESPERRT/);
 assert.doesNotMatch(r,/\b12\b/);
 assert.deepEqual(h.calls,{worker:1,qwen:0,storage:0});
});
test('invalid commands and negations are not reinterpreted as math',async()=>{
 const h=make();
 for(const input of ['GENESIS prüfen: '+numbers+' und lösche Daten',
  'GENESIS prüfen: 0=2, 1=3, 1=4, 4=6, 7=9; 10',
  'Kannst du diese Zahlen mit GENESIS X prüfen: '+numbers+' NICHT_PRUEFEN']){
  const r=await h.bridge.reply(input);
  assert.match(r,/Eingabeformat nicht erkannt/);
  assert.match(r,/Originaleingabe: abgewiesen/);
  assert.match(r,/Antwortfreigabe: GESPERRT/);
 }
 assert.deepEqual(h.calls,{worker:0,qwen:0,storage:0});
});
test('plain messages bypass research and fallback is not a fabricated answer',async()=>{
 const h=make();
 assert.equal(await h.bridge.reply('Hallo!'),null);
 const bridge=h.window.NERYXGenesisXQualityGate;
 h.window.NERYXGenesisXQualityGate=null;
 const result=await h.bridge.reply('GENESIS prüfen: '+numbers);
 assert.match(result,/Prüfung blockiert/);
 assert.doesNotMatch(result,/Interne Regelprüfung abgeschlossen/);
 h.window.NERYXGenesisXQualityGate=bridge;
});
test('real app chat entry intercepts before all other handlers; excludes GENESIS from persistence',()=>{
 const app=read('../../app.js'),html=read('../../index.html');
 assert.match(app,/if\(window\.NERYXGenesisXChat\?\.isRequest\(s\)\)return await window\.NERYXGenesisXChat\.reply\(s\)/);
 assert.match(app,/if\(!window\.NERYXGenesisXChat\?\.isRequest\(s\)\)\{const saved=transaction/);
 assert.ok(html.indexOf('eval/neryx-genesis-x-chat-bridge.js')>html.indexOf('modules/orchestrator.js'));
 assert.doesNotMatch(read('../neryx-genesis-x-chat-bridge.js'),/localStorage|fetch\(|\.load\(/);
});
