import {collectCandidates,applyReviews,reasonWithApproved,conflictsFromCandidates,benchmarkExtraction} from './extract73.js';
import {validateFacts,infer,askFact,candidatesFromDb,demoFacts,holdoutQuestions,benchmark} from './reasoning72.js';
import {safeDb,graph,answer} from './knowledge71.js';
import {episode,initialModel,learn,seriesSeeds} from './rl62.js';
const $=id=>document.getElementById(id);
let db=safeDb({}),net=graph(db),experiment=null;
let reasoning=null,exam=null;
let claims=[],reviews={},claimInference=null;
const REVIEW_KEY="meinLernBot.phase73.review.v1";
try{const stored=JSON.parse(localStorage.getItem(REVIEW_KEY)||"{}");if(stored&&typeof stored==="object"&&!Array.isArray(stored))reviews=stored;}catch{}
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
 $('integration').textContent=`Internetwissen: ${db.entries.length} Einträge aus Phase 7.0\nWissensnetz: ${net.edges.length} heuristische Beziehungen\nEhemaliges Q-Labor: Phase 6.2 als eigenständige Originalmodule eingebunden\nWissenstransfer zwischen Sachwissen und Navigation: NICHT IMPLEMENTIERT\nLogik: symbolische ist_ein-Ketten nur über manuell geladene strukturierte Annahmen\nAutomatische Recherche: weiterhin über den vorhandenen Phase-7.0-Workflow\nUnabhängige Quellenprüfung: NICHT IMPLEMENTIERT`;
}
async function load(){try{$('status').textContent='Lade Phase-7.0-Daten …';const r=await fetch('../phase70/knowledge.json?refresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);db=safeDb(await r.json());net=graph(db);render();refreshCandidates();$('status').textContent=`Geladen: ${db.entries.length} Einträge. Letzter Lernlauf: ${db.runs.at(-1)?.time||'keiner'}.`;return true;}catch(e){$('status').textContent=`Laden fehlgeschlagen: ${e.message}. Prüfe, ob Phase 7.0 im selben Repository veröffentlicht ist.`;return false;}}
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

function reasonRun(){
 try{
  const raw=JSON.parse($('facts').value);const facts=validateFacts(raw,'Benutzereingabe');reasoning=infer(facts);
  const lines=[`Ausgangsfakten: ${facts.length}`,`Abgeleitete Fakten: ${reasoning.derived.length}`,`Widersprüche: ${reasoning.conflicts.length}`];
  for(const x of reasoning.derived.slice(0,30))lines.push(`ABGELEITET: ${x.subject} ist_ein ${x.object} · Beleg-IDs: ${x.premises.join(', ')}`);
  for(const c of reasoning.conflicts.slice(0,30))lines.push(`WIDERSPRUCH: ${c.subject} ${c.relation} ${c.object} · Dafür: ${c.positivePremises.join(', ')} · Dagegen: ${c.negativePremises.join(', ')}`);
  if(reasoning.truncated)lines.push('Hinweis: Ableitungsgrenze erreicht.');
  $('reasonResult').textContent=lines.join('\n');
 }catch(e){reasoning=null;$('reasonResult').textContent='Fehler bei der Eingabe: '+e.message;}
}
$('demo').onclick=()=>{$('facts').value=JSON.stringify(demoFacts,null,2);reasonRun()};
$('reason').onclick=reasonRun;
$('benchmark').onclick=()=>{const b=benchmark();exam={correct:b.correct,total:b.total};$('reasonResult').textContent+=`\n\nDEMO-TEST: ${b.correct}/${b.total} erwartete Antworten. Ausschließlich synthetische Testfälle; keine Wikipedia-Verifikation und kein allgemeiner Intelligenztest.`};
$('checkClaim').onclick=()=>{if(!reasoning)reasonRun();if(!reasoning)return;const a=askFact(reasoning,$('claimS').value,$('claimR').value,$('claimO').value);$('claimResult').textContent=`${a.answer}\nBeleg-IDs: ${a.proof.join(', ')||'keine'}\nGegenbelege: ${a.counterproof.join(', ')||'keine'}\nBewertung nur innerhalb deiner strukturierten Ausgangsannahmen.`};
$('demo').click();
function refreshCandidates(){
 claims=applyReviews(collectCandidates(db),reviews);
 const warnings=conflictsFromCandidates(claims);
 $('claims').replaceChildren();
 for(const c of claims.slice(0,100)){
  const article=add('article',undefined,'claim');
  const heading=add('strong',`${c.subject} ${c.relation} ${c.object}`);
  const state=add('span',c.status==='manuell_geprueft'?'Manuell geprüfter Text (keine Wahrheitsgarantie)':c.status==='verworfen'?'Verworfen':'Ungeprüfter Kandidat','state');
  const quote=add('blockquote',c.quote);
  const link=add('a','Originalquelle ↗');link.href=c.source;link.target='_blank';link.rel='noopener noreferrer';
  const actions=add('div',undefined,'actions');
  const approve=add('button','Textstelle geprüft – für Logik zulassen');
  const reject=add('button','Verwerfen');
  const reset=add('button','Zurücksetzen');
  for(const [button,status] of [[approve,'reviewed'],[reject,'rejected'],[reset,'pending']]){
   button.onclick=()=>{if(status==='pending')delete reviews[c.id];else reviews[c.id]=status;try{localStorage.setItem(REVIEW_KEY,JSON.stringify(reviews))}catch{}refreshCandidates()};actions.append(button);
  }
  article.append(heading,state,quote,link,add('small',`Erkennung: ${c.reason} · ID ${c.id}`),actions);$('claims').append(article);
 }
 if(!claims.length)$('claims').append(add('p','Keine Kandidaten mit den engen Mustern gefunden. Das bedeutet nicht, dass die Quelle keine Fakten enthält.'));
 const approved=claims.filter(c=>c.status==='manuell_geprueft').length;
 $('extractSummary').textContent=`Quelleneinträge: ${db.entries.length}\nErkannte Kandidaten: ${claims.length}\nManuell für Logik zugelassen: ${approved}\nVerworfen: ${claims.filter(c=>c.status==='verworfen').length}\nVerschiedene Beschreibungen desselben Subjekts: ${warnings.length} (keine bewiesenen Widersprüche)\nUnabhängig verifizierte Aussagen: 0\nFreigaben nur lokal auf diesem Gerät gespeichert.`;
 if(claimInference) $('extractReason').textContent='Altes Ableitungsergebnis – erneut auf „Manuell geprüfte Aussagen ableiten“ tippen.';
 claimInference=null;
}
$('extract').onclick=refreshCandidates;
$('extractTest').onclick=()=>{$('extractReason').textContent=`Synthetische Extraktionstests: ${benchmarkExtraction().passed}/${benchmarkExtraction().total}. Keine Prüfung der Wikipedia-Aussagen.`};
$('approveReason').onclick=()=>{try{claimInference=reasonWithApproved(claims);const r=claimInference.reasoning;$('extractReason').textContent=`Manuell zugelassene Quellenaussagen: ${claimInference.reviewed}\nSymbolische Ableitungen: ${r.derived.length}\nFormale Widersprüche: ${r.conflicts.length}\n${r.derived.slice(0,12).map(x=>x.subject+' ist_ein '+x.object+' – Prämissen: '+x.premises.join(', ')).join('\n')||'Keine Ableitungen.'}\nWichtig: Auch abgeleitete Aussagen erben die Unsicherheit der Quellen.`;}catch(e){$('extractReason').textContent='Fehler: '+e.message;}};
function report(){return ['LERNBOT 7.0 – PHASE 7.3','WISSEN, REGELN UND LERNLABOR',`Wissenseinträge aus Phase 7.0: ${db.entries.length}`,`Phase-7.0-Lernläufe: ${db.runs.length}`,`Recherchewarteschlange: ${db.queue.length}`,`Heuristische Beziehungen: ${net.edges.length}`,...db.entries.slice(-10).map(e=>`Quelle: ${e.title} – ${e.url}`),`Letzter Lernlauf: ${db.runs.at(-1)?.time||'-'}`,'',experiment?`Experiment: ${experiment.trained} Trainingswelten; Test ${experiment.count}; Basis ${experiment.baseline.success}/${experiment.count} Ø ${format(experiment.baseline.steps)}; Q ${experiment.candidate.success}/${experiment.count} Ø ${format(experiment.candidate.steps)}; besser ${experiment.better}, schlechter ${experiment.worse}, gleich ${experiment.equal}`:'Experiment: noch nicht ausgeführt.','', `SCHLUSSFOLGERN: ${reasoning?.derived.length??0} Ableitungen; ${reasoning?.conflicts.length??0} Widersprüche; Demo-Test ${exam?exam.correct+'/'+exam.total:'nicht ausgeführt'}`,`Internet-Zitatkandidaten: ${candidatesFromDb(db).length}`,`Extrahierte Quellenbehauptungen: ${claims.length}; manuell zugelassen: ${claims.filter(c=>c.status==='manuell_geprueft').length}; verworfen: ${claims.filter(c=>c.status==='verworfen').length}`, `Neue logische Ableitungen aus freigegebenen Quellenbehauptungen: ${claimInference?.reasoning.derived.length??'noch nicht getestet'}`, 'BEGRENZUNGEN','Automatische Extraktion durch enge Textmuster, keine unabhängige Quellenverifikation; manuelle Freigabe = Textprüfung, nicht Wahrheitsprüfung. Wissensnetz aus Text-Erwähnungen, keine geprüften semantischen Relationen. Q-Learning-Labor ist eingebunden, lernt aber nicht aus Wikipedia. Kein Sprachmodell, keine AGI, keine automatische Selbstmodifikation.'].join('\n');}
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(report());$('copy').textContent='Kopiert!';}catch{const t=add('textarea');t.value=report();document.body.append(t);t.select();try{document.execCommand('copy');$('copy').textContent='Kopiert!'}catch{$('copy').textContent='Kopieren nicht möglich'}t.remove()}};
$('download').onclick=()=>{const blob=new Blob([report()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lernbot-phase73-bericht.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
load();
