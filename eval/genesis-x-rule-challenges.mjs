/* Fixed public challenge families; not sealed/independent research.
   Deliberately distinct numerical rules and unresolvable cases. */
const scenario=(name,fn,training,validation,probes)=>Object.freeze({
 name,training:Object.freeze(training.map(x=>Object.freeze({x,y:fn(x)}))),
 validation:Object.freeze(validation.map(x=>Object.freeze({x,y:fn(x)}))),
 probes:Object.freeze(probes.map(x=>Object.freeze({x,expected:fn(x)})))
});
export const positive=Object.freeze([
 scenario('plus-two',x=>x+2,[-3,0,2],[4,9],[-10,3.5,100]),
 scenario('triple',x=>x*3,[-3,0,2],[4,9],[-10,3.5,100]),
 scenario('square',x=>x*x,[-3,0,2],[4,9],[-10,3.5,100]),
 scenario('negate',x=>-x,[-3,0,2],[4,9],[-10,3.5,100])
]);
export const unsupported=Object.freeze([
 // Cubic cannot be expressed by one of the six allowed one-step operators.
 scenario('cubic-outside-one-step',x=>x*x*x,[1,2,3],[4,5],[6]),
 // The same deterministic function cannot satisfy a contradictory validation label.
 Object.freeze({name:'contradictory-validation',
  training:Object.freeze([{x:0,y:2},{x:1,y:3},{x:2,y:4}].map(Object.freeze)),
  validation:Object.freeze([{x:4,y:999},{x:7,y:9}].map(Object.freeze)),
  probes:Object.freeze([])})
]);
export const validProgram=(program)=>Array.isArray(program)&&program.length===1&&
 program[0]&&typeof program[0]==='object'&&!Array.isArray(program[0])&&
 ['add','subtract','multiply','divide','square','negate'].includes(program[0].op);
export function oneStep(program,x){
 if(!validProgram(program)||!Number.isFinite(x))throw Error('Invalid one-step program');
 const {op,c}=program[0];
 if(['add','subtract','multiply','divide'].includes(op)&&
    (!Number.isFinite(c)||Math.abs(c)>1000))throw Error('Invalid constant');
 const value=op==='add'?x+c:op==='subtract'?x-c:op==='multiply'?x*c:
  op==='divide'?c===0?NaN:x/c:op==='square'?x*x:-x;
 if(!Number.isFinite(value))throw Error('Invalid result');
 return value;
}
