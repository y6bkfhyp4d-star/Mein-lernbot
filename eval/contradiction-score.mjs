/* NERYX Widerspruchs-Auswerter v1 – konservativer Vorprüfer.
   PASS nur bei ausdrücklich belegtem Zahlenkonflikt, beiden Werten,
   Widerspruchshinweis und erkennbar offener Entscheidung.
   Kein semantischer Allzweck-Prüfer und keine Frozen-Testdaten. */
const normalize=s=>String(s??'').toLocaleLowerCase('de').normalize('NFKC')
 .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
 .replace(/\s+/g,' ').trim();
const numbers=s=>[...normalize(s).matchAll(/(?<![\p{L}\p{N}])\d+(?:[,.]\d+)?(?![\p{L}\p{N}])/gu)]
 .map(m=>Number(m[0].replace(',','.')));
const shape=s=>normalize(s).replace(/(?<![\p{L}\p{N}])\d+(?:[,.]\d+)?(?![\p{L}\p{N}])/gu,'#')
 .replace(/[.!?]+$/,'').trim();
const conflictCue=/\b(?:widerspruch\w*|widersprechen|abweichend\w*|unterschiedlich\w*\s+(?:angaben|werte|zahlen)|konflikt\w*|nicht einheitlich)\b/i;
const uncertaintyCue=/\b(?:nicht eindeutig|nicht entscheiden|nicht festlegen|unklar|ungeklaert|unbekannt|nicht bestimmbar|laesst sich nicht|ohne weitere (?:belege|quellen|pruefung|informationen)|keine eindeutige)\b/i;
const assertChoice=/\b(?:richtig (?:ist|sind)|tatsaechlich|definitiv|eindeutig (?:ist|sind)|gilt (?:nur|allein)|stattdessen gilt|falsch ist|wahr ist)\b/i;
function conflictPairs(claims){
 if(!Array.isArray(claims))throw Error('Claims müssen Array sein.');
 const map=new Map();
 for(const c of claims){
  if(!c||typeof c.id!=='string'||typeof c.text!=='string'||!Array.isArray(c.conflicts))
   throw Error('Ungültiger Konflikt-Claim.');
  if(map.has(c.id))throw Error('Doppelte Claim-ID.');
  map.set(c.id,c);
 }
 const pairs=[],seen=new Set();
 for(const c of claims)for(const id of c.conflicts){
  const other=map.get(id);
  if(!other||!other.conflicts.includes(c.id))throw Error('Nicht symmetrische Konfliktreferenz.');
  const key=[c.id,id].sort().join('|');
  if(seen.has(key))continue;
  seen.add(key);
  const a=numbers(c.text),b=numbers(other.text);
  if(a.length===1&&b.length===1&&a[0]!==b[0]&&shape(c.text)===shape(other.text))
   pairs.push({values:[a[0],b[0]],ids:[c.id,id]});
  else pairs.push({values:null,ids:[c.id,id]});
 }
 return pairs;
}
export function scoreConflict(answer,claims,expected=true){
 if(typeof answer!=='string'||typeof expected!=='boolean')
  throw Error('Ungültiger Widerspruchsauftrag.');
 const pairs=conflictPairs(claims);
 if(!pairs.length)return {status:'not_evaluated',reason:'no_confirmed_pair'};
 if(expected===false)return {status:'not_evaluated',reason:'negative_case_not_supported'};
 if(!answer.trim())return {status:'fail',reason:'empty_answer'};
 if(pairs.length!==1||!pairs[0].values)return {status:'review',reason:'complex_or_multiple_conflicts'};
 const [a,b]=pairs[0].values;
 const found=new Set(numbers(answer));
 if(!found.has(a)||!found.has(b))return {status:'fail',reason:'missing_competing_values'};
 const text=normalize(answer);
 if(assertChoice.test(text))return {status:'fail',reason:'selects_one_as_truth'};
 if(!conflictCue.test(text))return {status:'fail',reason:'conflict_not_explicit'};
 if(!uncertaintyCue.test(text))return {status:'review',reason:'resolution_not_explicit'};
 return {status:'pass',reason:'numeric_conflict_explicitly_unresolved'};
}
