// Phase 7.2: explizite symbolische Regeln; keine generative Sprache, keine automatische Wahrheitsprüfung.
export const clean = s => String(s ?? '').trim().replace(/\s+/g,' ').slice(0,120);
export const key = s => clean(s).toLocaleLowerCase('de').normalize('NFKC');
const allowed = new Set(['ist_ein','nicht_ist_ein','lebt_in','nicht_lebt_in']);
export function validateFacts(input, origin='manuell') {
  if (!Array.isArray(input)) throw new Error('Fakten müssen ein JSON-Array sein.');
  if (input.length > 250) throw new Error('Maximal 250 Eingabefakten.');
  const output=[], seen=new Set();
  for(let i=0;i<input.length;i++){
    const f=input[i]; if(!f||typeof f!=='object'||!allowed.has(f.relation))throw Error(`Ungültige Relation in Fakt ${i+1}.`);
    const subject=clean(f.subject),object=clean(f.object);
    if(!subject||!object)throw Error(`Subjekt oder Objekt fehlt in Fakt ${i+1}.`);
    const id=`f${i+1}`,signature=[key(subject),f.relation,key(object)].join('|');
    if(seen.has(signature))continue;seen.add(signature);
    const source=typeof f.source==='string'&&/^https:\/\//.test(f.source)?f.source.slice(0,300):null;
    output.push({id,subject,relation:f.relation,object,source,origin,derived:false,premises:[id]});
  }
  return output;
}
const sig=f=>[key(f.subject),f.relation,key(f.object)].join('|');
export function infer(facts, maxNew=1000) {
  const all=facts.map(f=>({...f,premises:[...(f.premises||[f.id])]}));
  const seen=new Set(all.map(sig));let rounds=0;
  // Positiv: A ist_ein B, B ist_ein C => A ist_ein C
  // Vererbung von Lebensraum ist bewusst NICHT aktiviert (nicht allgemein gültig für jedes Individuum).
  while(rounds++ < 25 && all.length-facts.length<maxNew){
    const add=[];const taxa=all.filter(f=>f.relation==='ist_ein');
    for(const ab of taxa)for(const bc of taxa){
      if(key(ab.object)!==key(bc.subject))continue;
      if(key(ab.subject)===key(bc.object))continue;
      const f={id:`d${all.length+add.length+1}`,subject:ab.subject,relation:'ist_ein',object:bc.object,derived:true,origin:'Regel: Transitivität ist_ein',source:null,premises:[...new Set([...ab.premises,...bc.premises])],proof:[ab.id,bc.id]};
      if(!seen.has(sig(f))){seen.add(sig(f));add.push(f);if(all.length+add.length-facts.length>=maxNew)break;}
    }
    if(!add.length)break;all.push(...add);
  }
  const positives=all.filter(f=>!f.relation.startsWith('nicht_'));
  const negatives=all.filter(f=>f.relation.startsWith('nicht_'));
  const conflicts=[];
  for(const neg of negatives){
    const relation=neg.relation.slice('nicht_'.length);
    const pos=positives.find(p=>p.relation===relation&&key(p.subject)===key(neg.subject)&&key(p.object)===key(neg.object));
    if(pos)conflicts.push({subject:neg.subject,relation,object:neg.object,positive:pos.id,negative:neg.id,positivePremises:pos.premises,negativePremises:neg.premises});
  }
  return {all,derived:all.filter(f=>f.derived),conflicts,truncated:rounds>=25||all.length-facts.length>=maxNew};
}
export function askFact(result, subject, relation, object){
  const s=key(subject),o=key(object);
  const pos=result.all.find(f=>key(f.subject)===s&&f.relation===relation&&key(f.object)===o);
  const neg=result.all.find(f=>key(f.subject)===s&&f.relation===`nicht_${relation}`&&key(f.object)===o);
  return {answer:pos&&neg?'Widerspruch':pos?'Ja':neg?'Nein':'Unbekannt',proof:pos?.premises||[],counterproof:neg?.premises||[]};
}
export function candidatesFromDb(db){
  // Extrahiert bewusst KEINE Relationen aus Wikipedia-Freitext. Nur Kandidaten als manuell zu prüfende Textstellen.
  return db.entries.map(e=>({title:e.title,quote:e.excerpt.slice(0,200),source:e.url,verified:false}));
}
export const demoFacts = [
  {subject:'Fabelwesen A',relation:'ist_ein',object:'Säugetier'},
  {subject:'Säugetier',relation:'ist_ein',object:'Wirbeltier'},
  {subject:'Fabelwesen B',relation:'ist_ein',object:'Säugetier'},
  {subject:'Fabelwesen B',relation:'nicht_ist_ein',object:'Wirbeltier'},
  {subject:'Fabelwesen A',relation:'lebt_in',object:'Wald'}
];
export const holdoutQuestions=[
  {subject:'Fabelwesen A',relation:'ist_ein',object:'Wirbeltier',expected:'Ja'},
  {subject:'Fabelwesen A',relation:'lebt_in',object:'Wald',expected:'Ja'},
  {subject:'Fabelwesen A',relation:'lebt_in',object:'Wüste',expected:'Unbekannt'},
  {subject:'Fabelwesen B',relation:'ist_ein',object:'Wirbeltier',expected:'Widerspruch'}
];
export function benchmark(facts=demoFacts,tests=holdoutQuestions){const result=infer(validateFacts(facts,'Demo'));return {correct:tests.filter(q=>askFact(result,q.subject,q.relation,q.object).answer===q.expected).length,total:tests.length,result};}
