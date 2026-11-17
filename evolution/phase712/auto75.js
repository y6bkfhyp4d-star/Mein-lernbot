// Phase 7.5: automatische VORLÄUFIGE Verarbeitung, keine unabhängige Verifikation.
import {analyzeDatabase} from './extract74.js';
import {infer,validateFacts,key} from './reasoning72.js';
const accepted=new Set(['ist_ein','lebt_in']);
const whitespace=s=>String(s||'').replace(/\s+/g,' ').trim();
const riskWords=/\b(?:bestandteil|ansammlung|systeme|nahezu|fast|sogenannt|vermeintlich|gebunden|in einer|der sich|einige|mehrere)\b/i;
export function classify(c){
  // Klassifikationen nur sehr vorsichtig als transitive Relationen verwenden.
  const structurallySafe=c.relation==='ist_ein' && c.object.split(/\s+/).length<=4 && !riskWords.test(c.object);
  const logicSafe=structurallySafe || c.relation==='lebt_in';
  const status=logicSafe?'vorlaeufig_logik':'nur_quellenbehauptung';
  return {...c,status,logicSafe,independentVerified:false,
    why:logicSafe?'Regelbasierte Extraktion; noch nicht unabhängig verifiziert':'Zu komplex oder nicht für die vorhandene Schlussregel geeignet'};
}
export function processKnowledge(db){
  const analyzed=analyzeDatabase(db);
  const claims=analyzed.candidates.map(classify);
  const sources=new Set(claims.map(c=>c.source));
  const logicFacts=claims.filter(c=>c.logicSafe).slice(0,250).map(c=>({subject:c.subject,object:c.object,relation:c.relation,source:c.source}));
  const res=infer(validateFacts(logicFacts,'Ungeprüfte Internetquelle'),100);
  const groups=new Map();
  for(const c of claims){let k=key(c.subject)+'|'+c.relation;let g=groups.get(k)||[];g.push(c);groups.set(k,g);}
  // Verschiedene Objekte können koexistieren. Kein automatischer Widerspruchsbeweis.
  const disagreements=[...groups.values()].filter(g=>new Set(g.map(c=>key(c.object))).size>1).map(g=>({subject:g[0].subject,relation:g[0].relation,variants:g.map(c=>c.object)}));
  const inference=res.derived.map(x=>({...x,status:'abgeleitet_unbestaetigt',independentVerified:false}));
  return {claims,derived:inference,disagreements,analyzed,sourceCount:sources.size,
    logicFacts:logicFacts.length,independentlyVerified:0,
    blocked:claims.filter(c=>!c.logicSafe).length,
    // Zur transparenten Berichterstattung: kein Feedback- oder Wahrheitsorakel.
    verifiedCorrectionCount:0};
}
export function runChecks(){
  const db={entries:[
    {title:'Okapi',excerpt:'Das Okapi ist ein Säugetier.',url:'https://de.wikipedia.org/wiki/Okapi'},
    {title:'Säugetier',excerpt:'Ein Säugetier ist ein Wirbeltier.',url:'https://de.wikipedia.org/wiki/Saeugetier'},
    {title:'Galaxie',excerpt:'Eine Galaxie ist eine durch Gravitation gebundene große Ansammlung von Sternen.',url:'https://de.wikipedia.org/wiki/Galaxie'},
    {title:'Mars',excerpt:'Mars ist möglicherweise ein Stern.',url:'https://de.wikipedia.org/wiki/Mars'}
  ]};
  const p=processKnowledge(db), ok=p.claims.some(c=>c.subject==='Okapi'&&c.object==='Säugetier')&&p.derived.some(c=>c.subject==='Okapi'&&c.object==='Wirbeltier') && p.independentlyVerified===0 && !p.claims.some(c=>c.subject==='Mars') && p.claims.some(c=>c.subject==='Galaxie'&&!c.logicSafe);
  return {passed:ok?5:0,total:5,claims:p.claims.length,derived:p.derived.length};
}
