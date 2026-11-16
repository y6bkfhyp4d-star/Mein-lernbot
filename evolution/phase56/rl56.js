import {createWorld,createState,observe,action,rng,neighbors,id,at,SITES} from './world.js';
import {createPolicy54,missing} from './agent54.js';
import {emptyMemory,safeMemory,learn as learnResources} from './memory52.js';

export const BUDGET=180;
export const STAGES=[0,25,50,100,250,500];
const ACTIONS=['follow','north','south','west','east','rest'];
const DIR={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0]};
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function initialModel(){return {version:2,episodes:0,q:{},visits:{},recent:[],memory:emptyMemory()};}
export function safeModel(raw){const out=initialModel();if(!raw||typeof raw!=='object')return out;
 out.episodes=clamp(Math.floor(Number(raw.episodes)||0),0,100000);
 for(const [key,row] of Object.entries(raw.q||{}).slice(0,6000)){
  if(key.length>160||!row||typeof row!=='object')continue;
  out.q[key]=Object.fromEntries(ACTIONS.map(a=>[a,clamp(Number(row[a])||0,-200,200)]));
 }
 for(const [key,v] of Object.entries(raw.visits||{}).slice(0,6000))out.visits[key]=clamp(Math.floor(Number(v)||0),0,1000000);
 out.recent=Array.isArray(raw.recent)?raw.recent.slice(-30):[];out.memory=safeMemory(raw.memory);return out;
}
function rowFor(model,key){return model.q[key]||(model.q[key]=Object.fromEntries(ACTIONS.map(a=>[a,0])));}
const tax=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function energyCost(s,a){if(a.type!=='move')return a.type==='rest'?0:1;const x=s.pos.x+a.dx,y=s.pos.y+a.dy;
 return 1+((x*3+y*7+s.world.seed)%7===0?2:0);
}
function stage(s){if(!s.recipes)return 'labor';if(s.inventory.tool&&Object.entries(s.recipes.beacon).every(([k,n])=>(s.inventory[k]||0)>=n))return 'beacon';if(!s.inventory.tool&&Object.keys(missing(s)).length===0)return 'werkstatt';return 'sammeln';}
function keyOf(s,energy,base,visits){const fraction=s.known.size<32?'early':'late',e=energy<=6?'low':energy<15?'mid':'high';
 let heading='other';if(base?.type==='move'){heading=Object.entries(DIR).find(([,v])=>v[0]===base.dx&&v[1]===base.dy)?.[0]||'other';}
 const adj=neighbors(s.pos).filter(p=>!s.known.get(id(p.x,p.y))?.wall),novel=adj.filter(p=>!visits.has(id(p.x,p.y))).length;
 return `${s.world.biome}|${stage(s)}|${fraction}|${e}|${heading}|${novel?'fresh':'visited'}`;
}
function candidates(s,energy,base){const avail=[];
 if(base?.type&&base.type!=='idle'&&base.type!=='done'&&base.type!=='rest')avail.push('follow');
 for(const [name,[dx,dy]] of Object.entries(DIR)){const p={x:s.pos.x+dx,y:s.pos.y+dy};if(p.x<0||p.y<0||p.x>=8||p.y>=8||s.known.get(id(p.x,p.y))?.wall)continue;
 if(energy>=3)avail.push(name);
 }
 // Rest is a real optional action, with a hard safety cap to avoid wasting energy.
 if(energy<=14)avail.push('rest');return avail;
}
function chosenAction(label,base){if(label==='follow')return base;if(label==='rest')return {type:'rest',reason:'Erholung durch Agent gewählt'};
 const [dx,dy]=DIR[label];return {type:'move',dx,dy,reason:`Q-Learning: ${label}`};
}
function select(model,key,allowed,r,epsilon,training){if(training&&r()<epsilon)return allowed[Math.floor(r()*allowed.length)];
 const row=model?.q?.[key]||{};let choice=allowed.includes('follow')?'follow':allowed[0];let best=Number(row[choice]||0)+(choice==='follow'?.65:0);
 for(const a of allowed){const v=Number(row[a]||0)+(a==='follow'?.65:0);if(v>best+1e-9){best=v;choice=a;}}
 // Non-baseline choices are only accepted in evaluation after repeated training.
 if(!training&&model&&choice!=='follow'&&(model.visits[key]||0)<5&&allowed.includes('follow'))return 'follow';
 return choice;
}
function rewardOf(s,a,res,newKnown,energySpent,visits,success){let r=-1-.12*energySpent+newKnown*.9;
 if(!res.ok)r-=5;
 if(a.type==='move'){const loc=id(s.pos.x,s.pos.y);r-=Math.min(3,Math.max(0,(visits.get(loc)||0)-1))*.85;}
 if(res.ok&&a.type==='collect')r+=10;
 if(res.ok&&a.type==='research')r+=12;
 if(res.ok&&a.type==='craft')r+=18;
 if(res.ok&&a.type==='activate')r+=90;
 if(a.type==='rest')r-=.7;
 if(success)r+=25;
 return r;
}
export function episode(seed,model=null,{training=false,epsilon=.20,mode='q',trace=false}={}){
 const s=createState(createWorld(seed));observe(s);let energy=25,rests=0,energyUsed=0,updates=0,totalReward=0,overrides=0,forcedRests=0;
 const r=rng(seed^0x98561^(training?Math.imul((model?.episodes||0)+1,3571):0));
 const policy=createPolicy54(model?.memory||null);const traceRows=[],positions=new Map([[id(s.pos.x,s.pos.y),1]]);
 let last=null;let failReason='Aktionsbudget erreicht';
 const gamma=.94,alpha=.18;
 const update=(old,target)=>{const row=rowFor(model,old.key);row[old.label]+=alpha*(target-row[old.label]);model.visits[old.key]=(model.visits[old.key]||0)+1;updates++;};
 for(let t=0;t<BUDGET&&!s.success;t++){
  let base=policy(s);if(!base?.type||base.type==='idle'||base.type==='done'){failReason='Kein erreichbares Ziel';break;}
  const key=keyOf(s,energy,base,positions),allowed=candidates(s,energy,base);
  if(!allowed.length){failReason='Keine gültige Aktion';break;}
  let label='follow',act=base;
  if(energy<=3){act={type:'rest',reason:'Sicherheits-Erholung'};label='rest';forcedRests++;}
  else if(mode==='q'&&model){label=select(model,key,allowed,r,training?epsilon:0,training);act=chosenAction(label,base);}
  if(label!=='follow'&&label!=='rest')overrides++;
  const before=s.known.size;const oldPos={...s.pos};let res,cost=energyCost(s,act),actualType=act.type;
  if(act.type==='rest'||cost>energy){s.steps++;rests++;energy=clamp(energy+11,0,25);cost=0;actualType='rest';res={ok:true,message:'Energie regeneriert'};s.events.push({step:s.steps,action:'rest',ok:true,message:res.message});}
  else{res=action(s,act);energy-=cost;energyUsed+=cost;}
  if(actualType==='move'&&res.ok){const pos=id(s.pos.x,s.pos.y);positions.set(pos,(positions.get(pos)||0)+1);}
  const earned=rewardOf(s,{type:actualType},res,s.known.size-before,cost,positions,s.success);totalReward+=earned;
  if(training&&model){const nextBase=s.success?null:policy(s);const nextKey=nextBase?keyOf(s,energy,nextBase,positions):null;
   const nextAllowed=nextBase?candidates(s,energy,nextBase):[];
   const nextRow=nextKey?model.q[nextKey]||{}:{};
   const nextBest=nextAllowed.length?Math.max(...nextAllowed.map(a=>Number(nextRow[a]||0)+(a==='follow'?.65:0))):0;
   update({key,label},earned+(s.success?0:gamma*nextBest));
  }
  if(trace&&traceRows.length<150)traceRows.push({step:s.steps,key,label,action:actualType,energy,earned:Number(earned.toFixed(2)),event:res.message});
  if(!res.ok&&actualType==='move'){failReason='Ungültiger Schritt';break;}
 }
 return {seed,biome:s.world.biome,success:s.success,steps:s.steps,penalty:s.success?s.steps:BUDGET,explored:s.known.size,energyUsed,rests,updates,overrides,forcedRests,totalReward,trace:traceRows,state:s,failReason:s.success?'':failReason};
}
export const seriesSeeds=(seed,count,offset)=>Array.from({length:count},(_,i)=>((seed+offset+i*1997)>>>0)||1);
export function learn(seed,count,raw=initialModel(),offset=80000){const model=safeModel(raw);for(const worldSeed of seriesSeeds(seed,count,offset+model.episodes*1997)){
 const result=episode(worldSeed,model,{training:true,epsilon:Math.max(.07,.28-model.episodes*.00033)});
 learnResources(model.memory,result.state);model.episodes++;model.recent.push({seed:worldSeed,success:result.success,steps:result.steps,updates:result.updates});model.recent=model.recent.slice(-30);
 }return model;
}
function metrics(rows){return{count:rows.length,solved:rows.filter(x=>x.success).length,mean:rows.reduce((a,x)=>a+x.penalty,0)/rows.length,energy:rows.reduce((a,x)=>a+x.energyUsed,0)/rows.length,rests:rows.reduce((a,x)=>a+x.rests,0)/rows.length,overrides:rows.reduce((a,x)=>a+x.overrides,0),explored:rows.reduce((a,x)=>a+x.explored,0)/rows.length};}
function scoreRuns(seeds,m,mode){return seeds.map(s=>episode(s,m,{mode}));}
function validate(seed,m){const seeds=seriesSeeds(seed,32,2700000),base=metrics(scoreRuns(seeds,null,'base')),candidate=metrics(scoreRuns(seeds,m,'q'));
 const accepted=candidate.solved>=base.solved&&candidate.mean<=base.mean-.4;
 return{base,candidate,accepted};}
export function compare56(seed=2027,testCount=100){const test=seriesSeeds(seed,testCount,6100000),baseline=scoreRuns(test,null,'base'),base=metrics(baseline);let model=initialModel(),done=0;const stages=[];
 for(const count of STAGES){if(count>done)model=learn(seed,count-done,model,80000);done=count;
  const valid=validate(seed,model),mode=count>0&&valid.accepted?'q':'base',runs=mode==='q'?scoreRuns(test,model,mode):baseline,result=metrics(runs);
  stages.push({training:count,valid,mode,metrics:result,states:Object.keys(model.q).length,updates:Object.values(model.visits).reduce((a,b)=>a+b,0),faster:runs.filter((x,i)=>x.penalty<baseline[i].penalty).length,slower:runs.filter((x,i)=>x.penalty>baseline[i].penalty).length,equal:runs.filter((x,i)=>x.penalty===baseline[i].penalty).length});
 }
 const last=stages.at(-1),mode=last.mode,runs=mode==='q'?scoreRuns(test,model,'q'):baseline;
 return{seed,testCount,base,stages,worlds:runs.map((x,i)=>({seed:x.seed,biome:x.biome,base:baseline[i].penalty,chosen:x.penalty,success:x.success,rest:x.rests,overrides:x.overrides})),method:'Phasen-5.5-Weltgenerator und Mission übernommen. Q-Learning entscheidet bei jedem Schritt zwischen der Empfehlung des Basisplaners, legalen Bewegungsrichtungen und bei Bedarf einer Pause. Belohnungen aus sichtbaren Aktionen, Energie und Entdeckungen. 0/25/50/100/250/500 Trainingswelten; 32 getrennte Validierungswelten; 100 neue Testwelten. Keine verdeckten Kartendaten als Entscheidungsinput. Die Freigabe erfordert mindestens gleiche Erfolgszahl und 0,4 Schritte Vorteil auf Validierung.'};}
