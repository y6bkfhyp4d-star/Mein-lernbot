/* NERYX Grounding Vorprüfer v1.
   Nur explizit belegte Textgleichheit und eindeutige Zahlenwidersprüche.
   Für semantisch unklare Fälle: review statt erfundener Gewissheit.
   Keine Frozen-Testdaten, kein Sprachmodell, keine Speicherung. */
const norm=s=>String(s??'').toLocaleLowerCase('de').normalize('NFKC')
 .replace(/\u00a0/g,' ').replace(/ä/g,'ae').replace(/ö/g,'oe')
 .replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/\s+/g,' ').trim()
 .replace(/[.!?]+$/,'').trim();
const sentences=s=>(String(s??'').match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[])
 .map(x=>x.trim()).filter(Boolean);
const nums=s=>[...s.matchAll(/(?<![\p{L}\p{N}])\d+(?:[,.]\d+)?(?![\p{L}\p{N}])/gu)]
 .map(x=>Number(x[0].replace(',','.')));
const skeleton=s=>norm(s).replace(/(?<![\p{L}\p{N}])\d+(?:[,.]\d+)?(?![\p{L}\p{N}])/gu,'#');
function label(sentence,evidence){
 const s=norm(sentence);
 if(!s)return {label:'review',reason:'empty_sentence'};
 if(evidence.some(c=>c.text===undefined||typeof c.text!=='string'))
  throw Error('Beleg muss Text enthalten.');
 const exact=evidence.filter(c=>norm(c.text)===s);
 if(exact.some(c=>c.origin==='curated'))
  return {label:'supported',reason:'exact_curated_evidence'};
 if(exact.some(c=>c.origin==='user'))
  return {label:'unverified',reason:'exact_user_evidence'};
 // Widerspruch nur bei identischem Satzgerüst und genau EINEM abweichenden Zahlenwert.
 const values=nums(s);
 if(values.length===1){
  const opposite=evidence.filter(c=>{
   const n=nums(norm(c.text));
   return n.length===1&&skeleton(c.text)===skeleton(s)&&n[0]!==values[0];
  });
  if(opposite.length===1&&opposite[0].origin==='curated')
   return {label:'contradicted',reason:'same_statement_different_number'};
  if(opposite.length)return {label:'review',reason:'conflicting_or_unverified_numbers'};
 }
 if(!evidence.length)return {label:'unsupported',reason:'no_evidence'};
 // Fremde Themen oder Paraphrasen dürfen nicht mit einem simplen Matcher entschieden werden.
 return {label:'review',reason:'semantic_verification_required'};
}
export function inspectGrounding(draft,evidence){
 if(typeof draft!=='string'||!Array.isArray(evidence))
  throw Error('Ungültiges Draft-/Belegformat.');
 if(evidence.some(c=>!c||typeof c!=='object'||!['curated','user'].includes(c.origin)))
  throw Error('Ungültiger Quellenstatus.');
 const parts=sentences(draft);
 if(!parts.length||parts.length>100)return {status:'review',labels:[],reasons:['invalid_sentence_count']};
 const results=parts.map(s=>label(s,evidence));
 const labels=results.map(x=>x.label);
 return {status:labels.includes('review')?'review':'classified',
  labels,reasons:results.map(x=>x.reason)};
}
export function scoreGrounding(draft,evidence,goldLabels){
 if(!Array.isArray(goldLabels)||!goldLabels.length||
  goldLabels.some(x=>!['supported','unsupported','contradicted','unverified'].includes(x)))
  throw Error('Ungültige Goldlabels.');
 const result=inspectGrounding(draft,evidence);
 if(result.status==='review')return {status:'review',reason:'ambiguous_grounding'};
 if(result.labels.length!==goldLabels.length)return {status:'fail',reason:'label_count_mismatch'};
 return {status:result.labels.every((x,i)=>x===goldLabels[i])?'pass':'fail',
  reason:'all_sentence_labels_compared'};
}
