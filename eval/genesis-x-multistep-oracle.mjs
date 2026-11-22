/* Test-only multi-step program oracle and ambiguity detector.
   Not imported by the research engine, not production code. */
const OPS=Object.freeze(['add','subtract','multiply','divide','square','negate']);
const CONSTANTS=Object.freeze([0,1,2,3]);
const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&
 Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
export function execute(program,x){
 if(!Array.isArray(program)||program.length<1||program.length>2||
    typeof x!=='number'||!Number.isFinite(x))throw Error('Invalid program or input');
 let y=x;
 for(const step of program){
  if(!step||!OPS.includes(step.op))throw Error('Unknown operator');
  if(!['square','negate'].includes(step.op)&&
     (!Number.isFinite(step.c)||!CONSTANTS.includes(step.c)))throw Error('Invalid constant');
  const c=step.c;
  switch(step.op){
   case 'add':y+=c;break;
   case 'subtract':y-=c;break;
   case 'multiply':y*=c;break;
   case 'divide':y=c===0?NaN:y/c;break;
   case 'square':y=y*y;break;
   case 'negate':y=-y;break;
  }
  if(!Number.isFinite(y)||Math.abs(y)>1e12)throw Error('Invalid arithmetic');
 }
 return y;
}
export function programPool(){
 const steps=OPS.flatMap(op=>['square','negate'].includes(op)?
  [{op}]:CONSTANTS.map(c=>({op,c})));
 const all=[];
 for(const a of steps){
  all.push([a]);
  for(const b of steps)all.push([a,b]);
 }
 return all;
}
export function detectAmbiguity(samples,probes){
 if(!Array.isArray(samples)||samples.length<5||
    !Array.isArray(probes)||probes.length<1)return Object.freeze({status:'invalid',publishable:false});
 if(samples.some(p=>!p||typeof p!=='object'||!Number.isFinite(p.x)||!Number.isFinite(p.y))||
    probes.some(x=>!Number.isFinite(x)))return Object.freeze({status:'invalid',publishable:false});
 const matching=[];
 for(const program of programPool()){
  let fits=true;
  for(const s of samples){
   try{if(!close(execute(program,s.x),s.y)){fits=false;break;}}
   catch{fits=false;break;}
  }
  if(fits)matching.push(program);
 }
 if(!matching.length)return Object.freeze({status:'unconfirmed',publishable:false,candidates:0});
 const fingerprints=new Set();
 for(const program of matching){
  const predictions=[];
  try{for(const x of probes)predictions.push(execute(program,x));}
  catch{continue;}
  // Distinguish predictions by a defined numeric tolerance, not source code.
  const equivalent=[...fingerprints].some(serialized=>{
   const prior=JSON.parse(serialized);
   return prior.every((v,i)=>close(v,predictions[i]));
  });
  if(!equivalent)fingerprints.add(JSON.stringify(predictions));
 }
 return Object.freeze({
  status:fingerprints.size>1?'ambiguous':'probe_consistent',
  publishable:false,candidates:matching.length,distinctProbeBehaviors:fingerprints.size,
  checkedProbes:probes.length
 });
}
