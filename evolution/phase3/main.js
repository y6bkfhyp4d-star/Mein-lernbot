import {SIZE,rng,createWorld,inspectAtWorld} from '../world.js';
import {MATERIALS} from '../materials.js';
import {createBrain,chooseExperiment,recordExperiment,scoreBrain,runTrial} from './learning.js';
const $=id=>document.getElementById(id);
const KEY='lernbot7.evolution.phase3.v1';
let world,brain,random,mode='curious',timer=null,running=false,logs=[];
const colors={floor:'#1d2735',wall:'#64748b',food:'#16a34a',hazard:'#dc5353'};
function stop(){running=false;if(timer)clearInterval(timer);timer=null;$('start').textContent='Start';}
function setup(){stop();const seed=Number($('seed').value);if(!Number.isSafeInteger(seed)||seed<1||seed>4294967295){alert('Seed zwischen 1 und 4294967295 wählen.');return;}world=createWorld(seed);brain=createBrain();random=rng(seed^0x5A17);logs=[];render();}
function render(){if(!world)return;const c=$('world'),ctx=c.getContext('2d'),tile=c.width/SIZE;ctx.clearRect(0,0,c.width,c.height);
 for(let i=0;i<world.cells.length;i++){const x=i%SIZE*tile,y=Math.floor(i/SIZE)*tile;ctx.fillStyle=world.cells[i]==='object'?MATERIALS[world.objects[i].type].color:(colors[world.cells[i]]||colors.floor);ctx.fillRect(x,y,tile,tile);ctx.strokeStyle='rgba(255,255,255,.06)';ctx.strokeRect(x,y,tile,tile);}
 const ax=(world.agent%SIZE+.5)*tile,ay=(Math.floor(world.agent/SIZE)+.5)*tile;ctx.fillStyle='#e9d5ff';ctx.beginPath();ctx.arc(ax,ay,tile*.35,0,Math.PI*2);ctx.fill();
 const score=scoreBrain(brain);$('status').textContent=world.alive?(running?'Forscht':'Pausiert'):'Energie aufgebraucht';$('energy').textContent=world.energy+' %';$('experiments').textContent=score.experiments;$('properties').textContent=score.knownProperties;$('types').textContent=score.types;$('novel').textContent=score.novelExperiments;
 $('knowledge').textContent=Object.keys(world.knowledge).length?JSON.stringify(world.knowledge,null,2):'Noch keine Erkenntnisse.';
 $('log').replaceChildren(...logs.slice(-12).reverse().map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));$('start').textContent=running?'Pause':'Start';
}
function tick(){if(!world.alive){stop();render();return;}const choice=chooseExperiment(brain,world,random,mode);if(!choice){stop();logs.push('Keine untersuchbaren Objekte mehr.');render();return;}
 const result=inspectAtWorld(world,choice.index,choice.action);const added=recordExperiment(brain,world,choice,result);
 logs.push(`${MATERIALS[choice.type].name} · ${choice.action} · ${added.length?'Neu: '+added.join(', '):'Keine neue Eigenschaft'} · ${result.event}`);
 if(!world.alive)stop();render();}
function start(){if(running){stop();render();return;}if(!world.alive)return;running=true;timer=setInterval(tick,1000/Number($('speed').value));render();}
function compare(){const seed=Number($('seed').value);if(!Number.isSafeInteger(seed)||seed<1||seed>4294967295){alert('Ungültiger Seed');return;}
 // Each strategy starts in its own identical world. The seed is fixed for reproducibility.
 const a=runTrial(seed,'random',createWorld,inspectAtWorld,rng,35),b=runTrial(seed,'curious',createWorld,inspectAtWorld,rng,35);
 $('comparison').textContent=`35 Experimente, Seed ${seed}\nZufall: ${a.score.knownProperties} Eigenschaften, ${a.score.types} Materialarten, ${a.score.novelExperiments} Erkenntnis-Experimente\nNeugier: ${b.score.knownProperties} Eigenschaften, ${b.score.types} Materialarten, ${b.score.novelExperiments} Erkenntnis-Experimente\n\nDies ist nur ein einzelner Vergleich, kein Beweis für allgemeine Intelligenz.`;
}
function save(){stop();try{localStorage.setItem(KEY,JSON.stringify({world,brain,logs,mode}));logs.push('Gespeichert');render();}catch(e){alert('Speichern fehlgeschlagen: '+e.message);}}
function load(){stop();try{const raw=localStorage.getItem(KEY);if(!raw)throw Error('Kein Speicherstand vorhanden');const data=JSON.parse(raw);if(!data.world||data.world.version!==2||!Array.isArray(data.world.cells)||data.world.cells.length!==SIZE*SIZE||!data.brain||!Array.isArray(data.brain.history))throw Error('Ungültige Daten');world=data.world;brain=data.brain;logs=Array.isArray(data.logs)?data.logs.slice(-120):[];mode=data.mode==='random'?'random':'curious';$('mode').value=mode;$('seed').value=world.seed;
 // Restore the deterministic RNG stream by replaying draws for the recorded choices.
 random=rng(world.seed^0x5A17);
 // For robust reproducibility, each experiment's RNG usage is restored via the saved draw counter in future versions.
 logs.push('Geladen (Zufallsfolge wird ab Startseed neu begonnen)');render();}catch(e){alert('Laden fehlgeschlagen: '+e.message);}}
$('start').addEventListener('click',start);$('once').addEventListener('click',()=>{stop();tick();});$('reset').addEventListener('click',setup);$('mode').addEventListener('change',e=>{mode=e.target.value;render();});$('speed').addEventListener('input',()=>{if(running){stop();start();}});$('compare').addEventListener('click',compare);$('save').addEventListener('click',save);$('load').addEventListener('click',load);document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});setup();
