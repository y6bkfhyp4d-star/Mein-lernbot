import {SIZE,ACTIONS,rng,createWorld,observe,stepWorld,inspectWorld} from './world.js';
import {MATERIALS} from './materials.js';
const $=id=>document.getElementById(id),STORAGE='lernbot7.evolution.phase2.v1';
const canvas=$('world'),ctx=canvas.getContext('2d'),seedInput=$('seed'),speedInput=$('speed');
let world=createWorld(2027),random=rng(2027^0xABCDEF),running=false,timer=null,events=[],drawCount=0;
const colors={floor:'#1d2735',wall:'#64748b',food:'#16a34a',hazard:'#dc5353'};
function render(){
 const tile=canvas.width/SIZE;ctx.clearRect(0,0,canvas.width,canvas.height);
 for(let i=0;i<world.cells.length;i++){
  const x=i%SIZE*tile,y=Math.floor(i/SIZE)*tile,kind=world.cells[i];
  ctx.fillStyle=kind==='object'?MATERIALS[world.objects[i].type].color:(colors[kind]||colors.floor);ctx.fillRect(x,y,tile,tile);
  ctx.strokeStyle='rgba(255,255,255,.055)';ctx.strokeRect(x,y,tile,tile);
  if(world.visits[i]&&i!==world.agent){ctx.fillStyle='rgba(167,139,250,.3)';ctx.fillRect(x+tile*.36,y+tile*.36,tile*.28,tile*.28);}
 }
 const ax=(world.agent%SIZE+.5)*tile,ay=(Math.floor(world.agent/SIZE)+.5)*tile;
 ctx.beginPath();ctx.arc(ax,ay,tile*.34,0,Math.PI*2);ctx.fillStyle='#e9d5ff';ctx.fill();
 ctx.beginPath();ctx.arc(ax,ay,tile*.14,0,Math.PI*2);ctx.fillStyle='#6d28d9';ctx.fill();
 for(const [id,value] of [['energy',world.energy+'%'],['steps',world.steps],['foods',world.foods],['hits',world.hits],['unique',Object.keys(world.visits).length],['experiments',world.experiments],['discovered',Object.keys(world.knowledge).length],['state',!world.alive?'Ohne Energie':running?'Läuft':'Pausiert']])$(id).textContent=value;
 $('observation').textContent=JSON.stringify(observe(world),null,2);
 $('knowledge').textContent=Object.keys(world.knowledge).length?JSON.stringify(world.knowledge,null,2):'Noch keine Materialien untersucht.';
 $('events').replaceChildren(...events.slice(-10).reverse().map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
 $('run').textContent=running?'Pause':'Start';$('speedText').textContent=speedInput.value+' Schritte/s';
}
function log(msg){events.push('Schritt '+world.steps+': '+msg);if(events.length>120)events=events.slice(-120);}
function tick(){if(!world.alive){pause();return;}const action=ACTIONS[Math.floor(random()*ACTIONS.length)];drawCount++;const result=stepWorld(world,action);if(result.event!=='Bewegung')log(result.event);if(!world.alive)pause();render();}
function pause(){running=false;if(timer!==null)clearInterval(timer);timer=null;render();}
function start(){if(!world.alive)return;pause();running=true;timer=setInterval(tick,1000/Number(speedInput.value));render();}
function reset(){pause();const seed=Number(seedInput.value);if(!Number.isSafeInteger(seed)||seed<1||seed>4294967295){alert('Seed muss zwischen 1 und 4294967295 liegen.');return;}world=createWorld(seed);random=rng(seed^0xABCDEF);drawCount=0;events=[];log('Neue Phase-2-Welt: Seed '+seed);render();}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify({world,events,drawCount}));log('Speicherstand angelegt');render();}catch(e){alert('Speichern fehlgeschlagen: '+e.message);}}
function valid(w){return w&&w.version===2&&Array.isArray(w.cells)&&w.cells.length===SIZE*SIZE&&w.objects&&typeof w.objects==='object'&&w.knowledge&&typeof w.knowledge==='object'&&Number.isInteger(w.seed)&&w.seed>=1&&w.seed<=4294967295&&Number.isInteger(w.agent)&&w.agent>=0&&w.agent<SIZE*SIZE&&Number.isFinite(w.energy)&&w.energy>=0&&w.energy<=100&&Number.isInteger(w.steps)&&w.steps>=0&&Number.isInteger(w.experiments)&&w.experiments>=0&&w.visits&&typeof w.visits==='object'&&w.cells.every((c,i)=>['floor','wall','food','hazard','object'].includes(c)&&(c!=='object'||(w.objects[i]&&MATERIALS[w.objects[i].type])));}
function load(){try{const raw=localStorage.getItem(STORAGE);if(!raw){alert('Noch kein Phase-2-Speicherstand.');return;}const data=JSON.parse(raw);if(!valid(data.world)||!Array.isArray(data.events))throw Error('Ungültiger Speicherstand');pause();world=data.world;events=data.events.slice(-120).map(x=>String(x).slice(0,200));seedInput.value=world.seed;random=rng(world.seed^0xABCDEF);drawCount=Number.isInteger(data.drawCount)&&data.drawCount>=0&&data.drawCount<=10000000?data.drawCount:0;for(let i=0;i<drawCount;i++)random();log('Speicherstand geladen');render();}catch(e){alert('Laden fehlgeschlagen: '+e.message);}}
$('run').addEventListener('click',()=>running?pause():start());$('once').addEventListener('click',()=>{pause();tick();});$('reset').addEventListener('click',reset);$('save').addEventListener('click',save);$('load').addEventListener('click',load);
$('try').addEventListener('click',()=>{pause();const result=inspectWorld(world,$('direction').value,$('action').value);log(result.event);render();});
speedInput.addEventListener('input',()=>{if(running)start();else render();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
log('Phase-2-Welt mit Seed 2027 erstellt');render();
