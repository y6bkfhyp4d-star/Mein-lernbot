/* NERYX GENESIS 2.0 – messbare Gegenproben, keine automatischen Faktenänderungen. */
(() => {
'use strict';
const KEY='neryx.genesis.benchmark.v2', MAX_RUNS=20;
const normalize=x=>String(x??'').toLocaleLowerCase('de').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss')
  .replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const compact=x=>normalize(x).replace(/\s/g,'');
const parts=x=>String(x??'').toLocaleLowerCase('de').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss')
  .replace(/(\d)[.,](?=\d{3}(?:\D|$))/g,'$1')
  .match(/[\p{L}\p{N}]+/gu)||[];
function containsValue(answer,value) {
  const a=parts(answer),b=parts(value);
  return b.length>0&&a.some((_,i)=>i+b.length<=a.length&&b.every((x,j)=>a[i+j]===x));
}
const questions={
  definition:s=>[`Beschreibe, was ${s} ist.`,`Kannst du ${s} definieren?`],
  durchmesser:s=>[`Nenne den Durchmesser von ${s}.`,`Wie viel misst ${s} im Durchmesser?`],
  hauptstadt:s=>[`Nenne die Hauptstadt von ${s}.`,`Welche Stadt ist die Hauptstadt von ${s}?`],
  gewicht:s=>[`Nenne das Gewicht von ${s}.`,`Wie schwer ist ${s}?`],
  lebensraum:s=>[`Wo ist ${s} beheimatet?`,`Wo lebt ${s}?`],
  nahrung:s=>[`Wovon ernährt sich ${s}?`,`Was frisst ${s}?`],
  familie:s=>[`Welcher Familie gehört ${s} an?`,`Nenne die Familie von ${s}.`],
  fellfarbe:s=>[`Beschreibe die Fellfarbe von ${s}.`,`Welche Farbe hat das Fell von ${s}?`],
  aussehen:s=>[`Beschreibe, wie ${s} aussieht.`,`Wie sieht ${s} aus?`],
  groesse:s=>[`Nenne die Größe von ${s}.`,`Wie groß ist ${s}?`]
};
const prop=p=>{const n=normalize(p);return n==='grosse'||n==='groesse'?'groesse':n};
const usable=f=>f&&typeof f.subject==='string'&&typeof f.property==='string'
  &&typeof f.value==='string'&&f.subject.trim()&&f.property.trim()&&f.value.trim();
const noKnowledge=text=>!normalize(text)||/\b(nicht bekannt|keine passende antwort|nichts gespeichert|weiss ich nicht|kann ich nicht beantworten|nicht gespeichert|keine information|unbekannt)\b/.test(normalize(text));
const warning=text=>/unterschiedliche angaben|widerspruch|konflikt|abweichende angaben/i.test(String(text??''));
const hash=s=>{let h=2166136261;for(const char of s){h=Math.imul(h^char.charCodeAt(0),16777619)}return (h>>>0).toString(36)};
function signature(facts) {
  return hash((Array.isArray(facts)?facts:[]).filter(usable)
    .map(f=>[compact(f.subject),compact(f.property),compact(f.value),!!f.conflict].join(':')).sort().join('|'));
}
function examine(facts,responder,limit=20) {
  const rows=(Array.isArray(facts)?facts:[]).filter(usable);
  const selected=[],seen=new Set();
  for(const f of rows) {
    const p=prop(f.property),key=compact(f.subject)+'|'+p;
    if(!questions[p]||seen.has(key))continue;
    seen.add(key);selected.push(f);
    if(selected.length>=Math.max(1,Math.min(30,Number.isFinite(limit)?Math.floor(limit):20)))break;
  }
  const tests=[],issues=[];
  function test(type,question,expected,source,answerDb=rows) {
    let answer='',error='';
    try {const result=responder(question,answerDb);answer=typeof result==='string'?result:result?.text||''}
    catch(e){error=String(e?.message||e).slice(0,100)}
    let passed=false;
    if(type==='paraphrase')passed=containsValue(answer,expected);
    if(type==='unknown')passed=noKnowledge(answer);
    if(type==='conflict')passed=warning(answer);
    const item={type,question,passed,subject:source?.subject||'',property:source?.property||''};
    tests.push(item);
    if(!passed)issues.push({...item,answer:answer.slice(0,160),error});
  }
  for(const f of selected)for(const q of questions[prop(f.property)](f.subject))
    test('paraphrase',q,f.value,f);
  // Question to a nonexistent subject: a correct response must abstain.
  const fake='NeryxTestobjekt'+hash(signature(rows));
  const unknownQuestion=`Welchen Durchmesser hat ${fake}?`;
  test('unknown',unknownQuestion,'',null);
  // Known subject but unsupported property must not invent a value.
  if(selected.length) {
    const f=selected[0],p=new Set(rows.filter(x=>compact(x.subject)===compact(f.subject)).map(x=>prop(x.property)));
    const missing=[['durchmesser','Welchen Durchmesser hat'],['gewicht','Wie viel wiegt'],['fellfarbe','Welche Fellfarbe hat']]
      .find(([key])=>!p.has(key));
    if(missing)test('unknown',`${missing[1]} ${f.subject}?`,'',f);
  }
  // Inject a simulated conflicting claim in a *copy*. Real facts are never edited.
  if(selected.length) {
    const f=selected[0],target=compact(f.subject)+'|'+prop(f.property);
    const cloned=rows.map(x=>(compact(x.subject)+'|'+prop(x.property)===target)
      ?{...x,conflict:true,alternatives:[{value:'GENESIS Testkonflikt'}]}:{...x});
    const key=prop(f.property);
    const baseline={definition:`Was ist ${f.subject}?`,aussehen:`Wie sieht ${f.subject} aus?`,
      durchmesser:`Welchen Durchmesser hat ${f.subject}?`,gewicht:`Wie viel wiegt ${f.subject}?`,
      hauptstadt:`Was ist die Hauptstadt von ${f.subject}?`,
      fellfarbe:`Welche Fellfarbe hat ${f.subject}?`,
      lebensraum:`Wo lebt ${f.subject}?`,nahrung:`Was frisst ${f.subject}?`,
      familie:`Zu welcher Familie gehört ${f.subject}?`,groesse:`Wie groß ist ${f.subject}?`};
    test('conflict',baseline[key]||questions[key](f.subject)[0],'',f,cloned);
  }
  const summary=type=>({checked:tests.filter(x=>x.type===type).length,
    passed:tests.filter(x=>x.type===type&&x.passed).length});
  return {facts:rows.length,signature:signature(rows),checked:tests.length,
    passed:tests.filter(x=>x.passed).length,
    paraphrase:summary('paraphrase'),unknown:summary('unknown'),conflict:summary('conflict'),
    issues:issues.slice(0,12)};
}
function history() {
  try {const rows=JSON.parse(localStorage.getItem(KEY)||'[]');
    return Array.isArray(rows)?rows.filter(x=>x&&typeof x.signature==='string').slice(-MAX_RUNS):[];
  }catch{return []}
}
function record(r,modelVersion) {
  if(!r.checked)return {saved:false,reason:'Keine Testfragen'};
  try {
    const rows=history();
    rows.push({time:Date.now(),signature:r.signature,model:String(modelVersion||'unbekannt'),
      checked:r.checked,passed:r.passed,paraphrase:r.paraphrase,
      unknown:r.unknown,conflict:r.conflict});
    localStorage.setItem(KEY,JSON.stringify(rows.slice(-MAX_RUNS)));
    return {saved:true};
  }catch{return {saved:false,reason:'Lokaler Verlauf nicht beschreibbar'}}
}
function formatRatio(x){return `${x.passed}/${x.checked}`}
function report() {
  const bridge=window.LernBotBridge,ai=window.LernBotAntwortKI;
  if(!bridge?.getFacts||!ai?.answer)return 'GENESIS 2.0: Wissens- oder Antwortschnittstelle nicht geladen.';
  const facts=bridge.getFacts();
  const result=examine(facts,(q,db)=>ai.answer(q,{facts:db,documents:[],context:{}}));
  const previous=history().filter(x=>x.signature===result.signature&&x.model===String(ai.version||'unbekannt')&&x.checked===result.checked).at(-1);
  const saveResult=record(result,ai.version);
  const lines=['NERYX GENESIS 2.0 · ERWEITERTE GEGENPROBE',
    `Strukturierte Fakten: ${result.facts}`,
    `Neue Frageformulierungen: ${formatRatio(result.paraphrase)}`,
    `Wissenslücken korrekt erkannt: ${formatRatio(result.unknown)}`,
    `Simulierter Widerspruch erkannt: ${formatRatio(result.conflict)}`,
    `Gesamtergebnis: ${result.passed}/${result.checked}`];
  if(previous) {
    const difference=result.passed-previous.passed;
    lines.push(`Vergleich bei gleichem Faktenstand und gleicher Antwort-KI: ${difference>0?'+':''}${difference} richtige Antworten`);
  }else lines.push('Noch kein direkt vergleichbarer früherer Test.');
  lines.push(saveResult.saved?'Testverlauf lokal gespeichert.':'Verlauf nicht gespeichert: '+saveResult.reason);
  if(!result.facts)lines.push('Keine Fakten vorhanden. Getestet wurde nur der Umgang mit unbekanntem Wissen.');
  if(result.issues.length) {
    lines.push('','ERKANNTE SCHWACHSTELLEN (keine automatischen Änderungen):');
    for(const [i,x] of result.issues.entries()) {
      const label={paraphrase:'Formulierung',unknown:'Wissenslücke',conflict:'Widerspruch'}[x.type];
      lines.push(`${i+1}. ${label}: ${x.question}`+(x.answer?`\nAntwort: ${x.answer}`:'\nKeine Antwort'));
    }
  }else lines.push('Keine Schwachstellen in dieser begrenzten Gegenprobe entdeckt.');
  lines.push('','Hinweis: Tests mit eigenen Fakten sind kein unabhängiger Wahrheits- oder Intelligenzbeweis.');
  return lines.join('\n');
}
function historyReport() {
  const rows=history();
  if(!rows.length)return 'GENESIS: Noch kein lokal gespeicherter Testverlauf.';
  const lines=['NERYX GENESIS · TESTVERLAUF',`${rows.length} letzte Testläufe (maximal ${MAX_RUNS}):`];
  for(const x of rows.slice(-10))lines.push(`${new Date(x.time).toLocaleString('de-DE')}: ${x.passed}/${x.checked} · Antwort-KI ${x.model}`);
  lines.push('Gespeichert werden Zähler, Zeit und eine einfache Prüfsumme des Faktenstands, aber keine Klartext-Fakten oder Chattexte. Die Prüfsumme ist nicht kryptografisch geschützt.');
  lines.push('Ergebnisse sind nur bei identischem Faktenbestand, gleichem Modell und gleicher Testanzahl direkt vergleichbar.');
  return lines.join('\n');
}
window.NERYXGenesis2=Object.freeze({version:'2.0',examine,report,historyReport,signature});
})();
