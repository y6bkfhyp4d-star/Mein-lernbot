/* NERYX Dokument-Relevanzfilter 1.0. Leere Treffer sind gewollt.
   Ausschließlich lesende, konservative Wortprüfung; keine Wahrheitsprüfung. */
(() => {
'use strict';
const STOP=new Set('der die das den dem des ein eine einer eines einem eines und oder ist sind war waren wie was wer wo wann warum ich du er sie es wir ihr mit von zu zum zur im am an auf fur als aber auch sich bitte mir nach uber welche welcher welches welchen hat haben kann kannst wurde wird denn erklare erklaere erklaer erklar erklart unterschied unterschiede vergleiche vergleich anhand beispiel beispiels beispiele zeige nenne beschreibe zwischen aus eines frage erklr genauer malerhandwerk'.split(' '));
const base=x=>String(x??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
const stem=w=>w.length>6?w.replace(/(?:ungen|keiten|heiten|ischen|liche|liches|licher|lichen|endes|ender|enden|ungen|ung|heit|keit|ern|en|er|es|e|s)$/,''):w;
const tokens=x=>[...new Set(base(x).split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)).map(stem).filter(w=>w.length>2))];
function rank(query,docs,limit=4){
 const terms=tokens(query);
 if(!terms.length)return [];
 const out=[];
 for(const doc of (Array.isArray(docs)?docs:[]).slice(0,200)){
  const title=String(doc?.title??'');
  const paragraphs=String(doc?.content??'').slice(0,100000).replace(/\s+/g,' ');
  const sentences=paragraphs.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
  for(const sentence of sentences.slice(0,450)){
   const body=new Set(tokens(sentence)),heading=new Set(tokens(title));
   const matched=terms.filter(t=>body.has(t)||heading.has(t));
   if(!matched.length)continue;
   const coverage=matched.length/terms.length;
   // Mehrwort-Anfragen brauchen echte Themenüberschneidung; bei zwei Wörtern beide.
   if(coverage<0.6)continue;
   // Titel allein ist kein Beleg, mindestens ein Themenwort muss im Satz stehen.
   if(!matched.some(t=>body.has(t)))continue;
   out.push({title,sentence:sentence.trim(),score:matched.length+matched.filter(t=>heading.has(t)).length*0.25,coverage});
  }
 }
 return out.sort((a,b)=>b.score-a.score||b.coverage-a.coverage).slice(0,Math.max(1,Math.min(10,limit)));
}
window.NERYXDocumentGate=Object.freeze({version:'1.0',tokens,rank});
})();