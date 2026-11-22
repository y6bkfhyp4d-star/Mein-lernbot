/* GENESIS X #64: independent status-only quality gate, research only.
 * Three separate assessments: original user input, Qwen intent, GENESIS review.
 * No predictions, scores, tool operands, model text or answer publication.
 */
(() => {
'use strict';
const allowed=new Set(['review_required','ambiguous','unconfirmed','invalid','blocked','unavailable','declined','model_not_loaded','model_error','model_rejected','opt_in_required']);
const fail=()=>Object.freeze({status:'blocked',route:'none',original:'rejected',model:'untrusted',evidence:'none',reviewOnly:true,publishable:false});
async function inspect(input,options={}){
 const normal=window.NERYXGenesisXNaturalIntent;
 if(normal?.version!=='0.1-research'||typeof normal.normalize!=='function'||typeof normal.inspect!=='function')return fail();
 const canonical=normal.normalize(input);
 if(!canonical)return Object.freeze({...fail(),status:'invalid'});
 let result;
 try{result=await normal.inspect(input,options)}catch{return fail();}
 if(!result||result.reviewOnly!==true||result.publishable!==false||
    !allowed.has(result.status)||!['genesis','qwen','none'].includes(result.route)||
    Object.keys(result).some(k=>!['status','route','reviewOnly','publishable','modelDisagreed'].includes(k))||
    (result.modelDisagreed!==undefined&&result.modelDisagreed!==true))return fail();
 const checked=result.route==='genesis'&&['review_required','ambiguous','unconfirmed'].includes(result.status);
 if(checked&&result.modelDisagreed===true&&options.useQwen!==true)return fail();
 const model=options.useQwen===true?
   (result.modelDisagreed===true?'disagreed':checked?'accepted':'not_confirmed'):'not_requested';
 const evidence=checked?'internal_review_only':'none';
 return Object.freeze({status:result.status,route:result.route,original:'validated',model,evidence,reviewOnly:true,publishable:false});
}
window.NERYXGenesisXQualityGate=Object.freeze({version:'0.1-research',inspect});
})();
