/* NERYX Frozen-Validierung: unabhängig von WebLLM, vollständig lokal.
   node eval/validate-frozen.mjs /ABSOLUT/frozen-fixture.json /ABSOLUT/frozen-suite.json
   Keine Inhalte in der Ausgabe; beide Dateien bleiben außerhalb des Repos.
*/
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, resolve } from 'node:path';
import {externalFrozenPath} from './frozen-path-policy.mjs';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.length!==2||args.some(p=>!isAbsolute(p)))throw Error('Zwei absolute Dateipfade angeben: Fixture und Suite.');
function load(p){
 const path=externalFrozenPath(p,root);
 const buf=readFileSync(path),data=JSON.parse(buf.toString('utf8'));
 return {data,hash:createHash('sha256').update(buf).digest('hex')};
}
const fixture=load(args[0]),suite=load(args[1]),errors=[],warn=[];
const fail=(cond,msg)=>{if(!cond)errors.push(msg)};
const claims=fixture.data.claims,items=Array.isArray(suite.data)?suite.data:suite.data?.items;
fail(fixture.data.schema===1,'Fixture: schema muss 1 sein.');
fail(fixture.data.fixtureId==='fx-frozen-v1','Fixture-ID stimmt nicht.');
fail(Array.isArray(claims),'Fixture: claims muss ein Array sein.');
fail(Array.isArray(items),'Suite: JSON-Array von Items erwartet.');
if(!Array.isArray(claims)||!Array.isArray(items)){console.log(JSON.stringify({ok:false,errors},null,2));process.exit(1)}
fail(claims.length>=60&&claims.length<=90,'Claim-Anzahl außerhalb 60–90.');
fail(items.length===50,'Suite enthält nicht exakt 50 Items.');
const claimIds=new Set(),categories=Object.create(null),difficulty=Object.create(null),groups=new Map();
const claimMap=new Map();
for(const [i,c] of claims.entries()){
 const id='fz-c'+String(i+1).padStart(3,'0');
 fail(c.id===id,'Claim-IDs sind nicht fortlaufend bei Position '+(i+1));
 fail(!claimIds.has(c.id),'Claim-ID doppelt: '+c.id);
 claimIds.add(c.id);claimMap.set(c.id,c);
 fail(typeof c.text==='string'&&c.text.endsWith('.'),'Claim ohne vollständigen Satz: '+c.id);
 fail(['curated','user'].includes(c.origin),'Claim-Herkunft ungültig: '+c.id);
 fail(Array.isArray(c.topics)&&c.topics.length>=2&&c.topics.length<=4,'Themenanzahl ungültig: '+c.id);
}
let conflicts=0,userClaims=0,numberClaims=0;const domains=new Set();
for(const c of claims){
 domains.add(c.domain);
 if(c.origin==='user')userClaims++;
 if(/\d/.test(c.text)&&/stunden?|minuten?|liter|kilogramm|zentimeter|millimeter|metern?|monaten?|tagen?|grad/i.test(c.text))numberClaims++;
 for(const ref of c.conflicts||[]){
  fail(claimMap.has(ref),'Unbekannter Konfliktbeleg: '+ref);
  if(claimMap.has(ref))fail(claimMap.get(ref).conflicts?.includes(c.id),'Konflikt nicht gegenseitig: '+c.id);
  if(c.id<ref)conflicts++;
 }
}
fail(domains.size>=5,'Weniger als fünf Domänen.');
fail(userClaims>=3,'Weniger als drei Nutzerclaims.');
fail(conflicts>=2,'Weniger als zwei Widerspruchspaare.');
if(numberClaims<8)warn.push('Zahlen-/Einheitenclaims manuell kontrollieren: '+numberClaims+' maschinell erkannt.');
const allowed={retrieval_hit:12,retrieval_distractor:6,abstain_correct:8,should_answer_hard:6,solver:6,grounding:6,contradiction:4,status:2};
for(const [i,t] of items.entries()){
 const id='fz-'+String(i+1).padStart(3,'0');
 fail(t.id===id,'Item-IDs nicht fortlaufend bei Position '+(i+1));
 fail(t.schema===1&&t.suite==='frozen'&&t.origin==='synthetic','Ungültige Item-Grunddaten bei '+id);
 fail(Object.hasOwn(allowed,t.category),'Kategorie ungültig bei '+id);
 categories[t.category]=(categories[t.category]||0)+1;
 difficulty[t.difficulty]=(difficulty[t.difficulty]||0)+1;
 fail([1,2,3].includes(t.difficulty),'Schwierigkeit ungültig bei '+id);
 fail(Array.isArray(t.layers)&&t.layers.every(x=>['retrieval','generation','verifier'].includes(x)),'Layer ungültig bei '+id);
 fail(typeof t.input?.question==='string'&&t.input.question.length>4,'Frage fehlt bei '+id);
 if(t.category==='solver'){
  fail(t.fixture===null,'Solver muss fixture:null haben: '+id);
  fail(typeof t.expect?.exact?.value==='number','Solver braucht exakten Wert: '+id);
 }else fail(t.fixture==='fx-frozen-v1','Fixture-Verweis ungültig bei '+id);
 const refs=[
  ...(t.expect?.retrieval?.mustInclude||[]),...(t.expect?.retrieval?.mustExclude||[]),
  ...(t.input?.evidence||[])
 ];
 for(const ref of refs)fail(claimMap.has(ref),'Unbekannte Claim-ID referenziert bei '+id);
 if(t.category==='grounding'){
  fail(Array.isArray(t.input.evidence)&&Array.isArray(t.expect?.labels),'Grounding-Belege/-Labels fehlen bei '+id);
  const sentences=(String(t.input?.draft||'').match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]).filter(x=>x.trim());
  fail(sentences.length===t.expect?.labels?.length,'Grounding: Satz-/Labelanzahl stimmt nicht bei '+id);
 }
 if(t.category==='retrieval_hit'){
  fail(!!t.group,'Retrieval-Paraphrasengruppe fehlt bei '+id);
  groups.set(t.group,(groups.get(t.group)||0)+1);
 }
 if(t.expect?.retrieval){
  const include=t.expect.retrieval.mustInclude||[],exclude=t.expect.retrieval.mustExclude||[];
  fail(!include.some(x=>exclude.includes(x)),'ID in include und exclude bei '+id);
 }
}
/* S4 – Vertragsprüfung der Bewertungsfelder: nicht gleichbedeutend mit fachlicher Richtigkeit. */
const keys=(x,allowed,context)=>{
 if(!x||typeof x!=='object'||Array.isArray(x)){errors.push(context+': Objekt erwartet.');return}
 for(const k of Object.keys(x))if(!allowed.includes(k))errors.push(context+': unbekanntes Feld '+k);
};
const isIds=x=>Array.isArray(x)&&x.every(v=>typeof v==='string'&&claimIds.has(v))&&new Set(x).size===x.length;
for(const t of items){
 const id=t.id,ex=t.expect,inp=t.input;
 keys(ex,['retrieval','mode','concepts','numbersFromEvidenceOnly','forbidden','exact','labels','conflictSurfaced','statusWording'],id+'.expect');
 keys(inp,['question','draft','evidence'],id+'.input');
 if(!ex||typeof ex!=='object'||Array.isArray(ex))continue;
 if(t.layers?.includes('retrieval')){
  fail(!!ex.retrieval,id+': Retrieval-Ebene ohne expect.retrieval.');
 }
 if(ex.retrieval!==undefined){
  const r=ex.retrieval;
  keys(r,['verdict','mustInclude','mustExclude','allowOnly'],id+'.retrieval');
  if(!r||typeof r!=='object'||Array.isArray(r))continue;
  fail(t.layers?.includes('retrieval'),id+': Retrieval-Erwartung ohne Retrieval-Ebene.');
  fail(['sufficient','none','any'].includes(r.verdict),id+': Verdict muss sufficient, none oder any sein.');
  const inc=r.mustInclude??[],exc=r.mustExclude??[],only=r.allowOnly;
  fail(isIds(inc)&&isIds(exc),id+': Ungültige mustInclude-/mustExclude-Liste.');
  if(only!==undefined)fail(isIds(only)&&only.length>0,id+': Ungültige allowOnly-Liste.');
  if(r.verdict==='sufficient')fail(inc.length>0,id+': sufficient benötigt mustInclude.');
  if(r.verdict==='none')fail(inc.length===0,id+': none darf keine mustInclude-Treffer verlangen.');
  if(r.verdict==='any')fail((only?.length||0)>0||exc.length>0,id+': any braucht allowOnly oder mustExclude.');
  if(Array.isArray(only))fail(inc.every(x=>only.includes(x)),id+': mustInclude außerhalb allowOnly.');
  fail(!inc.some(x=>exc.includes(x)),id+': mustInclude überschneidet mustExclude.');
  if(Array.isArray(only))fail(!only.some(x=>exc.includes(x)),id+': allowOnly überschneidet mustExclude.');
 }
 if(ex.mode!==undefined)fail(['answer','abstain'].includes(ex.mode),id+': Ungültiger Antwortmodus.');
 if(ex.concepts!==undefined){
  fail(Array.isArray(ex.concepts)&&ex.concepts.length>0,id+': concepts muss nichtleer sein.');
  if(Array.isArray(ex.concepts)){
   const used=new Set();
   for(const c of ex.concepts){
    keys(c,['id','anyOf'],id+'.concept');
    if(!c||typeof c!=='object')continue;
    fail(typeof c.id==='string'&&c.id.length>0&&!used.has(c.id),id+': Konzept-ID doppelt/ungültig.');
    used.add(c.id);
    fail(Array.isArray(c.anyOf)&&c.anyOf.length>0&&c.anyOf.every(x=>typeof x==='string'&&x.trim()),id+': anyOf ungültig.');
   }
  }
 }
 if(ex.numbersFromEvidenceOnly!==undefined)fail(typeof ex.numbersFromEvidenceOnly==='boolean',id+': numbersFromEvidenceOnly kein Boolean.');
 if(ex.forbidden!==undefined)fail(Array.isArray(ex.forbidden)&&ex.forbidden.length>0&&ex.forbidden.every(x=>typeof x==='string'&&x.length>0),id+': forbidden ungültig.');
 if(ex.exact!==undefined){
  keys(ex.exact,['value','tol','unit'],id+'.exact');
  fail(typeof ex.exact?.value==='number'&&Number.isFinite(ex.exact.value),id+': exact.value muss endlich sein.');
  fail(typeof ex.exact?.tol==='number'&&Number.isFinite(ex.exact.tol)&&ex.exact.tol>=0,id+': exact.tol muss >= 0 sein.');
  fail(typeof ex.exact?.unit==='string'&&ex.exact.unit.length>0,id+': exact.unit fehlt.');
 }
 if(t.category==='solver')fail(ex.exact!==undefined,id+': Solver ohne exact.');
 if(ex.labels!==undefined){
  fail(t.layers?.includes('verifier'),id+': labels ohne verifier.');
  fail(Array.isArray(ex.labels)&&ex.labels.length>0&&ex.labels.every(x=>['supported','unsupported','contradicted','unverified'].includes(x)),id+': Ungültige Satzlabels.');
 }
 if(ex.conflictSurfaced!==undefined)fail(typeof ex.conflictSurfaced==='boolean',id+': conflictSurfaced ungültig.');
 if(ex.statusWording!==undefined)fail(['hedged','assertive'].includes(ex.statusWording),id+': statusWording ungültig.');
 if(inp?.evidence!==undefined)fail(isIds(inp.evidence),id+': evidence enthält ungültige oder doppelte IDs.');
}

for(const [cat,n] of Object.entries(allowed))fail(categories[cat]===n,'Kategorienanzahl '+cat+' soll '+n+' sein, ist '+(categories[cat]||0));
fail(groups.size===4&&[...groups.values()].every(n=>n===3),'Vier Paraphrasengruppen zu je drei Items erwartet.');
const result={ok:errors.length===0,summary:{claims:claims.length,items:items.length,domains:domains.size,userClaims,conflictPairs:conflicts,categories,difficulty},sha256:{fixture:fixture.hash,suite:suite.hash},errors,warnings:warn,notice:'Syntaktisch/strukturell geprüft; fachliche Erwartungsrichtigkeit ist nur menschlich prüfbar. Kein Siegel geschrieben.'};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
