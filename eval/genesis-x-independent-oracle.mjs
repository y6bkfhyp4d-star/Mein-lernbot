/* Test-only deterministic arithmetic oracle. No GENESIS X imports. */
export const holdout=Object.freeze([
 Object.freeze({x:3,b:4}),Object.freeze({x:8,b:20}),
 Object.freeze({x:-4,b:-1}),Object.freeze({x:0,b:2}),
 Object.freeze({x:10,b:11}),Object.freeze({x:-10,b:-9}),
 Object.freeze({x:7,b:7}),Object.freeze({x:12,b:3}),
 Object.freeze({x:1.5,b:3.5}),Object.freeze({x:-1.5,b:0.5}),
 Object.freeze({x:99,b:100}),Object.freeze({x:-20,b:-15})
]);
export function reference(x,b){
 if(typeof x!=='number'||!Number.isFinite(x)||
    typeof b!=='number'||!Number.isFinite(b)||
    Math.abs(x)>1000000||Math.abs(b)>1000000)throw Error('Unsupported reference input');
 const value=x+2;
 return Object.freeze({value,decision:value>b});
}
export function auditCases(cases,inputs){
 if(!Array.isArray(cases)||!Array.isArray(inputs)||!inputs.length||
   inputs.length>20||cases.length!==inputs.length||
   Array.from(inputs,i=>!(i&&typeof i==='object'&&!Array.isArray(i))).some(Boolean))
  return Object.freeze({status:'invalid',publishable:false,checked:0,matched:0,mismatched:0});
 let matched=0,values=0,decisions=0;
 for(let n=0;n<inputs.length;n++){
  const source=inputs[n],candidate=cases[n];
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate)||
     candidate.x!==source.x||candidate.b!==source.b||
     typeof candidate.value!=='number'||!Number.isFinite(candidate.value)||
     typeof candidate.decision!=='boolean')
   return Object.freeze({status:'blocked',publishable:false,checked:0,matched:0,mismatched:0});
  const expected=reference(source.x,source.b);
  const v=candidate.value===expected.value,d=candidate.decision===expected.decision;
  if(v)values++;
  if(d)decisions++;
  if(v&&d)matched++;
 }
 return Object.freeze({status:matched===inputs.length?'reference_matched':'reference_mismatch',
  publishable:false,checked:inputs.length,matched,
  mismatched:inputs.length-matched,valueMatches:values,decisionMatches:decisions});
}
