/* #60: opt-in-only page UI. No localStorage, no network or normal chat listeners. */
(() => {
'use strict';
const form=document.getElementById('routed-form'),input=document.getElementById('routed-question'),
 output=document.getElementById('routed-result'),button=document.getElementById('routed-submit');
if(!form||!input||!output||!button)return;
const labels=Object.freeze({
 review_required:'Interne Regelprüfung durchgeführt. Unabhängige Bestätigung fehlt. Keine Antwort freigegeben.',
 ambiguous:'Mehrdeutigkeit erkannt: Mehrere Rechenprogramme führen bei weiteren Eingaben zu verschiedenen Ergebnissen. Keine Antwort freigegeben.',
 unconfirmed:'Keine passende Rechenregel bestätigt. Keine Antwort freigegeben.',
 invalid:'Aufgabe nicht eindeutig oder Format ungültig. Keine Antwort freigegeben.',
 unavailable:'GENESIS X ist hier nicht verfügbar. Keine Antwort freigegeben.',
 blocked:'Forschungsprüfung blockiert. Keine Antwort freigegeben.'
});
let busy=false;
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 busy=true;button.disabled=true;output.textContent='NERYX prüft das Format; GENESIS X führt nur eine interne Forschungskontrolle aus.';
 try{
  const r=await window.NERYXGenesisXRoutedResearch?.inspect?.(input.value);
  if(!r||r.reviewOnly!==true||r.publishable!==false||!Object.hasOwn(labels,r.status))
   output.textContent=labels.blocked;
  else output.textContent=labels[r.status];
 }catch{output.textContent=labels.blocked}
 finally{button.disabled=false;busy=false;}
});
})();