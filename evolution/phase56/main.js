import {SIZE,id} from './world.js';
import {episode,compare56,learn,initialModel,safeModel} from './rl56.js';
const $=id=>document.getElementById(id),fix=n=>Number(n).toFixed(2);
const KEY='lernbot7.phase56.actions.v1';let personal=initialModel(),report='',raw=null,single='';
try{personal=safeModel(JSON.parse(localStorage.getItem(KEY)));}catch{personal=initialModel();}
function seed(){const s=Number($('seed').value);if(!Number.isInteger(s)||s<1||s>4294967295)throw Error('Bitte einen gültigen Seed von 1 bis 4294967295 eingeben.');return s;}
function status(s){$('status').textContent=s;}
function saved(){try{localStorage.setItem(KEY,JSON.stringify(personal));return true;}catch{return false;}}
function personalInfo(){const n=Object.values(personal.visits).reduce((a,b)=>a+b,0);$('personal').textContent=`${personal.episodes} Trainingswelten · ${Object.keys(personal.q).length} Q-Zustände · ${n} Q-Updates`;}personalInfo();
async function copy(t){if(!t)return status('Noch keine Ergebnisse vorhanden.');try{await navigator.clipboard.writeText(t);status('Kopiert – jetzt hier im Chat einfügen.');}catch{const area=document.createElement('textarea');area.value=t;area.style.cssText='position:fixed;top:8%;left:4%;width:92%;height:62%;z-index:9999;background:#1d192c;color:white;padding:14px';document.body.append(area);area.focus();area.select();const close=document.createElement('button');close.textContent='Textfeld schließen';close.style.cssText='position:fixed;top:72%;left:4%;z-index:10000';close.onclick=()=>{area.remove();close.remove()};document.body.append(close);status('Text markiert: über Kopieren übernehmen.');}}
function mapRender(run){const map=$('map');map.replaceChildren();for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
 const tile=run.state.known.get(id(x,y)),el=document.createElement('div');el.className='cell';let icon='?';if(!tile)el.classList.add('unknown');else if(tile.wall){icon='🪨';el.classList.add('wall');}else if(tile.site==='lab')icon='🧪';else if(tile.site==='workshop')icon='🛠️';else if(tile.site==='beacon')icon='📡';else if(tile.resource==='wood')icon='🌲';else if(tile.resource==='ore')icon='⛏️';else if(tile.resource==='crystal')icon='💎';else icon='·';if(run.state.pos.x===x&&run.state.pos.y===y){icon='👤';el.classList.add('hero')}el.textContent=icon;map.append(el);
 }}
const entry=s=>{const li=document.createElement('li');li.textContent=s;return li;};
function singleRun(){const s=seed(),usePersonal=$('mode').value==='personal';const e=episode(s,usePersonal?personal:null,{mode:usePersonal?'q':'base',trace:true});mapRender(e);
 $('info').textContent=`${e.success?'Mission erfüllt':'Mission nicht abgeschlossen'} · ${e.steps} Schritte · ${e.energyUsed} Energie · ${e.rests} Pausen · ${e.overrides} selbst gewählte Richtungsabweichungen · ${e.explored}/64 entdeckte Felder · ${e.biome}`;
 $('decisions').replaceChildren(...e.trace.filter(x=>x.label!=='follow').slice(-35).map(x=>entry(`Schritt ${x.step}: ${x.label} · ${x.event} · Belohnung ${x.earned}`)));
 single=`PHASE 5.6 – EINZELWELT\nSeed: ${s}\nStrategie: ${usePersonal?'persönlicher Q-Agent':'Basis'}\nErfolg: ${e.success}\nSchritte: ${e.steps}\nEnergie: ${e.energyUsed}\nPausen: ${e.rests}\nRichtungsabweichungen: ${e.overrides}\nEntdeckte Felder: ${e.explored}/64\n`;
 status('Einzelwelt abgeschlossen.');}
function reportFormat(x){const lines=[`LERNBOT 7.0 – PHASE 5.6`,`Q-LEARNING MIT EINZELAKTIONEN UND ENERGIE`,`Seed ${x.seed} · 100 Testwelten · 180 Aktionen/Welt`, '',`BASIS: ${x.base.solved}/${x.base.count} Missionen · ${fix(x.base.mean)} Schritte · ${fix(x.base.energy)} Energie · ${fix(x.base.rests)} Pausen`, '',`LERNKURVE`];
 for(const s of x.stages){lines.push(`Training ${s.training}: ${s.metrics.solved}/${s.metrics.count} · ${fix(s.metrics.mean)} Schritte · ${fix(s.metrics.energy)} Energie · ${fix(s.metrics.rests)} Pausen · schneller ${s.faster}, langsamer ${s.slower}, gleich ${s.equal}`);
 lines.push(`  Validierung: Basis ${fix(s.valid.base.mean)}, freier Q-Agent ${fix(s.valid.candidate.mean)} · Erfolge ${s.valid.candidate.solved}/32 · freigegeben ${s.valid.accepted?'ja':'nein'}`);
 lines.push(`  Aktiv: ${s.mode==='q'?'Q-Learning':'Basis (Rückfall)'} · Zustände ${s.states} · Q-Updates ${s.updates} · Richtungsabweichungen im Test ${s.metrics.overrides}`);}
 lines.push('',`EINZELWELTEN NACH 500 TRAININGSWELTEN`);
 for(const w of x.worlds)lines.push(`${w.seed} (${w.biome}): Basis ${w.base} · gewählt ${w.chosen} · ${w.success?'OK':'MISS'} · Pausen ${w.rest} · freie Richtungen ${w.overrides}`);
 lines.push('',`METHODIK`,x.method,`Die Auswahl erfolgt nur über Validierungswelten. Der neue Agent kann Richtungen und Pausen wählen, benutzt für die Hauptmission weiterhin einen sicheren Basisplaner als Vorschlag. Lernen wird nicht mit garantiertem Fortschritt gleichgesetzt. Die bekannte Mission und der Weltgenerator stammen aus Phase 5.5. Lokale Simulation, keine allgemeine KI.`);return lines.join('\n');}
function curve(x){$('curve').replaceChildren(...x.stages.map(s=>{const row=document.createElement('div');row.className='curve-row';const l=document.createElement('span');l.textContent=`${s.training} Welten`;const track=document.createElement('div');track.className='track';const fill=document.createElement('div');fill.className='fill';fill.style.width=`${Math.max(2,Math.min(100,100*(x.base.mean/s.metrics.mean)))}%`;track.append(fill);const val=document.createElement('strong');val.textContent=fix(s.metrics.mean);row.append(l,track,val);return row;}));}
function busy(btn,fn){btn.disabled=true;status('Berechnung läuft …');setTimeout(()=>{try{fn();}catch(err){console.error(err);status('Fehler: '+err.message);}finally{btn.disabled=false;}},60);}
$('single').onclick=()=>busy($('single'),singleRun);
$('singlecopy').onclick=()=>copy(single);
$('train').onclick=()=>busy($('train'),()=>{personal=learn(seed(),25,personal,80000);personalInfo();status(saved()?'25 Welten trainiert und lokal gespeichert.':'Trainiert, aber Browser-Speicher nicht verfügbar.');});
$('memorycopy').onclick=()=>copy(JSON.stringify(personal,null,2));
$('reset').onclick=()=>{if(!confirm('Gesamtes persönliche Phase-5.6-Gedächtnis löschen?'))return;personal=initialModel();try{localStorage.removeItem(KEY);}catch{}personalInfo();status('Persönliches Gedächtnis zurückgesetzt.');};
$('compare').onclick=()=>busy($('compare'),()=>{raw=compare56(seed(),100);report=reportFormat(raw);$('report').textContent=report;curve(raw);for(const k of ['copy','json','txt'])$(k).disabled=false;status('Lernkurve berechnet. Bericht kann kopiert werden.');});
$('copy').onclick=()=>copy(report);$('json').onclick=()=>copy(raw?JSON.stringify(raw,null,2):'');
$('txt').onclick=()=>{if(!report)return;const file=new Blob([report],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download='lernbot-phase56-ergebnisse.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
