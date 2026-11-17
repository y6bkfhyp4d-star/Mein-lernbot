// Phase 7.3: konservative, nachvollziehbare Musterextraktion.
// Ein erkannter Satz ist ein QUELLENBEHAUPTUNGS-KANDIDAT, keine Wahrheit.
import {clean,key,validateFacts,infer} from './reasoning72.js';
const MAX=250;
const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
const endRx=/[.!?](?:\s+|$)/g;
export function splitSentences(text){
  const t=norm(text).slice(0,1600), out=[];let start=0,m;
  while((m=endRx.exec(t))!==null){const s=t.slice(start,m.index+1).trim();if(s)out.push({text:s,start,end:m.index+1});start=endRx.lastIndex;}
  if(start<t.length)out.push({text:t.slice(start),start,end:t.length});
  return out.slice(0,35);
}
const simplify=s=>norm(s).replace(/^[„"'\s]+|[„“"'\s]+$/g,'').slice(0,110);
const unsafe=/\b(?:nicht|kein(?:e|en|em|er|es)?|weder|angeblich|vermutlich|möglicherweise|umstritten|ehemals|früher)\b/i;
// Nur eindeutig titelbezogene Subjektsätze, keine impliziten Rückschlüsse.
export function extractEntry(entry){
  if(!entry||typeof entry.title!=='string'||typeof entry.excerpt!=='string'||typeof entry.url!=='string')return [];
  const subject=simplify(entry.title),out=[];
  const tokens=splitSentences(entry.excerpt);
  const titleCore=subject.replace(/\s*\([^)]*\)\s*$/,'');
  const escaped=titleCore.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const lead=new RegExp('^(?:(?:Der|Die|Das|Ein|Eine)\\s+)?'+escaped+'(?:\\s*\\([^)]{1,80}\\))?\\s+(?:ist|war)\\s+(?:ein(?:e|er|es|em|en)?\\s+)([^,;:()]{3,110})','i');
  for(const sentence of tokens){
    if(unsafe.test(sentence.text))continue;
    const m=lead.exec(sentence.text);if(!m)continue;
    let object=simplify(m[1].replace(/\s+(?:aus|mit|in|von|der|die|das)\s+.+$/i,'').replace(/[.!?]+$/,''));
    // Nur kurze Nominalgruppen, keine umfangreichen Erklärungen.
    if(!object||object.length>65||object.split(' ').length>7||key(object)===key(subject))continue;
    const claim={subject,relation:'ist_ein',object,source:entry.url,quote:sentence.text.slice(0,320),position:sentence.start,article:subject,status:'kandidat',reason:'Muster: Artikelüberschrift + ist/war ein(e) + Nominalgruppe'};
    claim.id=claimId(claim);if(!out.some(x=>x.id===claim.id))out.push(claim);
  }
  return out;
}
export function claimId(c){const raw=[key(c.subject),c.relation,key(c.object),c.source].join('|');let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619);}return 'c'+(h>>>0).toString(16);}
export function collectCandidates(db){const entries=Array.isArray(db?.entries)?db.entries:[];const out=[],seen=new Set();for(const entry of entries){for(const c of extractEntry(entry)){if(!seen.has(c.id)){seen.add(c.id);out.push(c);if(out.length>=MAX)return out;}}}return out;}
export function applyReviews(candidates,reviews){const safe=reviews&&typeof reviews==='object'?reviews:{};return candidates.map(c=>({...c,status:safe[c.id]==='reviewed'?'manuell_geprueft':safe[c.id]==='rejected'?'verworfen':'kandidat'}));}
export function reasonWithApproved(candidates){const reviewed=candidates.filter(c=>c.status==='manuell_geprueft');const facts=validateFacts(reviewed.map(c=>({subject:c.subject,relation:c.relation,object:c.object,source:c.source})),'Manuell geprüfte Quellenbehauptung');const reasoning=infer(facts);return {reviewed:reviewed.length,facts,reasoning};}
export function conflictsFromCandidates(candidates){const grouped=new Map();for(const c of candidates){const k=key(c.subject)+'|'+c.relation;const list=grouped.get(k)||[];list.push(c);grouped.set(k,list)}const warnings=[];for(const [group,list] of grouped){const objects=[...new Set(list.map(x=>key(x.object)))];if(objects.length>1)warnings.push({group,variants:list.map(x=>({object:x.object,source:x.source})),warning:'Unterschiedliche Beschreibungen; nicht automatisch ein logischer Widerspruch.'});}return warnings;}
export function benchmarkExtraction(){const samples=[
 {entry:{title:'Okapi',excerpt:'Okapi ist ein Säugetier. Es lebt im Regenwald.',url:'https://de.wikipedia.org/wiki/Okapi'},count:1},
 {entry:{title:'Mars',excerpt:'Mars ist kein Stern. Mars ist möglicherweise ein Planet.',url:'https://de.wikipedia.org/wiki/Mars'},count:0},
 {entry:{title:'Sonnensystem',excerpt:'Andere Forscher sagen: Mars ist ein Planet.',url:'https://de.wikipedia.org/wiki/Sonnensystem'},count:0},
 {entry:{title:'Zelle',excerpt:'Zelle ist eine biologische Einheit.',url:'https://de.wikipedia.org/wiki/Zelle'},count:1}
 ];return {passed:samples.filter(s=>extractEntry(s.entry).length===s.count).length,total:samples.length};}
