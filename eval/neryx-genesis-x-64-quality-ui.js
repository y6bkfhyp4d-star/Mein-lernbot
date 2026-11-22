/* Separate #64 research UI; never auto-load a model or touch saved data. */
(() => {
'use strict';
const question=document.getElementById('qwen-question'),
 output=document.getElementById('qwen-result'),
 load=document.getElementById('qwen-load'),
 run=document.getElementById('qwen-run'),
 direct=document.getElementById('genesis-only');
if(!question||!output||!load||!run||!direct)return;
let busy=false;
const labels=Object.freeze({
 review_required:'GENESIS X: Interne Regelprüfung abgeschlossen. Keine Antwort freigegeben.',
 ambiguous:'GENESIS X: Mehrdeutigkeit erkannt. Keine Antwort freigegeben.',
 unconfirmed:'GENESIS X: Keine passende Rechenregel bestätigt. Keine Antwort freigegeben.',
 invalid:'Eingabeformat nicht erkannt. Mindestens fünf Zahlenpaare und einen Prüfwert angeben.',
 opt_in_required:'Ohne Qwen bitte den Befehl GENESIS prüfen: vor die Zahlen setzen.',
 model_not_loaded:'Qwen ist noch nicht geladen. Erst über die separate Schaltfläche laden oder GENESIS ohne Qwen verwenden.',
 model_error:'Qwen konnte nicht antworten. Keine Prüfung ausgelöst.',
 model_rejected:'Qwen hat kein gültiges Absichts-Signal geliefert. GENESIS X wurde nicht gestartet.',
 declined:'Qwen hat den Prüfwunsch verneint. GENESIS X wurde nicht gestartet. Du kannst die Prüfung mit „Nur GENESIS X prüfen“ ausdrücklich selbst starten.',
 unavailable:'Prüfung nicht verfügbar. Keine Antwort freigegeben.',
 blocked:'Prüfung blockiert. Keine Antwort freigegeben.'
});
function assessment(r){
 if(!r||r.reviewOnly!==true||r.publishable!==false)return '';
 const original=r.original==='validated'?'zulässig':'abgewiesen';
 const model=({accepted:'zugestimmt',disagreed:'widerspricht dem eindeutigen Auftrag',not_requested:'nicht angefragt',not_confirmed:'keine bestätigte Zustimmung',untrusted:'nicht vertrauenswürdig'})[r.model]||'unbekannt';
 const evidence=r.evidence==='internal_review_only'?'nur interne Regelprüfung; kein unabhängiger Antwortbeweis':'kein bestätigter Prüfstatus';
 return '\n\nQualitätsbericht:\nOriginaleingabe: '+original+
  '\nQwen: '+model+'\nGENESIS: '+evidence+'\nAntwortfreigabe: GESPERRT';
}
async function action(work){
 if(busy)return;
 busy=true;load.disabled=run.disabled=direct.disabled=true;
 try{await work()}
 catch{output.textContent='Die Forschungsprüfung wurde sicher abgebrochen.'}
 finally{load.disabled=run.disabled=direct.disabled=false;busy=false}
}
load.addEventListener('click',()=>action(async()=>{
 output.textContent='Qwen wird nur auf deinen Klick hin geladen. Bei erstem Start sind Downloads nötig.';
 const model=window.NERYXLocalModel;
 if(model?.version!=='1.2'){output.textContent='Lokale Qwen-Schnittstelle fehlt.';return}
 const msg=await model.load();
 output.textContent=model.info?.().loaded?'Qwen lokal geladen. Jetzt kannst du den Qwen-Test starten.':
  'Qwen nicht geladen: '+String(msg).slice(0,320);
}));
run.addEventListener('click',()=>action(async()=>{
 output.textContent='Qwen prüft nur deine Absicht; GENESIS X bekommt ausschließlich die originalen Zahlen.';
 const r=await window.NERYXGenesisXQualityGate?.inspect?.(question.value,{useQwen:true});
 output.textContent=r?.reviewOnly===true&&r?.publishable===false?
  (labels[r.status]||labels.blocked)+assessment(r):
  labels.blocked;
}));
direct.addEventListener('click',()=>action(async()=>{
 output.textContent='GENESIS X prüft nur die vorhandenen Zahlen; kein Qwen-Aufruf.';
 const r=await window.NERYXGenesisXQualityGate?.inspect?.(question.value,{useQwen:false,directConsent:true});
 output.textContent=r?.reviewOnly===true&&r?.publishable===false?
  (labels[r.status]||labels.blocked)+assessment(r):labels.blocked;
}));
})();