/* GENESIS X standalone research UI. Never mounted into production NERYX. */
(() => {
'use strict';
const form=document.getElementById('task-form');
const button=document.getElementById('run');
const output=document.getElementById('report');
const x=document.getElementById('x'),b=document.getElementById('b');
if(!form||!button||!output||!x||!b)return;
const bounded=v=>Number.isFinite(v)&&Math.abs(v)<=1000000;
function makeTask(a,c){
 return {
  numeric:{training:[0,1,2].map(v=>({x:v,y:v+2})),
   validation:[4,7].map(v=>({x:v,y:v+2})),maxSteps:1},
  logic:{training:[[0,1],[2,1],[5,3],[1,4],[3,3],[0,0]]
   .map(([m,n])=>({a:m,b:n,expected:m>n})),
   validation:[[8,2],[-2,0],[4,4]]
   .map(([m,n])=>({a:m,b:n,expected:m>n}))},
  cases:[{x:a,b:c}]
 };
}
const messages=Object.freeze({
 invalid:'Ungültige Eingabe. Bitte Zahlen im erlaubten Bereich eingeben.',
 blocked:'Prüfung blockiert. Kein Ergebnis freigegeben.',
 unavailable:'Forschungsmodul nicht verfügbar. Kein Ergebnis freigegeben.'
});
let busy=false;
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(busy)return;
 const a=x.value.trim()===''?NaN:Number(x.value);
 const c=b.value.trim()===''?NaN:Number(b.value);
 if(!bounded(a)||!bounded(c)||!form.reportValidity()){
  output.textContent=messages.invalid;return;
 }
 busy=true;button.disabled=true;
 output.textContent='Interne Prüfung läuft. Keine Antwortfreigabe.';
 try{
  const client=window.NERYXGenesisXWorkerClient;
  if(!client||typeof client.preview!=='function'){
   output.textContent=messages.unavailable;return;
  }
  const r=await client.preview(makeTask(a,c));
  if(!r||r.publishable!==false||r.status!=='review_required'||
     r.checkedCases!==1||!Number.isInteger(r.referenceCases)||
     r.referenceCases!==0||r.allReferencesMatched!==false){
   output.textContent=messages[r?.status]||messages.blocked;return;
  }
  // No derived values, decisions, rule predictions or user-facing answers.
  output.textContent='Interne Ausführung geprüft (1 Fall). Keine unabhängigen Referenzdaten. Überprüfung durch einen Menschen erforderlich; keine Antwort freigegeben.';
 }catch{output.textContent=messages.blocked;}
 finally{busy=false;button.disabled=false;}
});
})();
