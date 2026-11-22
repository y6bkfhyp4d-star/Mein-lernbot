/* Opt-in research-only ambiguity client. Never wired to active NERYX chat. */
(() => {
'use strict';
const source=document.currentScript?.src||'';
const workerUrl=source?new URL('genesis-x-ambiguity-worker.js',source).href:null;
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=status=>Object.freeze({status,publishable:false});
function inspect(task){
 if(!workerUrl||!record(task))return Promise.resolve(fail('invalid'));
 let json;
 try{json=JSON.stringify(task);}catch{return Promise.resolve(fail('invalid'));}
 if(!json||json.length>12000)return Promise.resolve(fail('invalid'));
 return new Promise(resolve=>{
  let worker,closed=false,timer;
  const done=result=>{
   if(closed)return;
   closed=true;clearTimeout(timer);
   if(worker)worker.terminate();
   resolve(Object.freeze(result));
  };
  try{
   worker=new Worker(workerUrl,{name:'genesis-x-ambiguity-review'});
   timer=setTimeout(()=>done(fail('blocked')),8000);
   worker.onerror=()=>done(fail('blocked'));
   worker.onmessage=event=>{
    const r=event.data;
    if(!record(r)||r.version!==2||r.id!==1||r.publishable!==false||
       !['invalid','unavailable','blocked','unconfirmed','ambiguous','review_required'].includes(r.status)){
     done(fail('blocked'));return;
    }
    if(['ambiguous','review_required'].includes(r.status)){
     if(Object.keys(r).length!==7||!Number.isInteger(r.candidates)||
        r.candidates<1||r.candidates>342||
        !Number.isInteger(r.distinctProbeBehaviors)||
        r.distinctProbeBehaviors<1||r.distinctProbeBehaviors>r.candidates||
        !Number.isInteger(r.checkedProbes)||r.checkedProbes<1||r.checkedProbes>6||
        (r.status==='ambiguous')!==(r.distinctProbeBehaviors>1)){
      done(fail('blocked'));return;
     }
     done({status:r.status,publishable:false,candidates:r.candidates,
       distinctProbeBehaviors:r.distinctProbeBehaviors,checkedProbes:r.checkedProbes});
     return;
    }
    if(Object.keys(r).length!==4){done(fail('blocked'));return;}
    done(fail(r.status));
   };
   worker.postMessage({version:2,id:1,kind:'ambiguity',task});
  }catch{done(fail('blocked'));}
 });
}
window.NERYXGenesisXAmbiguityClient=Object.freeze({version:'0.1-research',inspect});
})();