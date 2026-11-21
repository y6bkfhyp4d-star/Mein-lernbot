/* Real answer module with synthetic facts; no browser storage writes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../../antwort-ki.js',import.meta.url),'utf8');
function make(facts){
 const window={};
 runInNewContext(source,{window,console:{log(){}}});
 return q=>window.LernBotAntwortKI.answer(q,{facts,documents:[],context:{}});
}
const main={subject:'Quendel',property:'lebensraum',value:'Nebelwälder im Norden von Testland',source:'user',conflict:true,alternatives:[
 {value:'Nebelwälder im Norden von Testland',source:'user'},
 {value:'Trockene Steppe',source:'user'}
]};
for(const q of ['Was weißt du über Quendel?','Wo lebt Quendel?']){
 test('Conflict blocks factual lead for '+q,()=>{
  const result=make([main])(q);
  assert.match(result.text,/^NERYX · WISSENSKONFLIKT/);
  assert.match(result.text,/WISSENSKONFLIKT\nZu diesem Thema/);
  assert.doesNotMatch(result.text,/\\n/);
  assert.match(result.text,/Trockene Steppe/);
  assert.match(result.text,/Nebelwälder/);
  assert.doesNotMatch(result.text,/Quendel lebt in/);
  assert.equal((result.text.match(/Alternative \(ungeprüft\):/g)||[]).length,1);
 });
}
test('Unconflicted fact still produces ordinary answer',()=>{
 const r=make([{...main,conflict:false,alternatives:[]}])('Wo lebt Quendel?');
 assert.doesNotMatch(r.text,/WISSENSKONFLIKT/);
 assert.match(r.text,/Quendel lebt in/);
});
test('Overview with mixed properties must not state conflicted value as fact',()=>{
 const r=make([main,{subject:'Quendel',property:'definition',value:'ein Testwesen',source:'user',conflict:false}])('Was weißt du über Quendel?');
 assert.match(r.text,/^NERYX · WISSENSKONFLIKT/);
 assert.doesNotMatch(r.text,/Quendel lebt in/);
});
test('Similar subject is not treated as conflicted',()=>{
 assert.equal(make([main])('Was weißt du über Quendelkraut?'),null);
});
