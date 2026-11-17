import {safeDb,graph} from './knowledge71.js';
import {processKnowledge,runChecks} from './auto75.js';
const $=id=>document.getElementById(id);
let db=safeDb({}),result=null,error='',check=null,lastRun='';
const fmt=(n)=>String(n||0);
const el=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=String(text??'');if(cls)e.className=cls;return e;};
function paint(){
  $('entries').textContent=fmt(db.entries.length);$('claimsCount').textContent=fmt(result?.claims.length);$('derivedCount').textContent=fmt(result?.derived.length);$('runs').textContent=fmt(db.runs.length);
  $('summary').textContent=error||`Quellen: ${db.entries.length} · Vorläufige Aussagen: ${result?.claims.length||0} · Für begrenzte Logik nutzbar: ${result?.logicFacts||0} · Unsichere Ableitungen: ${result?.derived.length||0}. Keine unabhängige Wahrheitsprüfung.`;
  $('facts').replaceChildren();
  if(result){
   for(const c of result.claims.slice(0,75)){
    const article=el('article','','fact'),title=el('strong',`${c.subject} · ${c.relation.replace(/_/g,' ')} · ${c.object}`),state=el('div',c.logicSafe?'Vorläufig für Logik nutzbar':'Nicht automatisch für Logik verwendet','sub'),quote=el('p',c.quote,'quote'),why=el('p',c.why,'sub'),source=el('a','Originalquelle öffnen');source.href=c.source;source.target='_blank';source.rel='noopener noreferrer';article.append(title,state,quote,why,source);$('facts').append(article);
   }
   if(!result.claims.length)$('facts').append(el('p','Keine erkennbaren Aussagen. Das bedeutet nicht, dass die Texte keine Fakten enthalten.'));
  }
  $('derived').replaceChildren();
  if(result){for(const d of result.derived.slice(0,25))$('derived').append(el('p',`${d.subject} → ist ein → ${d.object} (ungeprüfte Ableitung)`));if(!result.derived.length)$('derived').textContent='Noch keine zusammenhängende Faktenkette für neue Ableitungen gefunden.';}
  $('issues').replaceChildren();
  if(result){for(const g of result.disagreements.slice(0,12))$('issues').append(el('p',`${g.subject}: ${g.variants.join(' | ')} (verschiedene Aussagen, kein bewiesener Widerspruch)`));if(!result.disagreements.length)$('issues').textContent='Keine verschiedenen Objektbeschreibungen für dieselbe Relation erfasst.';}
  $('technical').textContent=`Stand: ${lastRun||'noch nicht geladen'}\nQuelleneinträge: ${db.entries.length}\nPhase-7.0-Lernläufe: ${db.runs.length}\nRecherchewarteschlange: ${db.queue.length}\nKandidaten: ${result?.claims.length||0}\nNur vorläufig für Logik: ${result?.logicFacts||0}\nZurückgestellte Aussagen: ${result?.blocked||0}\nAbleitungen ohne Verifikationsgarantie: ${result?.derived.length||0}\nVarianten desselben Subjekts/Prädikats: ${result?.disagreements.length||0}\nUnabhängig verifizierte Aussagen: 0\nAutomatisch erkannte und bestätigte eigene Fehler: 0\nDiagnosegründe: ${JSON.stringify(result?.analyzed.reasons||{})}\nTests: ${check?check.passed+'/'+check.total:'noch nicht gestartet'}`;
}
async function load(){const btn=$('learn');btn.disabled=true;btn.textContent='Wissen wird geprüft …';error='';try{
 const url='../phase70/knowledge.json?refresh='+Date.now();const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);
 db=safeDb(await r.json());result=processKnowledge(db);lastRun=new Date().toLocaleString('de-DE');
 $('status').textContent=`Fertig: ${db.entries.length} Einträge ausgewertet. Weitere automatische Recherchen laufen über GitHub Actions aus Phase 7.0.`;
 }catch(e){error='Daten konnten nicht geladen werden: '+e.message; $('status').textContent=error;}
 finally{btn.disabled=false;btn.textContent='Wissen laden & prüfen';paint();}}
function report(){return ['LERNBOT 7.0 – PHASE 7.5','EINFACHE AUTOMATISCHE FAKTENVERARBEITUNG',`Quelleneinträge: ${db.entries.length}`,`Lernläufe aus 7.0: ${db.runs.length}`,`Warteschlange: ${db.queue.length}`,`Erkannte Faktenkandidaten: ${result?.claims.length||0}`,`Vorläufig für Schlussfolgern geeignet: ${result?.logicFacts||0}`,`Zurückgestellt: ${result?.blocked||0}`,`Logische Ableitungen (unbestätigt): ${result?.derived.length||0}`,`Unterschiedliche Beschreibungen: ${result?.disagreements.length||0}`,`Unabhängig verifizierte Aussagen: 0`,`Bestätigte eigenständige Fehlerkorrekturen: 0`, `Selbsttest: ${check?check.passed+'/'+check.total:'nicht gestartet'}`,'', ...(result?.claims.slice(0,18).map(c=>`${c.subject} ${c.relation} ${c.object} | ${c.status} | ${c.source}`)||[]),'',...(result?.derived.slice(0,10).map(c=>`ABGELEITET (ungeprüft): ${c.subject} ist_ein ${c.object}`)||[]),'', `Nicht erkannte Satzgründe: ${JSON.stringify(result?.analyzed.reasons||{})}`,'GRENZEN: Nur Wikipedia-Ausschnitte, keine unabhängige Verifikation. Automatische vorläufige Einordnung ist kein Wahrheitsnachweis; kein autonomes Erkennen eigener Fehler. Q-Learning und Spielwelt sind getrennt.'].join('\n');}
$('learn').onclick=load;
$('test').onclick=()=>{check=runChecks();paint();$('status').textContent=`Kontrollierter Selbsttest: ${check.passed}/${check.total}. Keine Prüfung der Wikipedia-Wahrheit.`;};
$('copy').onclick=async()=>{const s=report();try{await navigator.clipboard.writeText(s);$('copy').textContent='Kopiert ✓';}catch{const t=document.createElement('textarea');t.value=s;document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();$('copy').textContent=ok?'Kopiert ✓':'Bitte Bericht markieren';}};
$('download').onclick=()=>{const u=URL.createObjectURL(new Blob([report()],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='lernbot-phase75-bericht.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
load();
