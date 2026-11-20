/* NERYX Fehlerpfade: drei feste künstliche Fälle, keine Frozen-Daten. */
export const negativeCases=Object.freeze([
 Object.freeze({id:'negative-sequence',question:'1, 2, 4, 8, 15',plan:'sequence',
  expected:'Kein unterstütztes Muster erkannt. Mehrdeutige Folgen können andere Regeln haben.'}),
 Object.freeze({id:'blocked-grid',question:'Weg planen: 000;111;000',plan:'grid',
  expected:'NERYX · WEGPLANUNG\nKein freier Weg von oben links nach unten rechts.'}),
 Object.freeze({id:'missing-reasoner',question:'Weg planen: 000;010;000',plan:'grid',
  expected:'Das Planungsmodul fehlt.'})
]);
export function checkNegativeResponses(answers){
 if(!Array.isArray(answers)||answers.length!==negativeCases.length)throw Error('Drei Negativfälle erforderlich.');
 return negativeCases.map((entry,i)=>({
  id:entry.id,passed:typeof answers[i]==='string'&&answers[i]===entry.expected
 }));
}
