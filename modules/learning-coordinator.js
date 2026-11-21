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
 const check=window.NERYXTopicLearning?.parseLocationCheck?.(input);
 if(check){
  const all=window.NERYXLearningHub?.collect()?.claims||[];
  const sub=clean(check.subject),same=all.filter(c=>clean(c.subject)===sub);
  const matches=same.filter(c=>c.property==='lebensraum');
  // Explizite Ortsfakten: "vorkommen_in" oder "nicht_vorkommen_in" mit Ortsname als Wert.
  // Kein Umkehrschluss aus einem freien Lebensraumtext; keine Hierarchie-Inferenz.
  const place=fold(check.place);
  const explicit=same.filter(c=>
   (c.property==='vorkommen_in'||c.property==='nicht_vorkommen_in')&&fold(c.value)===place);
  const habitatConflict=matches.some(c=>c.conflict)||
   new Set(matches.flatMap(c=>[fold(c.value),...(
    c.conflict&&Array.isArray(c.alternatives)?c.alternatives.map(a=>fold(a.value)).filter(Boolean):[]
   )])).size>1;
  if(explicit.length){
   const positive=explicit.some(c=>c.property==='vorkommen_in');
   const negative=explicit.some(c=>c.property==='nicht_vorkommen_in');
   const suspicious=explicit.some(c=>c.conflict||
    (Array.isArray(c.alternatives)&&c.alternatives.some(a=>fold(a.value)!==place)));
   if((positive&&negative)||suspicious||habitatConflict)
    return {status:'conflict',subject:sub,property:'vorkommen_in',
     text:'NERYX · WISSENSKONFLIKT\nZum Vorkommen von „'+sub+
      '“ am Ort „'+check.place+'“ liegen widersprüchliche oder markierte Angaben vor. Keine Ja/Nein-Aussage möglich.\n'+
      explicit.map(c=>'• '+c.property+': '+c.value+' | Quelle: '+c.origin+' ('+c.source+')').join('\n')};
   const answer=positive?'Ja':'Nein';
   return {status:'answered',subject:sub,property:'vorkommen_in',
    text:'NERYX · BELEGTE ORTSAUSSAGE\nBehauptung: „'+sub+' kommt in '+check.place+' vor.“\nErgebnis: '+answer+
     ' – laut ausdrücklich gespeichertem '+(positive?'Vorkommens':'Nichtvorkommens')+'fakt.'+
     (check.negated?'\nHinweis: Deine Frage enthält eine Verneinung. Das Ergebnis bewertet ausdrücklich die positive Behauptung oben.':'')+
     '\nQuelle: '+[...new Set(explicit.map(c=>c.origin+' ('+c.source+')'))].join('; ')+
     '\nDieser gespeicherte Fakt wurde nicht unabhängig überprüft.'};
  }
  if(!matches.length)return {status:same.length?'entity_known_no_attribute':'no_match',
   text:null,subject:sub,property:'lebensraum'};
  const values=[...new Set(matches.flatMap(c=>[fold(c.value),...(
   c.conflict&&Array.isArray(c.alternatives)?c.alternatives.map(a=>fold(a.value)).filter(Boolean):[]
  )]))];
  if(matches.some(c=>c.conflict)||values.length>1)
   return {status:'conflict',subject:sub,property:'lebensraum',
    text:'NERYX · WISSENSKONFLIKT\nZum Lebensraum von „'+sub+
     '“ liegen widersprüchliche Angaben vor. Keine Ja/Nein-Aussage möglich.\n'+
     matches.map(c=>'• '+c.value+' | Quelle: '+c.origin+' ('+c.source+')').join('\n')};
  return {status:'related',subject:sub,property:'lebensraum',
   text:'NERYX · ORTSPRÜFUNG\nGespeicherter Lebensraum: '+matches[0].value+
    '\nQuelle: '+matches.map(c=>c.origin+' ('+c.source+')').filter((v,i,a)=>a.indexOf(v)===i).join('; ')+
    '\nGefragter Ort: '+check.place+(check.negated?' (verneinte Frage)':'')+
    '\nAus der gespeicherten Angabe allein lässt sich diese Ja/Nein-Frage nicht sicher entscheiden. Keine Bestätigung oder Verneinung.'+
    '\nDie gespeicherte Angabe wurde nicht unabhängig verifiziert.'};
 }
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