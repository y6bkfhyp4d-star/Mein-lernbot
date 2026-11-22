/* NERYX x GENESIS X: opt-in chat routing (research preview only).
 * No automatic model loading, numerical release, memory writes, or side effects.
 */
(() => {
'use strict';
const prefixes=Object.freeze([
 'Bitte untersuche diese Zahlen mit GENESIS X:',
 'GENESIS prüfen:',
 'Bitte überprüfe das Zahlenmuster mit GENESIS X:',
 'Prüfe das Zahlenmuster mit GENESIS X:',
 'Kannst du diese Zahlen mit GENESIS X prüfen:',
 'Untersuche bitte diese Zahlen mit GENESIS X:'
]);
const labels=Object.freeze({
 review_required:'GENESIS X: Interne Regelprüfung abgeschlossen. Keine Antwort freigegeben.',
 ambiguous:'GENESIS X: Mehrdeutigkeit erkannt. Keine Antwort freigegeben.',
 unconfirmed:'GENESIS X: Keine passende Rechenregel bestätigt. Keine Antwort freigegeben.',
 invalid:'Eingabeformat nicht erkannt. Mindestens fünf Zahlenpaare und einen Prüfwert angeben.',
 opt_in_required:'GENESIS X: Eindeutiger Prüfauftrag erforderlich.',
 model_not_loaded:'Qwen ist nicht geladen; GENESIS X wurde nicht automatisch gestartet.',
 model_error:'Qwen ist fehlgeschlagen. Keine Antwort freigegeben.',
 model_rejected:'Qwen lieferte kein gültiges Prüf-Signal. Keine Antwort freigegeben.',
 declined:'Qwen hat die Prüfung abgelehnt. Keine Antwort freigegeben.',
 unavailable:'GENESIS X nicht verfügbar. Keine Antwort freigegeben.',
 blocked:'GENESIS X: Prüfung blockiert. Keine Antwort freigegeben.'
});
function isRequest(input){
 if(typeof input!=='string')return false;
 const str=input.trimStart().toLocaleLowerCase('de');
 return prefixes.some(p=>str.startsWith(p.toLocaleLowerCase('de')));
}
const fallback=Object.freeze({status:'blocked',original:'rejected',model:'untrusted',evidence:'none',reviewOnly:true,publishable:false});
function format(r){
 if(!r||r.reviewOnly!==true||r.publishable!==false)return labels.blocked;
 const own=Object.prototype.hasOwnProperty;
 const allowed=Object.keys(labels);
 if(!allowed.includes(r.status)||
    !['validated','rejected'].includes(r.original)||
    !['not_requested','not_confirmed','accepted','disagreed','untrusted'].includes(r.model)||
    !['none','internal_review_only'].includes(r.evidence)||
    own.call(r,'result')||own.call(r,'prediction'))return labels.blocked;
 const qwen=({
  not_requested:'nicht angefragt',
  not_confirmed:'keine bestätigte Zustimmung',
  accepted:'zugestimmt',
  disagreed:'widerspricht dem eindeutigen Auftrag',
  untrusted:'nicht vertrauenswürdig'
 })[r.model];
 return (labels[r.status]||labels.blocked)+
  '\n\nQualitätsbericht:\nOriginaleingabe: '+(r.original==='validated'?'zulässig':'abgewiesen')+
  '\nQwen: '+qwen+
  '\nGENESIS: '+(r.evidence==='internal_review_only'?
   'nur interne Regelprüfung; kein unabhängiger Antwortbeweis':'kein bestätigter Prüfstatus')+
  '\nAntwortfreigabe: GESPERRT';
}
async function reply(input){
 if(!isRequest(input))return null;
 const gate=window.NERYXGenesisXQualityGate;
 if(gate?.version!=='0.1-research'||typeof gate.inspect!=='function')return format(fallback);
 try{
  // Deliberate chat routing never uses Qwen or starts model downloads.
  // The legacy research gate validates the entire original input.
  return format(await gate.inspect(input,{useQwen:false,directConsent:true}));
 }catch{return format(fallback);}
}
window.NERYXGenesisXChat=Object.freeze({version:'0.1-research',isRequest,reply});
})();
