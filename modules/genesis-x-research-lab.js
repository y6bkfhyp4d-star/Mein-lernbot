/* GENESIS X 1.0: read-only integration facade for nine isolated research stages. */
(() => {
'use strict';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const engines=Object.freeze({
 strategy:Object.freeze({key:'NERYXGenesisX',method:'compare',version:'0.1'}),
 numeric:Object.freeze({key:'NERYXGenesisXTools',method:'compose',version:'0.2'}),
 logic:Object.freeze({key:'NERYXGenesisXLogic',method:'learn',version:'0.3'}),
 routing:Object.freeze({key:'NERYXGenesisXRouter',method:'solve',version:'0.4'}),
 chain:Object.freeze({key:'NERYXGenesisXChain',method:'solve',version:'0.5'}),
 audit:Object.freeze({key:'NERYXGenesisXVerifier',method:'verify',version:'0.6'}),
 checked:Object.freeze({key:'NERYXGenesisXVerifiedChain',method:'solve',version:'0.7'}),
 diagnosis:Object.freeze({key:'NERYXGenesisXDiagnostics',method:'diagnose',version:'0.8'}),
 research:Object.freeze({key:'NERYXGenesisXResearch',method:'run',version:'0.9'})
});
const permitted=new Set(['candidate','unconfirmed','invalid','unavailable','blocked',
 'classified','mismatch','reference_mismatch','execution_matched','reference_matched',
 'execution_checked','no_change','needs_input','proposal','no_evidence','rejected',
 'no_improvement','inconclusive','coverage_gain_observed']);
function capabilities(){
 return Object.freeze(Object.entries(engines).map(([name,config])=>{
  const engine=window[config.key];
  return Object.freeze({name,version:config.version,
   available:!!(engine&&engine.version===config.version&&typeof engine[config.method]==='function')});
 }));
}
function run({mode,input}={}){
 if(typeof mode!=='string'||!Object.hasOwn(engines,mode)||!object(input))
  return {status:'invalid',reason:'A supported mode and structured input are required.'};
 const config=engines[mode],engine=window[config.key];
 if(!engine||engine.version!==config.version||typeof engine[config.method]!=='function')
  return {status:'unavailable',mode,reason:'Required research module missing or version mismatch.'};
 try{
  const report=engine[config.method](input);
  if(!object(report)||typeof report.status!=='string'||!permitted.has(report.status))
   return {status:'blocked',mode,reason:'Malformed or unrecognized engine result.'};
  return {status:report.status,mode,engineVersion:config.version,
   report,
   note:'Experimental output only. Candidate and execution_checked do not prove real-world correctness or novelty.'};
 }catch{return {status:'blocked',mode,reason:'Engine threw; no output accepted.'};}
}
window.NERYXGenesisXResearchLab=Object.freeze({version:'1.0',modes:Object.freeze(Object.keys(engines)),capabilities,run});
})();
