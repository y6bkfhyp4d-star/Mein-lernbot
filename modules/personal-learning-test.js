/* NERYX Persönlicher Lerntest 1.0
   Vorher/Nachher mit dem echten, lokalen Sprachlern-System.
   Keine Änderungen an Wissen, Sprachbeispielen oder Bedeutungsbrücken. */
(() => {
'use strict';
const KEY='neryx.learning.personaltest.v1';
const WORDS='neryx.learning.wordfeatures.v1', MEANINGS='neryx.learning.meanings.v1';
const CASES=[
 ['Die Folge wird jedes Mal verdoppelt','geometrisch'],
 ['Jede nächste Zahl verdoppeln','geometrisch'],
 ['Wir nehmen immer das Doppelte','geometrisch'],
 ['Die Werte steigen um den Faktor zwei','geometrisch'],
 ['Jede Zahl mit vier multiplizieren','geometrisch'],
 ['Die Werte werden jeweils verdreifacht','geometrisch'],
 ['Wir erhöhen jede Zahl um fünf','arithmetisch'],
 ['Jeder Schritt addiert fünf','arithmetisch'],
 ['Die Zahlen steigen gleichmäßig um drei','arithmetisch'],
 ['Wir ziehen immer zwei ab','arithmetisch'],
 ['Die Werte werden um sechs vermindert','arithmetisch'],
 ['Die Folge nimmt jedes Mal um vier zu','arithmetisch']
].map(([phrase,type],i)=>({id:i,phrase,type}));
const normalize=s=>String(s??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[.!?]+$/,'').replace(/\s+/g,' ').trim();
function data(){
 const warns=[],read=(key)=>{
  try{
   const raw=localStorage.getItem(key);
   if(raw===null)return null;
   const val=JSON.parse(raw);
   if(!val||typeof val!=='object'||Array.isArray(val))throw Error('format');
   return val;
  }catch{warns.push(key+' nicht lesbar');return null}
 };
 const words=read(WORDS), meanings=read(MEANINGS);
 if(warns.length)return {error:'Speicherfehler: '+warns.join('; ')+'. Keine Prüfung gestartet.'};
 if(words&&(!Array.isArray(words.examples)||words.version!==1))return {error:'Sprachbeispiele haben ein unbekanntes Format.'};
 if(meanings&&(!Array.isArray(meanings.links)||meanings.version!==1))return {error:'Bedeutungen haben ein unbekanntes Format.'};
 const examples=words?.examples||[],links=meanings?.links||[];
 return {examples,links,sign:JSON.stringify({
  examples:examples.map(x=>[x.fingerprint,x.phrase,x.type]),
  links:links.map(x=>[x.from,x.to])
 })};
}
function readState(){
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return null;
  const x=JSON.parse(raw);
  if(x?.version!==1||!Array.isArray(x.before)||typeof x.signature!=='string'||!Array.isArray(x.testIds))return {error:'Gespeicherter Testzustand ist nicht lesbar.'};
  return x;
 }catch{return {error:'Gespeicherter Testzustand ist beschädigt.'}}
}
function measure(ids){
 const classifier=window.NERYXWordLearning?.classify;
 if(typeof classifier!=='function')return null;
 return ids.map(id=>{
  const c=CASES[id],predict=classifier(c.phrase)?.type||null;
  return {id,predict,correct:predict===c.type};
 });
}
const count=xs=>({correct:xs.filter(x=>x.correct).length,answered:xs.filter(x=>x.predict!==null).length,total:xs.length});
function start(){
 const old=readState();
 if(old)return old.error||'Es läuft bereits eine persönliche Lernprüfung. Erst „Persönlichen Lerntest auswerten“ oder „Persönlichen Lerntest abbrechen“ verwenden.';
 const d=data();if(d.error)return d.error;
 const trained=new Set(d.examples.map(x=>normalize(x.phrase)));
 const ids=CASES.filter(x=>!trained.has(normalize(x.phrase))).map(x=>x.id);
 if(ids.length<6)return 'Zu wenige neue Prüfphrasen verfügbar ('+ids.length+'). Kein Test gestartet.';
 const before=measure(ids);if(!before)return 'Sprachlernmodul nicht geladen.';
 const baseline=count(before);
 const state={version:1,testIds:ids,before,signature:d.sign,trainingCount:d.examples.length,meaningCount:d.links.length};
 try{localStorage.setItem(KEY,JSON.stringify(state))}
 catch{return 'Der Prüfstand konnte nicht gespeichert werden. Keine Trainingsdaten verändert.'}
 return ['NERYX · PERSÖNLICHER LERNTEST GESTARTET',
  'Zurückgehaltene Prüfphrasen: '+ids.length,
  'Vor dem Training richtig: '+baseline.correct+'/'+baseline.total+' | Zuordnungen: '+baseline.answered+'/'+baseline.total,
  'Die konkreten Prüfphrasen bleiben bis zur Auswertung verborgen.',
  'Übe jetzt mit „Beispiel lernen: FORMULIERUNG | ZAHLENFOLGE“ oder bestätigten Bedeutungsbrücken.',
  'Nutze für das Training eigene Beispiele – nicht die Prüfphrasen aus dem Programmcode.',
  'Danach: Persönlichen Lerntest auswerten',
  'Keine bestehenden Trainingsdaten wurden für den Test verändert.'].join('\n');
}
function finish(){
 const state=readState();
 if(!state)return 'Kein persönlicher Lerntest aktiv. Starte mit „Persönlichen Lerntest starten“.';
 if(state.error)return state.error;
 const d=data();if(d.error)return d.error;
 if(d.sign===state.signature)return 'Seit dem Teststart wurden keine Änderungen an Sprachbeispielen oder Bedeutungen gefunden. Bitte zuerst üben; der Test bleibt aktiv.';
 // Direkt nachträglich im Training verwendete Prüfphrasen gelten nicht als unbekannt.
 const seen=new Set(d.examples.map(x=>normalize(x.phrase)));
 const valid=state.testIds.filter(id=>!seen.has(normalize(CASES[id].phrase)));
 const excluded=state.testIds.length-valid.length;
 if(valid.length<6)return 'Zu wenige unabhängige Prüfphrasen übrig ('+valid.length+'). Test bleibt aktiv. Bitte keine Prüfphrasen trainieren.';
 const before=state.before.filter(x=>valid.includes(x.id));
 const after=measure(valid);if(!after)return 'Sprachlernmodul nicht geladen.';
 const a=count(before),b=count(after),difference=b.correct-a.correct;
 const lines=['NERYX · PERSÖNLICHER LERNFORTSCHRITT',
  'Prüfphrasen: '+b.total+' | wegen direktem Training ausgeschlossen: '+excluded,
  'Vorher richtig: '+a.correct+'/'+a.total+' | beantwortet '+a.answered,
  'Nachher richtig: '+b.correct+'/'+b.total+' | beantwortet '+b.answered,
  'Veränderung: '+(difference>=0?'+':'')+difference+' richtige Zuordnungen',
  difference>0?'Mehr Treffer auf diesen zurückgehaltenen Formulierungen.':
  difference<0?'Weniger Treffer auf diesen Formulierungen.':'Keine Verbesserung der Trefferzahl nachgewiesen.',
  'Sprachbeispiele: '+state.trainingCount+' → '+d.examples.length,
  'Bedeutungsbrücken: '+state.meaningCount+' → '+d.links.length,
  ...after.map(x=>'• '+CASES[x.id].phrase+': '+(x.predict||'unsicher')+' (erwartet '+CASES[x.id].type+') '+(x.correct?'richtig':'nicht richtig')),
  'Grenze: Fester, begrenzter Prüfbestand; nicht extern oder verblindet geprüft. Antworten werden nicht als Training gespeichert.',
  'Der Test verändert keine vorhandenen Lernspeicher.'];
 try{localStorage.removeItem(KEY)}catch{lines.push('Warnung: Teststand konnte nicht entfernt werden; neuer Test eventuell blockiert.')}
 return lines.join('\n');
}
function cancel(){
 const state=readState();if(!state)return 'Kein aktiver persönlicher Lerntest.';
 try{localStorage.removeItem(KEY);return 'Persönlicher Test beendet. Keine Lernbeispiele oder Bedeutungsbrücken gelöscht.'}
 catch{return 'Teststand konnte nicht entfernt werden. Andere Daten unverändert.'}
}
function status(){
 const s=readState();return s?.error|| (s?'Persönlicher Lerntest aktiv: '+s.testIds.length+' zurückgehaltene Formulierungen. Nach dem Üben „Persönlichen Lerntest auswerten“ eingeben.':'Kein persönlicher Lerntest aktiv. Befehl: Persönlichen Lerntest starten');
}
window.NERYXPersonalTest=Object.freeze({version:'1.0',start,finish,cancel,status});
})();