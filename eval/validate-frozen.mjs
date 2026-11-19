/* NERYX Frozen-Validierung: unabhängig von WebLLM, vollständig lokal.
   node eval/validate-frozen.mjs /ABSOLUT/frozen-fixture.json /ABSOLUT/frozen-suite.json
   Keine Inhalte in der Ausgabe; beide Dateien bleiben außerhalb des Repos.
*/
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.length!==2||args.some(p=>!isAbsolute(p)))throw Error('Zwei absolute Dateipfade angeben: Fixture und Suite.');
function load(p){
 const path=realpathSync(p),rel=relative(root,path);
 if(rel===''||rel==='..'||(!rel.startsWith('..'+sep)&&!isAbsolute(rel)))
  throw Error('Vertrauliche Tests dürfen nicht im öffentlichen Repository liegen.');
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
for(const [cat,n] of Object.entries(allowed))fail(categories[cat]===n,'Kategorienanzahl '+cat+' soll '+n+' sein, ist '+(categories[cat]||0));
fail(groups.size===4&&[...groups.values()].every(n=>n===3),'Vier Paraphrasengruppen zu je drei Items erwartet.');
const result={ok:errors.length===0,summary:{claims:claims.length,items:items.length,domains:domains.size,userClaims,conflictPairs:conflicts,categories,difficulty},sha256:{fixture:fixture.hash,suite:suite.hash},errors,warnings:warn,notice:'Syntaktisch/strukturell geprüft; fachliche Erwartungsrichtigkeit ist nur menschlich prüfbar. Kein Siegel geschrieben.'};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
