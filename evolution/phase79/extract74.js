// Phase 7.4 – regelbasierte Faktenkandidaten + nachvollziehbare Satzdiagnose.
// Jede Ausgabe ist eine UNVERIFIZIERTE Quellenbehauptung. Nur expliziter Satzinhalt.
import {key,validateFacts,infer} from './reasoning72.js';
const MAX_CANDIDATES=250,MAX_SENTENCES=60,MAX_TEXT=1600;
const space=s=>String(s??'').replace(/\s+/g,' ').trim();
const neat=s=>space(s).replace(/^[„“"'\s]+|[„“"'\s]+$/g,'').replace(/[.!?:;,\s]+$/,'').slice(0,100);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Trennzeichen mit konservativer Sonderbehandlung für häufige Abkürzungen.
export function splitSentences(text){
 const t=space(text).slice(0,MAX_TEXT), out=[];
 const pattern=/[.!?](?:\s+|$)/g;let from=0,m;
 while((m=pattern.exec(t))!==null){
  const part=t.slice(from,m.index+1).trim();
  if(/\b(?:z\.|bzw\.|u\.|ca\.|bspw\.)$/i.test(part))continue;
  if(part)out.push({text:part,start:from});
  from=pattern.lastIndex;if(out.length>=MAX_SENTENCES)return out;
 }
 if(from<t.length)out.push({text:t.slice(from).trim(),start:from});
 return out.filter(x=>x.text).slice(0,MAX_SENTENCES);
}
const caution=/\b(?:nicht|kein(?:e|en|em|er|es)?|weder|angeblich|vermutlich|möglicherweise|umstritten|ehemals|früher|soll(?:te|ten)?|laut|wahrscheinlich|mutmaßlich|hypothetisch)\b/i;
const structural=/\b(?:jedoch|obwohl|während|beziehungsweise|oder|sondern)\b/i;
function subjectPart(title){return neat(String(title).replace(/\s*\([^)]*\)\s*$/,'')).replace(/^(?:Der|Die|Das)\s+/i,'');}
function articleStart(subject){
 const escaped=escape(subject);
 // Titel: Mars (Planet); kann im Artikel "Der Mars" oder "Mars" heißen.
 return new RegExp('^(?:(?:Der|Die|Das|Ein|Eine)\\s+)?'+escaped+'(?:\\s*\\([^)]{1,110}\\))?\\s*[,–-]?\\s*','i');
}
function objectPart(raw){
 let x=neat(raw);
 x=x.replace(/^(?:ein(?:e|er|es|em|en)?|der|die|das)\s+/i,'');
 x=x.split(/\s*(?:[,;:]|\s+\b(?:welche|welcher|welches|dessen|deren|wobei|während|und|sowie|mit|durch|aufgrund|aus)\b\s*)/i)[0];
 return neat(x);
}
function makeClaim(entry,subject,relation,object,sentence,reason){
 if(!object||object.length>70||object.split(' ').length>9||key(object)===key(subject))return null;
 const claim={subject,relation,object,source:entry.url,quote:sentence.text.slice(0,340),position:sentence.start,article:subject,status:'kandidat',reason};
 claim.id=claimId(claim);return claim;
}
export function claimId(c){const raw=[key(c.subject),c.relation,key(c.object),c.source].join('|');let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619);}return 'c'+(h>>>0).toString(16);}
function analyzeSentence(entry,subject,sentence){
 const t=space(sentence.text);
 if(t.length<16)return {reason:'zu_kurz',claims:[]};
 const start=articleStart(subject).exec(t);
 if(!start)return {reason:'anderes_subjekt_oder_titel_nicht_am_anfang',claims:[]};
 let tail=t.slice(start[0].length);
 tail=tail.replace(/^(?:ist|war),\s*(?:von der Sonne aus gezählt),\s*/i,'ist ');
 // Komma-Einschub nur vor dem Kopulaverb, kein allgemeines Umdrehen von Satzlogik.
 tail=tail.replace(/^,?\s*(?:von der Sonne aus gezählt|auch als [^,]{3,60} bekannt|kurz [^,]{1,25})\s*,\s*/i,'');
 if(caution.test(t))return {reason:'negation_oder_unsichere_aussage',claims:[]};
 if(structural.test(t))return {reason:'mehrdeutige_konjunktion',claims:[]};
 // Klare klassifizierende Sätze: X ist eine Spezies / ein Planet / eine Form ...
 let m=/^(?:ist|war)\s+(?:ein(?:e|er|es|em|en)?)\s+([^.;:]{3,125})/i.exec(tail);
 if(m){const object=objectPart(m[1]);const c=makeClaim(entry,subject,'ist_ein',object,sentence,'Klassifikation: Subjekt + ist/war + Nominalgruppe');return c?{reason:'erkannt_ist_ein',claims:[c]}:{reason:'objekt_zu_lang_oder_unklar',claims:[]};}
 // "X gehört zur Familie der Giraffenartigen" -> nur als taxonomischer Kandidat, NICHT für Transitivität.
 m=/^(?:gehört|zählt)\s+zu(?:r|m| den)?\s+((?:Familie|Gruppe|Gattung|Ordnung|Klasse|Art)\s+(?:der|des|von)\s+[^.;:,]{3,85})/i.exec(tail);
 if(m){const c=makeClaim(entry,subject,'gehoert_zu',neat(m[1]),sentence,'Zugehörigkeit: gehört/zählt zu');return c?{reason:'erkannt_gehoert_zu',claims:[c]}:{reason:'objekt_zu_lang_oder_unklar',claims:[]};}
 // "X ist die gasförmige Hülle der Erde" -> Beschreibung statt sichere Oberklasse.
 m=/^(?:ist|war)\s+(?:die|der|das)\s+([^.;:,]{3,125})/i.exec(tail);
 if(m){const c=makeClaim(entry,subject,'beschreibung',objectPart(m[1]),sentence,'Beschreibung: ist die/der/das');return c?{reason:'erkannt_beschreibung',claims:[c]}:{reason:'objekt_zu_lang_oder_unklar',claims:[]};}
 // "Schall bezeichnet mechanische Schwingungen" -> Beschreibung, keine Taxonomie.
 m=/^(?:bezeichnet|beschreibt)\s+((?:allgemein\s+)?[^.;:,]{3,125})/i.exec(tail);
 if(m){const c=makeClaim(entry,subject,'beschreibung',objectPart(m[1]).replace(/^allgemein\s+/i,''),sentence,'Definition: bezeichnet/beschreibt');return c?{reason:'erkannt_beschreibung',claims:[c]}:{reason:'objekt_zu_lang_oder_unklar',claims:[]};}
 // "X lebt im Regenwald" -> Wohnortkandidat.
 m=/^(?:lebt|kommt)\s+(?:im|in|auf|in der|in den|auf der)\s+([^.;:,]{3,110})/i.exec(tail);
 if(m){const c=makeClaim(entry,subject,'lebt_in',objectPart(m[1]),sentence,'Lebensraum: lebt/kommt in');return c?{reason:'erkannt_lebt_in',claims:[c]}:{reason:'objekt_zu_lang_oder_unklar',claims:[]};}
 return {reason:'kein_unterstuetztes_muster',claims:[]};
}
export function analyzeEntry(entry){
 if(!entry||typeof entry.title!=='string'||typeof entry.excerpt!=='string'||typeof entry.url!=='string'||!/^https:\/\//.test(entry.url))return {candidates:[],diagnostics:[{sentence:'',reason:'ungueltiger_eintrag'}]};
 const subject=subjectPart(entry.title),candidates=[],diagnostics=[],seen=new Set();
 for(const s of splitSentences(entry.excerpt)){
  const r=analyzeSentence(entry,subject,s);diagnostics.push({sentence:s.text.slice(0,240),reason:r.reason,title:entry.title});
  for(const c of r.claims)if(!seen.has(c.id)){seen.add(c.id);candidates.push(c);}
 }
 return {candidates,diagnostics};
}
export const extractEntry=e=>analyzeEntry(e).candidates;
export function analyzeDatabase(db){const out=[],diagnostics=[],seen=new Set(),entries=Array.isArray(db?.entries)?db.entries:[];
 for(const entry of entries){const r=analyzeEntry(entry);diagnostics.push(...r.diagnostics);for(const c of r.candidates){if(!seen.has(c.id)&&out.length<MAX_CANDIDATES){seen.add(c.id);out.push(c);}}}
 const reasons={};for(const d of diagnostics)reasons[d.reason]=(reasons[d.reason]||0)+1;
 return {candidates:out,diagnostics,reasons,sentences:diagnostics.length};}
export const collectCandidates=db=>analyzeDatabase(db).candidates;
export function applyReviews(candidates,reviews){const safe=reviews&&typeof reviews==='object'?reviews:{};return candidates.map(c=>({...c,status:safe[c.id]==='reviewed'?'manuell_geprueft':safe[c.id]==='rejected'?'verworfen':'kandidat'}));}
export function reasonWithApproved(candidates){const reviewed=candidates.filter(c=>c.status==='manuell_geprueft');const supported=reviewed.filter(c=>['ist_ein','lebt_in'].includes(c.relation));const facts=validateFacts(supported.map(c=>({subject:c.subject,relation:c.relation,object:c.object,source:c.source})),'Manuell geprüfte Quellenbehauptung');return {reviewed:reviewed.length,unsupported:reviewed.length-supported.length,facts,reasoning:infer(facts)};}
export function conflictsFromCandidates(candidates){const grouped=new Map();for(const c of candidates){const k=key(c.subject)+'|'+c.relation;const list=grouped.get(k)||[];list.push(c);grouped.set(k,list)}const warnings=[];for(const [group,list] of grouped){const objects=[...new Set(list.map(x=>key(x.object)))];if(objects.length>1)warnings.push({group,variants:list.map(x=>({object:x.object,source:x.source})),warning:'Unterschiedliche Beschreibungen; kein nachgewiesener Widerspruch.'});}return warnings;}
export function benchmarkExtraction(){const samples=[
 {title:'Okapi',excerpt:'Das Okapi (Okapia johnstoni) ist eine Säugetierart aus der Familie der Giraffenartigen.',want:'ist_ein'},
 {title:'Mars (Planet)',excerpt:'Der Mars ist, von der Sonne aus gezählt, der vierte Planet des Sonnensystems.',want:'beschreibung'},
 {title:'Photosynthese',excerpt:'Die Photosynthese ist ein biochemischer Prozess.',want:'ist_ein'},
 {title:'Okapi',excerpt:'Das Okapi gehört zur Familie der Giraffenartigen.',want:'gehoert_zu'},
 {title:'Schall',excerpt:'Schall bezeichnet allgemein mechanische Schwingungen.',want:'beschreibung'},
 {title:'Erdatmosphäre',excerpt:'Die Erdatmosphäre ist die gasförmige Hülle der Erde.',want:'beschreibung'},
 {title:'Mars',excerpt:'Mars ist möglicherweise ein Stern.',want:null},
 {title:'Mars',excerpt:'Mars ist kein Stern.',want:null},
 {title:'Mars',excerpt:'Venus ist ein Planet.',want:null},
 {title:'Okapi',excerpt:'Das Okapi lebt im Regenwald.',want:'lebt_in'}
 ];let passed=0;for(const s of samples){const got=extractEntry({...s,url:'https://de.wikipedia.org/wiki/'+encodeURIComponent(s.title)});if(s.want===null?got.length===0:got.length===1&&got[0].relation===s.want)passed++;}return {passed,total:samples.length};}
