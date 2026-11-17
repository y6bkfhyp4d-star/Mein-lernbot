export function assess79(raw){
 const report=raw?.schema===79?raw:{records:[],runs:[]};
 const records=Array.isArray(report.records)?report.records.filter(r=>r&&typeof r.topic==='string'):[];
 const runs=Array.isArray(report.runs)?report.runs:[];
 const claims=records.flatMap(r=>Array.isArray(r.claims)?r.claims:[]);
 const last=runs.length?runs[runs.length-1]:null;
 return {records,runs,claims,last,topics:records.filter(r=>r.claims?.length).length,
   candidates:claims.length,errors:records.filter(r=>r.status==='abruf_fehler').length,
   verified:0,corrections:0};
}
export function test79(){const r=assess79({schema:79,records:[{topic:'Schall',claims:[{statement:'Schall ist eine mechanische Schwingung.',source:'https://de.wikipedia.org/'}]}],runs:[{baseline_topics_same_pages:0}]});return {passed:Number(r.candidates===1)+Number(r.topics===1)+Number(r.last!==null)+Number(r.verified===0),total:4};}
