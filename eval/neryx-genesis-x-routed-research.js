/* NERYX/GENESIS X #60: explicitly requested numeric research routing.
 * Uses existing NERYXOrchestrator.plan only, not solve(), not Qwen.
 * Never an answer API; no implicit main-chat connection or persistence.
 */
(() => {
'use strict';
const fail=status=>Object.freeze({status,reviewOnly:true,publishable:false});
const num=/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const pairsPattern=/^(?:\s*[^=;,\s]+\s*=\s*[^=;,\s]+\s*,){4,12}\s*[^=;,\s]+\s*=\s*[^=;,\s]+\s*;\s*[^=;,\s]+\s*$/;
const number=(s,max)=>{
 if(!num.test(s))return null;
 const n=Number(s);
 return Number.isFinite(n)&&Math.abs(n)<=max?n:null;
};
function parse(message){
 if(typeof message!=='string'||message.length>1500)return null;
 const match=message.trim().match(/^GENESIS prüfen\s*:\s*(.+)$/i);
 if(!match)return null;
 const expression=match[1].trim();
 if(!pairsPattern.test(expression))return null;
 const orchestrator=window.NERYXOrchestrator;
 if(!orchestrator||typeof orchestrator.plan!=='function')return null;
 const plan=orchestrator.plan(expression);
 if(plan?.type!=='pairs'||plan.query!==expression)return null;
 const [examples,probe]=expression.split(';');
 const lines=examples.split(','),rows=[],seen=new Set();
 for(const line of lines){
  const parts=line.split('=');
  if(parts.length!==2)return null;
  const x=number(parts[0].trim(),1e6),y=number(parts[1].trim(),1e12);
  if(x===null||y===null||seen.has(x))return null;
  seen.add(x);rows.push({x,y});
 }
 const x=number(probe.trim(),1e6);
 if(x===null||seen.has(x))return null;
 return {training:rows.slice(0,3),validation:rows.slice(3),probes:[x]};
}
async function inspect(message){
 const task=parse(message);
 if(!task)return fail('invalid');
 const bridge=window.NERYXGenesisXResearchBridge;
 if(bridge?.version!=='0.1-research'||typeof bridge.review!=='function')
  return fail('unavailable');
 try{
  const r=await bridge.review({version:1,kind:'research_check',task});
  if(!r||r.publishable!==false||r.reviewOnly!==true||
   !['ambiguous','review_required','unconfirmed','invalid','blocked','unavailable'].includes(r.status))
   return fail('blocked');
  // Only status survives. Discard all candidate counts, predictions or untrusted fields.
  return fail(r.status);
 }catch{return fail('blocked');}
}
window.NERYXGenesisXRoutedResearch=Object.freeze({version:'0.1-research',inspect});
})();