/**
 * NERYX Browser Connector v1 for Mein LernBot.
 * No API key, no cross-origin read access; model runs in the embedded NERYX page.
 * Import in LernBot with: import {createNeryxClient} from './neryx/client.js';
 * When kept at evolution/neryx, use the absolute published URL instead.
 */
export function createNeryxClient({url, timeoutMs=600000}={}) {
  if(!url) throw new Error('NERYX-URL fehlt.');
  const target=new URL(url, location.href);
  if(target.origin!==location.origin) throw new Error('Aus Sicherheitsgründen nur gleiche Domain (Origin) verwenden.');
  if(!['https:','http:'].includes(target.protocol)) throw new Error('Ungültiges Protokoll.');
  target.searchParams.set('embed','1');
  const pending=new Map();
  const frame=document.createElement('iframe');
  frame.title='NERYX KI-Modell';frame.setAttribute('aria-label','NERYX KI-Modell');
  frame.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-9999px;';
  // Hidden but rendered (WebGPU might not run in browsers that freeze fully hidden frames).
  frame.src=target.toString();
  document.body.appendChild(frame);
  let ready=false;
  const onMessage=event=>{
    if(event.origin!==target.origin || event.source!==frame.contentWindow) return;
    const msg=event.data;
    if(!msg || msg.protocol!=='neryx.v1' || typeof msg.id!=='string')return;
    const p=pending.get(msg.id);if(!p)return;
    pending.delete(msg.id);clearTimeout(p.timer);
    if(msg.type==='ERROR')p.reject(new Error(msg.error||'NERYX-Fehler'));
    else p.resolve(msg);
  };
  window.addEventListener('message',onMessage);
  const started=new Promise((resolve,reject)=>{
    frame.addEventListener('load',()=>{ready=true;resolve();},{once:true});
    frame.addEventListener('error',()=>reject(new Error('NERYX-Seite konnte nicht geladen werden.')),{once:true});
  });
  let counter=0;
  async function send(type,extra={}){
    await started;
    if(!ready)throw new Error('NERYX nicht bereit.');
    const id='nx-'+Date.now().toString(36)+'-'+(++counter);
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('NERYX Zeitüberschreitung.'));},timeoutMs);
      pending.set(id,{resolve,reject,timer});
      frame.contentWindow.postMessage({protocol:'neryx.v1',type,id,...extra},target.origin);
    });
  }
  return {
    async ping(){const m=await send('PING');return m.ok===true;},
    async selectModel(model){return (await send('SET_MODEL',{model})).data;},
    async load(){return (await send('LOAD')).data;},
    async ask(prompt){if(typeof prompt!=='string'||!prompt.trim())throw new Error('Leere Frage.');const r=await send('ASK',{prompt:prompt.slice(0,6000)});return r.answer;},
    destroy(){window.removeEventListener('message',onMessage);frame.remove();ready=false;for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('NERYX-Verbindung beendet.'));}pending.clear();}
  };
}
