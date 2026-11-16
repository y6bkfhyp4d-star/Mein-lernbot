import {run436} from './guard436.js';
const $=id=>document.getElementById(id);
const fmtNum=x=>x===null||x===undefined?'–':Number(x).toFixed(2);
const fmt=s=>`Fehler ${fmtNum(s.mae)} °C | erkannt ${s.detected}/${s.changed} | Fehlalarme ${s.falseAlarms} | Verzögerung ${fmtNum(s.delay)} | Kontrollmessungen ${s.checks}`;
let latest=null,latestText='';
function loadArchive(){try{const x=JSON.parse(localStorage.getItem('lernbot7.phase42.archive.v1'));return Array.isArray(x)?x.slice(0,8):[];}catch{return[];}}
function makeReport(result){
 const lines=['LERNBOT 7.0 – PHASE 4.3.6','Adaptive Sicherheitsentscheidung · 108 neue Testwelten',`Seeds: ${result.seeds.join(', ')}`,'Je Welt: exakt 90 Messungen inklusive Kontrollmessungen.','', 'GESAMT','Phase 4.2: '+fmt(result.aggregate.baseline),'Phase 4.3.4 (Original): '+fmt(result.aggregate.earlier),'Phase 4.3.6: '+fmt(result.aggregate.adaptive)];
 for(const r of result.runs){
  lines.push('',`SEED ${r.seed}`,`Prüfregel: ${JSON.stringify(r.policy)}`,'4.2: '+fmt(r.baseline),'4.3.4: '+fmt(r.earlier),'4.3.6: '+fmt(r.adaptive));
  for(const x of r.byNoise)lines.push(`  RAUSCHEN ${fmtNum(x.noise)}`,'  4.2: '+fmt(x.baseline),'  4.3.4: '+fmt(x.earlier),'  4.3.6: '+fmt(x.adaptive));
 }
 lines.push('','METHODIK',...result.notes,'','Achtung: Frühere Tests wurden bereits zur Entwicklung betrachtet. Diese Ergebnisse sind reproduzierbare Simulationen, kein Beweis für allgemeine Überlegenheit.');
 return lines.join('\n');
}
function copyFallback(text){const el=$('report');el.focus();el.select?.();return Promise.reject(new Error('Zwischenablage-Zugriff nicht verfügbar; Text im Bericht manuell markieren.'));}
$('run').addEventListener('click',()=>{
 const seed=Number($('seed').value);
 if(!Number.isInteger(seed)||seed<1||seed>3990000000){alert('Bitte einen gültigen Seed zwischen 1 und 3990000000 eingeben.');return;}
 const button=$('run');button.disabled=true;$('report').textContent='Trainiere und teste auf neuen Welten …';$('copy').disabled=true;$('json').disabled=true;
 setTimeout(()=>{try{latest=run436(seed,loadArchive());latestText=makeReport(latest);$('report').textContent=latestText;$('copy').disabled=false;$('json').disabled=false;$('status').textContent='Test fertig. Du kannst die Ergebnisse direkt kopieren.';}catch(error){console.error(error);$('report').textContent='Fehler: '+error.message;$('status').textContent='Bitte Fehlermeldung kopieren oder Screenshot schicken.';}finally{button.disabled=false;}},80);
});
async function copy(text){try{if(!navigator.clipboard?.writeText)throw new Error('Keine Clipboard API');await navigator.clipboard.writeText(text);$('status').textContent='Kopiert! Jetzt hier im Chat einfügen.';}catch{const area=$('report');area.focus();const sel=window.getSelection();const range=document.createRange();range.selectNodeContents(area);sel.removeAllRanges();sel.addRange(range);$('status').textContent='Text markiert. Halte ihn gedrückt und wähle „Kopieren“.';}}
$('copy').addEventListener('click',()=>{if(latestText)copy(latestText);});
$('json').addEventListener('click',()=>{if(latest)copy(JSON.stringify(latest,null,2));});
$('download').addEventListener('click',()=>{if(!latestText)return;const blob=new Blob([latestText],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='lernbot-phase436-ergebnisse.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);});
