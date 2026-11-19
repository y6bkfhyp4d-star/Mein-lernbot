/* NERYX Systemzentrale 1.0: dynamische Übersicht und enger gemeinsamer
   Problem-Router. Keine parallelen Chat-Listener oder Speicher-Migration. */
(() => {
'use strict';
const modules=[
 ['Kern und Fakten','LernBotBridge'],
 ['Antwort-KI','LernBotAntwortKI'],
 ['Lernkoordinator','NERYXCoordinator'],
 ['Lernzentrale','NERYXLearningHub'],
 ['Themenlernen','NERYXTopicLearning'],
 ['Sprachlernen','NERYXWordLearning'],
 ['Bedeutungsverknüpfungen','NERYXMeanings'],
 ['Zahlenstrategien','NERYXLearning'],
 ['Auto-Lernen','NERYXAutoLearn'],
 ['Kontextlernen','NERYXContextLearning'],
 ['Problemlöser','NERYXReasoner'],
 ['Rechenprüfer','NERYXMathVerifier'],
 ['Mustererkennung','NERYXPatterns'],
 ['Fähigkeitstest','NERYXCapabilityTest'],
 ['Persönlicher Lerntest','NERYXPersonalTest'],
 ['Lernkontrolle','NERYXLearningAudit'],
 ['Stapeltest','NERYXBatch'],
 ['Sprachmodell-Brücke','NERYXLocalModel']
];
function report(){
 const available=modules.filter(([,key])=>!!window[key]);
 const missing=modules.filter(([,key])=>!window[key]);
 const bridge=window.NERYXLocalModel?.info();
 return ['NERYX · SYSTEMZENTRALE',
  'Aktive Kern-Schnittstellen: '+available.length+'/'+modules.length,
  ...modules.map(([name,key])=>'• '+name+': '+(window[key]?'eingebunden':'fehlt')),
  'Lokales Sprachmodell: '+(bridge?.loaded?'geladen':bridge?.connecting?'lädt':'nicht geladen'),
  'Experimentelle Bereiche sind NICHT automatisch mit dem Hauptchat verbunden.',
  'Befehle: Systemstatus | Problem lösen: 2=5, 4=9; 7 | Problem lösen: 2, 4, 8, 16 | Weg planen: 000;010;000',
  'WebLLM kann über „Sprachmodell laden“ ausdrücklich aktiviert werden.',
  'Ein eingebundenes Modul ist nicht automatisch durch echte iPhone-Tests verifiziert.',
  missing.length?'Fehlende Schnittstellen bitte bei der Diagnose prüfen.':'Alle überwachten Kern-Schnittstellen vorhanden.'].join('\n');
}
function solve(input){
 const s=String(input??'').trim();
 if(!s||s.length>600||s.includes('\n'))return 'Format: Problem lösen: 2=5, 4=9; 7 oder Problem lösen: 2, 4, 8, 16';
 if(s.includes('=')&&s.includes(';')){
  const f=window.NERYXPatterns?.solvePairs||window.NERYXReasoner?.ruleFromText;
  return f?f(s):'Der Problemlöser ist nicht geladen.';
 }
 if(/^-?\d+(?:\.\d+)?(?:\s*[,;]\s*-?\d+(?:\.\d+)?){3,29}$/.test(s)){
  return window.NERYXPatterns?.solveSequence?.(s)||'Mustererkennung ist nicht geladen.';
 }
 return 'Für diesen Problemtyp gibt es noch keinen überprüften Lösungsweg. Nutze einen Fachbefehl oder – nach ausdrücklichem Start – „KI fragen: ...“.';
}
function route(gridText){
 const rows=String(gridText??'').trim().split(/\s*;\s*/);
 if(rows.length<2||rows.length>20||rows.some(x=>!/^[01]{2,20}$/.test(x)||x.length!==rows[0].length))return 'Format: Weg planen: 000;010;000 (0 = frei, 1 = blockiert).';
 const grid=rows.map(s=>[...s].map(Number)),solver=window.NERYXReasoner?.shortestPath;
 if(typeof solver!=='function')return 'Das Planungsmodul fehlt.';
 if(grid[0][0]!==0||grid.at(-1).at(-1)!==0)return 'Start oder Ziel ist blockiert.';
 const path=solver(grid,[0,0],[grid.length-1,grid[0].length-1]);
 return !path?'NERYX · WEGPLANUNG\nKein freier Weg von oben links nach unten rechts.':
  'NERYX · WEGPLANUNG\nSchritte: '+(path.length-1)+'\nKoordinaten (Zeile, Spalte; ab 1): '+
  path.map(([r,c])=>'('+ (r+1)+','+(c+1)+')').join(' → ')+
  '\nKürzester Weg innerhalb des eingegebenen Rasters. Keine Navigation außerhalb dieses Modells.';
}
window.NERYXSystem=Object.freeze({version:'1.0',report,solve,route});
})();