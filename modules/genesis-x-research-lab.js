/* GENESIS X 1.0 experimental research facade; never a production answer API. */
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
const statuses=Object.freeze({
 strategy:Object.freeze(['candidate','unconfirmed','invalid']),
 numeric:Object.freeze(['candidate','unconfirmed','invalid']),
 logic:Object.freeze(['candidate','unconfirmed','invalid']),
 routing:Object.freeze(['candidate','unconfirmed','invalid','unavailable']),
 chain:Object.freeze(['candidate','unconfirmed','invalid','unavailable']),
 audit:Object.freeze(['execution_matched','reference_matched','mismatch','reference_mismatch','invalid']),
 checked:Object.freeze(['execution_checked','unconfirmed','invalid','unavailable','blocked']),
 diagnosis:Object.freeze(['no_change','proposal','blocked','needs_input','unconfirmed','invalid','unavailable']),
 research:Object.freeze(['coverage_gain_observed','no_improvement','rejected','inconclusive','no_change','no_evidence','blocked','invalid','unavailable'])
});
function capabilities(){
 return Object.freeze(Object.entries(engines).map(([name,config])=>{
  const engine=window[config.key];
  return Object.freeze({name,version:config.version,
   available:!!(engine&&engine.version===config.version&&typeof engine[config.method]==='function')});
 }));
}
function run(request){
 const mode=object(request)?request.mode:undefined;
 const input=object(request)?request.input:undefined;
 if(typeof mode!=='string'||!Object.hasOwn(engines,mode)||!object(input))
  return {status:'invalid',reason:'A supported mode and structured input are required.'};
 const config=engines[mode],engine=window[config.key];
 if(!engine||engine.version!==config.version||typeof engine[config.method]!=='function')
  return {status:'unavailable',mode,reason:'Required research module missing or version mismatch.',publishable:false};
 try{
  const report=engine[config.method](input);
  if(!object(report)||typeof report.status!=='string'||!statuses[mode].includes(report.status))
   return {status:'blocked',mode,reason:'Status is not permitted for this research mode.',publishable:false};
  // Chain 0.5 is deliberately unverified. Never return its case predictions via this facade.
  if(mode==='chain')return {status:'exploration_only',mode,candidateStatus:report.status,
   publishable:false,note:'The unchecked chain is accessible for research only; its predictions are not exposed.'};
  return {status:report.status,mode,engineVersion:config.version,
   report,publishable:false,
   note:'Research only. Even execution_checked does not establish real-world correctness or authorize publication.'};
 }catch{return {status:'blocked',mode,reason:'Engine threw; no output accepted.',publishable:false};}
}
window.NERYXGenesisXResearchLab=Object.freeze({
 version:'1.0',modes:Object.freeze(Object.keys(engines)),capabilities,run
});
})();
