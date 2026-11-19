/* NERYX natürlicher Zahlenfolgen-Dialog v0.1.
   Eng begrenzte Erkennung; nichts wird ohne bestätigte Lösung gelernt. */
(() => {
'use strict';
const numerals=s=>/^-?\d+(?:\.\d+)?(?:\s*[,;]\s*-?\d+(?:\.\d+)?){3,29}$/.test(s.trim());
const norm=s=>String(s??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
let awaitingSequence=null,awaitingCorrection=false;
function phraseQuestion(input){
 const s=String(input??'').trim();
 if(s.length>240||s.includes('\n')||/\d\s*[,;]\s*\d/.test(s))return null;
 const n=norm(s);
 if(!/^(?:was passiert|was kommt|wie geht|welche zahl|wie berechne|wie geht es)/.test(n))return null;
 if(!/\b(?:zahl|zahlen|zahlenfolge|folge)\b/.test(n))return null;
 if(!/\b(?:verdoppel\w*|multiplizier\w*|addier\w*|vermehr\w*|verdreifach\w*|subtrahier\w*)\b/.test(n))return null;
 return s.replace(/[?.!]+$/,'');
}
function unpack(input){
 const s=String(input??'').trim();
 if(s.length>300||s.includes('\n'))return null;
 const match=s.match(/^(?:was kommt(?: als nächstes)?|wie geht (?:die )?(?:zahlenfolge|folge) weiter|welche zahl kommt(?: als nächstes)?|setze (?:die )?folge fort)[\s:,-]*(.+)$/i);
 if(!match)return null;
 const body=match[1].trim().replace(/[?.!]+$/,'');
 const list=body.match(/-?\d+(?:\.\d+)?(?:\s*[,;]\s*-?\d+(?:\.\d+)?){3,29}/);
 if(!list||!numerals(list[0]))return null;
 const rest=(body.slice(0,list.index)+' '+body.slice(list.index+list[0].length)).trim().replace(/^(?:[,;:]|\s)+/,'').replace(/^(?:wenn|wobei|bei|mit|indem|wo)\s+/i,'').trim();
 if(!rest||rest.length<5)return null;
 return {phrase:rest,sequence:list[0]};
}
function respond(input){
 const s=String(input??'').trim(),w=window.NERYXWordLearning;
 if(!w)return null;
 if(awaitingCorrection){
  if(/^(?:abbrechen|stopp|stop)$/i.test(s)){
   awaitingCorrection=false;
   awaitingSequence=null;
   return w.feedback('abbrechen');
  }
  const match=s.match(/^(?:die (?:richtige |nächste )?zahl ist |es ist |ich meine )?(-?\d+(?:\.\d+)?)\.?$/i);
  if(match){
   awaitingCorrection=false;
   return w.feedback(match[1]);
  }
  // unrelated turn ends the conversational correction window
  awaitingCorrection=false;
  w.feedback('abbrechen');
 }
 if(awaitingSequence){
  const phrase=awaitingSequence;
  awaitingSequence=null;
  if(/^(?:abbrechen|stopp|stop)$/i.test(s))return 'Zahlenfolgen-Frage abgebrochen.';
  if(numerals(s)){
   const answer=w.query(phrase+' | '+s);
   awaitingCorrection=answer.includes('Beispielkorrektur: ZAHL');
   return answer;
  }
 }
 const parsed=unpack(s);
 if(parsed){
  const answer=w.query(parsed.phrase+' | '+parsed.sequence);
  awaitingCorrection=answer.includes('Beispielkorrektur: ZAHL');
  return answer;
 }
 const phrase=phraseQuestion(s);
 if(phrase){
  awaitingSequence=phrase;
  return 'Ich brauche dazu eine konkrete Zahlenfolge. Nenne mindestens vier Werte, zum Beispiel: 7, 14, 28, 56. Dann prüfe ich, welche Strategie dazu passt.';
 }
 return null;
}
window.NERYXConversationMath=Object.freeze({version:'0.1',respond,unpack,phraseQuestion});
})();