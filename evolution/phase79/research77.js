// Phase 7.7: Suchtreffer sind Recherchehinweise, keine verifizierten Fakten.
export function assess(raw){
 const data=raw?.schema===77?raw:{schema:77,questions:[],runs:[],last_batch:[]};
 const questions=Array.isArray(data.questions)?data.questions.filter(q=>q&&typeof q.topic==='string'):[];
 const runs=Array.isArray(data.runs)?data.runs:[];
 const searched=questions.filter(q=>q.status==='suchtreffer').length;
 const missing=questions.filter(q=>q.status==='keine_treffer').length;
 const errors=questions.filter(q=>q.status==='recherche_fehler').length;
 return {available: runs.length>0,questions,runs,searched,missing,errors,independentVerified:0,confirmedCorrections:0};
}
export function tests77(){
 const good=assess({schema:77,questions:[{topic:'Mars',status:'suchtreffer',hits:[{title:'Planet',url:'https://de.wikipedia.org/?curid=1'}]}],runs:[{searched:1}]});
 const empty=assess(null);
 return {passed:Number(good.available)+Number(good.searched===1)+Number(good.independentVerified===0)+Number(!empty.available),total:4};
}
