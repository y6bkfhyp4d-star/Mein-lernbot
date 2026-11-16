import {SIZE,TYPES,SITES,at,id,path,enough,zone} from './world.js';
import {probability} from './memory52.js';

export const TACTICS=[
 {id:'short',name:'Kürzester bekannter Weg',bonus:0,risk:0},
 {id:'balanced',name:'Behutsame Rohstoffsuche',bonus:7,risk:0},
 {id:'targeted',name:'Gezielte Rohstoffsuche',bonus:15,risk:0},
 {id:'strong',name:'Starke Rohstoffpriorität',bonus:24,risk:0},
 {id:'explore',name:'Alternative Grenzfelder',bonus:4,risk:0.8}
];
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const move=(a,b)=>({type:'move',dx:b.x-a.x,dy:b.y-a.y});
const goto=(s,p)=>{const route=path(s.pos,p,s.known);return route?.length?move(s.pos,route[0]):null;};
function missing(s){if(!s.recipes)return{};const desired=s.inventory.tool?s.recipes.beacon:Object.fromEntries(TYPES.map(t=>[t,(s.recipes.tool[t]||0)+(s.recipes.beacon[t]||0)]));return Object.fromEntries(Object.entries(desired).filter(([t,n])=>n>(s.inventory[t]||0)).map(([t,n])=>[t,n-s.inventory[t]]));}
function frontier(s,need,mem,tactic){
 let choice=null;const wanted=Object.keys(need);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const p={x,y};if(s.known.has(id(x,y)))continue;
  const route=path(s.pos,p,s.known);if(!route?.length)continue;
  const n=route.length;
  let expected=0,support=0;
  if(mem&&wanted.length){
   for(const t of wanted){const row=mem.biomes?.[s.world.biome]?.[TYPES.indexOf(t)]?.[zone(p)];if(row){expected+=probability(mem,s.world.biome,t,p)*Math.min(2,need[t]);support+=Math.min(1,row.seen/16);} }
  }
  const trust=wanted.length?support/wanted.length:0;
  // Risk term modestly prefers frontiers that expose several unknown adjacent tiles.
  const exposure=[{x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1}].filter(q=>q.x>=0&&q.x<SIZE&&q.y>=0&&q.y<SIZE&&!s.known.has(id(q.x,q.y))).length;
  const score=n-tactic.bonus*expected*trust-tactic.risk*exposure;
  if(!choice||score<choice.score-1e-8||(Math.abs(score-choice.score)<1e-8&&(n<choice.n||(n===choice.n&&(y<choice.p.y||(y===choice.p.y&&x<choice.p.x))))))choice={p,score,n,expected,trust,exposure};
 }
 return choice;
}
export function createPolicy53(mem=null,tactic=TACTICS[0],onDecision=null){
 return s=>{
  const explain=(action,context)=>{if(onDecision)onDecision({step:s.steps+1,biome:s.world.biome,tactic:tactic.id,...context});return action;};
  if(s.success)return{type:'done',reason:'Mission fertig'};
  if(!s.recipes){if(at(s.pos,SITES.lab))return{type:'research',reason:'Rezept erforschen'};return{...goto(s,SITES.lab),reason:'Labor besuchen'};}
  if(s.inventory.tool&&enough(s.inventory,s.recipes.beacon)){if(at(s.pos,SITES.beacon))return{type:'activate',reason:'Signal aktivieren'};return{...goto(s,SITES.beacon),reason:'Zum Signalgerät'};}
  const need=missing(s);
  if(!Object.keys(need).length&&!s.inventory.tool){if(at(s.pos,SITES.workshop))return{type:'craft',reason:'Werkzeug herstellen'};return{...goto(s,SITES.workshop),reason:'Zur Werkstatt'};}
  const current=s.known.get(id(s.pos.x,s.pos.y));if(current?.resource&&(need[current.resource]||0)>0)return{type:'collect',reason:`${current.resource} sammeln`};
  const resources=[...s.known.values()].filter(t=>t.resource&&t.amount>0&&need[t.resource]>0).sort((a,b)=>distance(a,s.pos)-distance(b,s.pos));
  if(resources.length)return{...goto(s,resources[0]),reason:'Bekannten Rohstoff aufsuchen'};
  const f=frontier(s,need,mem,tactic);
  if(f)return explain({...goto(s,f.p),reason:`${tactic.name}: Grenzfeld ${id(f.p.x,f.p.y)}`},{target:id(f.p.x,f.p.y),distance:f.n,likelihood:Number(f.expected.toFixed(3)),confidence:Number(f.trust.toFixed(2)),score:Number(f.score.toFixed(2)),missing:Object.keys(need).join(',')});
  return{type:'idle',reason:'Kein erreichbares Grenzfeld'};
 };
}
