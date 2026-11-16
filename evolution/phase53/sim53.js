import {createWorld,createState,observe,action,BIOMES} from './world.js';
import {emptyMemory,learn,safeMemory} from './memory52.js';
import {TACTICS,createPolicy53} from './agent53.js';
export const LIMIT=180,COUNTS=[0,10,25,50,100];
export const seeds=(base,n,offset)=>Array.from({length:n},(_,i)=>((base+offset+i*1997)>>>0)||1);
export function mission(seed,mem=null,tactic=TACTICS[0],trace=false){const state=createState(createWorld(seed));observe(state);const decisions=[];const policy=createPolicy53(mem,tactic,trace?item=>{if(decisions.length<120)decisions.push(item);}:null);for(let i=0;i<LIMIT&&!state.success;i++){const a=policy(state);if(!a?.type||a.type==='idle'||a.type==='done')break;const result=action(state,a);if(!result.ok&&a.type==='move')break;}
 return{seed,biome:state.world.biome,success:state.success,steps:state.steps,explored:state.known.size,penalty:state.success?state.steps:LIMIT,decisions,state};}
function stat(runs){return{success:runs.filter(x=>x.success).length,total:runs.length,steps:runs.reduce((s,x)=>s+x.penalty,0)/Math.max(1,runs.length),avgSuccessful:runs.filter(x=>x.success).reduce((s,x)=>s+x.steps,0)/Math.max(1,runs.filter(x=>x.success).length)};}
// Each training episode produces a measured outcome for each candidate policy.
// Every candidate has to explore from scratch and sees only its own observations.
export function train(seed,n){const mem=emptyMemory(),evidence=Object.fromEntries(BIOMES.map(b=>[b,Object.fromEntries(TACTICS.map(t=>[t.id,{episodes:0,cost:0,success:0}]))]));
 for(const worldSeed of seeds(seed,n,12000)){
  // Learn resource-location statistics from baseline's observed route only.
  const base=mission(worldSeed,null,TACTICS[0]);
  const before=structuredClone(mem);
  for(const t of TACTICS){const out=t.id==='short'?base:mission(worldSeed,before,t);const e=evidence[out.biome][t.id];e.episodes++;e.cost+=out.penalty;e.success+=Number(out.success);}
  learn(mem,base.state);
 }
 return{memory:mem,evidence};}
function select(trained,seed){const result={},details={};const validation=seeds(seed,24,500000);
 for(const biome of BIOMES){const relevant=validation.filter(s=>createWorld(s).biome===biome);const base=stat(relevant.map(s=>mission(s,null,TACTICS[0])));
  const candidates=TACTICS.map(t=>{const record=trained.evidence[biome][t.id];const data=stat(relevant.map(s=>mission(s,trained.memory,t)));return{tactic:t.id,trainingCount:record.episodes,trainSteps:record.episodes?record.cost/record.episodes:null,trainSuccess:record.success,validation:data};});
  // Require enough training evidence and validation improvement with no drop in success.
  const allowed=candidates.filter(x=>x.tactic!=='short'&&x.trainingCount>=6&&x.trainSteps!==null&&x.trainSteps<=trained.evidence[biome].short.cost/Math.max(1,trained.evidence[biome].short.episodes)-.5&&x.validation.success>=base.success&&x.validation.steps<=base.steps-.75);
  allowed.sort((a,b)=>a.validation.steps-b.validation.steps||a.trainSteps-b.trainSteps);
  result[biome]=allowed.length?TACTICS.find(t=>t.id===allowed[0].tactic):TACTICS[0];details[biome]={validationWorlds:relevant.length,baseline:base,selected:result[biome].id,alternatives:candidates.map(x=>({tactic:x.tactic,trainingCount:x.trainingCount,trainSteps:x.trainSteps,validationSteps:x.validation.steps,validationSuccess:x.validation.success}))};
 }
 return{policies:result,details};}
export function compare53(seed=2027,testCount=48){const test=seeds(seed,testCount,2900000),baseRuns=test.map(s=>mission(s)),base=stat(baseRuns),stages=[];let last=null;
 for(const n of COUNTS){const trained=train(seed,n),selected=select(trained,seed),runs=test.map(s=>{const b=createWorld(s).biome;return mission(s,trained.memory,selected.policies[b]);});const metrics=stat(runs);stages.push({trained:n,metrics,selected:Object.fromEntries(BIOMES.map(b=>[b,selected.policies[b].id])),faster:runs.filter((r,i)=>r.penalty<baseRuns[i].penalty).length,slower:runs.filter((r,i)=>r.penalty>baseRuns[i].penalty).length,equal:runs.filter((r,i)=>r.penalty===baseRuns[i].penalty).length,trainingEvidence:trained.evidence,validation:selected.details});last={trained,selected,runs};}
 const rows=test.map((s,i)=>({seed:s,biome:baseRuns[i].biome,base:baseRuns[i].penalty,learned:last.runs[i].penalty,successful:last.runs[i].success}));
 const changes=rows.filter(x=>x.base!==x.learned).sort((a,b)=>Math.abs(b.base-b.learned)-Math.abs(a.base-a.learned)).slice(0,5).map(x=>{const tactic=last.selected.policies[x.biome];const t=mission(x.seed,last.trained.memory,tactic,true);return{...x,tactic:tactic.id,decisions:t.decisions.slice(0,7)};});
 return{seed,testCount,base,stages,rows,changes,method:'Getrennte Training-, Validierungs- und Test-Seeds. Fünf Taktiken werden anhand abgeschlossener Episoden und beobachteter Entscheidungen bewertet. Rohstoffkarten werden nur aus tatsächlich entdeckten Feldern gelernt. Die Auswahl jeder Taktik erfolgt ausschließlich nach Training und Validierung. Testwelten beeinflussen die Auswahl nicht.'};}
export function freshPersonal(){return{version:1,episodes:0,memory:emptyMemory(),evidence:Object.fromEntries(BIOMES.map(b=>[b,Object.fromEntries(TACTICS.map(t=>[t.id,{episodes:0,cost:0,success:0}]))]))};}
export function safePersonal(raw){const base=freshPersonal();if(!raw||typeof raw!=='object')return base;base.memory=safeMemory(raw.memory);base.episodes=Math.max(0,Math.min(5000,Math.floor(Number(raw.episodes)||0)));for(const b of BIOMES)for(const t of TACTICS){const x=raw.evidence?.[b]?.[t.id];if(x&&typeof x==='object'){base.evidence[b][t.id]={episodes:Math.max(0,Math.min(5000,Number(x.episodes)||0)),cost:Math.max(0,Math.min(900000,Number(x.cost)||0)),success:Math.max(0,Math.min(5000,Number(x.success)||0))};}}return base;}
export function growPersonal(raw,seed,n=25){const data=safePersonal(raw);for(let i=0;i<n;i++){
 const worldSeed=((seed+3900000+(data.episodes+i)*1997)>>>0)||1;
 const before=structuredClone(data.memory);const baseline=mission(worldSeed,null,TACTICS[0]);
 for(const tactic of TACTICS){const r=tactic.id==='short'?baseline:mission(worldSeed,before,tactic);const e=data.evidence[r.biome][tactic.id];e.episodes++;e.cost+=r.penalty;e.success+=Number(r.success);}
 learn(data.memory,baseline.state);
 }
 data.episodes+=n;return data;}
export function choosePersonal(data,seed){const parsed=safePersonal(data);return select({memory:parsed.memory,evidence:parsed.evidence},seed);}
