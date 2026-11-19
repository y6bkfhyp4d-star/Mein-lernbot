/* NERYX Antwortkontrolle 1.0 – nur prüfbare Form-/Vollständigkeitsmerkmale.
   Keine semantische Wahrheitsprüfung, keine Speicherung, kein zweites Modell. */
(() => {
'use strict';
const norm=s=>String(s??'').toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
const RE={
 example:/\b(?:beispiel|beispielsweise|z\.?\s*b\.?|beispielsatz|beispielhaft)\b/i,
 steps:/\b(?:schritt[\s-]*fur[\s-]*schritt|schritte|rechenweg|vorgehensweise)\b/i,
 comparison:/\b(?:unterschied|vergleiche|vergleich|gegenuberstellung)\b/i,
 painting:/\b(?:malerhandwerk|malerbetrieb|malerarbeiten|malerberuf)\b/i
};
function requirements(question){
 const q=norm(question),needs=[];
 if(RE.example.test(q))needs.push('Beispiel');
 if(RE.steps.test(q))needs.push('Schritte');
 // Nur explizit angefordertes Fachbeispiel, nicht jedes zufällige Fachwort.
 if(RE.painting.test(q)&&RE.example.test(q))needs.push('Malerhandwerk');
 if(RE.comparison.test(q)&&RE.example.test(q)&&/\bhypothese\b/.test(q)&&/\bmessung\b/.test(q))
  needs.push('Hypothese und Messung');
 return needs;
}
function inspect(question,answer){
 const a=norm(answer),needs=requirements(question),missing=[];
 if(needs.includes('Beispiel')&&!RE.example.test(a))missing.push('konkret gekennzeichnetes Beispiel');
 if(needs.includes('Schritte')){
  const items=(a.match(/(?:^|\n)\s*(?:\d+[.)]|[-*]\s)/gm)||[]).length;
  if(items<2&&!/\b(?:zuerst|danach|anschliessend|schliesslich|erstens|zweitens)\b/.test(a))
   missing.push('nachvollziehbare Einzelschritte');
 }
 if(needs.includes('Malerhandwerk')&&!/\b(?:wand|wande|anstrich|farbe|lack|grundier|tiefgrund|putz|tapete|rolle|pinsel|untergrund|beschichtung|feuchte|wasseraufnahme)\w*/i.test(a))
  missing.push('Bezug zum Malerhandwerk');
 if(needs.includes('Hypothese und Messung')&&(!/\bhypothes\w*/.test(a)||!/\bmess\w*/.test(a)))
  missing.push('Unterscheidung zwischen Hypothese und Messung');
 return {complete:missing.length===0,missing,needs};
}
function improvementPrompt(question,answer,missing){
 return [
 'Überarbeite deine vorherige Antwort in gutem Deutsch. Beantworte exakt die Originalfrage.',
 'Es fehlen überprüfbare Anforderungen: '+missing.join('; ')+'.',
 'Schreibe eine vollständige Antwort mit diesem Inhalt, ohne dich auf die vorherige Antwort zu beziehen.',
 'Erfinde keine Fakten, Messwerte oder Quellen. Bleibe unter 150 Wörtern.',
 'Frage: '+String(question).slice(0,1200),
 'Vorherige Antwort: '+String(answer).slice(0,750)
 ].join('\n');
}
window.NERYXAnswerReview=Object.freeze({version:'1.0',requirements,inspect,improvementPrompt});
})();