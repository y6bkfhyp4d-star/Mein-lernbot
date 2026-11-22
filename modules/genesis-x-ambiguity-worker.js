/* Separate optional GENESIS X ambiguity-check worker, never a production answer API. */
'use strict';
self.window=self;
importScripts('genesis-x-tools.js','genesis-x-ambiguity-gate.js');
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=status=>({version:2,id:1,status,publishable:false});
self.onmessage=event=>{
 let response=fail('invalid');
 try{
  const r=event.data;
  if(record(r)&&Object.keys(r).length===4&&r.version===2&&r.id===1&&
    r.kind==='ambiguity'&&record(r.task)){
   const size=JSON.stringify(r.task)?.length||0;
   if(size>0&&size<=12000){
    const gate=self.NERYXGenesisXAmbiguityGate;
    if(!gate||gate.version!=='0.1-research'||typeof gate.inspect!=='function')
     response=fail('unavailable');
    else{
     const result=gate.inspect(r.task);
     if(record(result)&&result.publishable===false&&
        ['ambiguous','review_required'].includes(result.status)&&
        Number.isInteger(result.candidates)&&result.candidates>=1&&result.candidates<=342&&
        Number.isInteger(result.distinctProbeBehaviors)&&
        result.distinctProbeBehaviors>=1&&result.distinctProbeBehaviors<=result.candidates&&
        Number.isInteger(result.checkedProbes)&&result.checkedProbes>=1&&result.checkedProbes<=6&&
        (result.status==='ambiguous')===(result.distinctProbeBehaviors>1))
      response={version:2,id:1,status:result.status,publishable:false,
       candidates:result.candidates,distinctProbeBehaviors:result.distinctProbeBehaviors,
       checkedProbes:result.checkedProbes};
     else if(record(result)&&['invalid','unavailable','unconfirmed','blocked'].includes(result.status))
      response=fail(result.status);
     else response=fail('blocked');
    }
   }
  }
 }catch{response=fail('blocked');}
 self.postMessage(response);
};