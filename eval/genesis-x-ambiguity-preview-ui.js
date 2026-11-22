/* Standalone optional research preview. Never writes to app chat or localStorage. */
(() => {
'use strict';
const form=document.getElementById('research-form');
const select=document.getElementById('scenario');
const button=document.getElementById('check');
const output=document.getElementById('result');
if(!form||!select||!button||!output)return;
const make=(fn,training,validation,probes)=>({
 training:training.map(x=>({x,y:fn(x)})),
 validation:validation.map(x=>({x,y:fn(x)})),probes
});
const scenarios=Object.freeze({
 unique:()=>make(x=>x*x+2,[-3,-1,0],[1,3],[-6,4,7.5]),
 ambiguous:()=>make(x=>x+2,[0,1e-10,2e-10],[3e-10,4e-10],[10,-10]),
 contradictory:()=>{
  const t=make(x=>x+2,[0,1,2],[4,7],[10]);
  t.validation[0].y=999;return t;
 }
});
const messages=Object.freeze({
 ambiguous:'Mehrdeutigkeit erkannt: Unterschiedliche Programme können dieselben Beispiele erklären. Keine Lösung freigegeben.',
 review_required:'Interne Prüfung abgeschlossen. Die betrachteten Programme zeigen bei den Prüfwerten kein abweichendes Verhalten. Unabhängige Bestätigung fehlt; keine Antwort freigegeben.',
 unconfirmed:'Keine passende Regel bestätigt. Keine Antwort freigegeben.',
 invalid:'Ungültige Forschungsaufgabe. Keine Antwort freigegeben.',
 unavailable:'GENESIS X ist nicht verfügbar. Keine Antwort freigegeben.',
 blocked:'Prüfung blockiert. Keine Antwort freigegeben.'
});
let busy=false;
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(busy)return;
 const build=scenarios[select.value];
 if(typeof build!=='function'){output.textContent=messages.invalid;return;}
 busy=true;button.disabled=true;select.disabled=true;
 output.textContent='Forschungsprüfung läuft – keine Antwortfreigabe.';
 try{
  const client=window.NERYXGenesisXAmbiguityClient;
  if(!client||client.version!=='0.1-research'||typeof client.inspect!=='function'){
   output.textContent=messages.unavailable;return;
  }
  const r=await client.inspect(build());
  if(!r||r.publishable!==false||!Object.hasOwn(messages,r.status)){
   output.textContent=messages.blocked;return;
  }
  if(['ambiguous','review_required'].includes(r.status)&&
    (!Number.isInteger(r.candidates)||!Number.isInteger(r.distinctProbeBehaviors)||
     !Number.isInteger(r.checkedProbes)||r.checkedProbes<1||
     (r.status==='ambiguous')!==(r.distinctProbeBehaviors>1))){
   output.textContent=messages.blocked;return;
  }
  output.textContent=messages[r.status];
 }catch{output.textContent=messages.blocked;}
 finally{busy=false;button.disabled=false;select.disabled=false;}
});
})();
