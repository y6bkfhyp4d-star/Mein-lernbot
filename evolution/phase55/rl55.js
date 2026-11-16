import {createWorld,createState,observe,action,rng} from './world.js';
import {TACTICS,createPolicy54,context,missing} from './agent54.js';
import {emptyMemory,safeMemory,learn as learnResources} from './memory52.js';

export const BUDGET=180;
export const STAGES=[0,10,25,50,100,250];
const ids=TACTICS.map(t=>t.id);
const get=(table,key)=>table[key]||(table[key]=Object.fromEntries(ids.map(x=>[x,0])));
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export const initialModel=()=>({version:1,episodes:0,q:{},visits:{},recent:[],memory:emptyMemory()});
export function safeModel(raw){const out=initialModel();if(!raw||typeof raw!=='object')return out;out.episodes=clamp(Math.floor(Number(raw.episodes)||0),0,100000);for(const [k,row] of Object.entries(raw.q||{}).slice(0,1600)){if(k.length>130||!row||typeof row!=='object')continue;out.q[k]={};for(const id of ids)out.q[k][id]=clamp(Number(row[id])||0,-100,100);}for(const [k,v] of Object.entries(raw.visits||{}).slice(0,1600))out.visits[k]=clamp(Math.floor(Number(v)||0),0,1000000);out.recent=Array.isArray(raw.recent)?raw.recent.slice(-25):[];out.memory=safeMemory(raw.memory);return out;}
const keyOf=(s,need,energy)=>`${context(s,need)}|${energy<9?'tief':energy<17?'mittel':'hoch'}|${Object.values(need).reduce((a,b)=>a+b,0)>1?'mehrere':'eins'}`;
function select(row,random,epsilon,greedy){if(random()<epsilon)return ids[Math.floor(random()*ids.length)];let best=greedy?'short':ids[0],value=Number(row[best]||0);for(const id of ids){const v=Number(row[id]||0);if(v>value+1e-8){value=v;best=id;}}return best;}
function energyCost(s,a){if(a.type==='move'){const x=s.pos.x+a.dx,y=s.pos.y+a.dy;const tile=s.world.tiles.get(`${x},${y}`);if(tile?.wall||!tile)return 1;return 1+((x*3+y*7+s.world.seed)%7===0?2:0);}return a.type==='rest'?0:1;}
function outcomeReward(type,ok,explored,energySpent){let reward=-1-0.17*energySpent+0.27*explored;if(!ok)reward-=5;if(ok&&type==='collect')reward+=4;if(ok&&type==='research')reward+=6;if(ok&&type==='craft')reward+=8;if(ok&&type==='activate')reward+=100;return reward;}
// Q-learning operates at exploration choice points; TD updates use observable
// step-by-step costs, energy and progress accrued until the next choice point.
// World truth is used only by the environmental action() simulation.
export function episode(seed,model=null,{training=false,epsilon=.14,trace=false,mode='q'}={}){
 const s=createState(createWorld(seed));observe(s);let energy=25,restCount=0,energyUsed=0,frontierChoices=0,tdUpdates=0,failReason='Budget erreicht';const r=rng(seed^0xa15638^(training?(model?.episodes||0)*193:0));
 const memory=model?.memory||null;let pending=null;const choices=[];
 const policy=createPolicy54(memory,(ctx,state,need)=>{
   const full=keyOf(state,need,energy);
   // Previous frontier macro-action finishes when the next frontier choice starts.
   if(training&&pending){const targetRow=get(model.q,full);const maxNext=Math.max(...ids.map(id=>targetRow[id]));const old=get(model.q,pending.key);const alpha=.24;old[pending.tactic]+=alpha*(pending.reward+Math.pow(.94,pending.duration)*maxNext-old[pending.tactic]);model.visits[pending.key]=(model.visits[pending.key]||0)+1;tdUpdates++;pending=null;}
   const row=model?.q?.[full]||{};const chosen=mode==='base'||!model?'short':select(row,r,training?epsilon:0,true);
   frontierChoices++;pending=training?{key:full,tactic:chosen,reward:0,duration:0}:null;
   if(trace&&choices.length<160)choices.push({step:s.steps+1,context:full,tactic:chosen,energy,known:s.known.size});
   return TACTICS.find(t=>t.id===chosen)||TACTICS[0];
 });
 let totalReward=0;
 for(let i=0;i<BUDGET&&!s.success;i++){
   let a;
   if(energy<=6){a={type:'rest',reason:'Energie regenerieren'};}else a=policy(s);
   if(!a?.type||a.type==='idle'||a.type==='done'){failReason='Kein erreichbares Ziel';break;}
   const before=s.known.size;
   let res,cost=energyCost(s,a);
   if(a.type==='rest') {s.steps++;restCount++;energy=clamp(energy+11,0,25);res={ok:true,message:'Energie regeneriert'};s.events.push({step:s.steps,action:'rest',ok:true,message:res.message});}
   else {if(cost>energy){s.steps++;restCount++;energy=clamp(energy+11,0,25);res={ok:true,message:'Energie regeneriert'};cost=0;}
     else{res=action(s,a);energy-=cost;energyUsed+=cost;}}
   const advanced=outcomeReward(a.type,res.ok,s.known.size-before,cost);totalReward+=advanced;
   if(pending){pending.reward+=Math.pow(.94,pending.duration)*advanced;pending.duration++;}
   if(!res.ok&&a.type==='move'){failReason='Weg blockiert';break;}
 }
 if(training&&pending){const old=get(model.q,pending.key);const terminal=s.success?0:-25;old[pending.tactic]+=.24*(pending.reward+Math.pow(.94,pending.duration)*terminal-old[pending.tactic]);model.visits[pending.key]=(model.visits[pending.key]||0)+1;tdUpdates++;}
 return {seed,biome:s.world.biome,success:s.success,steps:s.steps,penalty:s.success?s.steps:BUDGET,explored:s.known.size,energy,restCount,energyUsed,frontierChoices,tdUpdates,reward:totalReward,choices,events:trace?s.events.slice(-16):[],state:s,failReason:s.success?'':failReason};
}
export const seriesSeeds=(seed,n,offset)=>Array.from({length:n},(_,i)=>((seed+offset+i*1997)>>>0)||1);
export function learn(startSeed,count,model=initialModel(),offset=60000){const m=safeModel(model);for(const seed of seriesSeeds(startSeed,count,offset+m.episodes*1997)){const e=episode(seed,m,{training:true,epsilon:Math.max(.06,.26-m.episodes*.00065)});learnResources(m.memory,e.state);m.episodes++;if(m.recent.length>=25)m.recent.shift();m.recent.push({seed,success:e.success,steps:e.steps,rest:e.restCount,updates:e.tdUpdates});}return m;}
function metrics(rows){return {solved:rows.filter(r=>r.success).length,count:rows.length,mean:rows.reduce((a,r)=>a+r.penalty,0)/Math.max(1,rows.length),energy:rows.reduce((a,r)=>a+r.energyUsed,0)/Math.max(1,rows.length),rests:rows.reduce((a,r)=>a+r.restCount,0)/Math.max(1,rows.length),explored:rows.reduce((a,r)=>a+r.explored,0)/Math.max(1,rows.length)};}
function compareRows(seeds,model,mode){return seeds.map(s=>episode(s,model,{mode}));}
function validation(seed,model){const cases=seriesSeeds(seed,32,1700000),baseline=metrics(compareRows(cases,null,'base')),candidate=metrics(compareRows(cases,model,'q'));const accepted=candidate.solved>=baseline.solved&&candidate.mean<=baseline.mean-0.5;return{baseline,candidate,accepted};}
export function compare55(seed=2027,testCount=100){const test=seriesSeeds(seed,testCount,5100000),baseRuns=compareRows(test,null,'base'),base=metrics(baseRuns),stages=[];let model=initialModel(),done=0;
 for(const target of STAGES){if(target>done)model=learn(seed,target-done,model,60000);done=target;const v=validation(seed,model);const active=target>0&&v.accepted?'q':'base';const runs=compareRows(test,active==='q'?model:null,active);const m=metrics(runs);stages.push({training:target,valid:v,active,metrics:m,states:Object.keys(model.q).length,updates:Object.values(model.visits).reduce((a,b)=>a+b,0),faster:runs.filter((r,i)=>r.penalty<baseRuns[i].penalty).length,slower:runs.filter((r,i)=>r.penalty>baseRuns[i].penalty).length,equal:runs.filter((r,i)=>r.penalty===baseRuns[i].penalty).length});}
 const finalActive=stages.at(-1).active;const finalRuns=compareRows(test,finalActive==='q'?model:null,finalActive);const diagnostic=finalRuns.map((r,i)=>({seed:r.seed,biome:r.biome,base:baseRuns[i].penalty,learned:r.penalty,success:r.success,rests:r.restCount}));return{seed,testCount,base,stages,diagnostic,modelSummary:{episodes:model.episodes,states:Object.keys(model.q).length},method:'Reale TD-Q-Updates auf beobachtete Rewards nach Bewegungs-, Sammel-, Forschungs- und Herstellungsaktionen. Q-Werte werden an Entscheidungspunkten für Erkundungstaktiken aktualisiert, nicht für jede einzelne Bewegungsrichtung. 0/10/25/50/100/250 Trainingswelten, 32 Validierungswelten, 100 unbekannte Testwelten. Dieselben Testwelten, maximal 180 Aktionen inklusive Energiepausen. Validierungs-Rückfall bei weniger Erfolgen oder weniger als 0,5 Aktion Vorteil. Keine unbekannten Kartendaten bei Entscheidungen.'};}
