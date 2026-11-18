/* NERYX Denkmodul 0.1: kleine, überprüfbare allgemeine Operatoren.
   Kein Sprachmodell und kein Nachweis allgemeiner Intelligenz. */
(() => {
'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function inferRule(examples,input) {
  if(!Array.isArray(examples)||examples.length<2||examples.length>50||!finite(input))return null;
  const pairs=examples.map(e=>[Number(e?.[0]),Number(e?.[1])]);
  if(pairs.some(([x,y])=>!finite(x)||!finite(y)))return null;
  const [x0,y0]=pairs[0];
  const second=pairs.find(([x])=>x!==x0);
  if(!second)return null;
  const slope=(second[1]-y0)/(second[0]-x0),offset=y0-slope*x0;
  if(!finite(slope)||!finite(offset)||!pairs.every(([x,y])=>
    Math.abs((slope*x+offset)-y)<1e-8*Math.max(1,Math.abs(y))))return null;
  const result=slope*input+offset;
  return finite(result)?{result,slope,offset,verified:pairs.length}:null;
}
function shortestPath(grid,start,end) {
  if(!Array.isArray(grid)||!grid.length||grid.length>30)return null;
  const height=grid.length,width=Array.isArray(grid[0])?grid[0].length:0;
  if(!width||width>30||!grid.every(r=>Array.isArray(r)&&r.length===width&&
    r.every(x=>x===0||x===1)))return null;
  const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&
    p[0]>=0&&p[0]<height&&p[1]>=0&&p[1]<width&&grid[p[0]][p[1]]===0;
  if(!point(start)||!point(end))return null;
  const key=p=>p[0]+','+p[1],queue=[start],paths=new Map([[key(start),[start]]]);
  for(let i=0;i<queue.length;i++){
    const current=queue[i],route=paths.get(key(current));
    if(key(current)===key(end))return route;
    for(const [dr,dc] of [[0,1],[1,0],[0,-1],[-1,0]]) {
      const next=[current[0]+dr,current[1]+dc],k=key(next);
      if(point(next)&&!paths.has(k)){paths.set(k,[...route,next]);queue.push(next)}
    }
  }
  return null;
}
function compose(value,steps) {
  if(!finite(value)||!Array.isArray(steps)||steps.length>30)return null;
  let result=value;
  for(const item of steps){
    if(!Array.isArray(item)||item.length!==2||!finite(item[1]))return null;
    const [op,n]=item;
    if(op==='add')result+=n;
    else if(op==='subtract')result-=n;
    else if(op==='multiply')result*=n;
    else if(op==='divide'&&n!==0)result/=n;
    else return null;
    if(!finite(result))return null;
  }
  return result;
}
function ruleFromText(input) {
  const text=String(input??'').trim();
  const sections=text.split(';');
  if(sections.length!==2)return 'Format: Regel lösen: 2=5, 4=9; 7';
  const matches=sections[0].split(',').map(s=>s.trim().match(/^(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)$/));
  if(matches.length<2||matches.length>20||matches.some(m=>!m))
    return 'Bitte mindestens zwei Zahlenpaare angeben: 2=5, 4=9; 7';
  if(!/^-?\d+(?:\.\d+)?$/.test(sections[1].trim()))
    return 'Bitte nach dem Semikolon eine Zielzahl angeben.';
  const samples=matches.map(m=>[Number(m[1]),Number(m[2])]),x=Number(sections[1].trim());
  const result=inferRule(samples,x);
  if(!result)return 'Keine eindeutige lineare Regel aus diesen Beispielen ableitbar.';
  const rounded=n=>Number(n.toPrecision(12));
  return `Abgeleitete Regel: y = ${rounded(result.slope)} × x + ${rounded(result.offset)}\n`+
    `Für x = ${x}: y = ${rounded(result.result)}\n`+
    `Hinweis: Dies ist eine passende lineare Regel, nicht die einzig denkbare Regel.`;
}
window.NERYXReasoner=Object.freeze({version:'0.1',inferRule,shortestPath,compose,ruleFromText});
})();