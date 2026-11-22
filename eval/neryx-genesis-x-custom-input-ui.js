/* Explicit free-form numeric research form. Text is parsed locally and never persisted. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const form=$('custom-form'),button=$('custom-run'),out=$('custom-result');
if(!form||!button||!out)return;
const texts=Object.freeze({
 ambiguous:'Mehrdeutigkeit erkannt. Mehrere passende Rechenprogramme verhalten sich bei den zusätzlichen Eingaben unterschiedlich. Keine Antwort freigegeben.',
 review_required:'Interne Prüfung abgeschlossen; unabhängige Bestätigung fehlt. Keine Antwort freigegeben.',
 unconfirmed:'Keine passende Rechenregel bestätigt. Keine Antwort freigegeben.',
 invalid:'Ungültige Forschungsdaten. Bitte Eingabeformat und unterschiedliche x-Werte prüfen. Keine Antwort freigegeben.',
 unavailable:'Forschungsbrücke nicht verfügbar. Keine Antwort freigegeben.',
 blocked:'Prüfung blockiert. Keine Antwort freigegeben.'
});
const numeric=(text,max)=>{
 const raw=text.trim();
 if(!raw||!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(raw))return null;
 const n=Number(raw.replace(',','.'));
 return Number.isFinite(n)&&Math.abs(n)<=max?n:null;
};
function lines(value,min,max){
 if(typeof value!=='string'||value.length>1500)return null;
 const rows=value.trim().split(/\r?\n/).map(x=>x.trim());
 return rows.length>=min&&rows.length<=max&&rows.every(Boolean)?rows:null;
}
function parse(){
 const train=lines($('training').value,3,15);
 const validation=lines($('validation').value,2,10);
 const probes=lines($('probes').value,1,6);
 if(!train||!validation||!probes)return null;
 const seen=new Set();
 const pairs=rows=>rows.map(row=>{
  const parts=row.split(';');
  if(parts.length!==2)return null;
  const x=numeric(parts[0],1e6),y=numeric(parts[1],1e12);
  if(x===null||y===null||seen.has(x))return null;
  seen.add(x);return {x,y};
 });
 const training=pairs(train),holdout=pairs(validation);
 if([...training,...holdout].some(x=>!x))return null;
 const probeValues=probes.map(row=>numeric(row,1e6));
 if(probeValues.some(x=>x===null||seen.has(x)))return null;
 if(new Set(probeValues).size!==probeValues.length)return null;
 return {training,validation:holdout,probes:probeValues};
}
let busy=false;
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 const task=parse();
 if(!task){out.textContent=texts.invalid;return;}
 busy=true;button.disabled=true;out.textContent='Rechenregeln werden intern geprüft – keine Antwortfreigabe.';
 try{
  const api=window.NERYXGenesisXResearchBridge;
  if(!api||api.version!=='0.1-research'||typeof api.review!=='function'){
   out.textContent=texts.unavailable;return;
  }
  const r=await api.review({version:1,kind:'research_check',task});
  if(!r||r.publishable!==false||r.reviewOnly!==true||!Object.hasOwn(texts,r.status)){
   out.textContent=texts.blocked;return;
  }
  out.textContent=texts[r.status];
 }catch{out.textContent=texts.blocked;}
 finally{busy=false;button.disabled=false;}
});
})();