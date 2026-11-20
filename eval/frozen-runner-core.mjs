/* NERYX Frozen-Runner-Kern: bewertet nur tatsächlich verfügbare Systemausgaben.
   Keine Antworten oder Verifier-Labels aus Gold-Daten erzeugen. */
import {evaluateItem,aggregateEvaluation} from './integration-score.mjs';
export function evaluateFrozenBatch(items,documents,rank){
 if(!Array.isArray(items)||!Array.isArray(documents)||typeof rank!=='function')
  throw Error('Ungültiger Evaluationsauftrag.');
 const results=[],categories={};
 for(const item of items){
  const category=item.category??'unknown';
  if(typeof category!=='string'||!/^[a-z_]{1,40}$/.test(category))
   throw Error('Ungültige Testkategorie.');
  const context={};
  if(item.layers?.includes('retrieval')){
   const hits=rank(item.input.question,documents,10);
   if(!Array.isArray(hits)||hits.some(x=>typeof x?.id!=='string'))
    throw Error('Retrieval-Ausgabe ungültig.');
   context.foundIds=hits.map(x=>x.id);
  }
  // Absichtlich KEIN answer, claims, verifierOutput oder künstliches Orakel:
  // Solange kein echter NERYX-Aufruf existiert, bleiben alle weiteren
  // Prüfungen not_evaluated (kein Gold-Draft als Modellantwort).
  const result=evaluateItem(item,context);
  results.push(result);
  const c=categories[category]??={total:0,fullyEvaluated:0,outcomes:{pass:0,fail:0,review:0,not_evaluated:0}};
  c.total++;if(result.fullyEvaluated)c.fullyEvaluated++;c.outcomes[result.outcome]++;
 }
 const total=aggregateEvaluation(results);
 return {schema:2,scope:'retrieval_only_no_generated_answers',...total,categories};
}
