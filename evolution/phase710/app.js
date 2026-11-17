import {safeDb} from './knowledge71.js';
import {processKnowledge,runChecks} from './auto75.js';
import {evaluate,verifyTests} from './review76.js';
const $=id=>document.getElementById(id);
let db=safeDb({}), analysis=null, cross=null, error='',date='',tests=null;
const text=(id,value)=>{$(id).textContent=String(value)};
const elem=(tag,content,cls)=>{const n=document.createElement(tag);n.textContent=content??'';if(cls)n.className=cls;return n};
const num=x=>Number(x||0);
function show(){
 text('entries',db.entries.length);text('claimsCount',analysis?.claims.length||0);text('checked',cross?.checked||0);text('runs',db.runs.length);
 text('summary',error||`Vorläufig nutzbar: ${analysis?.logicFacts||0} · Zurückgestellt: ${analysis?.blocked||0} · Quellenänderungen im Quervergleich: ${cross?.changes.length||0}. Kein automatisch bestätigter Wahrheitsbeweis.`);
 const facts=$('facts');facts.replaceChildren();
 if(cross){for(const c of cross.claims.slice(0,60)){
  const a=elem('article','','fact');a.append(elem('strong',`${c.subject} · ${c.relation.replaceAll('_',' ')} · ${c.object}`),elem('div',c.verdict==='wikimedia_quergestützt'?'Wikimedia-Quervergleich: übereinstimmend (nicht unabhängig)':c.verdict==='quelltext_geaendert'?'Quelltext geändert – erneute Prüfung nötig':'Nur Quellenbehauptung','sub'),elem('p',c.quote,'quote'),elem('p',c.detail,'sub'));
  const link=elem('a','Wikipedia-Originalquelle');link.href=c.source;link.target='_blank';link.rel='noopener noreferrer';a.append(link);
  if(c.verificationSource){const l=elem('a',' · Wikidata-Datensatz');l.href=c.verificationSource;l.target='_blank';l.rel='noopener noreferrer';a.append(l);}
  facts.append(a);
 }}
 const changes=$('changes');changes.replaceChildren();
 if(cross?.changes?.length){for(const change of cross.changes.slice(-15).reverse()){changes.append(elem('p',`${change.type||'Änderung'}: ${change.title||'?'} – ${change.note||'Quelltextänderung'} (${change.at||'Zeit unbekannt'})`));}}
 else changes.textContent='Noch keine Quellenänderungen registriert. Das bedeutet nicht, dass Fakten unabhängig verifiziert wurden.';
 const deriv=$('derived');deriv.replaceChildren();if(analysis?.derived.length)for(const d of analysis.derived.slice(0,12))deriv.append(elem('p',`${d.subject} → ist ein → ${d.object} (unbestätigt)`));else deriv.textContent='Noch keine passenden Faktenketten für eine neue Ableitung.';
 text('technical',`Phase 7.6 – Diagnose\nOnline-Wissen (Phase 7.0): ${db.entries.length} Einträge, ${db.runs.length} Läufe, ${db.queue.length} vorgemerkte Themen\nFaktenkandidaten: ${analysis?.claims.length||0}\nVorläufig für Logik: ${analysis?.logicFacts||0}\nZurückgestellt: ${analysis?.blocked||0}\nWikimedia-Klassifikationen passend: ${cross?.checked||0}\nWirklich unabhängig verifiziert: 0\nQuellenänderungen im Prüflog: ${cross?.changes.length||0}\nQuervergleich-Daten vorhanden: ${cross?.reviewAvailable?'JA':'NEIN'}\nAusgeführte Quervergleich-Läufe: ${cross?.runs.length||0}\nAutonom bestätigte inhaltliche Fehlerkorrekturen: 0\nVerschiedene Beschreibungen: ${analysis?.disagreements.length||0} (kein formaler Widerspruch)\nStand: ${date||'nicht geladen'}\nSelbsttests: ${tests?tests.passed+'/'+tests.total:'nicht gestartet'}\nDiagnose: ${JSON.stringify(analysis?.analyzed.reasons||{})}`);
}
async function getJson(path,required){try{const response=await fetch(path+'?v='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}catch(e){if(required)throw e;return null;}}
async function load(){const btn=$('learn');btn.disabled=true;btn.textContent='Quellen werden geprüft …';error='';try{
 const [raw,review]=await Promise.all([getJson('../phase70/knowledge.json',true),getJson('review76.json',false)]);
 db=safeDb(raw);analysis=processKnowledge(db);cross=evaluate(analysis.claims,review);date=new Date().toLocaleString('de-DE');
 text('status',`${db.entries.length} Einträge geladen. ${cross.checked} Klassifikationen mit Wikidata abgeglichen. ${cross.reviewAvailable?'Prüfbericht geladen.':'Noch kein Online-Prüfbericht: GitHub-Workflow für Phase 7.6 einrichten.'}`);
 }catch(e){error='Konnte das Wissen nicht laden: '+e.message;text('status',error);}finally{btn.disabled=false;btn.textContent='Wissen laden & prüfen';show();}}
function report(){return ['LERNBOT 7.0 – PHASE 7.6','AUTOMATISCHER QUELLENABGLEICH UND ÄNDERUNGSPROTOKOLL',`Wissenseinträge: ${db.entries.length}`,`Lernläufe Phase 7.0: ${db.runs.length}`,`Warteschlange: ${db.queue.length}`,`Erkannte Kandidaten: ${analysis?.claims.length||0}`,`Vorläufige Logik-Aussagen: ${analysis?.logicFacts||0}`,`Wikimedia-konsistente Klassifikationen: ${cross?.checked||0}`,`Unabhängig verifiziert: 0`,`Online-Prüfbericht vorhanden: ${cross?.reviewAvailable?'ja':'nein'}`,`Online-Quervergleichsläufe: ${cross?.runs.length||0}`,`Protokollierte Quelltextänderungen: ${cross?.changes.length||0}`,`Inhaltlich bestätigte automatische Korrekturen: 0`,`Unbestätigte logische Ableitungen: ${analysis?.derived.length||0}`,`Selbsttest: ${tests?tests.passed+'/'+tests.total:'nicht gestartet'}`,'',...(cross?.claims.slice(0,35).map(c=>`${c.subject} ${c.relation} ${c.object} | ${c.verdict} | ${c.source}`)||[]),'',...(cross?.changes.slice(-20).map(c=>`${c.type}: ${c.title} – ${c.note}`)||[]),'',`Analysegründe: ${JSON.stringify(analysis?.analyzed.reasons||{})}`,'GRENZEN: Wikidata und Wikipedia gehören zu Wikimedia, keine unabhängige Verifikation. Unbekannte oder abweichende Klassifikation = kein Gegenbeweis. Quellenänderung ist keine bestätigte Sachkorrektur. Kein Sprachmodell, keine AGI, keine autonome Selbstmodifikation.'].join('\n');}
$('learn').onclick=load;
$('test').onclick=()=>{const a=runChecks(),b=verifyTests();tests={passed:a.passed+b.passed,total:a.total+b.total};show();text('status',`Selbsttest: ${tests.passed}/${tests.total}. Nutzt künstliche Beispieldaten, keine externe Quellenprüfung.`);};
$('copy').onclick=async()=>{const s=report();try{await navigator.clipboard.writeText(s);text('copy','Kopiert ✓');}catch{const t=document.createElement('textarea');t.value=s;document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();text('copy',ok?'Kopiert ✓':'Kopieren fehlgeschlagen');}};
$('download').onclick=()=>{const u=URL.createObjectURL(new Blob([report()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='lernbot-phase76-bericht.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
load();
