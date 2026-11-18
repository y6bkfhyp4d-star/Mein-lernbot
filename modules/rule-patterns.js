/* NERYX Mustererkennung 0.2 – mathematische Hypothesen, keine AGI. */
(() => {
'use strict';
const good = x => typeof x === 'number' && Number.isFinite(x);
const near = (a,b) => Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
const round = n => Number(n.toPrecision(12));
const num = s => /^-?\d+(?:\.\d+)?$/.test(s.trim()) ? Number(s.trim()) : NaN;
function polynomial(pairs) {
  if (!Array.isArray(pairs) || pairs.length<3 || pairs.length>30) return null;
  const p = pairs.map(x=>[Number(x?.[0]),Number(x?.[1])]);
  if (p.some(x=>x.some(y=>!good(y))) || new Set(p.map(x=>x[0])).size!==p.length) return null;
  const [[x0,y0],[x1,y1],[x2,y2]]=p;
  const a = ((y2-y0)/(x2-x0)-(y1-y0)/(x1-x0))/(x2-x1);
  const b = (y1-y0)/(x1-x0)-a*(x1+x0),c=y0-a*x0*x0-b*x0;
  if (![a,b,c].every(good)||!p.every(([x,y])=>near(a*x*x+b*x+c,y)))return null;
  return {type:'quadratisch',a,b,c,prediction:x=>a*x*x+b*x+c};
}
function solvePairs(input) {
  const sections=String(input??'').trim().replace(/:\s*$/,'').split(';');
  if(sections.length!==2)return 'Format: Regel lösen: 1=1, 2=4, 3=9; 4';
  const matches=sections[0].split(',').map(x=>x.trim().match(/^(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)$/));
  const target=num(sections[1]);
  if(matches.length<2||matches.length>30||matches.some(x=>!x)||!good(target))
    return 'Format: Regel lösen: 1=1, 2=4, 3=9; 4';
  const examples=matches.map(m=>[Number(m[1]),Number(m[2])]);
  const xValues=examples.map(p=>p[0]);
  if(new Set(xValues).size!==xValues.length)return 'Jede Eingabezahl darf nur einmal vorkommen.';
  const linear=window.NERYXReasoner?.inferRule(examples,target);
  if(linear)return window.NERYXReasoner.ruleFromText(input);
  const q=polynomial(examples);
  if(!q||!good(q.prediction(target)))return 'Keine passende lineare oder quadratische Regel gefunden. Andere Regeln sind möglich.';
  return `Passende quadratische Regel: y = ${round(q.a)} × x² + ${round(q.b)} × x + ${round(q.c)}\n`+
    `Für x = ${target}: y = ${round(q.prediction(target))}\n`+
    'Hinweis: Auch diese Regel ist nur eine mögliche Fortsetzung, nicht eindeutig bewiesen.';
}
function inferSequence(values) {
  if(!Array.isArray(values)||values.length<3||values.length>30||values.some(x=>!good(x)))return null;
  const diffs=values.slice(1).map((x,i)=>x-values[i]);
  if(diffs.every(x=>near(x,diffs[0])))return {type:'arithmetisch',next:values.at(-1)+diffs[0]};
  if(values.every(x=>x!==0)){
    const ratios=values.slice(1).map((x,i)=>x/values[i]);
    if(ratios.every(x=>near(x,ratios[0])) && good(values.at(-1)*ratios[0]))
      return {type:'geometrisch',next:values.at(-1)*ratios[0]};
  }
  if(values.length>=5){
    const even=values.filter((_,i)=>i%2===0),odd=values.filter((_,i)=>i%2===1);
    const separate=(a)=>a.length>=2&&a.slice(1).every((x,i)=>near(x-a[i],a[1]-a[0]));
    if(separate(even)&&separate(odd)){
      const i=values.length,sub=i%2?odd:even;
      return {type:'abwechselndes arithmetisches Muster',next:sub.at(-1)+(sub[1]-sub[0])};
    }
  }
  if(values.length>=4){
    const second=diffs.slice(1).map((x,i)=>x-diffs[i]);
    if(second.every(x=>near(x,second[0])))
      return {type:'quadratische Folge',next:values.at(-1)+diffs.at(-1)+second[0]};
  }
  return null;
}
function solveSequence(input) {
  const body=String(input??'').trim().replace(/:\s*$/,'');
  const cells=body.split(',').map(x=>x.trim());
  const vals=cells.map(num);
  if(vals.length<3||vals.length>30||vals.some(x=>!good(x)))
    return 'Format: Folge lösen: 2, 4, 8, 16';
  const r=inferSequence(vals);
  if(!r||!good(r.next))return 'Kein unterstütztes Muster erkannt. Mehrdeutige Folgen können andere Regeln haben.';
  return `Erkanntes Muster: ${r.type}\nMögliche nächste Zahl: ${round(r.next)}\n`+
    'Hinweis: Zahlenfolgen können mehrere passende Fortsetzungen haben.';
}
window.NERYXPatterns=Object.freeze({version:'0.2',polynomial,inferSequence,solvePairs,solveSequence});
})();
