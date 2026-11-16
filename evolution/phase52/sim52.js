import {createWorld,createState,observe,action,BIOMES} from './world.js';
import {emptyMemory,learn,summary,safeMemory} from './memory52.js';
import {createPolicy52} from './agent52.js';
export const LIMIT=180;
export const WEIGHTS=[0,4,8,12,18,26];
const COUNTS=[0,10,25,50,100];
const indices=(seed,n,offset)=>Array.from({length:n},(_,i)=>((seed+offset+i*1997)>>>0)||1);
export function mission(seed,mem=null,weight=0){
 const state=createState(createWorld(seed));observe(state);const policy=createPolicy52(seed,mem,weight);
 for(let i=0;i<LIMIT&&!state.success;i++){
  const choice=policy(state);if(!choice?.type||choice.type==='idle'||choice.type==='done')break;
  const result=action(state,choice);if(!result.ok&&choice.type==='move')break;
 }
 return{seed,biome:state.world.biome,success:state.success,steps:state.steps,explored:state.known.size,state};
}
function statistics(arr){
 const wins=arr.filter(e=>e.success);
 return{success:wins.length,total:arr.length,avgSteps:wins.length?wins.reduce((s,x)=>s+x.steps,0)/wins.length:null,penalty:arr.reduce((s,x)=>s+(x.success?x.steps:LIMIT),0)/Math.max(1,arr.length),avgExplored:arr.reduce((s,x)=>s+x.explored,0)/Math.max(1,arr.length)};
}
function selectWeights(mem,seeds){
 // Strictly separate validation worlds. No test truth is used for selection.
 // Prefer baseline if any variant has lower mission success or insufficient gain.
 const choices={};const details={};
 for(const biome of BIOMES){
  const relevant=seeds.filter(seed=>createWorld(seed).biome===biome);
  const candidates=WEIGHTS.map(weight=>({weight,stats:statistics(relevant.map(seed=>mission(seed,mem,weight)))}));
  const base=candidates[0];
  const valid=candidates.filter(x=>x.stats.success>=base.stats.success&&x.stats.penalty<=base.stats.penalty-1.5);
  const best=valid.sort((a,b)=>a.stats.penalty-b.stats.penalty||a.weight-b.weight)[0];
  choices[biome]=best?.weight||0;
  details[biome]={n:relevant.length,selected:choices[biome],baseline:base.stats.penalty,best:best?.stats.penalty??null};
 }
 return{choices,details};
}
export function train52(seed,n){
 const mem=emptyMemory();
 for(const s of indices(seed,n,12000)){
  const result=mission(s,null,0);learn(mem,result.state);
 }
 const validation=indices(seed,24,500000);
 const tuning=selectWeights(mem,validation);
 return{memory:mem,...tuning};
}
export function compare52(seed=2027,testCount=48){
 const test=indices(seed,testCount,1900000);
 const baselineRuns=test.map(s=>mission(s,null,0));
 const baseline=statistics(baselineRuns);
 const stages=[];
 for(const n of COUNTS){
  const trained=train52(seed,n);
  const learnedRuns=test.map(s=>{const biome=createWorld(s).biome;return mission(s,trained.memory,trained.choices[biome]);});
  const learned=statistics(learnedRuns);
  const faster=learnedRuns.filter((x,i)=>x.success&&baselineRuns[i].success&&x.steps<baselineRuns[i].steps).length;
  const slower=learnedRuns.filter((x,i)=>x.success&&baselineRuns[i].success&&x.steps>baselineRuns[i].steps).length;
  stages.push({trained:n,learned,weights:trained.choices,validation:trained.details,faster,slower,same:testCount-faster-slower});
 }
 const last=train52(seed,100);
 const rows=test.map((s,i)=>({seed:s,biome:baselineRuns[i].biome,baseline:baselineRuns[i].steps,learned:mission(s,last.memory,last.choices[baselineRuns[i].biome]).steps,success:baselineRuns[i].success}));
 return{seed,testCount,budget:LIMIT,baseline,stages,rows,method:'Training, Validierung und Test nutzen unterschiedliche Seeds. Die Wahl der Gewichte erfolgt nur in der Validierung. Die Welten benutzen denselben Generator wie Phase 5.1. Gleiche Testwelten, aber möglicherweise andere Bewegungsfolgen. Ergebnisse sind eine Simulation.'};
}
export function expandPersonal(mem,seed,n=25){
 const m=safeMemory(mem),results=[];
 for(const s of indices(seed,n,2500000+m.episodes*3001)){
  const result=mission(s,null,0);learn(m,result.state);results.push(result);
 }
 return{memory:m,learned:results.length,completed:results.filter(x=>x.success).length};
}
export function weightsForPersonal(m,seed){
 return selectWeights(safeMemory(m),indices(seed,24,500000));
}
