import {SIZE,TYPES,SITES,at,id,path,rng,enough,zone} from './world.js';
import {probability} from './memory52.js';

const md=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const move=(a,b)=>({type:'move',dx:b.x-a.x,dy:b.y-a.y});
const go=(s,p)=>{const route=path(s.pos,p,s.known);return route?.length?move(s.pos,route[0]):null;};
function missing(s){
 if(!s.recipes)return {};
 const target=s.inventory.tool?s.recipes.beacon:Object.fromEntries(TYPES.map(k=>[k,(s.recipes.tool[k]||0)+(s.recipes.beacon[k]||0)]));
 return Object.fromEntries(Object.entries(target).filter(([k,v])=>v>(s.inventory[k]||0)).map(([k,v])=>[k,v-s.inventory[k]]));
}
// Only explored tiles and aggregate experience from OTHER worlds may influence the choice.
function frontier(s,need,mem,weight){
 const candidates=[];
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const p={x,y};if(s.known.has(id(x,y)))continue;
  const route=path(s.pos,p,s.known);if(!route?.length)continue;
  let score=route.length;
  if(mem&&weight>0&&Object.keys(need).length){
   let likelihood=0;
   for(const t of Object.keys(need))likelihood+=probability(mem,s.world.biome,t,p)*Math.min(2,need[t]);
   const cells=mem?.biomes?.[s.world.biome];
   const support=cells?Math.min(...Object.keys(need).map(t=>cells[TYPES.indexOf(t)]?.[zone(p)]?.seen||0)):0;
   // Do not trust low-sample memories. Small weight also limits expensive detours.
   const confidence=Math.min(1,support/18);
   score-=weight*likelihood*confidence;
  }
  candidates.push({p,score,dist:route.length});
 }
 candidates.sort((a,b)=>a.score-b.score||a.dist-b.dist||a.p.y-b.p.y||a.p.x-b.p.x);
 return candidates[0]?.p||null;
}
export function createPolicy52(seed,mem=null,weight=0){
 return s=>{
  if(s.success)return{type:'done',reason:'Mission abgeschlossen'};
  if(!s.recipes){if(at(s.pos,SITES.lab))return{type:'research',reason:'Bauplan erforschen'};return{...go(s,SITES.lab),reason:'Labor besuchen'};}
  if(s.inventory.tool&&enough(s.inventory,s.recipes.beacon)){
   if(at(s.pos,SITES.beacon))return{type:'activate',reason:'Signalgerät aktivieren'};
   return{...go(s,SITES.beacon),reason:'Zum Signalgerät'};
  }
  const need=missing(s);
  if(!Object.keys(need).length&&!s.inventory.tool){
   if(at(s.pos,SITES.workshop))return{type:'craft',reason:'Werkzeug bauen'};
   return{...go(s,SITES.workshop),reason:'Zur Werkstatt'};
  }
  const here=s.known.get(id(s.pos.x,s.pos.y));
  if(here?.resource&&(need[here.resource]||0)>0)return{type:'collect',reason:`${here.resource} sammeln`};
  const res=[...s.known.values()].filter(t=>t.resource&&t.amount>0&&need[t.resource]>0).sort((a,b)=>md(a,s.pos)-md(b,s.pos));
  if(res.length)return{...go(s,res[0]),reason:'Bekannten Rohstoff erreichen'};
  const p=frontier(s,need,mem,weight);
  if(p)return{...go(s,p),reason:weight>0?'Mit Erfahrungswahrscheinlichkeiten suchen':'Systematisch suchen'};
  return{type:'idle',reason:'Kein erreichbarer Schritt'};
 };
}
