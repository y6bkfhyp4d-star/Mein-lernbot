import {createWorld,createState,observe,action,BIOMES,TYPES} from './world.js';
import {emptyMemory,learn,safeMemory} from './memory52.js';
import {TACTICS,createPolicy54} from './agent54.js';
export const LIMIT=180,COUNTS=[0,10,25,50,100];
export const seeds=(base,n,offset)=>Array.from({length:n},(_,i)=>((base+offset+i*1997)>>>0)||1);
const TAC=Object.fromEntries(TACTICS.map(t=>[t.id,t]));
export function mission(seed,memory=null,chooser=()=>TACTICS[0],trace=false){const state=createState(createWorld(seed));observe(state);const decisions=[];const policy=createPolicy54(memory,chooser,trace?d=>{if(decisions.length<240)decisions.push(d);}:null);
 for(let i=0;i<LIMIT&&!state.success;i++){const a=policy(state);if(!a?.type||['done','idle'].includes(a.type))break;const res=action(state,a);if(!res.ok&&a.type==='move')break;}
 return{seed,biome:state.world.biome,success:state.success,steps:state.steps,explored:state.known.size,penalty:state.success?state.steps:LIMIT,decisions,state};}
const stat=runs=>({success:runs.filter(r=>r.success).length,total:runs.length,steps:runs.reduce((s,r)=>s+r.penalty,0)/Math.max(1,runs.length)});
const init=()=>({version:1,episodes:0,memory:emptyMemory(),table:{},logs:[]});
export function safePersonal(raw){const out=init();if(!raw||typeof raw!=='object')return out;out.episodes=Math.max(0,Math.min(5000,Math.floor(Number(raw.episodes)||0)));out.memory=safeMemory(raw.memory);if(raw.table&&typeof raw.table==='object')for(const [ctx,entry] of Object.entries(raw.table).slice(0,250)){if(typeof ctx!=='string'||ctx.length>100||!entry||typeof entry!=='object')continue;const t={};for(const tactic of TACTICS){const e=entry[tactic.id];if(e&&typeof e==='object')t[tactic.id]={n:Math.max(0,Math.min(10000,Number(e.n)||0)),sum:Math.max(-1e6,Math.min(1e6,Number(e.sum)||0))};}out.table[ctx]=t;}out.logs=Array.isArray(raw.logs)?raw.logs.slice(-25):[];return out;}
export const freshPersonal=init;
function update(table,ctx,tactic,reward){const row=table[ctx]||(table[ctx]={});const e=row[tactic]||(row[tactic]={n:0,sum:0});e.n++;e.sum+=reward;}
const chooseByTable=(model,scale=1,minEvidence=3)=>ctx=>{
 const row=model.table[ctx];if(!row)return TACTICS[0];let best=TACTICS[0],bestScore=0;
 for(const t of TACTICS.slice(1)){const a=row[t.id],base=row.short;if(!a||a.n<minEvidence||!base||base.n<minEvidence)continue;
  // Mild shrinkage towards the safe baseline. Positive gain required before changing policy.
  const score=scale*((a.sum/(a.n+4))-(base.sum/(base.n+4)));
  if(score>bestScore+.12){best=t;bestScore=score;}}
 return best;
};
// During training we run each candidate on its own observations. For a frontier decision,
// credit comes from the observable mission outcome, not hidden tile contents.
// This is approximate episode-level credit assignment, not a learned world model.
export function train(seed,n){const model=init();for(const s of seeds(seed,n,22000)){
 const before=structuredClone(model.memory);
 const runs=TACTICS.map(t=>mission(s,before,()=>t,true));
 const baseline=runs[0].penalty;
 for(let i=0;i<TACTICS.length;i++){
  const r=runs[i],t=TACTICS[i];
  const contexts=[...new Set(r.decisions.map(d=>d.context))];
  // Small reward differences in total mission cost, corrected by success penalty.
  const reward=(baseline-r.penalty)/6+(r.success?0:-25);
  for(const ctx of contexts)update(model.table,ctx,t.id,reward);
 }
 learn(model.memory,runs[0].state);model.episodes++;
 if(model.logs.length>=25)model.logs.shift();model.logs.push({seed:s,biome:runs[0].biome,base:baseline,alternatives:Object.fromEntries(runs.map((r,i)=>[TACTICS[i].id,r.penalty]))});
 }
 return model;
}
export function growPersonal(raw,seed,n=25){const base=safePersonal(raw);const extra=train((seed+3900000+base.episodes*1997)>>>0,n);for(const [ctx,entries]of Object.entries(extra.table)){for(const [tid,v]of Object.entries(entries)){const row=base.table[ctx]||(base.table[ctx]={});const old=row[tid]||(row[tid]={n:0,sum:0});old.n+=v.n;old.sum+=v.sum;}}
 // Reconstruct observed statistics from newly trained worlds, preserving earlier personal counts.
 // Learn from completed baseline episodes only, never from hidden tiles.
 for(const s of seeds((seed+3900000+base.episodes*1997)>>>0,n,22000)){const r=mission(s,null,()=>TACTICS[0]);learn(base.memory,r.state);}
 base.episodes+=n;base.logs=[...base.logs,...extra.logs].slice(-25);return base;}
function validate(trained,seed){const worlds=seeds(seed,32,710000);const reference=worlds.map(s=>mission(s));const base=stat(reference);const candidates=[.5,1,1.5,2.5].map(scale=>{const pick=chooseByTable(trained,scale);const results=worlds.map(s=>mission(s,trained.memory,pick));return{scale,stats:stat(results),changed:results.filter((r,i)=>r.penalty!==reference[i].penalty).length};});
 // Require an improvement beyond one step averaged over validation and no fewer successes.
 const ok=candidates.filter(x=>x.stats.success>=base.success&&x.stats.steps<=base.steps-0.5);
 ok.sort((a,b)=>a.stats.steps-b.stats.steps);
 return{base,candidates,accepted:ok.length?ok[0].scale:0};
}
export function choosePersonal(model,seed){const result=validate(safePersonal(model),seed);return{...result,chooser:result.accepted?chooseByTable(safePersonal(model),result.accepted):()=>TACTICS[0]};}
export function compare54(seed=2027,testCount=100){const test=seeds(seed,testCount,3900000),baselineRuns=test.map(s=>mission(s)),base=stat(baselineRuns),stages=[];
 for(const n of COUNTS){const trained=train(seed,n),valid=validate(trained,seed),chooser=valid.accepted?chooseByTable(trained,valid.accepted):()=>TACTICS[0],runs=test.map(s=>mission(s,trained.memory,chooser));
 const metrics=stat(runs);stages.push({trained:n,metrics,validation:{baseline:valid.base,candidates:valid.candidates,accepted:valid.accepted},changed:runs.filter((r,i)=>r.penalty!==baselineRuns[i].penalty).length,faster:runs.filter((r,i)=>r.penalty<baselineRuns[i].penalty).length,slower:runs.filter((r,i)=>r.penalty>baselineRuns[i].penalty).length,equal:runs.filter((r,i)=>r.penalty===baselineRuns[i].penalty).length,contexts:Object.keys(trained.table).length,table:trained.table});}
 const last=stages.at(-1),trained=train(seed,100),val=validate(trained,seed),chooser=val.accepted?chooseByTable(trained,val.accepted):()=>TACTICS[0];
 const finalRuns=test.map(s=>mission(s,trained.memory,chooser,true));const rows=finalRuns.map((r,i)=>({seed:r.seed,biome:r.biome,base:baselineRuns[i].penalty,learned:r.penalty,success:r.success}));const changed=finalRuns.map((r,i)=>({...rows[i],decisions:r.decisions.slice(0,8)})).filter(x=>x.base!==x.learned).slice(0,6);
 return{seed,testCount,base,stages,rows,changes:changed,method:'Training: 0/10/25/50/100 Welten. Validierung: 32 getrennte Welten. Test: 100 andere Welten. Fünf Taktiken erleben jede Trainingswelt separat; ihr Missionsaufwand gibt ein approximatives Lernsignal an die beobachteten Entscheidungskontexte. Der Agent wählt während einer Mission situationsabhängig; bei fehlendem validierten Vorteil bleibt er bei der Basis. Keine versteckten Kartenwerte bei Entscheidungen.'};}
