/* NERYX Sprachmodell-Bridge 1.0
   Ein vorhandener WebLLM-Prototyp wird nur nach explizitem Nutzerbefehl
   geladen. Keine Modell-Inferenz als Faktenquelle und kein Auto-Training. */
(() => {
'use strict';
let client=null,loaded=false,automatic=false,loading=null;
let selectedModel='Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const scriptURL=document.currentScript?.src||new URL('./modules/local-model-bridge.js',document.baseURI).href;
const prototypeURL=new URL('../evolution/neryx/',scriptURL).href;
const info=()=>({loaded,automatic,connecting:!!loading,webgpu:!!navigator.gpu,model:selectedModel});
function status(){
 const x=info();
 return ['NERYX · SPRACHMODELL','Lokales WebLLM: '+(x.loaded?'geladen':x.connecting?'lädt':'nicht geladen'),
  'Automatische Ergänzung unbekannter Fragen: '+(x.automatic?'eingeschaltet':'ausgeschaltet'),
  'WebGPU im Browser sichtbar: '+(x.webgpu?'ja':'nein / nicht verfügbar'),
  'Modell: '+(selectedModel.includes('1.5B')?'Qwen 2.5 1,5B':'Qwen 2.5 0,5B')+' (experimenteller Prototyp)',
  'Modell wählen: Sprachmodell wählen: 0,5B oder Sprachmodell wählen: 1,5B (vor Laden)',
  'Bei Fragen mit KI fragen: ... oder NERYX lösen: ... lädt Qwen bei Bedarf automatisch.',
  'Sprachmodell laden | KI fragen: TEXT | KI-Modus an | KI-Modus aus',
  'Laden benötigt WebGPU und Downloads von externen Modellquellen. Erfolg auf dem iPhone ist nicht garantiert.',
  'Modelltexte sind nicht unabhängig geprüft. Kein automatisches Lernen von Modellgewichten.'].join('\n');
}
async function load(){
 if(loaded)return 'Das Sprachmodell ist bereits geladen.\n'+status();
 if(loading)return 'Der Ladeversuch läuft bereits.';
 if(!navigator.gpu)return 'WebGPU wird in diesem Browser nicht erkannt. Öffne ggf. den separaten Prototyp in Safari: evolution/neryx/';
 loading=(async()=>{
  const mod=await import(new URL('client.js',prototypeURL).href);
  if(typeof mod.createNeryxClient!=='function')throw Error('Die WebLLM-Bridge ist nicht verfügbar.');
  const target=prototypeURL;
  const instance=mod.createNeryxClient({url:target,timeoutMs:240000});
  client=instance;
  try{
   const ok=await instance.ping();
   if(!ok)throw Error('Der eingebettete Prototyp antwortet nicht.');
   await instance.selectModel(selectedModel);
   const result=await instance.load();
   if(result?.mode!=='local')throw Error('Modell ist nicht im lokalen Modus.');
   loaded=true;
   return 'Lokales Sprachmodell verbunden und geladen. Du kannst jetzt „KI fragen: ...“ verwenden.\n'+status();
  }catch(e){instance.destroy();client=null;loaded=false;throw e}
 })();
 try{return await loading}
 catch(e){return 'Sprachmodell konnte nicht geladen werden: '+String(e?.message||e)+
  '\nDer normale NERYX-Chat funktioniert weiterhin. Du kannst den separaten WebLLM-Prototyp öffnen.'}
 finally{loading=null}
}
async function askRaw(question){
 const s=String(question??'').trim();
 if(!s||s.length>3000)throw Error('Ungültige Modellanfrage.');
 if(!loaded||!client)throw Error('Sprachmodell nicht geladen.');
 const answer=await client.ask(s);
 if(typeof answer!=='string'||!answer.trim())throw Error('Leere Modellantwort.');
 return answer.trim();
}
async function ask(question){
 const s=String(question??'').trim();
 if(!s||s.length>3000)return 'Bitte eine konkrete Frage bis 3000 Zeichen eingeben.';
 const verified=window.NERYXMathVerifier?.solve(s);
 if(verified)return verified;
 if(!loaded||!client){
  const startup=await load();
  if(!loaded||!client)return 'Das Sprachmodell konnte für diese Frage nicht automatisch geladen werden.\n'+startup;
 }
 try{
  const answer=await askRaw(s);
  return 'NERYX · LOKALES SPRACHMODELL (unverifiziert)\n'+answer.trim()+
   '\n\nHinweis: KI-generierte Antwort. Fakten vor Übernahme prüfen.';
 }catch(e){return 'Lokale Modellantwort fehlgeschlagen: '+String(e?.message||e)}
}
function selectModel(name){
 const n=String(name??'').trim().toLowerCase().replace(/s/g,'').replace(',','.');
 const next=n==='1.5b'?'Qwen2.5-1.5B-Instruct-q4f16_1-MLC':
  n==='0.5b'?'Qwen2.5-0.5B-Instruct-q4f16_1-MLC':null;
 if(!next)return 'Nur 0,5B oder 1,5B verfügbar.';
 if(loaded||loading)return 'Vor einem Modellwechsel: Sprachmodell trennen. Danach erneut wählen und laden.';
 selectedModel=next;
 return 'Modell gewählt: '+(n==='1.5b'?'Qwen 2.5 1,5B':'Qwen 2.5 0,5B')+
  '. Noch nicht geladen. Das größere Modell benötigt mehr Speicher. Befehl: Sprachmodell laden';
}
function mode(on){
 if(on&&!loaded)return 'Erst das lokale Sprachmodell mit „Sprachmodell laden“ starten.';
 automatic=!!on;
 return 'Ergänzung unbekannter Fragen durch das lokale Sprachmodell '+(automatic?'aktiviert':'deaktiviert')+
  '. Gespeicherte Fakten und vorhandene Fachbefehle haben weiterhin Vorrang.';
}
function shouldFallback(original){
 if(!loaded||!automatic)return false;
 const s=String(original??'').toLocaleLowerCase('de').trim();
 return !s||/(?:keine passende antwort|keine passenden informationen|weiss ich nicht|weiß ich nicht|kein passendes wissen|nicht bekannt|keine informationen|dazu habe ich|habe ich noch keine|nicht gelernt|keine passende|kann ich nicht beantworten)/i.test(s);
}
function unload(){
 automatic=false;loaded=false;
 if(client){client.destroy();client=null}
 return 'Sprachmodell-Verbindung getrennt. NERYX-Lernspeicher unverändert.';
}
window.NERYXLocalModel=Object.freeze({version:'1.2',status,load,ask,askRaw,selectModel,mode,shouldFallback,unload,info});
})();