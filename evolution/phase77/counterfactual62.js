/** Offline-only paired terminal rollouts. Never import from decision62.js.
 * The simulator uses the hidden world to execute actions, but the continuing
 * policy receives only the partially observed state.
 */
import {action,observe,id} from './world.js';
import {createPolicy54} from './agent54.js';
function cloneState(s){
 const w={...s.world,tiles:new Map([...s.world.tiles].map(([k,v])=>[k,{...v}]))};
 return {...s,world:w,pos:{...s.pos},inventory:{...s.inventory},
  known:new Map([...s.known].map(([k,v])=>[k,{...v}])),
  seenResources:new Map(s.seenResources),recipes:s.recipes?structuredClone(s.recipes):null,
  log:[],events:[]};
}
function cost(s,a){if(a.type!=='move')return a.type==='rest'?0:1;
 const x=s.pos.x+a.dx,y=s.pos.y+a.dy;
 return 1+((x*3+y*7+s.world.seed)%7===0?2:0);
}
function one(s,initialEnergy,first,memory,budget){
 const sim=cloneState(s);const policy=createPolicy54(memory||null);
 let energy=initialEnergy,rests=0,spent=0,invalid=0,forced=0,firstOutcome=null,executed=0;
 const max=Math.max(0,budget-s.steps);
 for(let i=0;i<max&&!sim.success;i++){
  let a=i===0?first:policy(sim);
  if(!a||!a.type||a.type==='idle'||a.type==='done')break;
  const c=cost(sim,a);
  if(energy<=3||a.type==='rest'||c>energy){
   sim.steps++;rests++;if(a.type!=='rest')forced++;energy=Math.min(25,energy+11);
   if(i===0)firstOutcome='rest';
  }else{
   const r=action(sim,a);energy-=c;spent+=c;if(!r.ok)invalid++;
   if(i===0)firstOutcome=`${a.type}:${r.ok?'OK':'fehlgeschlagen'}`;
  }
  executed++;
 }
 return {success:sim.success,stepsRemaining:executed,totalSteps:sim.steps,
  penalty:sim.success?sim.steps:budget,energyUsed:spent,rests,invalid,forced,
  discovered:sim.known.size-s.known.size,firstOutcome};
}
export function rolloutPair62(state,energy,baseAction,alternativeAction,memory,budget=180){
 return {base:one(state,energy,baseAction,memory,budget),
  alternative:one(state,energy,alternativeAction,memory,budget)};
}
