import {arbitrate62} from './decision62.js';
import {rolloutPair62} from './counterfactual62.js';
import {createWorld,createState,observe,action,rng,neighbors,id,at,SITES} from './world.js';
import {createPolicy54,missing} from './agent54.js';
import {emptyMemory,safeMemory,learn as learnResources} from './memory52.js';

export const BUDGET=180;
export const STAGES=[0,25,50,100,250,500];
const ACTIONS=['follow','north','south','west','east','rest'];
const DIR={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0]};
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function initialModel(){return {version:3,episodes:0,q:{},visits:{},recent:[],memory:emptyMemory()};}
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
function keyOf(s,energy,base,visits){const fraction=s.known.size<32?'early':'late',e=energy<=8?'low':'ok';
 let heading='other';if(base?.type==='move'){heading=Object.entries(DIR).find(([,v])=>v[0]===base.dx&&v[1]===base.dy)?.[0]||'other';}
 const adj=neighbors(s.pos).filter(p=>!s.known.get(id(p.x,p.y))?.wall),novel=adj.filter(p=>!visits.has(id(p.x,p.y))).length;
 return `${stage(s)}|${fraction}|${e}|${heading}|${novel?'fresh':'visited'}`;
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
// Phase 5.8: Die Vorschau simuliert ausschließlich bekannte/angrenzende Felder.
// Unbekannte Felder dürfen als mögliche Ziele gelten, aber nie als bekannte Ressourcen oder freie Wege.
function knownTarget(s,base){
 if(!s.recipes)return SITES.lab;
 if(s.inventory.tool&&Object.entries(s.recipes.beacon).every(([k,n])=>(s.inventory[k]||0)>=n))return SITES.beacon;
 if(!s.inventory.tool&&Object.keys(missing(s)).length===0)return SITES.workshop;
 const needed=missing(s);
 const resources=[...s.known.values()].filter(t=>t.resource&&t.amount>0&&(needed[t.resource]||0)>0);
 if(resources.length){resources.sort((a,b)=>(Math.abs(s.pos.x-a.x)+Math.abs(s.pos.y-a.y))-(Math.abs(s.pos.x-b.x)+Math.abs(s.pos.y-b.y)));return resources[0];}
 const match=base?.reason?.match(/→ (\d+),(\d+)/);
 return match?{x:+match[1],y:+match[2]}:null;
}
function legalObserved(s,p){return p.x>=0&&p.x<8&&p.y>=0&&p.y<8&&!s.known.get(id(p.x,p.y))?.wall;}
function visibleValue(s,p,visits,target){
 const known=s.known.get(id(p.x,p.y));
 const neighborUnknown=neighbors(p).filter(n=>!s.known.has(id(n.x,n.y))).length;
 let value= (known?0:1.2) + .42*neighborUnknown- .48*(visits.get(id(p.x,p.y))||0);
 if(known?.resource&&known.amount>0)value+=.22;
 if(target)value-=.28*(Math.abs(p.x-target.x)+Math.abs(p.y-target.y));
 return value;
}
function preview(s,base,allowed,visits,model,key,depth=3){
 const target=knownTarget(s,base);const row=model?.q?.[key]||{};
 const scoreOne=(label)=>{
  if(label==='rest')return -9;
  const move=label==='follow'?base:chosenAction(label,base);
  if(move?.type!=='move')return label==='follow'?9:-10;
  const first={x:s.pos.x+move.dx,y:s.pos.y+move.dy};
  if(!legalObserved(s,first))return -50;
  // Depth-limited imagined route: no generator, no actual hidden tiles are queried.
  let score=visibleValue(s,first,visits,target);
  const seen=new Set([id(s.pos.x,s.pos.y),id(first.x,first.y)]);
  let pos=first;
  for(let i=1;i<depth;i++){
   const next=neighbors(pos).filter(p=>legalObserved(s,p)&&!seen.has(id(p.x,p.y)));
   if(!next.length)break;
   next.sort((a,b)=>visibleValue(s,b,visits,target)-visibleValue(s,a,visits,target));
   pos=next[0];seen.add(id(pos.x,pos.y));score+=Math.pow(.67,i)*visibleValue(s,pos,visits,target);
  }
  // Conservative Q contribution and planner preference.
  score+=.06*Math.max(-8,Math.min(8,Number(row[label]||0)));
  if(label==='follow')score+=.30;
  return score;
 };
 const ranks=allowed.map(a=>({a,score:scoreOne(a)})).sort((a,b)=>b.score-a.score);
 const original=allowed.includes('follow')?'follow':allowed[0];
 const baseline=ranks.find(x=>x.a===original)?.score??-Infinity;
 const top=ranks[0];
 return {choice:top.score>baseline+3.0?top.a:original,score:top.score,baseline,advantage:top.score-baseline};
}
function select(model,key,allowed,r,epsilon,training){if(training&&r()<epsilon)return allowed[Math.floor(r()*allowed.length)];
 const row=model?.q?.[key]||{};let choice=allowed.includes('follow')?'follow':allowed[0];let best=Number(row[choice]||0)+(choice==='follow'?2:0);
 for(const a of allowed){const v=Number(row[a]||0)+(a==='follow'?2:0);if(v>best+1e-9){best=v;choice=a;}}
 // Non-baseline choices are only accepted in evaluation after repeated training.
 if(!training&&model&&choice!=='follow'&&(model.visits[key]||0)<12&&allowed.includes('follow'))return 'follow';
 return choice;
}
function rewardOf(s,a,res,newKnown,energySpent,visits,success){let r=-1.2-.22*energySpent+newKnown*.65;
 if(!res.ok)r-=5;
 if(a.type==='move'){const loc=id(s.pos.x,s.pos.y);r-=Math.min(4,Math.max(0,(visits.get(loc)||0)-1))*1.25;}
 if(res.ok&&a.type==='collect')r+=10;
 if(res.ok&&a.type==='research')r+=12;
 if(res.ok&&a.type==='craft')r+=18;
 if(res.ok&&a.type==='activate')r+=110;
 if(a.type==='rest')r-=1.2;
 if(success)r+=25;
 return r;
}
function cloneStateForDiagnosis(s){
 const world={...s.world,tiles:new Map([...s.world.tiles].map(([k,v])=>[k,{...v}]))};
 return {...s,world,pos:{...s.pos},inventory:{...s.inventory},known:new Map([...s.known].map(([k,v])=>[k,{...v}])),
 seenResources:new Map(s.seenResources),recipes:s.recipes?structuredClone(s.recipes):null,log:[],events:[]};
}
export function episode(seed,model=null,{training=false,epsilon=.20,mode='q',trace=false}={}){
 const s=createState(createWorld(seed));observe(s);let energy=25,rests=0,energyUsed=0,updates=0,totalReward=0,overrides=0,forcedRests=0,previews=0;
 const r=rng(seed^0x98561^(training?Math.imul((model?.episodes||0)+1,3571):0));
 const policy=createPolicy54(model?.memory||null);const traceRows=[],positions=new Map([[id(s.pos.x,s.pos.y),1]]);
 let last=null;let failReason='Aktionsbudget erreicht';const decisions=[];const diagnostics={reasons:{},verdicts:[],qProposals:0,qAccepted:0,qRejected:0,qEquivalent:0,qPhysical:0,counterfactuals:[],rollouts:[],decisionPoints:0,follow:0,alternative:0,restChosen:0,forcedRests:0,changedFromPlanner:0,qKnown:0,previewChoices:0,qInfluenced:0,invalid:0,events:[]};
 const gamma=.93,alpha=.12;
 const update=(old,target)=>{const row=rowFor(model,old.key);row[old.label]+=alpha*(target-row[old.label]);model.visits[old.key]=(model.visits[old.key]||0)+1;updates++;};
 for(let t=0;t<BUDGET&&!s.success;t++){
  let base=policy(s);if(!base?.type||base.type==='idle'||base.type==='done'){failReason='Kein erreichbares Ziel';break;}
  const key=keyOf(s,energy,base,positions),allowed=candidates(s,energy,base);
  if(!allowed.length){failReason='Keine gültige Aktion';break;}
  let label='follow',act=base;let previewInfo=null;const qrow=model?.q?.[key]||{};const qVisits=model?.visits?.[key]||0;
  if(energy<=3){act={type:'rest',reason:'Sicherheits-Erholung'};label='rest';forcedRests++;diagnostics.forcedRests++;}
  else if((mode==='q'||mode==='hybrid'||mode==='preview'||mode==='architecture62')&&model){
   if(mode==='preview'||mode==='hybrid'||mode==='architecture62'){
    const p=preview(s,base,allowed,positions,mode==='hybrid'||mode==='architecture62'?model:null,key,3);previewInfo=p;previews++;
    if(mode==='architecture62'&&!training){
     const noQ=preview(s,base,allowed,positions,null,key,3);
     const verdict=arbitrate62({base,allowed,energy,previewChoice:noQ.choice,previewAdv:noQ.advantage,
       q:model.q[key]||{},visits:qVisits});
     label=verdict.choice;
     diagnostics.reasons[verdict.reason]=(diagnostics.reasons[verdict.reason]||0)+1;
     if(verdict.proposed)diagnostics.qProposals++;
     if(verdict.accepted)diagnostics.qAccepted++;
     if(verdict.rejected)diagnostics.qRejected++;
     if(verdict.actionEquivalent&&verdict.accepted)diagnostics.qEquivalent++;
     if(verdict.physicalChange)diagnostics.qPhysical++;
     if(diagnostics.verdicts.length<40&&(verdict.proposed||verdict.choice!=='follow'))diagnostics.verdicts.push({step:t+1,key,energy,base:base.type,preview:noQ.choice,previewAdv:+noQ.advantage.toFixed(2),...verdict});
     // Gegenfaktisch: dieselbe Weltsituation, nur offline im Diagnosezweig.
     // Das Ergebnis der Gegenprobe wird NICHT an die Entscheidung oder das Lernen zurückgegeben.
     if(verdict.proposed&&diagnostics.counterfactuals.length<6){
       const candidate=chosenAction(verdict.proposal,base);
       const original=base;
       const sample=a=>{const sim=cloneStateForDiagnosis(s);const pre=sim.pos,know=sim.known.size;
         const needed=energyCost(sim,a);if(a.type==='rest'||needed>energy){return {type:'rest',ok:true,pos:id(pre.x,pre.y),cost:0,energyAfter:Math.min(25,energy+11),newKnown:0};}
         const result=action(sim,a);return {type:a.type,ok:result.ok,pos:id(sim.pos.x,sim.pos.y),cost:needed,energyAfter:energy-needed,newKnown:sim.known.size-know};};
       diagnostics.counterfactuals.push({step:t+1,seed,key,proposal:verdict.proposal,choice:verdict.choice,reason:verdict.reason,
          base:sample(original),alternative:sample(candidate),note:'Nur unmittelbare Schrittfolge; keine Aussage über späteren Missionserfolg'});
       // Vollständige Offline-Gegenprobe: zwei isolierte Weltkopien, gleicher Basisplaner ab Folgeschritt.
       // Nie als Input für die Entscheidung oder das Q-Training zurückgeben.
       if(diagnostics.rollouts.length<2 && !verdict.actionEquivalent){
         const pair=rolloutPair62(s,energy,original,candidate,model?.memory,180);
         diagnostics.rollouts.push({seed,step:t+1,key,proposal:verdict.proposal,reason:verdict.reason,accepted:verdict.accepted,
           base:pair.base,alternative:pair.alternative,delta:pair.alternative.penalty-pair.base.penalty,
           note:'Offline mit vollständigem Simulator als Umgebung; beide Folgepolitiken verwenden nur Beobachtungen. Die reale Wahl liest diese Daten nicht.'});
       }
     }
    }else if(training&&r()<epsilon*.6)label=allowed[Math.floor(r()*allowed.length)];
    else label=p.choice;
   }else label=select(model,key,allowed,r,training?epsilon:0,training);
   act=chosenAction(label,base);
  }
  if(label!=='follow'&&label!=='rest')overrides++;
  diagnostics.decisionPoints++;if(label==='follow')diagnostics.follow++;else if(label==='rest')diagnostics.restChosen++;else diagnostics.alternative++;
  if(model&&qVisits>0)diagnostics.qKnown++;
  if(previewInfo&&previewInfo.choice!=='follow')diagnostics.previewChoices++;
  if(label!=='follow'&&base?.type==='move')diagnostics.changedFromPlanner++;
  if((mode==='hybrid'||mode==='architecture62')&&previewInfo&&label!== 'follow'){const without=preview(s,base,allowed,positions,null,key,3);if(without.choice!==label)diagnostics.qInfluenced++;}
  if(diagnostics.events.length<35&&(label!=='follow'||(previewInfo&&previewInfo.advantage>1.5))){diagnostics.events.push({step:t+1,stage:stage(s),key,label,base:base.type,known:qVisits,q:Object.fromEntries(allowed.map(a=>[a,Number(qrow[a]||0).toFixed(2)])),previewAdv:previewInfo?Number(previewInfo.advantage.toFixed(2)):null,energy});}
  const before=s.known.size;const oldPos={...s.pos};let res,cost=energyCost(s,act),actualType=act.type;
  if(act.type==='rest'||cost>energy){s.steps++;rests++;energy=clamp(energy+11,0,25);cost=0;actualType='rest';res={ok:true,message:'Energie regeneriert'};s.events.push({step:s.steps,action:'rest',ok:true,message:res.message});}
  else{res=action(s,act);energy-=cost;energyUsed+=cost;}
  if(actualType==='move'&&res.ok){const pos=id(s.pos.x,s.pos.y);positions.set(pos,(positions.get(pos)||0)+1);}
  const earned=rewardOf(s,{type:actualType},res,s.known.size-before,cost,positions,s.success);totalReward+=earned;
  if(training&&model){const nextBase=s.success?null:policy(s);const nextKey=nextBase?keyOf(s,energy,nextBase,positions):null;
   const nextAllowed=nextBase?candidates(s,energy,nextBase):[];
   const nextRow=nextKey?model.q[nextKey]||{}:{};
   const nextBest=nextAllowed.length?Math.max(...nextAllowed.map(a=>Number(nextRow[a]||0)+(a==='follow'?2:0))):0;
   update({key,label},earned+(s.success?0:gamma*nextBest));
  }
  if(trace&&traceRows.length<150)traceRows.push({step:s.steps,key,label,action:actualType,energy,earned:Number(earned.toFixed(2)),event:res.message});
  if(!res.ok&&actualType==='move'){diagnostics.invalid++;failReason='Ungültiger Schritt';break;}
 }
 return {seed,biome:s.world.biome,success:s.success,steps:s.steps,penalty:s.success?s.steps:BUDGET,explored:s.known.size,energyUsed,rests,updates,overrides,forcedRests,previews,totalReward,trace:traceRows,diagnostics,state:s,failReason:s.success?'':failReason};
}
export const seriesSeeds=(seed,count,offset)=>Array.from({length:count},(_,i)=>((seed+offset+i*1997)>>>0)||1);
export function learn(seed,count,raw=initialModel(),offset=80000,mode='hybrid'){const model=safeModel(raw);for(const worldSeed of seriesSeeds(seed,count,offset+model.episodes*1997)){
 const result=episode(worldSeed,model,{mode,training:true,epsilon:Math.max(.05,.20-model.episodes*.00023)});
 learnResources(model.memory,result.state);model.episodes++;model.recent.push({seed:worldSeed,success:result.success,steps:result.steps,updates:result.updates});model.recent=model.recent.slice(-30);
 }return model;
}
function metrics(rows){return{count:rows.length,solved:rows.filter(x=>x.success).length,mean:rows.reduce((a,x)=>a+x.penalty,0)/rows.length,energy:rows.reduce((a,x)=>a+x.energyUsed,0)/rows.length,rests:rows.reduce((a,x)=>a+x.rests,0)/rows.length,overrides:rows.reduce((a,x)=>a+x.overrides,0),explored:rows.reduce((a,x)=>a+x.explored,0)/rows.length};}
function scoreRuns(seeds,m,mode){return seeds.map(s=>episode(s,m,{mode}));}
function validate(seed,m,mode){const seeds=seriesSeeds(seed,32,3200000),base=metrics(scoreRuns(seeds,null,'base')),candidate=metrics(scoreRuns(seeds,m,mode));
 const accepted=candidate.solved>=base.solved&&candidate.mean<=base.mean-.4;
 return{base,candidate,accepted};}
function cloneModel(m){return safeModel(JSON.parse(JSON.stringify(m)));}
export function compare58(seed=2027,testCount=100){
 const test=seriesSeeds(seed,testCount,8200000),validationSeed=seed+150000;
 let model=initialModel(),done=0,checkpoints=[];
 for(const count of STAGES){
  if(count>done)model=learn(seed,count-done,model,240000,'hybrid');done=count;
  const snapshot=cloneModel(model), v=validate(validationSeed,snapshot,'hybrid');
  checkpoints.push({training:count,model:snapshot,valid:v});
 }
 const eligible=checkpoints.filter(c=>c.training>0&&c.valid.accepted);
 const winner=eligible.slice().sort((a,b)=>a.valid.candidate.mean-b.valid.candidate.mean||a.training-b.training)[0]||null;
 const baseRuns=scoreRuns(test,null,'base'),base=metrics(baseRuns);
 const previewModel=initialModel();
 const previewValid=validate(validationSeed,previewModel,'preview');
 const previewRuns=scoreRuns(test,previewModel,'preview');
 const previewStats=metrics(previewRuns);
 const stages=checkpoints.map(c=>({training:c.training,valid:c.valid,states:Object.keys(c.model.q).length,
  updates:Object.values(c.model.visits).reduce((a,b)=>a+b,0)}));
 const candidateRuns=scoreRuns(test,checkpoints.at(-1).model,'hybrid');
 const candidate=metrics(candidateRuns);
 const selectedMode=winner?'hybrid':previewValid.accepted?'preview':'base';
 const finalRuns=selectedMode==='hybrid'?scoreRuns(test,winner.model,'hybrid'):selectedMode==='preview'?previewRuns:baseRuns;
 const selected=metrics(finalRuns);
 return{seed,testCount,base,preview:previewStats,previewValid,candidate,stages,selected,checkpoint:winner?.training??0,
  selectedMode,chosenValidation:winner?.valid??previewValid,
  worlds:finalRuns.map((x,i)=>({seed:x.seed,biome:x.biome,base:baseRuns[i].penalty,preview:previewRuns[i].penalty,hybrid:candidateRuns[i].penalty,chosen:x.penalty,success:x.success,rest:x.rests,overrides:x.overrides,previews:x.previews})),
  method:'Gleicher Weltgenerator und dieselbe Energiemission wie Phase 5.7. Planungsvorschau mit Horizont 3 nutzt nur bekannte Kartenzellen, Grenzbereiche und bereits beobachtete Ressourcen. Weder verborgene Karte noch Ziel-Wahrheit werden gelesen. Q-Lernen aktualisiert Werte nach echten Aktionen; die Vorschau ist eine Näherung, keine perfekte Weltsimulation. Trainieren 0/25/50/100/250/500 Welten, Validieren 32 getrennte Welten, danach 100 Testwelten. Freigabe bei gleicher Erfolgshäufigkeit und mindestens 0,4 Aktionen Vorteil auf Validierung; andernfalls Basis-Rückfall. Ergebnisse auf den Testwelten ändern die Strategieauswahl nicht.'};
}
