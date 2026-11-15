import {SIZE, ACTIONS, rng, createWorld, observe, stepWorld} from './world.js';
const $ = id => document.getElementById(id);
const STORAGE = 'lernbot7.evolution.phase1.v1';
const canvas = $('world'), ctx = canvas.getContext('2d');
const seedInput = $('seed'), speedInput = $('speed'), speedText = $('speedText');
let world = createWorld(2027), random = rng(2027 ^ 0xABCDEF), running = false, timer = null;
let events = [];
const symbols = {floor:'#1d2735', wall:'#64748b', food:'#16a34a', hazard:'#dc5353'};
function render() {
  const tile = canvas.width / SIZE;
  for (let i=0;i<world.cells.length;i++) {
    const x=(i%SIZE)*tile, y=Math.floor(i/SIZE)*tile;
    ctx.fillStyle = symbols[world.cells[i]] || symbols.floor;
    ctx.fillRect(x,y,tile,tile);
    ctx.strokeStyle='rgba(255,255,255,.055)'; ctx.strokeRect(x,y,tile,tile);
    if (world.visits[i] && i!==world.agent) {
      ctx.fillStyle='rgba(167,139,250,.25)'; ctx.fillRect(x+tile*.34,y+tile*.34,tile*.32,tile*.32);
    }
  }
  const ax=(world.agent%SIZE)*tile+tile/2, ay=Math.floor(world.agent/SIZE)*tile+tile/2;
  ctx.beginPath();ctx.arc(ax,ay,tile*.34,0,Math.PI*2);ctx.fillStyle='#e9d5ff';ctx.fill();
  ctx.beginPath();ctx.arc(ax,ay,tile*.14,0,Math.PI*2);ctx.fillStyle='#6d28d9';ctx.fill();
  $('energy').textContent=world.energy+'%'; $('steps').textContent=world.steps;
  $('foods').textContent=world.foods; $('hits').textContent=world.hits;
  $('unique').textContent=Object.keys(world.visits).length;
  $('state').textContent=!world.alive?'Ohne Energie':running?'Läuft':'Pausiert';
  $('observation').textContent=JSON.stringify(observe(world),null,2);
  $('events').replaceChildren(...events.slice(-9).reverse().map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
  $('run').textContent=running?'Pause':'Start';
  speedText.textContent=speedInput.value+' Schritte/s';
}
function log(message){events.push('Schritt '+world.steps+': '+message);if(events.length>120)events=events.slice(-120);}
function tick(){if(!world.alive){pause();return;}const action=ACTIONS[Math.floor(random()*ACTIONS.length)];const result=stepWorld(world,action);if(result.event!=='Bewegung')log(result.event);if(!world.alive)pause();render();}
function pause(){running=false;if(timer!==null)clearInterval(timer);timer=null;render();}
function start(){if(!world.alive)return;pause();running=true;timer=setInterval(tick,1000/Number(speedInput.value));render();}
function reset(){pause();const seed=Number(seedInput.value);if(!Number.isSafeInteger(seed)||seed<1||seed>4294967295){alert('Seed muss eine ganze Zahl zwischen 1 und 4294967295 sein.');return;}world=createWorld(seed);random=rng(seed^0xABCDEF);events=[];log('Welt mit Seed '+seed+' erstellt');render();}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify({world,events}));log('Speicherstand angelegt');render();}catch(e){alert('Speichern fehlgeschlagen: '+e.message);}}
function load(){try{const raw=localStorage.getItem(STORAGE);if(!raw){alert('Noch kein Speicherstand vorhanden.');return;}const data=JSON.parse(raw);const w=data.world;if(!w||!Array.isArray(w.cells)||w.cells.length!==SIZE*SIZE||!Number.isInteger(w.seed)||!Number.isInteger(w.agent)||w.agent<0||w.agent>=SIZE*SIZE||!Number.isFinite(w.energy)||w.energy<0||w.energy>100||!Number.isInteger(w.steps)||w.steps<0||!w.visits||typeof w.visits!=='object'||!Array.isArray(data.events)){throw new Error('Ungültiger Speicherstand');}pause();world=w;events=data.events.slice(-120).map(x=>String(x).slice(0,200));seedInput.value=world.seed;random=rng(world.seed^0xABCDEF);for(let i=0;i<world.steps;i++)random();log('Speicherstand geladen');render();}catch(e){alert('Laden fehlgeschlagen: '+e.message);}}
$('run').addEventListener('click',()=>running?pause():start());
$('once').addEventListener('click',()=>{pause();tick();});
$('reset').addEventListener('click',reset);
$('save').addEventListener('click',save);
$('load').addEventListener('click',load);
speedInput.addEventListener('input',()=>{if(running)start();else render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
log('Welt mit Seed 2027 erstellt');render();
