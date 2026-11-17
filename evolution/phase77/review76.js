// Phase 7.6: Wikimedia-Quervergleich, KEINE unabhängige Verifikation.
import {normalize} from './knowledge71.js';
const norm = x => normalize(x).replace(/^(ein|eine|einer|eines|einem|der|die|das)\s+/,'');
export function evaluate(claims, raw) {
  const review = raw && raw.schema === 76 ? raw : {schema:76, entities:[], changes:[], runs:[]};
  const entities = new Map((Array.isArray(review.entities)?review.entities:[]).filter(x=>x?.title).map(x=>[norm(x.title),x]));
  const checked = claims.map(c=>{
    let verdict='nur_quellenbehauptung', detail='Keine unabhängige Quellenprüfung.';
    const e=entities.get(norm(c.subject));
    if(c.relation==='ist_ein' && e?.status==='ok' && Array.isArray(e.classes)){
      const matches=e.classes.filter(x=>norm(x)===norm(c.object));
      if(matches.length){verdict='wikimedia_quergestützt';detail='Wikidata-Klassifikation passt zur Wikipedia-Aussage. Beide gehören zum Wikimedia-Ökosystem und sind NICHT unabhängig.';}
      else {detail='Kein identischer Klassenname in der geprüften Wikidata-Auswahl. Dies ist KEIN Gegenbeweis.';}
    }
    if(e?.source_changed){verdict='quelltext_geaendert';detail='Quelltext seit früherem Lauf geändert. Neue Prüfung erforderlich; kein Beleg für eine falsche Aussage.';}
    return {...c,verdict,detail,verificationSource:e?.wikidata_url||'',independentlyVerified:false};
  });
  return {claims:checked, checked:checked.filter(x=>x.verdict==='wikimedia_quergestützt').length,
    changed:checked.filter(x=>x.verdict==='quelltext_geaendert').length,
    reviewAvailable:!!(raw&&raw.schema===76&&Array.isArray(raw.runs)&&raw.runs.length),changes:Array.isArray(review.changes)?review.changes:[],
    runs:Array.isArray(review.runs)?review.runs:[], independentlyVerified:0};
}
export function verifyTests(){
 const claims=[{subject:'Wasserstoff',relation:'ist_ein',object:'chemisches Element'},{subject:'Mars',relation:'ist_ein',object:'Planet'}];
 const fixture={schema:76,entities:[{title:'Wasserstoff',status:'ok',classes:['chemisches Element'],wikidata_url:'https://www.wikidata.org/wiki/Q556'},{title:'Mars',status:'ok',classes:['Himmelskörper']}],changes:[],runs:[]};
 const r=evaluate(claims,fixture);
 return {passed:Number(r.checked===1)+Number(r.claims[1].verdict==='nur_quellenbehauptung')+Number(r.independentlyVerified===0)+Number(evaluate(claims,{}).checked===0),total:4};
}
