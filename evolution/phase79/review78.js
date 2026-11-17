// Client-side presentation only. No source is automatically marked verified.
export function assess78(raw){
 const r=raw?.schema===78?raw:{records:[],runs:[]};
 const records=Array.isArray(r.records)?r.records.filter(x=>x&&typeof x.topic==='string'):[];
 const runs=Array.isArray(r.runs)?r.runs:[];
 return {records,runs,available:runs.length>0,withClaims:records.filter(x=>Array.isArray(x.claims)&&x.claims.length).length,
   candidates:records.reduce((n,x)=>n+(Array.isArray(x.claims)?x.claims.length:0),0),
   errors:records.filter(x=>x.status==='abruf_fehler').length,verified:0,corrections:0};
}
export function checks78(){let x=assess78({schema:78,records:[{topic:'Wasserstoff',claims:[{object:'chemisches Element'}]}],runs:[{}]});return {passed:Number(x.available)+Number(x.candidates===1)+Number(x.verified===0)+Number(x.corrections===0),total:4};}
