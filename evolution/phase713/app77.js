import {safeDb} from './knowledge71.js';
import {processKnowledge,runChecks} from './auto75.js';
import {evaluate,verifyTests} from './review76.js';
import {assess,tests77} from './research77.js';
const $=id=>document.getElementById(id);
let db=safeDb({}), analysis=null, review=null, follow=null, fail='', checkedAt='', test=null;
const put=(id,x)=>{$(id).textContent=String(x)};
function make(tag,text,cls){const n=document.createElement(tag);n.textContent=text||'';if(cls)n.className=cls;return n;}
function display(){
 put('entries',db.entries.length);put('claimsCount',analysis?.claims?.length||0);put('gaps',follow?.questions.length||0);put('searched',follow?.searched||0);
 put('summary',fail||`Neue Recherchefragen: ${follow?.questions.length||0} · Treffer: ${follow?.searched||0} · Probleme: ${follow?.errors||0} · Unabhängig bestätigt: 0 · Verifizierte Sachkorrekturen: 0`);
 const cards=$('followups'); cards.replaceChildren();
 if(follow){for(const question of follow.questions.slice(0,35)){
  const box=make('article','','fact');box.append(make('strong',question.question||question.topic),make('div',question.status==='suchtreffer'?'Recherchehinweise vorhanden (unbestätigt)':question.status==='recherche_fehler'?'Recherche fehlgeschlagen':'Keine Suchtreffer oder noch nicht untersucht','sub'));
  for(const hit of (question.hits||[]).slice(0,3)){
   const p=make('p',hit.snippet||'','sub');box.append(p);
   if(typeof hit.url==='string'&&hit.url.startsWith('https://de.wikipedia.org/')){const link=make('a',hit.title||'Quelle ansehen');link.href=hit.url;link.rel='noopener noreferrer';link.target='_blank';box.append(link,make('span',' · '));}
  } cards.append(box);
 }} if(!cards.children.length)cards.append(make('p','Noch keine Nachrecherche gespeichert. Starte den Phase-7.7-Workflow und lade die Seite erneut.'));
 const last=follow?.runs?.at(-1);
 put('technical',`Phase 7.7 – Nachrecherche
Quellen: ${db.entries.length}
Automatische Wissensläufe: ${db.runs.length}
Faktenkandidaten: ${analysis?.claims.length||0}
Vorläufige Logik-Aussagen: ${analysis?.logicFacts||0}
Wikimedia-Quervergleiche: ${review?.checked||0}
Online-Recherchebericht: ${follow?.available?'JA':'NEIN'}
Nachrecherchen: ${follow?.runs.length||0}
Letzter Lauf: ${JSON.stringify(last||{})}
Unabhängige Bestätigungen: 0
Sachlich bestätigte Korrekturen: 0
Selbsttests: ${test?test.passed+'/'+test.total:'nicht gestartet'}
Stand: ${checkedAt}`);
}
async function jsonAt(path,required=false){try{const res=await fetch(path+'?v='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);return await res.json();}catch(e){if(required)throw e;return null;}}
async function load(){const b=$('learn');b.disabled=true;b.textContent='Wissen wird geprüft …';fail='';try{
 const [knowledge,cross,research]=await Promise.all([jsonAt('../phase70/knowledge.json',true),jsonAt('../phase76/review76.json'),jsonAt('research77.json')]);
 db=safeDb(knowledge);analysis=processKnowledge(db);review=evaluate(analysis.claims,cross);follow=assess(research);checkedAt=new Date().toLocaleString('de-DE');
 put('status',`${db.entries.length} Quelleneinträge · ${follow.questions.length} Nachrecherchefragen. ${follow.available?'Recherchebericht geladen.':'Der Phase-7.7-Workflow wurde noch nicht erfolgreich ausgeführt.'}`);
 }catch(e){fail='Ladefehler: '+e.message;put('status',fail);}finally{b.disabled=false;b.textContent='Wissen laden & prüfen';display();}}
function report(){return ['LERNBOT 7.0 – PHASE 7.7','GEZIELTE NACHRECHERCHE BEI WISSENSLÜCKEN',`Quellen: ${db.entries.length}`,`Lernläufe Phase 7.0: ${db.runs.length}`,`Erkannte Kandidaten: ${analysis?.claims.length||0}`,`Vorläufige Logik-Fakten: ${analysis?.logicFacts||0}`,`Wikimedia-konsistente Klassifikationen: ${review?.checked||0}`,`Online-Bericht vorhanden: ${follow?.available?'ja':'nein'}`,`Online-Nachrecherchen: ${follow?.runs.length||0}`,`Fragen gespeichert: ${follow?.questions.length||0}`,`Mit Treffern: ${follow?.searched||0}`,`Ohne Treffer: ${follow?.missing||0}`,`Recherchefehler: ${follow?.errors||0}`,`Unabhängig bestätigte Aussagen: 0`,`Bestätigte autonome Sachkorrekturen: 0`,`Selbsttests: ${test?test.passed+'/'+test.total:'nicht gestartet'}`,'',...(follow?.questions||[]).map(q=>`${q.topic} | ${q.status} | ${q.question} | ${(q.hits||[]).map(h=>h.url).join(', ')}`),'',`GRENZEN: Suchtreffer und Wikimedia-Querverweise sind keine unabhängige Verifikation. Keine automatische Wahrheitsgarantie; keine autonome Selbstmodifikation.`,fail].join('\n');}
$('learn').onclick=load;
$('test').onclick=()=>{const a=runChecks(),b=verifyTests(),c=tests77();test={passed:a.passed+b.passed+c.passed,total:a.total+b.total+c.total};display();put('status',`Beispieltests: ${test.passed}/${test.total}. Keine Wahrheitsprüfung.`);};
$('copy').onclick=async()=>{const s=report();try{await navigator.clipboard.writeText(s);put('copy','Kopiert ✓');}catch{const t=document.createElement('textarea');t.value=s;document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();put('copy',ok?'Kopiert ✓':'Bitte Bericht als TXT speichern');}};
$('download').onclick=()=>{const blob=new Blob([report()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lernbot-phase77-bericht.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
load();
