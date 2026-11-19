/* NERYX Evidenzvertrag 1.0 – lesende Projektion der bestehenden Lernzentrale.
   "gespeichert" oder "nutzerbestätigt" heißt NICHT extern verifiziert.
   Es werden keine Bestandsdaten migriert oder verändert. */
(() => {
'use strict';
const norm=x=>String(x??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
const statusNames=Object.freeze(['verified','user_claim','model_guess','unknown']);
const txt=(x,max=300)=>String(x??'').trim().slice(0,max);
function snapshot(){
 const collected=window.NERYXLearningHub?.collect?.();
 if(!collected)return {version:1,claims:[],warnings:['Lernzentrale nicht verfügbar.']};
 const claims=(collected.claims||[]).map((c,i)=>Object.freeze({
  id:'legacy:'+String(c.key||'unknown')+':'+i,
  text:txt(c.subject+' / '+c.property+': '+c.value,2000),
  subject:txt(c.subject),property:txt(c.property),value:txt(c.value,2000),
  status:'user_claim', // bewusst niemals aus einem Alt-Eintrag "verified" ableiten
  source:Object.freeze({kind:'legacy',store:txt(c.key),origin:txt(c.origin),
   reference:txt(c.source),verifiedExternally:false}),
  createdAt:null,version:1,conflict:!!c.conflict,
  alternatives:Array.isArray(c.alternatives)?c.alternatives.slice(0,10).map(x=>txt(x?.value||x)):[],
  note:'Lokaler Eintrag; unabhängige Wahrheitsprüfung liegt nicht vor.'
 }));
 return {version:1,claims,warnings:[...(collected.warnings||[])]};
}
function retrieve(query,limit=10){
 const raw=txt(query,250),parts=raw.split(/\s*:\s*/);
 const name=norm(parts[0]),property=parts[1]?norm(parts.slice(1).join(':')):null;
 const data=snapshot();
 // Ein expliziter Themenname wird vollständig abgeglichen; keine vagen Dokumenttreffer.
 const exact=data.claims.filter(c=>norm(c.subject)===name&&(!property||norm(c.property)===property));
 const cap=Number.isInteger(limit)?Math.max(1,Math.min(limit,30)):10;
 return {query:raw,status:exact.length?'user_claim':'unknown',
  claims:exact.slice(0,cap),total:exact.length,hasConflict:exact.some(c=>c.conflict)||
   new Set(exact.map(c=>norm(c.value))).size>1,warnings:data.warnings};
}
function report(query){
 const r=retrieve(query);
 const lines=['NERYX · EVIDENZSTATUS (NUR LESEN)','Anfrage: '+r.query,
  'Status: '+(r.status==='unknown'?'unbekannt – kein exakter gespeicherter Themen-Treffer':
   'user_claim – gespeicherte Nutzer-/Alt-Angaben, NICHT extern verifiziert'),
  'Exakte Einträge: '+r.total];
 if(r.hasConflict)lines.push('ACHTUNG: Widerspruch zwischen gespeicherten Angaben.');
 for(const c of r.claims)lines.push('• '+c.property+': '+c.value+'\n  Herkunft: '+c.source.origin+
  ' | Quelldetail: '+c.source.reference+(c.conflict?' | Konflikt markiert':''));
 if(r.total>r.claims.length)lines.push('Weitere Einträge vorhanden: '+(r.total-r.claims.length));
 lines.push(...r.warnings,'Keine Fakten ergänzt, geändert oder als verifiziert markiert.');
 return lines.join('\n');
}
window.NERYXEvidence=Object.freeze({version:'1.0',statusNames,snapshot,retrieve,report});
})();