// Phase 7.1 – quellengebundene Wissensansicht. Kein automatischer Wahrheitsbeweis.
export const normalize = s=>String(s||'').toLocaleLowerCase('de').normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const tokens=s=>new Set(normalize(s).split(/\s+/).filter(w=>w.length>3));
export function safeDb(raw){
 const list=Array.isArray(raw?.entries)?raw.entries:[];
 const entries=list.slice(-150).filter(x=>x&&typeof x.title==='string'&&typeof x.excerpt==='string'&&/^https:\/\/de\.wikipedia\.org\/wiki\//.test(x.source||'')).map((x,i)=>({id:i,title:x.title.slice(0,140),excerpt:x.excerpt.slice(0,1600),url:x.source,date:String(x.collected_at||''),status:String(x.status||'nicht_verifiziert')}));
 return {entries,runs:Array.isArray(raw?.runs)?raw.runs:[],queue:Array.isArray(raw?.discovered_queue)?raw.discovered_queue:[]};
}
export function graph(db){
 const entries=db.entries,edges=[];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i],b=entries[j],ta=tokens(a.title),tb=tokens(b.title),ea=tokens(a.excerpt),eb=tokens(b.excerpt);
  const mention=[...ta].some(t=>eb.has(t))||[...tb].some(t=>ea.has(t));
  if(mention)edges.push({a:i,b:j,relation:'Text-Erwähnung (heuristisch, unbestätigt)'});
 }
 return {nodes:entries.map(e=>({id:e.id,label:e.title,url:e.url})),edges};
}
export function search(db,question,limit=5){
 const qt=tokens(question);if(!qt.size)return [];
 return db.entries.map(e=>{const title=tokens(e.title),body=tokens(e.excerpt);let score=0;for(const w of qt){if(title.has(w))score+=5;else if(body.has(w))score++;}return {entry:e,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
}
export function answer(db,q){const matches=search(db,q);return {matches,summary:matches.length?`Passender Quellenauszug aus „${matches[0].entry.title}“: ${matches[0].entry.excerpt.slice(0,380)}${matches[0].entry.excerpt.length>380?'…':''}`:'Kein passender Wissenseintrag. Neue Themen müssen erst durch den Phase-7.0-Workflow recherchiert werden.',verified:false};}
