/* Isolated real routeAnswer + orchestrator; synthetic answers, no user/Frozen data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const app=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
const orchestrator=readFileSync(new URL('../../modules/orchestrator.js',import.meta.url),'utf8');
const start=app.indexOf('async function routeAnswer(');
const stop=app.indexOf('async function handle(input)',start);
assert.ok(start>0&&stop>start);
const helper=app.slice(start,stop);
function harness({answer,parsed=false,known=null,online=true}){
 const calls={model:0,knowledge:0,ask:0};
 const window={
  NERYXTopicLearning:{
   parse:()=>parsed?{subject:'quendel',type:'lebensraum'}:null,
   match:()=>known,
   ask:()=>{calls.ask++;return 'Dazu kenne ich noch keine bestätigte Antwort.'}
  },
  NERYXCoordinator:{decide:()=>null},
  NERYXLocalModel:{
   info:()=>{calls.model++;throw Error('model tripwire')},
   load:()=>{calls.model++;throw Error('model tripwire')},
   ask:()=>{calls.model++;throw Error('model tripwire')},
   askRaw:()=>{calls.model++;throw Error('model tripwire')}
  }
 };
 const intelligentAnswer=async()=>{calls.knowledge++;return answer};
 runInNewContext(orchestrator+'\n'+helper+'\nwindow.routeAnswer=routeAnswer;',
  {window,navigator:{onLine:online},intelligentAnswer},{filename:'app-answer-routing.js'});
 return {route:window.routeAnswer,calls};
}
const related='VERWANDTES WISSEN\n• Quendel – lebensraum: Nebelwälder von Testland';
test('Normalchat and NERYX lösen share knowledge-first decision',async()=>{
 const h=harness({answer:related});
 const q='In welchem Land kommt das Quendel vor?';
 const chat=await h.route(q,{allowTeaching:true});
 const explicit=await h.route(q);
 assert.equal(chat,explicit);
 assert.match(chat,/Nebelwälder/);
 assert.match(chat,/keine sichere Antwort/);
 assert.equal(h.calls.model,0);
});
test('Parsed but unknown property keeps confirmation-based learning',async()=>{
 const h=harness({answer:'Zu „Quendel“ habe ich noch keine passenden Informationen gespeichert.',parsed:true});
 const x=await h.route('Wo lebt das Quendel?',{allowTeaching:true});
 assert.match(x,/noch keine bestätigte Antwort/);
 assert.equal(h.calls.model,0);
 assert.equal(h.calls.ask,1);
});
test('Known direct answer containing nicht bekannt cannot trigger model',async()=>{
 const value='Quendel – ursache: Die Ursache ist nicht bekannt.';
 const h=harness({answer:value,parsed:true});
 assert.equal(await h.route('Was ist die Ursache?',{allowTeaching:true}),value);
 assert.equal(h.calls.model,0);
});
test('Missing fact without a parsed teaching question goes through model',async()=>{
 const h=harness({answer:'Keine passende Antwort gespeichert.',parsed:false});
 await assert.rejects(h.route('Unbekannte Wissensfrage'),/model tripwire/);
 assert.equal(h.calls.model,1);
});
test('Both real app entry points use same routeAnswer helper',()=>{
 assert.match(app,/command\(s,'NERYX lösen'\)[\s\S]*?return await routeAnswer\(v\)/);
 assert.match(app,/return await routeAnswer\(s,\{allowTeaching:true\}\)/);
 assert.doesNotMatch(app,/window\.NERYXLocalModel\?\.shouldFallback\(original\)/);
});
