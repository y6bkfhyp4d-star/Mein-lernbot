/* NERYX / GENESIS X #61: research-only decision gate; no chat, model or persistence.
 * A deterministic tool result is only shown after cross-checking wall-area operands.
 * GENESIS findings are NEVER mathematical answers; Qwen text is not truth evidence.
 */
(() => {
'use strict';
const fixed=(status,route,extra={})=>Object.freeze({
 status,route,reviewOnly:true,publishable:false,...extra
});
const equal=(a,b)=>typeof a==='number'&&Number.isFinite(a)&&
 Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
const numeric=x=>typeof x==='number'&&Number.isFinite(x)&&x>0&&x<=1e9;
function checkArea(question){
 const engine=window.NERYXMathVerifier;
 if(typeof engine?.wallArea!=='function')return fixed('unavailable','tool');
 let obj;
 try{obj=engine.wallArea(question)}catch{return fixed('blocked','tool');}
 if(!obj)return fixed('blocked','tool');
 if(typeof obj.error==='string'&&obj.error)
  return fixed('needs_clarification','tool');
 if(obj.kind!=='wall-area'||!Number.isInteger(obj.rooms)||!Number.isInteger(obj.walls)||
    ![obj.rooms,obj.walls,obj.width,obj.height,obj.count,obj.perWall,obj.total].every(numeric))
  return fixed('blocked','tool');
 const count=obj.rooms*obj.walls,perWall=obj.width*obj.height,total=count*perWall;
 if(count!==obj.count||!equal(perWall,obj.perWall)||!equal(total,obj.total)||
    !Number.isFinite(total)||total>1e9)return fixed('blocked','tool');
 // This is a narrowly checked area in m², not an endorsement of other tools.
 return fixed('tool_checked','tool',{
  result:Object.freeze({value:obj.total,unit:'m²',method:'identical_wall_rectangles'})
 });
}
async function decide(input){
 if(typeof input!=='string'||!input.trim()||input.length>1500||input.includes('\n'))
  return fixed('invalid','none');
 const question=input.trim();
 if(/^GENESIS prüfen\s*:/i.test(question)){
  const research=window.NERYXGenesisXRoutedResearch;
  if(research?.version!=='0.1-research'||typeof research.inspect!=='function')
   return fixed('unavailable','genesis');
  try{
   const r=await research.inspect(question);
   const statuses=['ambiguous','review_required','unconfirmed','invalid','blocked','unavailable'];
   if(!r||r.reviewOnly!==true||r.publishable!==false||
      !statuses.includes(r.status)||Object.keys(r).length!==3)
    return fixed('blocked','genesis');
   return fixed(r.status,'genesis');
  }catch{return fixed('blocked','genesis');}
 }
 const orchestrator=window.NERYXOrchestrator;
 if(typeof orchestrator?.plan!=='function')return fixed('unavailable','none');
 let plan;
 try{plan=orchestrator.plan(question)}catch{return fixed('blocked','none');}
 if(plan?.type==='area')return checkArea(question);
 if(plan?.type==='invalid')return fixed('invalid','none');
 // Other deterministic tools are NOT independently verified in this research module.
 // Do not claim "verified" just because NERYX can execute a type of tool.
 return fixed('unverified','none');
}
window.NERYXGenesisXDecisionGate=Object.freeze({version:'0.1-research',decide});
})();