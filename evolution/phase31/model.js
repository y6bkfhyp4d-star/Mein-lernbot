// LernBot 7.0 Phase 3.1 – online gelerntes Kausalmodell, ohne Zugriff auf verborgene Materialparameter.
export const ACTIONS=['touch','heat','cool'];
export function brain(){return {rules:{},episodes:[],count:0};}
export function predict(b,type,action){const r=b.rules[type+'|'+action];return r?{delta:r.sum/r.n,confidence:r.n/(r.n+3),samples:r.n}:null;}
export function update(b,type,action,before,after){const key=type+'|'+action,r=b.rules[key]||(b.rules[key]={n:0,sum:0,errors:0});const delta=after-before;const p=predict(b,type,action);const error=p?Math.abs(p.delta-delta):null;r.n++;r.sum+=delta;if(error!==null)r.errors+=error;b.count++;b.episodes.push({type,action,before,after,delta,prediction:p?.delta??null,error});if(b.episodes.length>200)b.episodes.shift();return {delta,error};}
export function choose(b,types,random,mode){const choices=types.flatMap(type=>ACTIONS.map(action=>({type,action})));if(mode==='random')return choices[Math.floor(random()*choices.length)];let best=[],top=-Infinity;for(const c of choices){const r=b.rules[c.type+'|'+c.action],n=r?.n||0;const score=1/(1+n);if(score>top){top=score;best=[c];}else if(score===top)best.push(c);}return best[Math.floor(random()*best.length)];}
export function summary(b){return {experiments:b.count,rules:Object.keys(b.rules).length,episodes:b.episodes.length};}
