/* NERYX Lernzentrale 1.0 – lesende Sicht auf bestehende Lernspeicher.
   Keine Migration, keine Gewichtsänderung, keine automatische Wahrheitsprüfung. */
(() => {
'use strict';
const KEYS=Object.freeze({
 main:'meinLernBot.v1',topics:'neryx.learning.topics.v1',
 words:'neryx.learning.wordfeatures.v1',context:'neryx.learning.context.v1',
 manual:'neryx.learning.strategies.v1',auto:'neryx.learning.auto.v1'
});
const groups=['lebensraum','definition','zweck','verfahren','farbe','herkunft','bestandteile','dauer'];
const mainProps={zugehoerigkeit:'familie',fellfarbe:'farbe'};
const fold=x=>String(x??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[.!?;,]+$/,'').replace(/\s+/g,' ').trim();
const subject=x=>fold(x).replace(/^(?:der|die|das|ein|eine|einen|einem|einer)\s+/,'');
const property=x=>mainProps[fold(x).replace(/_/g,' ')]||fold(x).replace(/ /g,'_');
const text=x=>String(x??'').trim();
function read(key,warnings){
 try{
  const raw=localStorage.getItem(key);
  if(raw===null)return null;
  const value=JSON.parse(raw);
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid');
  return value;
 }catch{warnings.push('Speicher '+key+' ist nicht lesbar; Original wurde nicht verändert.');return null}
}
function collect(){
 const warnings=[],main=read(KEYS.main,warnings),topics=read(KEYS.topics,warnings),
 words=read(KEYS.words,warnings),ctx=read(KEYS.context,warnings),
 manual=read(KEYS.manual,warnings),auto=read(KEYS.auto,warnings);
 const claims=[];
 for(const f of (Array.isArray(main?.facts)?main.facts:[])){
  if(!f||typeof f!=='object'||!text(f.subject)||!text(f.property)||!text(f.value))continue;
  const sub=subject(f.subject),prop=property(f.property);
  claims.push({subject:sub,property:prop,value:text(f.value),origin:'Hauptwissen',
   key:'main',source:text(f.source)||'unbekannt',status:f.conflict?'gemeldeter Konflikt':'gespeichert',
   conflict:!!f.conflict,alternatives:Array.isArray(f.alternatives)?f.alternatives:[]});
 }
 for(const r of (Array.isArray(topics?.records)?topics.records:[])){
  if(!r||typeof r!=='object'||!text(r.answer)||!text(r.subject))continue;
  claims.push({subject:subject(r.subject),property:property(r.type),value:text(r.answer),
   origin:'Themenlernen',key:'topics',source:'Nutzer bestätigt, nicht extern geprüft',
   status:'nutzerbestätigt',conflict:!!r.conflict,alternatives:[]});
 }
 const conflicts=[],seen=new Map();
 for(const claim of claims){
  const id=claim.subject+'|'+claim.property;
  if(!seen.has(id))seen.set(id,[]);
  seen.get(id).push(claim);
 }
 for(const [id,items] of seen){
  const values=[...new Set(items.flatMap(x=>[x.value,...x.alternatives.map(a=>text(a?.value)).filter(Boolean)]).map(fold))];
  if(values.length>1||items.some(x=>x.conflict))conflicts.push({id,items,values});
 }
 const wordExamples=Array.isArray(words?.examples)?words.examples.filter(x=>x&&typeof x==='object'):[];
 const contextRules=ctx?.rules&&typeof ctx.rules==='object'&&!Array.isArray(ctx.rules)?ctx.rules:{};
 const matchedContexts=Object.values(contextRules).filter(v=>v&&typeof v==='object').length;
 return {claims,conflicts,warnings,wordExamples,matchedContexts,
  manualCount:Number.isInteger(manual?.feedback)?manual.feedback:0,
  autoCount:Number.isInteger(auto?.trained)?auto.trained:0,
  mainFactCount:claims.filter(x=>x.key==='main').length,
  topicCount:claims.filter(x=>x.key==='topics').length,
  contextCount:Object.keys(contextRules).length};
}
function report(){
 const d=collect();
 return ['NERYX · GEMEINSAME LERNZENTRALE',
  'Hauptwissen: '+d.mainFactCount+' Fakten',
  'Themenlernen: '+d.topicCount+' bestätigte Antworten',
  'Sprachlernen: '+d.wordExamples.length+' unterschiedliche Zahlenbeispiele',
  'Kontextlernen: '+d.contextCount+' Hinweise',
  'Manuelles Mathe-Feedback: '+d.manualCount,
  'Automatische Mathe-Lernschritte: '+d.autoCount,
  'Erkannte Wissenskonflikte: '+d.conflicts.length,
  'Alle Quellen bleiben in ihren bisherigen Speichern. Nichts wurde umgeschrieben.',
  'Wichtig: Eine Nutzerbestätigung ist keine unabhängige Wahrheitsprüfung.',
  d.warnings.length?'Warnungen:\n'+d.warnings.join('\n'):'',
  'Befehle: Lernquellen: THEMA / Lernkonflikte'].filter(Boolean).join('\n');
}
function sources(q){
 const d=collect(),term=subject(q),search=term.replace(/^(?:wo|was|wer|wie|warum|welche|welcher|welches)\s+/,'');
 if(!search||search.length<2)return 'Format: Lernquellen: Okapi';
 const rows=d.claims.filter(c=>c.subject.includes(search)||c.property.includes(search)).slice(0,30);
 const words=d.wordExamples.filter(x=>fold(x.phrase||'').includes(search)).slice(0,5);
 const contexts=d.contextCount?[]:[];
 return ['NERYX · QUELLENPRÜFUNG: '+text(q),
  rows.length?rows.map(x=>'• '+x.subject+' / '+x.property+': '+x.value+
   '\n  Speicher: '+x.origin+' | Herkunft: '+x.source+
   (x.conflict?' | Konflikt bereits markiert':'')).join('\n'):'Keine passenden Sachinformationen in den beiden Faktenspeichern.',
  words.length?'Sprachbeispiele:\n'+words.map(x=>'• '+x.phrase+' → '+x.type+' (gelernte Wortmerkmale)').join('\n'):'',
  d.conflicts.some(x=>x.items.some(i=>rows.includes(i)))?'Achtung: Zu einer gezeigten Information bestehen abweichende Angaben. Lernkonflikte prüfen.':'',
  d.warnings.length?'Warnungen: '+d.warnings.join(' | '):'',
  'Quelle und Bestätigung bedeuten nicht, dass eine Aussage extern überprüft wurde.'
 ].filter(Boolean).join('\n');
}
function conflictReport(){
 const d=collect();
 return ['NERYX · LERNKONFLIKTE',
  'Erkannte Widersprüche: '+d.conflicts.length,
  ...d.conflicts.slice(0,20).map(c=>'• '+c.items[0].subject+' / '+c.items[0].property+
   '\n'+c.items.map(i=>'  '+i.origin+' ('+i.source+'): '+i.value).join('\n')+
   (c.items.some(x=>x.alternatives.length)?'\n  Weitere Werte in der Hauptwissens-Historie vorhanden':'')
  ),
  d.conflicts.length?'Keine Daten automatisch korrigiert oder überschrieben.':'Keine abweichenden Werte bei exakt zugeordneten Themen/Eigenschaften erkannt.',
  'Unterschiedliche Formulierungen können auf dieselbe Aussage hinauslaufen; fehlende Treffer sind kein Wahrheitsbeweis.',
  ...d.warnings].join('\n');
}
window.NERYXLearningHub=Object.freeze({version:'1.0',collect,report,sources,conflictReport});
})();