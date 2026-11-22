/* GENESIS X #63: bounded affirmative phrasing, research-only.
 * Never accepts model-authored numbers, extra commands, negations or storage.
 * #62 remains the sole numerical validation / Qwen intent / Worker gateway.
 */
(() => {
'use strict';
const prefixes=Object.freeze([
 'Bitte untersuche diese Zahlen mit GENESIS X:',
 'GENESIS prüfen:',
 'Bitte überprüfe das Zahlenmuster mit GENESIS X:',
 'Prüfe das Zahlenmuster mit GENESIS X:',
 'Kannst du diese Zahlen mit GENESIS X prüfen:',
 'Untersuche bitte diese Zahlen mit GENESIS X:'
]);
const numeric=/^-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?){4,12}\s*;\s*-?\d+(?:\.\d+)?$/;
const fail=()=>Object.freeze({status:'invalid',route:'none',reviewOnly:true,publishable:false});
function normalize(input){
 if(typeof input!=='string'||!input.trim()||input.length>1400||/[\r\n]/.test(input))return null;
 const value=input.trim();
 for(const prefix of prefixes){
  if(value.slice(0,prefix.length).toLocaleLowerCase('de')!==prefix.toLocaleLowerCase('de'))continue;
  const expression=value.slice(prefix.length).trim();
  if(!numeric.test(expression))return null;
  return 'Bitte untersuche diese Zahlen mit GENESIS X: '+expression;
 }
 return null;
}
async function inspect(input,options={}){
 const canonical=normalize(input);
 if(!canonical)return fail();
 const bridge=window.NERYXGenesisXQwenIntent;
 if(bridge?.version!=='0.1-research'||typeof bridge.inspect!=='function')return fail();
 const r=await bridge.inspect(canonical,options);
 if(!r||r.reviewOnly!==true||r.publishable!==false)return fail();
 return r;
}
window.NERYXGenesisXNaturalIntent=Object.freeze({version:'0.1-research',normalize,inspect});
})();
