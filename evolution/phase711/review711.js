export function assess711(raw){
 const d=raw?.schema===711?raw:{};
 const records=Array.isArray(d.records)?d.records:[];
 const runs=Array.isArray(d.runs)?d.runs:[];
 const last=runs.at(-1)||null;
 return {records,runs,last,claims:records.flatMap(r=>r.claims||[]),
 topics:records.filter(r=>(r.claims||[]).length>0).length,
 titles:records.filter(r=>r.source).length,
 errors:records.filter(r=>r.status==='abruf_fehler').length};
}
export function test711(){const x=assess711({schema:711,records:[{topic:'DNA',source:'https://de.wikipedia.org/?curid=1',claims:[{statement:'DNA ist ein Molekül.'}]}],runs:[{claims:1,topics_with_claims:1}]});return {passed:Number(x.topics===1)+Number(x.claims.length===1)+Number(x.last?.topics_with_claims===1)+Number(x.errors===0),total:4};}
