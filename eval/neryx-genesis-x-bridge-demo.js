/* Explicit opt-in demo for typed NERYX research requests. No chat integration. */
(() => {
'use strict';
const form=document.getElementById('bridge-form');
const choice=document.getElementById('bridge-case');
const button=document.getElementById('bridge-run');
const result=document.getElementById('bridge-result');
if(!form||!choice||!button||!result)return;
const task=(fn,train,validate,probes)=>({
 training:train.map(x=>({x,y:fn(x)})),
 validation:validate.map(x=>({x,y:fn(x)})),probes
});
const fixtures=Object.freeze({
 unique:()=>task(x=>x*x+2,[-3,-1,0],[1,3],[-6,4,7.5]),
 ambiguous:()=>task(x=>x+2,[0,1e-10,2e-10],[3e-10,4e-10],[10,-10]),
 contradictory:()=>{
  const t=task(x=>x+2,[0,1,2],[4,7],[10]);
  t.validation[0].y=999;return t;
 }
});
const texts=Object.freeze({
 ambiguous:'Mehrdeutigkeit erkannt. Unterschiedliche Programme kommen infrage. Keine Antwort freigegeben.',
 review_required:'Intern geprüft, aber unabhängig nicht bestätigt. Weitere Prüfung erforderlich. Keine Antwort freigegeben.',
 unconfirmed:'Keine Regel bestätigt. Keine Antwort freigegeben.',
 invalid:'Forschungsauftrag ungültig. Keine Antwort freigegeben.',
 unavailable:'Forschungsbrücke nicht verfügbar. Keine Antwort freigegeben.',
 blocked:'Prüfung blockiert. Keine Antwort freigegeben.'
});
let busy=false;
form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(busy)return;
 const build=fixtures[choice.value];
 if(!build){result.textContent=texts.invalid;return;}
 busy=true;button.disabled=true;choice.disabled=true;
 result.textContent='Forschungsauftrag wird geprüft – keine Freigabe.';
 try{
  const bridge=window.NERYXGenesisXResearchBridge;
  if(!bridge||bridge.version!=='0.1-research'||typeof bridge.review!=='function'){
   result.textContent=texts.unavailable;return;
  }
  const response=await bridge.review({version:1,kind:'research_check',task:build()});
  if(!response||response.publishable!==false||response.reviewOnly!==true||
     !Object.hasOwn(texts,response.status)){
   result.textContent=texts.blocked;return;
  }
  result.textContent=texts[response.status];
 }catch{result.textContent=texts.blocked;}
 finally{busy=false;button.disabled=false;choice.disabled=false;}
});
})();