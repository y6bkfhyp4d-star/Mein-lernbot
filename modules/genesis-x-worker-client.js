/* GENESIS X optional research-only worker client; no app wiring. */
(() => {
'use strict';
const scriptUrl=document.currentScript?.src||'';
const workerUrl=scriptUrl?new URL('genesis-x-worker.js',scriptUrl).href:null;
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=status=>Object.freeze({status,publishable:false});
function preview(task){
 if(!workerUrl||!record(task))return Promise.resolve(fail('invalid'));
 let size;
 try{size=JSON.stringify(task)?.length||0;}catch{return Promise.resolve(fail('invalid'));}
 if(size<2||size>30000)return Promise.resolve(fail('invalid'));
 return new Promise(resolve=>{
  let worker,done=false;
  const finish=r=>{
   if(done)return;
   done=true;
   clearTimeout(timer);
   if(worker)worker.terminate();
   resolve(Object.freeze(r));
  };
  let timer;
  try{
   worker=new Worker(workerUrl,{name:'genesis-x-research-preview'});
   timer=setTimeout(()=>finish(fail('blocked')),8000);
   worker.onerror=()=>finish(fail('blocked'));
   worker.onmessage=e=>{
    const r=e.data;
    if(!record(r)||r.version!==1||r.id!==1||r.publishable!==false||
       !['invalid','unavailable','blocked','review_required'].includes(r.status)){
      finish(fail('blocked'));return;
    }
    if(r.status!=='review_required'){
     if(Object.keys(r).length!==4){finish(fail('blocked'));return;}
     finish(fail(r.status));return;
    }
    if(Object.keys(r).length!==7||!Number.isInteger(r.checkedCases)||
       r.checkedCases<1||r.checkedCases>20||
       !Number.isInteger(r.referenceCases)||r.referenceCases<0||
       r.referenceCases>r.checkedCases||typeof r.allReferencesMatched!=='boolean'){
      finish(fail('blocked'));return;
    }
    finish({status:'review_required',publishable:false,
     checkedCases:r.checkedCases,referenceCases:r.referenceCases,
     allReferencesMatched:r.allReferencesMatched});
   };
   worker.postMessage({version:1,id:1,kind:'preview',task});
  }catch{finish(fail('blocked'));}
 });
}
window.NERYXGenesisXWorkerClient=Object.freeze({version:'0.1-preview',preview});
})();
