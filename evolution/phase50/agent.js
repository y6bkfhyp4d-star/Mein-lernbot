import{SIZE,TYPES,SITES,at,id,neighbors,path,rng,enough}from'./world.js';
const manhattan=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const directions=(a,b)=>({type:'move',dx:b.x-a.x,dy:b.y-a.y});
function goto(s,target){const route=path(s.pos,target,s.known);return route?.length?directions(s.pos,route[0]):null;}
function needs(s){if(!s.recipes)return{};const needed={...s.recipes.tool};const target=s.inventory.tool?{...s.recipes.beacon}:Object.fromEntries(TYPES.map(k=>[k,(needed[k]||0)+(s.recipes.beacon[k]||0)]));return Object.fromEntries(Object.entries(target).filter(([k,n])=>n>(s.inventory[k]||0)).map(([k,n])=>[k,n-s.inventory[k]]));}
function resourceTarget(s,missing,mode,r){const candidates=[...s.known.values()].filter(t=>t.resource&&t.amount>0&&(missing[t.resource]||0)>0);candidates.sort((a,b)=>manhattan(a,s.pos)-manhattan(b,s.pos));return mode==='baseline'&&candidates.length>1?candidates[Math.floor(r()*candidates.length)]:candidates[0]||null;}
function frontierTarget(s,r,mode){const list=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const p={x,y};if(s.known.get(id(x,y))?.wall||s.known.has(id(x,y)))continue;const route=path(s.pos,p,s.known);if(route){const dist=route.length;const score=mode==='planner'?dist:dist+r()*16;list.push({p,score});}}
 list.sort((a,b)=>a.score-b.score);return list[0]?.p||null;}
export function decide(s,mode='planner',seedRandom=()=>0.5){const r=seedRandom;
 if(s.success)return{type:'done',reason:'Ziel erreicht'};
 // Each strategy can see only discovered cells and learned recipes.
 if(!s.recipes){if(at(s.pos,SITES.lab))return{type:'research',reason:'Baupläne im Labor erforschen'};return{...goto(s,SITES.lab),reason:'Zum Labor navigieren und die Baupläne erlernen'};}
 if(s.inventory.tool&&enough(s.inventory,s.recipes.beacon)){if(at(s.pos,SITES.beacon))return{type:'activate',reason:'Mehrstufiges Ziel abschließen'};return{...goto(s,SITES.beacon),reason:'Mit Werkzeug und Rohstoff zum Ziel'};}
 const missing=needs(s);
 if(!Object.keys(missing).length&&!s.inventory.tool){if(at(s.pos,SITES.workshop))return{type:'craft',reason:'Gelerntes Rezept anwenden'};return{...goto(s,SITES.workshop),reason:'Zur Werkstatt für Werkzeugbau'};}
 const knownCurrent=s.known.get(id(s.pos.x,s.pos.y));if(knownCurrent?.resource&&(missing[knownCurrent.resource]||0)>0)return{type:'collect',reason:`Benötigten Rohstoff ${knownCurrent.resource} einsammeln`};
 const res=resourceTarget(s,missing,mode,r);if(res){return{...goto(s,res),reason:`Bekannten benötigten Rohstoff ${res.resource} aufsuchen`};}
 const dest=frontierTarget(s,r,mode);if(dest){return{...goto(s,dest),reason:'Unbekanntes Gebiet erkunden'};}
 return{type:'idle',reason:'Keine erreichbare Aktion gefunden'};
}
export function createPolicy(seed,mode='planner'){const r=rng(seed^0xace321);return s=>decide(s,mode,r);}
