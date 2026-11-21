/* NERYX 0.2: in-memory, no network, real production routing and knowledge modules. */
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const ROOT=new URL('../../../',import.meta.url);
const MAIN='meinLernBot.v1',TOPICS='neryx.learning.topics.v1';
const source=path=>readFileSync(new URL(path,ROOT),'utf8');

export function createHarness(fixtures){
  const entries=new Map([
    [MAIN,JSON.stringify(fixtures.main)],
    [TOPICS,JSON.stringify(fixtures.topics)]
  ]);
  const writes=[],networkAttempts=[];
  const localStorage={
    getItem:key=>entries.has(String(key))?entries.get(String(key)):null,
    setItem(key,value){key=String(key);value=String(value);writes.push({key,value});entries.set(key,value)},
    removeItem(key){key=String(key);writes.push({key,removed:true});entries.delete(key)},
    clear(){writes.push({clear:true});entries.clear()},
    key:index=>[...entries.keys()][index]??null,
    get length(){return entries.size}
  };
  const stubbed=['localStorage (in-memory)','document (startup disabled)','fetch (network tripwire)','navigator (offline)','NERYXLocalModel (model tripwire)'];
  const sandbox={
    localStorage,structuredClone,URL,console:{log(){},warn(){},error(){}},
    navigator:{onLine:false},
    document:{readyState:'loading',addEventListener(){},getElementById(){return null}},
    fetch(...args){networkAttempts.push(args);throw Error('Network forbidden in harness')},
  };
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  sandbox.NERYXLocalModel=Object.freeze({
    info(){throw Error('Unexpected local model access')},
    load(){throw Error('Unexpected local model load')},
    ask(){throw Error('Unexpected local model ask')},
    askRaw(){throw Error('Unexpected local model askRaw')}
  });
  const context=createContext(sandbox);
  const run=(src,name)=>runInContext(src,context,{filename:name,timeout:1500});
  // Expose real closure variables ONLY inside the VM copy; never edit app.js.
  const app=source('app.js');
  if(!/\}\)\(\);\s*$/.test(app))throw Error('app.js IIFE ending changed; harness needs review');
  const exposed=app.replace(/\}\)\(\);\s*$/,
    'window.__neryxHarness={ask:routeAnswer,resetChat:clearChat,observe:()=>({lastSubject:neryxLastSubject,context:structuredClone(context)})};\n})();');
  run(exposed,'app.js');
  for(const path of ['modules/topic-learning.js','modules/learning-hub.js',
                     'modules/learning-coordinator.js','modules/orchestrator.js']){
    run(source(path),path);
  }
  for(const name of ['NERYXTopicLearning','NERYXLearningHub','NERYXCoordinator','NERYXOrchestrator'])
    if(!sandbox[name])throw Error('Required real module missing: '+name);
  const initial={main:entries.get(MAIN),topics:entries.get(TOPICS)};
  return {
    ask:(text,{allowTeaching=false}={})=>sandbox.__neryxHarness.ask(text,{allowTeaching}),
    observe:()=>JSON.parse(JSON.stringify(sandbox.__neryxHarness.observe())),
    resetChat:()=>sandbox.__neryxHarness.resetChat(),
    storage:{
      initial,
      raw:()=>({main:entries.get(MAIN),topics:entries.get(TOPICS)}),
      writes,
      get writeCount(){return writes.length}
    },
    networkAttempts,stubbed
  };
}
