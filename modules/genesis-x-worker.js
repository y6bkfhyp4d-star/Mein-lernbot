/* GENESIS X isolated research worker. No production NERYX connection. */
'use strict';
self.window=self; // Legacy research modules use window; this alias stays inside the worker.
const files=[
 'genesis-x.js','genesis-x-tools.js','genesis-x-logic.js',
 'genesis-x-router.js','genesis-x-chain.js','genesis-x-verifier.js',
 'genesis-x-verified-chain.js','genesis-x-diagnostics.js',
 'genesis-x-research.js','genesis-x-research-lab.js',
 'genesis-x-integration-preview.js'
];
importScripts(...files);
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const fail=status=>({version:1,id:1,status,publishable:false});
self.onmessage=event=>{
 let response=fail('invalid');
 try{
  const r=event.data;
  if(record(r)&&Object.keys(r).length===4&&r.version===1&&r.id===1&&
     r.kind==='preview'&&record(r.task)&&JSON.stringify(r.task).length<=30000){
   const p=self.NERYXGenesisXIntegrationPreview;
   if(!p||p.version!=='0.1-preview'||typeof p.preview!=='function'){
    response=fail('unavailable');
   }else{
    const result=p.preview(r.task);
    if(record(result)&&result.publishable===false&&result.status==='review_required'&&
       Number.isInteger(result.checkedCases)&&result.checkedCases>=1&&result.checkedCases<=20&&
       Number.isInteger(result.referenceCases)&&result.referenceCases>=0&&
       result.referenceCases<=result.checkedCases&&typeof result.allReferencesMatched==='boolean'){
      response={version:1,id:1,status:'review_required',publishable:false,
       checkedCases:result.checkedCases,referenceCases:result.referenceCases,
       allReferencesMatched:result.allReferencesMatched};
    }else if(record(result)&&['invalid','blocked','unavailable'].includes(result.status)){
      response=fail(result.status);
    }else response=fail('blocked');
   }
  }
 }catch{response=fail('blocked');}
 self.postMessage(response); // Never send raw candidates, rules, reference truth or reports.
};
