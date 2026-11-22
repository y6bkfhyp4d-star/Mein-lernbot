/* Separate research page only: strictly categorical display, no model or data access. */
(() => {
'use strict';
const input=document.getElementById('decision-question'),
 output=document.getElementById('decision-result'),
 form=document.getElementById('decision-form'),button=document.getElementById('check');
if(!input||!output||!form||!button)return;
const cases=Object.freeze({
 area:'Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 5 Meter breit und 2,5 Meter hoch. Wie groß ist die gesamte Wandfläche?',
 ambiguous:'GENESIS prüfen: 0=2, 0.0000000001=2.0000000001, 0.0000000002=2.0000000002, 0.0000000003=2.0000000003, 0.0000000004=2.0000000004; 10',
 contradiction:'GENESIS prüfen: 0=2, 1=3, 2=4, 4=999, 7=9; 10',
 unknown:'Was ist die Hauptstadt von Testovia?'
});
for(const control of document.querySelectorAll('[data-case]')){
 control.addEventListener('click',()=>{
  if(!button.disabled)input.value=cases[control.dataset.case]||input.value;
 });
}
const labels=Object.freeze({
 ambiguous:'Mehrdeutigkeit erkannt. Keine GENESIS-X-Antwort freigegeben.',
 review_required:'Interner Regelkandidat gefunden. Unabhängige Bestätigung fehlt. Keine GENESIS-X-Antwort freigegeben.',
 unconfirmed:'Keine passende Rechenregel bestätigt. Keine Antwort freigegeben.',
 needs_clarification:'Angaben reichen für eine eindeutige Wandflächenberechnung nicht aus. Bitte präzisieren.',
 unverified:'Für diese Frage liegt keine unabhängig überprüfte Lösung vor. Qwen wird hier nicht aufgerufen.',
 invalid:'Ungültiges Eingabeformat. Keine Antwort freigegeben.',
 unavailable:'Ein benötigtes Prüfmodul ist nicht verfügbar. Keine Antwort freigegeben.',
 blocked:'Prüfung aus Sicherheits- oder Konsistenzgründen blockiert. Keine Antwort freigegeben.'
});
let busy=false;
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busy=true;button.disabled=true;
 output.textContent='Prüfe Aufgabenart und vorhandene Evidenz …';
 try{
  const r=await window.NERYXGenesisXDecisionGate?.decide?.(input.value);
  if(!r||r.reviewOnly!==true||r.publishable!==false){
   output.textContent=labels.blocked;return;
  }
  if(r.status==='tool_checked'&&r.route==='tool'&&r.result?.unit==='m²'&&
      typeof r.result.value==='number'&&Number.isFinite(r.result.value)){
   output.textContent='Eindeutige Wandfläche durch Fachwerkzeug nachgerechnet: '+r.result.value+
    ' m².\nNur für diesen begrenzten Aufgabentyp geprüft; keine allgemeine Antwortfreigabe.';
  }else output.textContent=labels[r.status]||labels.blocked;
 }catch{output.textContent=labels.blocked}
 finally{busy=false;button.disabled=false}
});
})();