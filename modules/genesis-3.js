/* NERYX GENESIS 3.0 – Erkennung, Vorschläge, isolierte Gegenversuche.
   KEINE Änderung von App-Code, Antworten oder gespeicherten Fakten. */
(() => {
'use strict';
const norm=x=>String(x??'').toLocaleLowerCase('de')
 .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const compact=x=>norm(x).replace(/[^a-z0-9]/g,'');
const words=x=>norm(x).replace(/(\d)[.,](?=\d{3}(?:\D|$))/g,'$1').match(/[a-z0-9]+/g)||[];
function matches(answer,value){
 const a=words(answer),b=words(value);
 return b.length>0&&a.some((_,i)=>b.every((v,j)=>a[i+j]===v));
}
const prop=p=>({größe:'groesse',grosse:'groesse'}[norm(p)]||norm(p));
const eligible=f=>f&&typeof f.subject==='string'&&typeof f.property==='string'&&
 typeof f.value==='string'&&f.subject.trim()&&f.property.trim()&&f.value.trim();
const challenge={
 definition:{make:s=>`Erklär mir, was ${s} ist.`,fix:s=>`Was ist ${s}?`,why:'Definition anders formuliert'},
 aussehen:{make:s=>`Was für ein Aussehen hat ${s}?`,fix:s=>`Wie sieht ${s} aus?`,why:'Aussehen anders formuliert'},
 lebensraum:{make:s=>`An welchem Ort lebt ${s}?`,fix:s=>`Wo lebt ${s}?`,why:'Lebensraum anders formuliert'},
 durchmesser:{make:s=>`Wie lautet der Durchmesser von ${s}?`,fix:s=>`Welchen Durchmesser hat ${s}?`,why:'Durchmesser anders formuliert'},
 gewicht:{make:s=>`Wie lautet das Gewicht von ${s}?`,fix:s=>`Wie viel wiegt ${s}?`,why:'Gewicht anders formuliert'},
 groesse:{make:s=>`Wie lautet die Größe von ${s}?`,fix:s=>`Wie groß ist ${s}?`,why:'Größe anders formuliert'},
 hauptstadt:{make:s=>`Nenn mir die Hauptstadt von ${s}.`,fix:s=>`Was ist die Hauptstadt von ${s}?`,why:'Hauptstadt anders formuliert'},
 familie:{make:s=>`Zu welcher Tierfamilie zählt ${s}?`,fix:s=>`Zu welcher Familie gehört ${s}?`,why:'Familie anders formuliert'},
 fellfarbe:{make:s=>`Welche Färbung hat das Fell von ${s}?`,fix:s=>`Welche Fellfarbe hat ${s}?`,why:'Fellfarbe anders formuliert'},
 nahrung:{make:s=>`Welche Nahrung nimmt ${s} zu sich?`,fix:s=>`Was frisst ${s}?`,why:'Nahrung anders formuliert'}
};
const answerText=(responder,q,facts)=>{try{const x=responder(q,facts);return typeof x==='string'?x:String(x?.text??'')}catch{return ''}};
function examine(facts,responder,limit=20){
 const valid=(Array.isArray(facts)?facts:[]).filter(eligible),seen=new Set(),cases=[];
 for(const f of valid){
  const property=prop(f.property),key=compact(f.subject)+'|'+property,model=challenge[property];
  if(!model||seen.has(key))continue;
  seen.add(key);cases.push({f,model});
  if(cases.length>=Math.max(1,Math.min(30,Number.isFinite(limit)?Math.floor(limit):20)))break;
 }
 const found=[],results=[];
 for(const {f,model} of cases){
  const question=model.make(f.subject),canonical=model.fix(f.subject);
  const original=answerText(responder,question,valid),baseline=answerText(responder,canonical,valid);
  const originalPassed=matches(original,f.value),baselinePassed=matches(baseline,f.value);
  const candidatePassed=baselinePassed;
  const candidateSafe=question!==canonical&&candidatePassed;
  const result={subject:f.subject,property:f.property,question,originalPassed,
   baselinePassed,candidatePassed,reason:model.why};
  results.push(result);
  if(!originalPassed)found.push({...result,suggestion:canonical,
   status:candidateSafe?'Im isolierten Versuch erfolgreich':'Nicht bestätigt – keine Empfehlung'});
 }
 return {facts:valid.length,checked:results.length,
  passed:results.filter(x=>x.originalPassed).length,
  candidates:found.length,validated:found.filter(x=>x.candidatePassed).length,
  suggestions:found.slice(0,10)};
}
function report(){
 const bridge=window.LernBotBridge,ai=window.LernBotAntwortKI;
 if(!bridge?.getFacts||!ai?.answer)return 'GENESIS 3.0: Antwort-KI oder Wissensschnittstelle fehlt.';
 const facts=bridge.getFacts();
 const r=examine(facts,(q,db)=>ai.answer(q,{facts:db,documents:[],context:{}}));
 const lines=['NERYX GENESIS 3.0 · VERBESSERUNGSLABOR',
  `Fakten vorhanden: ${r.facts}`,
  `Neue Herausforderungstypen: ${r.checked}`,
  `Direkt verstanden: ${r.passed}/${r.checked}`,
  `Mögliche Verbesserungen: ${r.candidates}`,
  `Im Einzelversuch erfolgreich: ${r.validated}`];
 if(!r.checked)lines.push('Noch keine geeigneten Fakten für die neuen Aufgaben vorhanden.');
 if(!r.candidates&&r.checked)lines.push('Keine Fehler in diesen zusätzlichen Herausforderungstypen gefunden.');
 if(r.suggestions.length){
  lines.push('','VORSCHLÄGE (nur Simulation, nichts aktiviert):');
  r.suggestions.forEach((x,i)=>{
   lines.push(`${i+1}. ${x.subject} · ${x.property}`,
    `Frage: ${x.question}`,`Mögliche Ersatzfrage: ${x.suggestion}`,`Prüfung: ${x.status}`);
  });
 }
 lines.push('','Es wurden keine Fakten, Chatregeln oder Modelldateien verändert.');
 lines.push('Ein bestandener Einzelversuch ist noch keine sichere Freigabe: vollständige Regressionstests und deine Zustimmung sind erforderlich.');
 return lines.join('\n');
}
window.NERYXGenesis3=Object.freeze({version:'3.0',examine,report});
})();
