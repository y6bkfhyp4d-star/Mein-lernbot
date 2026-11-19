/* NERYX Stapeltest 1.0: nur ausdrücklich erlaubte Prüf-/Bedeutungsbefehle.
   Kein allgemeiner Skript-Interpreter, keine automatischen Bestätigungen. */
(() => {
'use strict';
const MAX=12, MAX_CHARS=2400;
const allow=[
 /^Beispiel prüfen:\s*[^|\n]{4,140}\s*\|\s*-?\d+(?:\.\d+)?(?:\s*[,;]\s*-?\d+(?:\.\d+)?){3,29}\s*$/i,
 /^Bedeutung lernen:\s*[^\n=]{4,70}\s*=\s*[^\n=]{4,70}\s*$/i,
 /^Beispiel lernen:\s*[^|\n]{4,140}\s*\|\s*-?\d+(?:\.\d+)?(?:\s*[,;]\s*-?\d+(?:\.\d+)?){4,29}\s*$/i,
 /^(?:Persönlichen|Persoenlichen) Lerntest (?:starten|auswerten|abbrechen)$/i,
 /^(?:Persönlicher|Persoenlicher) Lernstand$/i,
 /^Ja,?\s*Bedeutung speichern$/i,
 /^Bedeutung abbrechen$/i,
 /^(?:Bedeutungstest|Bedeutungsstand|Sprachlernstand|Lernkontrolle|Lernzentrale|Lernkonflikte|Speicherabgleich)$/i,
 /^(?:Systemstatus|Sprachmodell Status|Modellstatus|Fähigkeitstest)$/i,
 /^Problem l(?:ö|oe)sen:\s*[^\n]{4,180}$/i,
 /^Weg planen:\s*[01]{2,20}(?:\s*;\s*[01]{2,20}){1,19}$/i,
 /^Lernquellen:\s*[^\n]{2,90}$/i
];
const trim=x=>String(x??'').trim();
function parse(input){
 const s=trim(input);
 const explicit=/^Stapeltest\s*:/i.test(s);
 if(s.length>MAX_CHARS)return explicit?{error:'Stapeltest zu lang (maximal 2400 Zeichen).'}:null;
 const body=explicit?s.replace(/^Stapeltest\s*:\s*/i,''):s;
 const lines=body.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!explicit&&lines.length<2)return null;
 if(lines.length<2||lines.length>MAX)return explicit?{error:'Bitte 2 bis 12 Befehle zeilenweise angeben.'}:null;
 const bad=lines.findIndex(line=>!allow.some(re=>re.test(line)));
 if(bad!==-1){
  return explicit?{error:'Zeile '+(bad+1)+' ist kein erlaubter Stapeltest-Befehl. Nichts ausgeführt.'}:null;
 }
 // Eine einzelne voreingetragene Bestätigung ist kein eigenständiger Schreibauftrag.
 for(let i=0;i<lines.length;i++){
  if(/^Ja,?\s*Bedeutung speichern$/i.test(lines[i])&&
     !lines.slice(0,i).some(x=>/^Bedeutung lernen:/i.test(x)))
   return {error:'Bestätigung ohne vorangehenden Bedeutungs-Lernbefehl. Nichts ausgeführt.'};
 }
 return {lines};
}
function isBatch(input){
 const parsed=parse(input);
 return parsed!==null;
}
async function run(input,execute){
 const parsed=parse(input);
 if(!parsed)return null;
 if(parsed.error)return 'NERYX · STAPELTEST ABGELEHNT\n'+parsed.error;
 if(typeof execute!=='function')return 'NERYX · STAPELTEST: Keine Chatverarbeitung verfügbar.';
 const out=['NERYX · STAPELTEST','Befehle: '+parsed.lines.length,''];
 for(let i=0;i<parsed.lines.length;i++){
  const line=parsed.lines[i];
  let answer;
  try{answer=await execute(line)}
  catch(e){answer='Fehler bei diesem Befehl: '+String(e?.message||e);out.push((i+1)+'. '+line+'\n'+answer);out.push('Stapel wegen Fehler abgebrochen.');break}
  out.push((i+1)+'. '+line+'\n'+String(answer??'Keine Antwort'));
  if(i<parsed.lines.length-1)out.push('');
 }
 out.push('Ende des Stapeltests. Jede Antwort steht direkt unter ihrem Befehl.');
 return out.join('\n');
}
window.NERYXBatch=Object.freeze({version:'1.0',parse,isBatch,run});
})();