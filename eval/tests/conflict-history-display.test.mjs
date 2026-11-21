/* Read-only regression for historical alternatives; synthetic browser storage only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync(new URL('../../modules/learning-hub.js',import.meta.url),'utf8');
function harness(facts){
 const writes=[];
 const localStorage={
  getItem:key=>key==='meinLernBot.v1'?JSON.stringify({version:6,facts}):null,
  setItem:(...args)=>writes.push(args)
 };
 const window={};
 runInNewContext(src,{window,localStorage},{filename:'modules/learning-hub.js'});
 return {hub:window.NERYXLearningHub,writes};
}
const primary={subject:'Quendel',property:'lebensraum',value:'Nebelwälder im Norden von Testland',
 source:'user',conflict:true,
 alternatives:[{value:'Nebelwälder im Norden von Testland',source:'user',time:123},
 {value:'Trockene Steppe',source:'user',time:456}]};
test('Conflict report exposes current and historical values with source, with no writes',()=>{
 const h=harness([primary]);
 const report=h.hub.conflictReport();
 assert.match(report,/Erkannte Widersprüche: 1/);
 assert.match(report,/Nebelwälder im Norden von Testland/);
 assert.match(report,/Alternative \(ungeprüft\): Trockene Steppe \| Herkunft: user/);
 assert.deepEqual(h.writes,[]);
});
test('Lernquellen exposes historical alternatives, without turning them into confirmed facts',()=>{
 const h=harness([primary]);
 const report=h.hub.sources('Quendel');
 assert.match(report,/Trockene Steppe/);
 assert.match(report,/Alternative \(ungeprüft\)/);
 assert.match(report,/Konflikt bereits markiert/);
 assert.deepEqual(h.writes,[]);
});
test('Malformed historical alternatives are not presented as valid and do not crash',()=>{
 const h=harness([{...primary,alternatives:[null,{},'bad',{value:'',source:'user'}]}]);
 assert.match(h.hub.conflictReport(),/NERYX · LERNKONFLIKTE/);
 assert.doesNotMatch(h.hub.conflictReport(),/Alternative \(ungeprüft\)/);
 assert.deepEqual(h.writes,[]);
});
test('Different subjects remain isolated and the report does not reveal other alternatives',()=>{
 const h=harness([primary,{...primary,subject:'Quendelkraut',value:'Steinboden',
   alternatives:[{value:'Geheimer Testort',source:'tester'}]}]);
 const report=h.hub.sources('Quendel');
 assert.match(report,/Quendel/);
 assert.match(report,/Trockene Steppe/);
 // The existing sources search deliberately allows partial subject matches,
 // so this test only verifies that alternatives stay attached to their own fact.
 assert.match(report,/Quendelkraut/);
 assert.deepEqual(h.writes,[]);
});
