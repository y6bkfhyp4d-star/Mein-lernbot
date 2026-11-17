import {SIZE,TYPES,SITES,at,id,path,enough,zone} from './world.js';
import {probability} from './memory52.js';

export const TACTICS=[
 {id:'short',name:'Kürzester Weg',bonus:0,exposure:0},
 {id:'balanced',name:'Rohstoffsuche',bonus:7,exposure:0},
 {id:'targeted',name:'Gezielte Suche',bonus:15,exposure:0},
 {id:'strong',name:'Starke Priorität',bonus:24,exposure:0},
 {id:'explore',name:'Neugier',bonus:4,exposure:.8}
];
const taxi=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const go=(s,p)=>{const route=path(s.pos,p,s.known);return route?.length?{type:'move',dx:route[0].x-s.pos.x,dy:route[0].y-s.pos.y}:null;};
export function missing(s){if(!s.recipes)return{};const wish=s.inventory.tool?s.recipes.beacon:Object.fromEntries(TYPES.map(t=>[t,(s.recipes.tool[t]||0)+(s.recipes.beacon[t]||0)]));return Object.fromEntries(Object.entries(wish).filter(([t,n])=>n>(s.inventory[t]||0)).map(([t,n])=>[t,n-s.inventory[t]]));}
export function context(s,need){const scarce=Object.entries(need).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||'none';const phase=s.known.size<23?'frueh':s.known.size<43?'mittel':'spaet';const stage=s.inventory.tool?'nach-werkzeug':'vor-werkzeug';return `${s.world.biome}|${stage}|${phase}|${scarce}`;}
export function searchFrontier(s,need,mem,tactic){let best=null;const wanted=Object.keys(need);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const p={x,y};if(s.known.has(id(x,y)))continue;
  const route=path(s.pos,p,s.known);if(!route?.length)continue;
  let expected=0,support=0;
  if(mem&&wanted.length)for(const t of wanted){const row=mem.biomes?.[s.world.biome]?.[TYPES.indexOf(t)]?.[zone(p)];if(row){expected+=probability(mem,s.world.biome,t,p)*Math.min(2,need[t]);support+=Math.min(1,row.seen/16);}}
  const trust=wanted.length?support/wanted.length:0;
  const exposure=[{x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1}].filter(q=>q.x>=0&&q.x<SIZE&&q.y>=0&&q.y<SIZE&&!s.known.has(id(q.x,q.y))).length;
  const score=route.length-tactic.bonus*expected*trust-tactic.exposure*exposure;
  if(!best||score<best.score-1e-9||(Math.abs(score-best.score)<1e-9&&(route.length<best.distance||(route.length===best.distance&&(y<best.p.y||(y===best.p.y&&x<best.p.x))))))best={p,score,distance:route.length,expected,trust,exposure};
 }
 return best;
}
export function createPolicy54(memory=null,chooseTactic=()=>TACTICS[0],onDecision=null){return s=>{
 if(s.success)return {type:'done',reason:'Mission geschafft'};
 if(!s.recipes){if(at(s.pos,SITES.lab))return {type:'research',reason:'Bauplan erforschen'};return {...go(s,SITES.lab),reason:'Zum Forschungslabor'};}
 if(s.inventory.tool&&enough(s.inventory,s.recipes.beacon)){if(at(s.pos,SITES.beacon))return {type:'activate',reason:'Signalgerät aktivieren'};return {...go(s,SITES.beacon),reason:'Zum Signalgerät'};}
 const need=missing(s);
 if(!Object.keys(need).length&&!s.inventory.tool){if(at(s.pos,SITES.workshop))return {type:'craft',reason:'Werkzeug herstellen'};return {...go(s,SITES.workshop),reason:'Zur Werkstatt'};}
 const tile=s.known.get(id(s.pos.x,s.pos.y));if(tile?.resource&&(need[tile.resource]||0)>0)return {type:'collect',reason:`${tile.resource} sammeln`};
 const resources=[...s.known.values()].filter(t=>t.resource&&t.amount>0&&need[t.resource]>0).sort((a,b)=>taxi(a,s.pos)-taxi(b,s.pos));
 if(resources.length)return {...go(s,resources[0]),reason:'Bekannten Rohstoff sammeln'};
 const ctx=context(s,need),tactic=chooseTactic(ctx,s,need),f=searchFrontier(s,need,memory,tactic);
 if(!f)return{type:'idle',reason:'Kein Ziel erreichbar'};
 if(onDecision)onDecision({step:s.steps+1,context:ctx,tactic:tactic.id,target:id(f.p.x,f.p.y),distance:f.distance,expected:+f.expected.toFixed(3),confidence:+f.trust.toFixed(2),known:s.known.size,needed:Object.keys(need)});
 return {...go(s,f.p),reason:`${tactic.name} → ${id(f.p.x,f.p.y)}`};
};}
