// NERYX v0.1 – lokal via WebLLM oder optional eigene HTTP-API.
// Die Webseite enthält keine eingebetteten Tokens und sendet im lokalen Modus keine Chattexte an einen KI-Server.
const $ = id => document.getElementById(id);
const KEY = 'neryx.chat.v1';
const SYSTEM = 'Du bist NERYX, ein hilfreicher deutschsprachiger KI-Assistent. Antworte klar, präzise und freundlich. Wenn du etwas nicht weißt, sage das offen. Erfinde keine Quellen. Du bist ein kleines lokal betriebenes Sprachmodell und hast keinen direkten Internetzugang.';
const MAX_HISTORY = 12;
let engine = null;
let initializedModel = '';
let busy = false;
let webllm = null;
let history = [];
const isEmbed = new URLSearchParams(location.search).get('embed') === '1';
if (isEmbed) document.body.classList.add('embed');

function readHistory() {
  if (isEmbed) return [];
  try { const data=JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(data) ? data.filter(x => x && ['user','assistant'].includes(x.role) && typeof x.content==='string').slice(-50) : []; }
  catch { return []; }
}
function storeHistory() {
  if (isEmbed) return;
  try { localStorage.setItem(KEY, JSON.stringify(history.slice(-50))); }
  catch { setProgress('Verlauf konnte nicht gespeichert werden (Speicher voll?).'); }
}
function setProgress(message,pct) {
  $('progressText').textContent = String(message);
  if (Number.isFinite(pct)) $('progress').value = Math.max(0,Math.min(100,pct));
}
function setStatus(message,ready=false){$('status').textContent=message;$('dot').classList.toggle('ok',ready);}
function append(role,content,save=true){
  $('intro')?.remove();
  const node=document.createElement('article');node.className='msg '+role;
  const by=document.createElement('div');by.className='by';by.textContent=role==='user'?'Du':'NERYX';
  const body=document.createElement('div');body.textContent=content;
  node.append(by,body);$('chat').append(node);
  node.scrollIntoView({block:'end'});
  if(save){history.push({role,content});storeHistory();}
  return body;
}
function lockUI(value){busy=value;$('send').disabled=value;$('load').disabled=value;$('mode').disabled=value;$('model').disabled=value;}
function parseProgress(p){
  const percent = typeof p.progress==='number'?Math.round(p.progress*100):undefined;
  setProgress(p.text||'Modell wird geladen …',percent);
}
async function initLocal(){
  if (!navigator.gpu) throw new Error('WebGPU ist in diesem Browser nicht verfügbar. Versuche Safari mit iOS 26 oder neuer.');
  const adapter=await navigator.gpu.requestAdapter();
  if(!adapter) throw new Error('Kein WebGPU-Adapter verfügbar. Gerät oder Browser unterstützt die Berechnung möglicherweise nicht.');
  const model=$('model').value;
  if(engine && initializedModel===model) return;
  engine=null;initializedModel='';
  setProgress('WebLLM wird geladen …',1);
  // Bibliothek wird erst beim Start geladen, sodass die Seite auch ohne WebGPU angezeigt werden kann.
  webllm ||= await import('https://esm.sh/@mlc-ai/web-llm@0.2.88');
  const known=webllm.prebuiltAppConfig.model_list.some(x=>x.model_id===model);
  if(!known) throw new Error('Das gewählte Modell ist in dieser WebLLM-Version nicht registriert.');
  engine=await webllm.CreateMLCEngine(model,{initProgressCallback:parseProgress});
  initializedModel=model;
  setProgress('Modell geladen. Du kannst chatten.',100);
}
async function initServer(){
  const url=validServerUrl();
  const res=await fetch(url+'/health',{method:'GET',signal:AbortSignal.timeout(8000)});
  if(!res.ok) throw new Error('Server nicht erreichbar (HTTP '+res.status+').');
  setProgress('Eigener Server erreichbar.',100);
}
function validServerUrl(){
  let url;
  try{url=new URL($('serverUrl').value.trim());}catch{throw new Error('Bitte eine gültige Server-URL eingeben.');}
  if(url.username||url.password||url.search||url.hash) throw new Error('Serveradresse darf keine Zugangsdaten oder URL-Parameter enthalten.');
  if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))) throw new Error('Externe Server müssen HTTPS verwenden.');
  return url.href.replace(/\/$/,'');
}
async function initialize(){
  if (busy) throw new Error('NERYX ist gerade beschäftigt.');
  lockUI(true);setStatus('Wird geladen …');
  try{
    if($('mode').value==='local') await initLocal(); else await initServer();
    setStatus('Bereit',true);
    return {ok:true,mode:$('mode').value,model:$('model').value};
  }catch(e){setStatus('Fehler');setProgress('Fehler: '+e.message,0);throw e;}
  finally{lockUI(false);}
}
async function generate(input,{display=true}={}){
  const text=String(input||'').trim().slice(0,6000);
  if(!text) throw new Error('Bitte eine Nachricht eingeben.');
  if(busy) throw new Error('NERYX verarbeitet bereits eine Anfrage.');
  if(display) append('user',text);
  const context=history.slice(-MAX_HISTORY).filter(x=>['user','assistant'].includes(x.role));
  // Beim Embed-Modus wird keine Chat-History gespeichert. Wir bauen den Kontext aus früheren Widget-Anfragen auf.
  if(!display || !context.length || context[context.length-1].content!==text) context.push({role:'user',content:text});
  let result='';
  if(!isEmbed && display){ // Der sichtbare Verlauf enthält die letzte Nutzerfrage bereits.
    // Kontext enthält die Frage genau einmal.
  }
  lockUI(true);setStatus('Antwort wird erstellt …',true);
  const output=display?append('assistant','',false):null;
  try{
    if($('mode').value==='local'){
      if(!engine || initializedModel!==$('model').value){
        lockUI(false);await initialize();lockUI(true);
      }
      const stream=await engine.chat.completions.create({
        messages:[{role:'system',content:SYSTEM},...context],
        temperature:0.65,max_tokens:380,stream:true
      });
      for await(const chunk of stream){
        const part=chunk.choices?.[0]?.delta?.content||'';
        result+=part;if(output) output.textContent=result;
      }
    }else{
      const url=validServerUrl();
      const res=await fetch(url+'/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:[{role:'system',content:SYSTEM},...context],temperature:0.65,max_tokens:380})
      });
      if(!res.ok) throw new Error('Serverfehler: '+res.status);
      const data=await res.json();result=String(data?.choices?.[0]?.message?.content||'');
      if(output)output.textContent=result;
    }
    if(!result.trim()) throw new Error('Das Modell hat keine Textantwort geliefert.');
    if(display){history.push({role:'assistant',content:result});storeHistory();}
    else {history.push({role:'user',content:text},{role:'assistant',content:result});history=history.slice(-MAX_HISTORY);}
    setStatus('Bereit',true);
    return result;
  }catch(e){if(output) output.textContent='Fehler: '+e.message;setStatus('Fehler');throw e;}
  finally{lockUI(false);}
}
$('load').addEventListener('click',()=>initialize().catch(e=>console.error('NERYX:',e)));
$('form').addEventListener('submit',async e=>{
  e.preventDefault();const text=$('prompt').value.trim();if(!text||busy)return;
  $('prompt').value='';
  try{await generate(text);}catch(e){console.error('NERYX:',e);}
});
$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('form').requestSubmit();}});
$('new').addEventListener('click',()=>{if(busy)return;history=[];storeHistory();$('chat').replaceChildren();append('assistant','Neuer Chat gestartet. Was möchtest du wissen?',false);});
$('copy').addEventListener('click',async()=>{
  const text=history.map(x=>(x.role==='user'?'DU':'NERYX')+': '+x.content).join('\n\n');
  try{await navigator.clipboard.writeText(text||'Noch kein Chatverlauf.');setProgress('Ergebnisse kopiert.');}
  catch{setProgress('Kopieren nicht erlaubt. Verwende die Browser-Funktion „Teilen“.');}
});
$('settingsToggle').addEventListener('click',()=>{$('sidebar').classList.toggle('expanded');$('settings').classList.toggle('hidden');});
// Desktop zeigt Einstellungen sofort; auf kleinen Displays zunächst eingeklappt.
if(matchMedia('(max-width:760px)').matches)$('settings').classList.add('hidden');
$('model').addEventListener('change',()=>{engine=null;initializedModel='';setStatus('Modell wechseln');setProgress('Neues Modell noch nicht geladen.',0);});
$('mode').addEventListener('change',()=>{setStatus('Nicht gestartet');setProgress('Betriebsart geändert – bitte laden.',0);});
history=readHistory();for(const item of history)append(item.role,item.content,false);
if(!navigator.gpu) setProgress('WebGPU nicht erkannt. Du kannst alternativ einen eigenen Server verwenden.');

// NERYX Browser Bridge: nur Nachrichten von derselben Origin, nur im eingebetteten Modus.
// Auf GitHub Pages bedeutet das, dass LernBot und NERYX unter demselben Host liegen müssen.
if(isEmbed){
  const allowedOrigin=location.origin;
  window.addEventListener('message',async event=>{
    if(event.origin!==allowedOrigin || event.source!==window.parent) return;
    const payload=event.data;
    if(!payload || payload.protocol!=='neryx.v1' || typeof payload.id!=='string' || payload.id.length>100) return;
    const reply=(type,data)=>event.source.postMessage({protocol:'neryx.v1',type,id:payload.id,...data},event.origin);
    try{
      if(payload.type==='PING') reply('READY',{ok:true});
      else if(payload.type==='LOAD'){const data=await initialize();reply('RESULT',{ok:true,data});}
      else if(payload.type==='ASK'){
        const answer=await generate(payload.prompt,{display:false});
        reply('RESULT',{ok:true,answer});
      }
    }catch(e){reply('ERROR',{ok:false,error:e.message});}
  });
}
