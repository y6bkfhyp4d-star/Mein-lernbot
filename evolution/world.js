import {MATERIAL_KEYS,makeObject,publicObject,experiment} from './materials.js';
export const SIZE=20;
export function rng(seed){let state=(Number(seed)>>>0)||1;return()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function createWorld(seed=2027){
 const random=rng(seed),cells=[],objects={};
 for(let i=0;i<SIZE*SIZE;i++){
  const r=random();let kind=r<.10?'wall':r<.19?'food':r<.24?'hazard':r<.35?'object':'floor';
  cells.push(kind);
  if(kind==='object')objects[i]=makeObject(MATERIAL_KEYS[Math.floor(random()*MATERIAL_KEYS.length)],`O-${i}`,random);
 }
 const start=10*SIZE+10;
 for(const p of [start,start-1,start+1,start-SIZE,start+SIZE]){cells[p]='floor';delete objects[p];}
 return {version:2,seed,cells,objects,agent:start,energy:100,steps:0,foods:0,hits:0,alive:true,visits:{[start]:1},knowledge:{},experiments:0};
}
export function observe(world){
 const x=world.agent%SIZE,y=Math.floor(world.agent/SIZE);
 const at=(dx,dy)=>{const nx=x+dx,ny=y+dy;if(nx<0||nx>=SIZE||ny<0||ny>=SIZE)return {art:'wall'};const p=ny*SIZE+nx;return world.cells[p]==='object'?{art:'object',objekt:publicObject(world.objects[p])}:{art:world.cells[p]};};
 return {position:{x,y},energie:world.energy,nachbarn:{oben:at(0,-1),unten:at(0,1),links:at(-1,0),rechts:at(1,0)}};
}
export const ACTIONS=['up','down','left','right'];
const delta={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function target(world,direction){if(!ACTIONS.includes(direction))throw Error('Ungültige Richtung');const x=world.agent%SIZE,y=Math.floor(world.agent/SIZE),[dx,dy]=delta[direction],nx=x+dx,ny=y+dy;return nx<0||nx>=SIZE||ny<0||ny>=SIZE?-1:ny*SIZE+nx;}
export function stepWorld(world,action){
 if(!world.alive)return {event:'Agent ohne Energie',observation:observe(world)};
 const p=target(world,action);world.steps++;world.energy=Math.max(0,world.energy-1);
 let event='Bewegung';
 if(p<0||world.cells[p]==='wall'||world.cells[p]==='object'){
  world.hits++;event=p>=0&&world.cells[p]==='object'?'Objekt blockiert den Weg':'Hindernis';
 }else{
  world.agent=p;world.visits[p]=(world.visits[p]||0)+1;
  if(world.cells[p]==='food'){world.foods++;world.energy=Math.min(100,world.energy+25);world.cells[p]='floor';event='Ressource entdeckt (+25 Energie)';}
  else if(world.cells[p]==='hazard'){world.energy=Math.max(0,world.energy-15);event='Gefahr (-15 Energie)';}
 }
 if(world.energy===0){world.alive=false;event+=' · Energie aufgebraucht';}
 return {event,observation:observe(world)};
}
export function inspectWorld(world,direction,action){
 return inspectAtWorld(world,target(world,direction),action);
}
export function inspectAtWorld(world,p,action){
 if(!world.alive)return {event:'Keine Energie'};
 if(p<0||world.cells[p]!=='object')return {event:'Dort befindet sich kein untersuchbares Objekt.'};
 const o=world.objects[p],result=experiment(o,action);
 world.experiments++;world.steps++;world.energy=Math.max(0,world.energy-result.energyCost);
 if(result.discovery)world.knowledge[o.type]={...(world.knowledge[o.type]||{}),...result.discovery};
 if(o.integrity<=0){world.cells[p]='floor';delete world.objects[p];}
 if(world.energy===0)world.alive=false;
 return {event:result.message};
}
