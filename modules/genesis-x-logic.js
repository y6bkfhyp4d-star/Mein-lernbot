/* GENESIS X 0.3 – isolated, bounded symbolic rule laboratory. */
(() => {
'use strict';
const num=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e6;
const ops=Object.freeze(['gt','lt','eq','and','or','not']);
function parse(rows,min){
 if(!Array.isArray(rows)||rows.length<min||rows.length>40)return null;
 const used=new Set(),out=[];
 for(const row of rows){
  if(!row||Array.isArray(row)||!num(row.a)||!num(row.b)||typeof row.expected!=='boolean')return null;
  const key=JSON.stringify([row.a,row.b]);
  if(used.has(key))return null;
  used.add(key);out.push({a:row.a,b:row.b,expected:row.expected,key});
 }
 return out;
}
function value(rule,point){
 if(rule.kind==='atom'){
  const left=point[rule.field],right=rule.target==='field'?point[rule.other]:rule.constant;
  return rule.op==='gt'?left>right:rule.op==='lt'?left<right:left===right;
 }
 if(rule.kind==='not')return !value(rule.child,point);
 if(rule.kind==='and')return value(rule.left,point)&&value(rule.right,point);
 if(rule.kind==='or')return value(rule.left,point)||value(rule.right,point);
 return false;
}
function learn(request){
 const {training,validation,constants=[0,1,2,3,5,10]}=request&&typeof request==='object'&&!Array.isArray(request)?request:{};
 const train=parse(training,4),check=parse(validation,2);
 if(!train||!check||check.some(p=>train.some(q=>q.key===p.key))||
 !Array.isArray(constants)||constants.length<1||constants.length>10||
 constants.some(c=>!num(c)))return {status:'invalid',reason:'Invalid samples, overlapping pairs or constants.'};
 const atoms=[];
 for(const field of ['a','b']){
  for(const op of ['gt','lt','eq']){
   for(const c of [...new Set(constants)])atoms.push({kind:'atom',field,op,target:'constant',constant:c});
   atoms.push({kind:'atom',field,op,target:'field',other:field==='a'?'b':'a'});
  }
 }
 const singles=[...atoms,...atoms.map(child=>({kind:'not',child}))];
 let tried=0,match=null;
 function accept(rule){
  tried++;
  if(train.every(p=>value(rule,p)===p.expected)&&
    check.every(p=>value(rule,p)===p.expected)){match=rule;return true;}
  return false;
 }
 for(const rule of singles)if(accept(rule))break;
 // 2 literal boolean combinations, bounded to avoid exponential growth.
 if(!match)outer:for(let i=0;i<singles.length;i++){
  for(let j=i+1;j<singles.length;j++){
   for(const kind of ['and','or']){
    if(tried>=5000)break outer;
    if(accept({kind,left:singles[i],right:singles[j]}))break outer;
   }
  }
 }
 return {status:match?'candidate':'unconfirmed',rule:match,
  trainingCount:train.length,validationCount:check.length,
  evaluated:tried,limitReached:tried>=5000,
  message:'Only developer-supplied samples were used; no generalization is proven.'};
}
window.NERYXGenesisXLogic=Object.freeze({version:'0.3',operations:ops,learn});
})();
