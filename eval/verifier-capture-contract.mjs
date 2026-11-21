/* NERYX Verifier-Capture-Vertrag v1.
   Bindet Testfall, Draft und nichtleere Labels aneinander.
   Dieser Strukturcheck ist KEIN Herkunftsnachweis.
   Solange kein authentifizierter NERYX-Capture existiert: niemals PASS. */
import {createHash} from 'node:crypto';
const labels=new Set(['supported','unsupported','contradicted','unverified']);
export const draftHash=text=>createHash('sha256').update(text,'utf8').digest('hex');
export function checkVerifierCaptureBinding(item,capture){
 const gold=item?.expect?.labels;
 if(!Array.isArray(gold)||!gold.length||gold.some(x=>!labels.has(x)))
  throw Error('Verifier-Goldlabels fehlen oder sind ungültig.');
 if(typeof item.id!=='string'||!item.id.trim()||typeof item.input?.draft!=='string'||!item.input.draft.trim())
  return {ok:false,reason:'verifier_item_or_draft_missing'};
 if(!capture||typeof capture!=='object'||Array.isArray(capture))
  return {ok:false,reason:'verified_capture_missing'};
 if(capture.itemId!==item.id||capture.draftSha256!==draftHash(item.input.draft))
  return {ok:false,reason:'capture_binding_mismatch'};
 if(!Array.isArray(capture.labels)||!capture.labels.length||capture.labels.some(x=>!labels.has(x)))
  return {ok:false,reason:'capture_labels_invalid'};
 if(capture.labels.length!==gold.length)
  return {ok:false,reason:'capture_label_count_mismatch'};
 return {ok:true,reason:'capture_structure_only'};
}
