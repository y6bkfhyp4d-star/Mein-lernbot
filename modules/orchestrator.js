/* NERYX Gesamt-KI 1.0 – ein Eingang für bestehende Fähigkeiten.
   Lesen und Berechnen ohne automatische Speicherung. Qwen ist austauschbar
   und wird nur verwendet, wenn es explizit geladen wurde. */
(() => {
'use strict';
const numberList=/^-?\d+(?:\.\d+)?(?:\s*[,;]\s*-?\d+(?:\.\d+)?){3,29}$/;
const pairs=/^-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?){1,19}\s*;\s*-?\d+(?:\.\d+)?$/;
const unknown=s=>!s||/^VERWANDTES WISSEN/i.test(String(s).trim())||/(?:keine passende antwort|keine passenden informationen|weiss ich nicht|weiß ich nicht|kein passendes wissen|nicht bekannt|keine informationen|dazu habe ich|habe ich noch keine|nicht gelernt|zu .{1,100} habe ich noch keine)/i.test(String(s));
function plan(input){
 const s=String(input??'').trim();
 if(!s||s.length>3000)return {type:'invalid',source:'Eingabe'};
 if(s.includes('\n'))return {type:'invalid',source:'Eingabe'};
 if(/^weg planen\s*:/i.test(s))return {type:'grid',source:'Wegplanung',query:s.replace(/^weg planen\s*:/i,'').trim()};
 if(window.NERYXMathVerifier?.wallArea(s))return {type:'area',source:'Rechenprüfer'};
 if(pairs.test(s))return {type:'pairs',source:'Regel- und Musterlöser'};
 if(numberList.test(s))return {type:'sequence',source:'Zahlenmuster'};
 return {type:'knowledge',source:'Lernkoordinator oder Qwen'};
}
function status(){
 const model=window.NERYXLocalModel?.info?.();
 return ['NERYX · GEMEINSAMES KI-SYSTEM 1.0',
 'Zentrale Steuerung: aktiv',
 'Rechenprüfer: '+(window.NERYXMathVerifier?.solve?'bereit':'fehlt'),
 'Problemlöser: '+(window.NERYXSystem?.solve?'bereit':'fehlt'),
 'Wissenskoordinator: '+(window.NERYXCoordinator?.decide?'bereit':'fehlt'),
 'Sprachmodell: '+(model?.loaded?'lokal geladen':'nicht geladen'),
 'Reihenfolge: überprüfbarer Rechenkern → eindeutige lokale Wissensantwort → optional Qwen',
 'Bestehendes Wissen wird nicht automatisch als Modellprompt verschickt oder umgeschrieben.',
 'Start: NERYX lösen: FRAGE',
 'Hinweis: Ein KI-generierter Text wird weiterhin als ungeprüft gekennzeichnet.'].join('\n');
}
async function solve(input,{knowledge}={}){
 const s=String(input??'').trim();
 const selected=plan(s);
 if(selected.type==='invalid')return 'NERYX · KI-SYSTEM\nBitte eine einzelne Frage bis 3000 Zeichen eingeben.';
 if(selected.type==='area')return window.NERYXMathVerifier.solve(s);
 if(selected.type==='grid')return window.NERYXSystem?.route(selected.query)||'Wegplaner nicht verfügbar.';
 if(selected.type==='pairs'||selected.type==='sequence'){
  const result=window.NERYXSystem?.solve(s);
  return result||'Problemlöser nicht verfügbar.';
 }
 const coordinated=window.NERYXCoordinator?.decide(s);
 if(coordinated)return coordinated;
 if(typeof knowledge==='function'){
  let answer;
  try{answer=await knowledge(s)}catch{answer=null}
  if(typeof answer==='string'&&answer.trim()&&!unknown(answer))return answer;
 }
 if(!window.NERYXLocalModel?.info?.().loaded)
  return 'NERYX · KI-SYSTEM\nKein gesicherter Fachtreffer. Für eine zusätzliche Sprachmodell-Antwort: zuerst „Sprachmodell laden“ eingeben.\nEs wurden keine Fakten erfunden oder gespeichert.';
 return await window.NERYXLocalModel.ask(s);
}
window.NERYXOrchestrator=Object.freeze({version:'1.0',plan,status,solve});
})();