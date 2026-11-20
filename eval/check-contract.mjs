/* NERYX – Schutz gegen leere und ungültige Auswertungen. */
export function checkBooleanResult(checks,required=[]){
 if(!checks||typeof checks!=='object'||Array.isArray(checks))throw Error('Ungültige Prüffelder.');
 const keys=Object.keys(checks);
 if(!keys.length||!Array.isArray(required)||required.some(k=>!keys.includes(k)))
  throw Error('Prüfergebnis leer oder unvollständig.');
 if(keys.some(k=>typeof checks[k]!=='boolean'))throw Error('Prüfergebnis enthält keinen Boolean.');
 return keys.every(k=>checks[k]===true);
}
export function checkAggregateResult(result,allowed){
 if(!result||!result.checks||typeof result.checks!=='object'||
  Array.isArray(result.checks)||!Object.keys(result.checks).length)
  throw Error('Keine Prüfdimension ausgewertet.');
 const statuses=Object.values(result.checks).map(v=>v?.status);
 if(statuses.some(s=>!allowed.has(s)))throw Error('Ungültiger Dimensionsstatus.');
 const full=!statuses.includes('not_evaluated');
 const outcome=statuses.includes('fail')?'fail':
  statuses.includes('not_evaluated')?'not_evaluated':
  statuses.includes('review')?'review':'pass';
 if(full!==result.fullyEvaluated||outcome!==result.outcome)
  throw Error('Widersprüchlicher Gesamtstatus.');
 return true;
}
