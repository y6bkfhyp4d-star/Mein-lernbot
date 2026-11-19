/* NERYX Gesamt-KI 2.0: begrenzte, lesende Werkzeugsteuerung.
   Modell kann Werkzeuge vorschlagen, Fachmodule führen aus und
   prüfen Argumente. Keine Datenänderungen oder freie Codeausführung. */
(() => {
'use strict';
const numberList=/^-?\d+(?:\.\d+)?(?:\s*[,;]\s*-?\d+(?:\.\d+)?){3,29}$/;
const pairs=/^-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?){1,19}\s*;\s*-?\d+(?:\.\d+)?$/;
const embeddedList=/-?\d+(?:\.\d+)?(?:\s*[,;]\s*-?\d+(?:\.\d+)?){3,29}/;
const embeddedPair=/-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?){1,19}\s*;\s*-?\d+(?:\.\d+)?/;
const grid=/^[01]{2,20}(?:\s*;\s*[01]{2,20}){1,19}$/;
const unknown=s=>!s||/^(?:VERWANDTES WISSEN|IN GESPEICHERTEN DOKUMENTEN:|GESPEICHERTES WISSEN)/i.test(String(s).trim())||/(?:keine passende antwort|keine passenden informationen|weiss ich nicht|weiß ich nicht|kein passendes wissen|nicht bekannt|keine informationen|dazu habe ich|habe ich noch keine|nicht gelernt|zu .{1,100} habe ich noch keine)/i.test(String(s));
function plan(input){
 const s=String(input??'').trim();
 if(!s||s.length>3000||s.includes('\n'))return {type:'invalid',source:'Eingabe'};
 if(/^weg planen\s*:/i.test(s))return {type:'grid',source:'Wegplanung',query:s.replace(/^weg planen\s*:/i,'').trim()};
 if(window.NERYXMathVerifier?.wallArea(s))return {type:'area',source:'Rechenprüfer'};
 if(pairs.test(s))return {type:'pairs',source:'Regel- und Musterlöser',query:s};
 if(numberList.test(s))return {type:'sequence',source:'Zahlenmuster',query:s};
 const pm=s.match(embeddedPair);
 if(pm&&/\b(?:regel|zuordnung|muster|welcher wert|berechne)\b/i.test(s))return {type:'pairs',source:'Regel- und Musterlöser',query:pm[0]};
 const sm=s.match(embeddedList);
 if(sm&&/\b(?:folge|zahlen|nächste|naechste|weiter|fortsetzen|kommt)\b/i.test(s))return {type:'sequence',source:'Zahlenmuster',query:sm[0]};
 return {type:'knowledge',source:'Lernkoordinator oder Qwen'};
}
function execute(selection,input){
 if(selection.type==='area')return window.NERYXMathVerifier?.solve(input)||null;
 if(selection.type==='grid')return window.NERYXSystem?.route(selection.query)||null;
 if(selection.type==='pairs'||selection.type==='sequence')return window.NERYXSystem?.solve(selection.query)||null;
 return null;
}
function status(){
 const model=window.NERYXLocalModel?.info?.();
 return ['NERYX · GEMEINSAMES KI-SYSTEM 2.0','Zentrale Steuerung: aktiv',
 'Rechenprüfer: '+(window.NERYXMathVerifier?.solve?'bereit':'fehlt'),
 'Problemlöser: '+(window.NERYXSystem?.solve?'bereit':'fehlt'),
 'Wissenskoordinator: '+(window.NERYXCoordinator?.decide?'bereit':'fehlt'),
 'Sprachmodell: '+(model?.loaded?'lokal geladen':'bei Bedarf automatisch ladbar'),
 'Werkzeugwahl: Zahlenfolgen, Regeln, Rasterwege und Wandflächen',
 'Reihenfolge: Rechenkern → passendes lokales Wissen → geprüfte Werkzeugwahl/Qwen',
 'Unsichere Suchtreffer aus gespeicherten Dokumenten sind kein Fachbeweis.',
 'Qwen darf weder Code ausführen noch gespeicherte Daten verändern.',
 'Modellstart: automatisch erst bei ungeklärten Fragen (kein Download beim App-Start)',
 'Befehl: NERYX lösen: FRAGE',
 'Antwortkontrolle: fehlende Beispiele/Schritte nachfordern; ungenügende Begriffsabgrenzung zurückweisen.',
 'Frei formulierte Modellantworten bleiben unverifiziert.'].join('\n');
}
function modelSelection(raw,input){
 const line=String(raw??'').trim();
 if(line.length>350||line.includes('\n'))return null;
 const match=line.match(/^WERKZEUG:\s*(folge|regel|weg|wand)\s*\|\s*(.*?)\s*$/i);
 if(!match)return null;
 const type=match[1].toLowerCase(),arg=match[2];
 if(type==='wand'){
  if(arg!=='ORIGINAL')return {rejected:true};
  const selected=plan(input);
  return selected.type==='area'?selected:{rejected:true};
 }
 if(type==='weg')return grid.test(arg)&&input.includes(arg)?{type:'grid',source:'Wegplanung (Modellvorschlag geprüft)',query:arg}:{rejected:true};
 if(type==='folge')return numberList.test(arg)&&input.includes(arg)?{type:'sequence',source:'Zahlenfolge (Modellvorschlag geprüft)',query:arg}:{rejected:true};
 if(type==='regel')return pairs.test(arg)&&input.includes(arg)?{type:'pairs',source:'Zahlenregel (Modellvorschlag geprüft)',query:arg}:{rejected:true};
 return {rejected:true};
}
function looksIncomplete(reply){
 const s=String(reply??'').trim();
 return !s||s.length<35||/^(?:wähle|waehle|stelle|nenne|schreibe|erkläre|erklaere)\b/i.test(s)&&s.length<110;
}
function narrativePrompt(input){
 return 'Beantworte die folgende Frage auf Deutsch. Gib eine klare Erklärung mit konkretem Beispiel. Antworte direkt, ohne die Frage als Aufgabe an den Nutzer zurückzugeben. Maximal 120 Wörter.\nFrage: '+input;
}
async function modelFallback(input){
 const model=window.NERYXLocalModel;
 if(!model?.info?.().loaded){
  if(typeof model?.load!=='function')return 'NERYX · KI-SYSTEM\nKein Sprachmodell verfügbar. Vorhandene NERYX-Funktionen bleiben nutzbar.';
  const started=await model.load();
  if(!model.info?.().loaded)return 'NERYX · KI-SYSTEM\nAutomatischer Modellstart fehlgeschlagen.\n'+String(started??'Keine Details verfügbar.');
 }
 if(typeof model.askRaw!=='function')return await model.ask(input);
 const prompt=[
 'Du bist die Sprachkomponente von NERYX. Wähle optional EIN verfügbares Werkzeug.',
 'Format: WERKZEUG: folge | ZAHLENLISTE, WERKZEUG: regel | ZAHLENPAARE;ZIEL,',
 'WERKZEUG: weg | RASTER oder WERKZEUG: wand | ORIGINAL.',
 'Nur Zahlen oder Raster aus der Nutzerfrage wörtlich übernehmen, nichts erfinden.',
 'Werkzeug wand nur bei eindeutigen Wandflächenangaben wählen.',
 'Wenn kein Werkzeug passt: antworte kurz und vorsichtig in Deutsch, keine erfundenen Quellen.',
 'NUTZERFRAGE: '+input
 ].join('\n');
 try{
  const mayNeedTool=/(?:\d\s*[,;=]\s*\d|\b(?:raster|wegplanung|zahlenfolge|zahlenregel|wandfläche)\b)/i.test(input);
  let raw=await model.askRaw(mayNeedTool?prompt:narrativePrompt(input));
  const choice=mayNeedTool?modelSelection(raw,input):null;
  if(choice?.rejected)return 'NERYX · WERKZEUGPRÜFUNG\nQwen hat einen unzulässigen Werkzeugaufruf vorgeschlagen. Nichts wurde ausgeführt oder gespeichert.';
  if(choice){
   const output=execute(choice,input);
   return output?'NERYX · WERKZEUGROUTING\n'+output+'\n\nQuelle: '+choice.source+'. Die Berechnung stammt vom Fachmodul.':
    'NERYX · WERKZEUGPRÜFUNG\nDas vorgeschlagene Fachmodul ist nicht verfügbar.';
  }
  if(/^WERKZEUG\s*:/i.test(raw))return 'NERYX · WERKZEUGPRÜFUNG\nUnbekannter Werkzeugaufruf abgelehnt.';
  const review=window.NERYXAnswerReview;
  let evaluation=review?.inspect(input,raw);
  const short=looksIncomplete(raw);
  if(short||evaluation&&!evaluation.complete){
   const retryPrompt=evaluation&&!evaluation.complete&&review
    ?review.improvementPrompt(input,raw,evaluation.missing)
    :'Antworte vollständig in 2 bis 4 deutschen Sätzen und gib ein Beispiel. Keine Gegenfrage, keine Anweisung an den Nutzer.\n'+input;
   raw=await model.askRaw(retryPrompt);
   evaluation=review?.inspect(input,raw);
   if(looksIncomplete(raw))return 'NERYX · ANTWORTKONTROLLE\nDas lokale Sprachmodell hat keine ausreichende Erklärung geliefert. Ich gebe keine offensichtlich unvollständige Antwort als Lösung aus. Bitte präziser fragen oder ein leistungsfähigeres Modell auswählen.';
  }
  if(evaluation?.missing?.some(x=>/^(?:prüfbare Annahme|ermittelte Messwerte|Unterscheidung zwischen Hypothese)/.test(x)))
   return 'NERYX · FACHLICHE KONTROLLE\nDie Erklärung unterscheidet Hypothese und Messung nicht ausreichend. Ich gebe die Modellantwort deshalb nicht als Lösung aus.\nFehlende Merkmale: '+evaluation.missing.join(', ')+'.\nDas ist eine begrenzte Plausibilitätsprüfung, kein allgemeiner Wahrheitsbeweis.';
  const caution=evaluation&&!evaluation.complete
   ?'\n\nNERYX · VOLLSTÄNDIGKEITSHINWEIS\nMöglicherweise fehlen: '+evaluation.missing.join(', ')+'. Der Inhalt wurde nicht auf Richtigkeit geprüft.'
   :'';
  return 'NERYX · LOKALES SPRACHMODELL (unverifiziert)\n'+raw.slice(0,2200)+caution+
   '\n\nHinweis: KI-generierte Erklärung, nicht unabhängig überprüft.';
 }catch(e){return 'NERYX · KI-SYSTEM\nSprachmodell nicht erreichbar: '+String(e?.message||e)}
}
async function solve(input,{knowledge}={}){
 const s=String(input??'').trim(),selected=plan(s);
 if(selected.type==='invalid')return 'NERYX · KI-SYSTEM\nBitte eine einzelne Frage bis 3000 Zeichen eingeben.';
 if(selected.type!=='knowledge')return execute(selected,s)||'NERYX · KI-SYSTEM\nDas Fachwerkzeug ist nicht verfügbar.';
 const coordinated=window.NERYXCoordinator?.decide(s);
 if(coordinated)return coordinated;
 if(typeof knowledge==='function'){
  let answer;try{answer=await knowledge(s)}catch{answer=null}
  if(typeof answer==='string'&&answer.trim()&&!unknown(answer))return answer;
 }
 return await modelFallback(s);
}
window.NERYXOrchestrator=Object.freeze({version:'2.4',plan,execute,modelSelection,status,solve,isUnknown:unknown});
})();