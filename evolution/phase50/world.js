export const SIZE=8;
export const TYPES=['wood','ore','crystal'];
export const NAMES={wood:'Holz',ore:'Erz',crystal:'Kristall'};
export const SPECIAL={lab:'Labor',workshop:'Werkstatt',beacon:'Signalgerät'};
export const START={x:0,y:0};
export const SITES={lab:{x:1,y:6},workshop:{x:6,y:1},beacon:{x:6,y:6}};
export function rng(seed){let s=(seed>>>0)||1;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
export const id=(x,y)=>`${x},${y}`;
export const at=(p,q)=>p.x===q.x&&p.y===q.y;
export const neighbors=p=>[{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(q=>q.x>=0&&q.x<SIZE&&q.y>=0&&q.y<SIZE);
export function createWorld(seed=2027){
 const r=rng(seed),reserved=new Set([id(START.x,START.y),...Object.values(SITES).map(p=>id(p.x,p.y))]);
 const walls=new Set();for(let tries=0;tries<240&&walls.size<10;tries++){const x=Math.floor(r()*SIZE),y=Math.floor(r()*SIZE),k=id(x,y);if(reserved.has(k)||walls.has(k))continue;walls.add(k);if(reachable(walls).size!==SIZE*SIZE-walls.size)walls.delete(k);}
 const tiles=new Map();for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const k=id(x,y);tiles.set(k,{x,y,wall:walls.has(k),resource:null,amount:0,site:Object.keys(SITES).find(name=>at({x,y},SITES[name]))||null});}
 const available=[...tiles.values()].filter(t=>!t.wall&&!t.site&&!at(t,START));
 for(const type of TYPES){for(let j=0;j<5;j++){const opts=available.filter(t=>!t.resource);const tile=opts.splice(Math.floor(r()*opts.length),1)[0];tile.resource=type;tile.amount=1;}}
 const recipeIndex=Math.floor(r()*2);const toolRecipe=recipeIndex===0?{wood:1,ore:1}:{wood:1,crystal:1};const beaconCost=recipeIndex===0?{crystal:1}:{ore:1};
 return{seed,tiles,recipes:{tool:toolRecipe,beacon:beaconCost},start:{...START}};
}
function reachable(walls){const seen=new Set([id(START.x,START.y)]),queue=[START];for(let i=0;i<queue.length;i++)for(const q of neighbors(queue[i])){const k=id(q.x,q.y);if(!seen.has(k)&&!walls.has(k)){seen.add(k);queue.push(q);}}return seen;}
export function createState(w){return{world:w,pos:{...w.start},inventory:{wood:0,ore:0,crystal:0,tool:0},known:new Map(),recipes:null,steps:0,success:false,log:[],events:[]};}
export function observe(s){for(const p of [s.pos,...neighbors(s.pos)]){const t=s.world.tiles.get(id(p.x,p.y));s.known.set(id(p.x,p.y),{...t});}}
export function action(s,a){if(s.success)return{ok:false,message:'Ziel bereits erreicht'};s.steps++;let message='',ok=false;
 if(a.type==='move'){const next={x:s.pos.x+a.dx,y:s.pos.y+a.dy};if(neighbors(s.pos).some(q=>at(q,next))&&!s.world.tiles.get(id(next.x,next.y)).wall){s.pos=next;ok=true;message=`Bewegt zu ${id(next.x,next.y)}`;}else message='Weg blockiert';}
 else if(a.type==='collect'){const t=s.world.tiles.get(id(s.pos.x,s.pos.y));if(t.resource&&t.amount>0){s.inventory[t.resource]++;message=`${NAMES[t.resource]} gesammelt`;ok=true;t.amount--;if(t.amount===0)t.resource=null;}else message='Hier liegt kein Rohstoff';}
 else if(a.type==='research'){if(at(s.pos,SITES.lab)){s.recipes=structuredClone(s.world.recipes);ok=true;message=`Rezept erforscht: Werkzeug = ${pretty(s.recipes.tool)}, Aktivierung = Werkzeug + ${pretty(s.recipes.beacon)}`;}else message='Forschung nur im Labor möglich';}
 else if(a.type==='craft'){if(at(s.pos,SITES.workshop)&&s.recipes&&enough(s.inventory,s.recipes.tool)){consume(s.inventory,s.recipes.tool);s.inventory.tool++;ok=true;message='Werkzeug hergestellt';}else message='Werkstatt, Bauplan oder Materialien fehlen';}
 else if(a.type==='activate'){if(at(s.pos,SITES.beacon)&&s.inventory.tool>=1&&s.recipes&&enough(s.inventory,s.recipes.beacon)){consume(s.inventory,s.recipes.beacon);s.inventory.tool--;s.success=true;ok=true;message='Signalgerät aktiviert – Mission erfüllt!';}else message='Gerät noch nicht aktivierbar';}
 else message='Unbekannte Aktion';
 observe(s);s.events.push({step:s.steps,action:a.type,ok,message});if(s.events.length>300)s.events.shift();return{ok,message};}
export function enough(inv,cost){return Object.entries(cost).every(([k,n])=>inv[k]>=n);}
export function consume(inv,cost){for(const [k,n]of Object.entries(cost))inv[k]-=n;}
export function pretty(cost){return Object.entries(cost).map(([k,v])=>`${v}× ${NAMES[k]||k}`).join(' + ');}
export function path(start,goal,known){const q=[start],back=new Map([[id(start.x,start.y),null]]);let found=false;for(let i=0;i<q.length;i++){const p=q[i],pk=id(p.x,p.y);if(at(p,goal)){found=true;break;}for(const n of neighbors(p)){const nk=id(n.x,n.y);if(back.has(nk)||known.get(nk)?.wall)continue;back.set(nk,pk);q.push(n);}}
 if(!found)return null;const route=[];let cur=id(goal.x,goal.y);while(cur!==id(start.x,start.y)){const [x,y]=cur.split(',').map(Number);route.unshift({x,y});cur=back.get(cur);if(cur===undefined)return null;}return route;}
export function snapshot(s){return{steps:s.steps,pos:{...s.pos},inventory:{...s.inventory},recipes:s.recipes?structuredClone(s.recipes):null,success:s.success,known:[...s.known.values()].map(x=>({...x})),events:[...s.events]};}
