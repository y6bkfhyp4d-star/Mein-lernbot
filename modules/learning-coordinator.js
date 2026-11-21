/* NERYX Lernkoordinator 1.0: entscheidet nur bei exakt zuordenbaren Fakten.
   Lesend, keine Wahrheitsprüfung, kein stiller Speicherabgleich/Autolernen. */
(() => {
'use strict';
const fold=x=>String(x??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[.!?;,]+$/,'').replace(/\s+/g,' ').trim();
const clean=x=>fold(x).replace(/^(?:der|die|das|ein|eine|einen|einem|einer)\s+/,'');
const equivalent=(a,b)=>fold(a)===fold(b);
const propertyAliases={farbe:['farbe','fellfarbe'],zweck:['zweck'],lebensraum:['lebensraum'],definition:['definition'],verfahren:['verfahren'],herkunft:['herkunft'],bestandteile:['bestandteile'],dauer:['dauer']};
const qprops=p=>propertyAliases[p]||[p];
let pending=null;
function decide(input){
 const t=window.NERYXTopicLearning?.parse(input);
 if(!t||t.subject.length<2)return null;
 // Freie Fragen nur mit exakt gelerntem Fragewortlaut behandeln.
 const all=window.NERYXLearningHub?.collect()?.claims||[];
 const subject=clean(t.subject);
 const group=t.type==='allgemein'?['allgemein']:qprops(t.type);
 const matched=all.filter(c=>clean(c.subject)===subject&&group.includes(c.property));
 if(!matched.length)return null;
 const values=[...new Set(matched.flatMap(c=>[fold(c.value),...(
   c.conflict&&Array.isArray(c.alternatives)?c.alternatives.map(a=>fold(a.value)).filter(Boolean):[]
 )]))];
 const conflict=matched.some(c=>c.conflict)||values.length>1;
 if(conflict){
  pending={subject,property:t.type};
  return ['NERYX · WISSENSKONFLIKT','Thema: '+subject,'Eigenschaft: '+t.type,
   'Ich finde widersprüchliche Angaben und kann nicht entscheiden, welche richtig ist.',
   ...matched.map(c=>'• '+c.value+' | '+c.origin+' | Quelle: '+c.source),
   matched.some(c=>c.alternatives?.length)?'Im Hauptwissen können weitere historische Angaben liegen.':'',
   'Welche Angabe soll geprüft werden? Du kannst zunächst mit „Lernquellen: '+subject+
   '“ die Herkunft ansehen. Keine Angabe wird automatisch geändert.'
  ].filter(Boolean).join('\n');
 }
 if(matched.length===1&&matched[0].conflict)return null;
 pending=null;
 const exemplar=matched[0];
 const origins=[...new Set(matched.map(c=>c.origin+' ('+c.source+')'))];
 return ['NERYX · KOORDINIERTE ANTWORT',
  exemplar.value,
  'Quellen: '+origins.join('; '),
  'Übereinstimmende gespeicherte Einträge: '+matched.length,
  'Hinweis: Die Aussage wurde aus lokal gespeicherten Angaben übernommen, nicht unabhängig verifiziert.'
 ].join('\n');
}
// Strukturierte, lesende Auskunft. Eine unbekannte Frageform ist kein Themenbeweis.
function lookup(input){
 const parsed=window.NERYXTopicLearning?.parse(input);
 if(!parsed||parsed.subject.length<2)return {status:'no_match',text:null,subject:null,property:null};
 const claims=window.NERYXLearningHub?.collect()?.claims||[];
 const sub=clean(parsed.subject);
 const same=claims.filter(c=>clean(c.subject)===sub);
 const group=parsed.type==='allgemein'?['allgemein']:qprops(parsed.type);
 const matches=same.filter(c=>group.includes(c.property));
 if(!matches.length)return {status:same.length?'entity_known_no_attribute':'no_match',
  text:null,subject:sub,property:parsed.type};
 const text=decide(input);
 if(!text)return {status:'no_match',text:null,subject:sub,property:parsed.type};
 return {status:text.startsWith('NERYX · WISSENSKONFLIKT')?'conflict':'answered',
  text,subject:sub,property:parsed.type};
}
function explicit(question){
 const response=decide(question);
 return response||'Für diese Frage liegen keine eindeutig vergleichbaren Einträge in Hauptwissen und Themenlernen vor. Ich verwende keine erratene Zuordnung.';
}
function pendingReply(input){
 if(!pending)return null;
 if(/^(?:abbrechen|stopp|stop)$/i.test(String(input).trim())){pending=null;return 'Konfliktprüfung abgebrochen. Keine Daten verändert.';}
 return null;
}
window.NERYXCoordinator=Object.freeze({version:'1.1',decide,lookup,explicit,pendingReply});
})();