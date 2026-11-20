/* NERYX Antwortmodus-Auswerter v1: konservativer Vorfilter.
   Kein semantischer Faktenprüfer. PASS nur bei belegter, klarer Abstention.
   Antworttexte ohne Belegprüfung bleiben REVIEW, nicht automatisch PASS. */
const normalize=s=>String(s??'').toLocaleLowerCase('de').normalize('NFKC')
  .replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const words=s=>normalize(s).replace(/[^\p{L}\p{N}]+/gu,' ').split(' ').filter(x=>x.length>3);
const abstain=/(?:\b(?:(?:weiß|weiss) ich nicht|ich (?:weiß|weiss|kenne)|mir (?:liegen|fehlen)|keine (?:angaben|informationen|daten|belege)|nicht (?:bekannt|belegt|dokumentiert|angegeben|ermittelbar)|kann (?:ich )?(?:nicht|keine).*?(?:sagen|beantworten|bestimmen))\b)/iu;
const relevantStop=new Set(['welche','welcher','welches','wieviel','warum','steht','dazu','davon','dieser','diese','einem','einer','einen','sind','wird','wurde','kann','bitte','heißt','heisst','genau','angaben','informationen']);
function topicMatch(question,answer){
 const q=new Set(words(question).filter(x=>!relevantStop.has(x)));
 const a=new Set(words(answer));
 return [...q].some(x=>a.has(x));
}
export function scoreAnswerMode(answer,question,mode,context={}){
 if(!['answer','abstain'].includes(mode))throw Error('Ungültiger erwarteter Antwortmodus.');
 if(typeof question!=='string'||!question.trim()||typeof answer!=='string')
  throw Error('Frage und Antwort müssen Texte sein.');
 const text=normalize(answer),q=normalize(question);
 if(!text)return {status:'fail',reason:'empty_answer'};
 const refusal=abstain.test(text);
 const hasNumber=/\b\d+(?:[,.]\d+)?\s*(?:€|euro|kg|g|liter|l|m2|m3|cm|mm|stunden?|minuten?)?\b/iu.test(text);
 const isEcho=text===q||text===q.replace(/[?!]+$/,'');
 if(mode==='answer'){
  if(refusal)return {status:'fail',reason:'abstained_instead_of_answering'};
  if(isEcho||text.length<12||words(text).length<3)return {status:'fail',reason:'no_substantive_answer'};
  return {status:'review',reason:'answer_needs_evidence_and_concept_checks'};
 }
 // Bei fehlenden Belegen ist selbst eine höfliche Abstention nicht automatisch richtig.
 if(!refusal)return {status:'fail',reason:'no_explicit_abstention'};
 if(hasNumber)return {status:'review',reason:'numeric_claim_needs_grounding'};
 if(!topicMatch(question,answer))return {status:'review',reason:'generic_abstention'};
 if(context.missingEvidenceConfirmed===true)
  return {status:'pass',reason:'confirmed_missing_evidence'};
 return {status:'review',reason:'missing_evidence_not_confirmed'};
}
