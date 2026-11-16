import {SIZE,TYPES,SITES,at,id,path,rng,enough} from './world.js';
import {probability} from './memory.js';
const md=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const move=(a,b)=>({type:'move',dx:b.x-a.x,dy:b.y-a.y});
const goto=(s,p)=>{const rt=path(s.pos,p,s.known);return rt?.length?move(s.pos,rt[0]):null;};
function missing(s){if(!s.recipes)return{};let target=s.inventory.tool?s.recipes.beacon:Object.fromEntries(TYPES.map(k=>[k,(s.recipes.tool[k]||0)+(s.recipes.beacon[k]||0)]));return Object.fromEntries(Object.entries(target).filter(([k,n])=>n>s.inventory[k]).map(([k,n])=>[k,n-s.inventory[k]]));}
function frontier(s,missing,mem){const pool=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const p={x,y};if(s.known.has(id(x,y)))continue;const route=path(s.pos,p,s.known);if(!route||!route.length)continue;let score=route.length;if(mem&&Object.keys(missing).length){const likelihood=Object.keys(missing).reduce((a,t)=>a+probability(mem,s.world.biome,t,p),0);const visits=Math.min(1,mem.episodes/12);score-=Math.min(6,visits*likelihood*21);}pool.push({p,score,dist:route.length});}pool.sort((a,b)=>a.score-b.score||a.dist-b.dist||a.p.y-b.p.y||a.p.x-b.p.x);return pool[0]?.p;}
export function createPolicy51(seed,mode='planner',memory=null){const r=rng(seed^0xace321);return s=>{
 if(s.success)return{type:'done',reason:'Mission abgeschlossen'};
 if(!s.recipes){if(at(s.pos,SITES.lab))return{type:'research',reason:'Neues Rezept im Labor erforschen'};return{...goto(s,SITES.lab),reason:'Zum Labor laufen'};}
 if(s.inventory.tool&&enough(s.inventory,s.recipes.beacon)){if(at(s.pos,SITES.beacon))return{type:'activate',reason:'Signalgerät aktivieren'};return{...goto(s,SITES.beacon),reason:'Zum Signalgerät laufen'};}
 const need=missing(s);if(!Object.keys(need).length&&!s.inventory.tool){if(at(s.pos,SITES.workshop))return{type:'craft',reason:'Werkzeug herstellen'};return{...goto(s,SITES.workshop),reason:'Zur Werkstatt laufen'};}
 const current=s.known.get(id(s.pos.x,s.pos.y));if(current?.resource&&(need[current.resource]||0)>0)return{type:'collect',reason:'Benötigten Rohstoff einsammeln'};
 const resources=[...s.known.values()].filter(t=>t.resource&&t.amount>0&&need[t.resource]>0).sort((a,b)=>md(a,s.pos)-md(b,s.pos));if(resources.length)return{...goto(s,resources[0]),reason:'Bekannten Rohstoff aufsuchen'};
 // Memory biases only which unknown cell to investigate; it never reveals hidden tiles.
 const p=frontier(s,need,mode==='memory'?memory:null);if(p)return{...goto(s,p),reason:mode==='memory'?'Erfahrungsbasiert erkunden':'Systematisch erkunden'};
 return{type:'idle',reason:'Keine erreichbare Aufgabe'};
};}
