import {safeDb,graph,answer} from './knowledge71.js';
import {episode,initialModel,learn,seriesSeeds} from './rl62.js';
const $=id=>document.getElementById(id);
let db=safeDb({}),net=graph(db),experiment=null;
const add=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=String(text);if(cls)n.className=cls;return n};
const avg=(a,key)=>a.length?a.reduce((s,x)=>s+Number(x[key]||0),0)/a.length:0;
const format=n=>Number(n).toFixed(2);
function render(){
 $('count').textContent=db.entries.length;$('runs').textContent=db.runs.length;$('edges').textContent=net.edges.length;
 $('items').replaceChildren();
 for(const e of db.entries.slice(-18).reverse()){
  const art=add('article',undefined,'entry'),title=add('strong',e.title),body=add('p',e.excerpt.slice(0,320)+(e.excerpt.length>320?'…':'')),src=add('a','Originalquelle ↗');src.href=e.url;src.target='_blank';src.rel='noopener noreferrer';art.append(title,body,src,add('small',' · Einzelquelle – unbestätigt'));$('items').append(art);
 }
 if(!db.entries.length)$('items').append(add('p','Noch keine Einträge. Prüfe den Phase-7.0-Workflow.'));
 $('relations').replaceChildren();for(const edge of net.edges.slice(0,25))$('relations').append(add('div',`${net.nodes[edge.a]?.label} ↔ ${net.nodes[edge.b]?.label} · Text-Erwähnung, unbestätigt`,'relation'));
 if(!net.edges.length)$('relations').textContent='Noch keine Beziehungen erkannt. Das ist bei wenigen Einträgen normal.';
 $('integration').textContent=`Internetwissen: ${db.entries.length} Einträge aus Phase 7.0\nWissensnetz: ${net.edges.length} heuristische Beziehungen\nEhemaliges Q-Labor: Phase 6.2 als eigenständige Originalmodule eingebunden\nWissenstransfer zwischen Sachwissen und Navigation: NICHT IMPLEMENTIERT\nAutomatische Recherche: weiterhin über den vorhandenen Phase-7.0-Workflow\nUnabhängige Quellenprüfung: NICHT IMPLEMENTIERT`;
}
async function load(){try{$('status').textContent='Lade Phase-7.0-Daten …';const r=await fetch('../phase70/knowledge.json?refresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);db=safeDb(await r.json());net=graph(db);render();$('status').textContent=`Geladen: ${db.entries.length} Einträge. Letzter Lernlauf: ${db.runs.at(-1)?.time||'keiner'}.`;return true;}catch(e){$('status').textContent=`Laden fehlgeschlagen: ${e.message}. Prüfe, ob Phase 7.0 im selben Repository veröffentlicht ist.`;return false;}}
$('refresh').onclick=load;
$('ask').onclick=()=>{const q=$('question').value.trim();if(!q)return $('answer').textContent='Bitte zuerst eine Frage eingeben.';const a=answer(db,q);$('answer').replaceChildren();$('answer').append(add('p',a.summary));for(const m of a.matches){const link=add('a',`${m.entry.title} · Trefferwert ${m.score}`);link.href=m.entry.url;link.target='_blank';link.rel='noopener noreferrer';$('answer').append(link,add('span','  '));}$('answer').append(add('p','Antwort ist ein Quellenauszug; keine eigenständige Faktenprüfung.'));};
$('question').addEventListener('keydown',e=>{if(e.key==='Enter')$('ask').click()});
$('experiment').onclick=()=>{$('experiment').disabled=true;$('experimentResult').textContent='Lernexperiment läuft …';setTimeout(()=>{try{
 const seed=Number($('seed').value),count=Number($('worlds').value);if(!Number.isInteger(seed)||seed<1||seed>4294967295||![5,10,20].includes(count))throw Error('Seed oder Testzahl ungültig');
 const model=learn(seed,25,initialModel(),240000,'hybrid'),seeds=seriesSeeds(seed,count,11600000);
 const base=seeds.map(s=>episode(s,null,{mode:'base'})),hybrid=seeds.map(s=>episode(s,model,{mode:'architecture62'}));
 let better=0,worse=0,equal=0;for(let i=0;i<count;i++){if(hybrid[i].penalty<base[i].penalty)better++;else if(hybrid[i].penalty>base[i].penalty)worse++;else equal++;}
 experiment={seed,count,trained:25,states:Object.keys(model.q).length,baseline:{success:base.filter(x=>x.success).length,steps:avg(base,'penalty')},candidate:{success:hybrid.filter(x=>x.success).length,steps:avg(hybrid,'penalty')},better,worse,equal};
 $('experimentResult').textContent=`25 Trainingswelten (getrennt) · ${experiment.states} Q-Zustände\nBasis: ${experiment.baseline.success}/${count} Missionen, Ø ${format(experiment.baseline.steps)} Aktionen\nExperimenteller Q-Agent: ${experiment.candidate.success}/${count} Missionen, Ø ${format(experiment.candidate.steps)} Aktionen\nSchneller ${better}, langsamer ${worse}, gleich ${equal}\nKeine automatische Freigabe; keine Erkenntnisse aus Testwelten ins Training übernommen.\nKeine Verbindung zum Sachwissen.`;
 }catch(e){$('experimentResult').textContent='Experimentfehler: '+e.message;console.error(e)}finally{$('experiment').disabled=false;}},80)};
function report(){return ['LERNBOT 7.0 – PHASE 7.1','INTEGRATION VON WISSEN UND LERNLABOR',`Wissenseinträge aus Phase 7.0: ${db.entries.length}`,`Phase-7.0-Lernläufe: ${db.runs.length}`,`Recherchewarteschlange: ${db.queue.length}`,`Heuristische Beziehungen: ${net.edges.length}`,...db.entries.slice(-10).map(e=>`Quelle: ${e.title} – ${e.url}`),`Letzter Lernlauf: ${db.runs.at(-1)?.time||'-'}`,'',experiment?`Experiment: ${experiment.trained} Trainingswelten; Test ${experiment.count}; Basis ${experiment.baseline.success}/${experiment.count} Ø ${format(experiment.baseline.steps)}; Q ${experiment.candidate.success}/${experiment.count} Ø ${format(experiment.candidate.steps)}; besser ${experiment.better}, schlechter ${experiment.worse}, gleich ${experiment.equal}`:'Experiment: noch nicht ausgeführt.','', 'BEGRENZUNGEN','Quellen nicht unabhängig verifiziert. Wissensnetz aus Text-Erwähnungen, keine geprüften semantischen Relationen. Q-Learning-Labor ist eingebunden, lernt aber nicht aus Wikipedia. Kein Sprachmodell, keine AGI, keine automatische Selbstmodifikation.'].join('\n');}
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(report());$('copy').textContent='Kopiert!';}catch{const t=add('textarea');t.value=report();document.body.append(t);t.select();try{document.execCommand('copy');$('copy').textContent='Kopiert!'}catch{$('copy').textContent='Kopieren nicht möglich'}t.remove()}};
$('download').onclick=()=>{const blob=new Blob([report()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lernbot-phase71-bericht.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
load();
