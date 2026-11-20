/* NERYX Solver-Auswerter v1: bewertet Antworten; löst keine Aufgaben.
   Konservativ: Mehrdeutigkeit wird REVIEW, nie automatisch PASS. */
const normalized=s=>String(s??'').toLowerCase().replace(/\u00a0/g,' ').replace(/²/g,'2').replace(/³/g,'3');
const number=x=>Number(x.replace(',','.'));
function clockValues(s){
 const t=normalized(s),hits=[];
 const patterns=[
  /\b([01]?\d|2[0-3]):([0-5]\d)\b/g,
  /\b([01]?\d|2[0-3])\.([0-5]\d)\s*uhr\b/g,
  /(?<![\d:.])\b([01]?\d|2[0-3])\s*uhr\s*([0-5]?\d)?\b/g
 ];
 for(const re of patterns){let m;while((m=re.exec(t))){
  hits.push({time:+m[1]*60+(m[2]?+m[2]:0),start:m.index,end:re.lastIndex});
 }}
 // Präferiere vollständige Zeitangaben gegenüber einer Teilübereinstimmung.
 return hits.filter((v,i)=>!hits.some((u,j)=>i!==j&&u.start<=v.start&&u.end>=v.end&&(u.start<v.start||u.end>v.end)));
}
function resultText(answer){
 const s=String(answer??'');
 const marked=[...s.matchAll(/(?:^|\n|[.!?]\s+)(?:ergebnis|antwort|endzeit|insgesamt|somit|daher|ergibt)\s*[:=]?\s*([^\n.!?]+)/gi)];
 return marked.length?marked.at(-1)[1]:s;
}
const units={
 'm2':{re:/\b(?:m2|quadratmeter(?:n)?)\b/i,factor:1,kind:'area'},
 'm3':{re:/\b(?:m3|kubikmeter(?:n)?)\b/i,factor:1,kind:'volume'},
 'l':{re:/\b(?:l|liter(?:n)?)\b/i,factor:1,kind:'liquid'},
 'kg':{re:/\b(?:kg|kilogramm)\b/i,factor:1,kind:'mass'},
 'g':{re:/\b(?:g|gramm)\b/i,factor:1/1000,kind:'mass'},
 'stunden':{re:/\b(?:h|stunden?)\b/i,factor:1,kind:'duration'},
 'minuten':{re:/\b(?:min|minuten?)\b/i,factor:1/60,kind:'duration'},
 'stueck':{re:/\b(?:stueck|stück|teile?|einheiten?)\b/i,factor:1,kind:'count'},
 'verpackungen':{re:/\b(?:verpackungen?|pakete?|kartons?)\b/i,factor:1,kind:'packages'}
};
const aliases={'m²':'m2','m³':'m3','liter':'l','kilogramm':'kg','gramm':'g','stunden':'stunden','minuten':'minuten','stück':'stueck','teile':'stueck','pakete':'verpackungen','verpackung':'verpackungen'};
function canonical(s){return aliases[String(s).toLowerCase()]??String(s).toLowerCase()}
function quantities(answer,expectedUnit){
 const s=normalized(resultText(answer));const out=[];
 const re=/(?<![\w.,])(-?\d+(?:[,.]\d+)?)(?![\w.,])\s*(m2|m3|kg|g|l|h|min|quadratmeter|kubikmeter|liter|kilogramm|gramm|stunden?|minuten?|stück|stueck|teile?|einheiten?|verpackungen?|pakete?|kartons?)\b/gi;
 let m;
 const u=canonical(expectedUnit);
 while((m=re.exec(s))){
  const raw=m[2].toLowerCase();
  const actual=Object.entries(units).find(([,spec])=>spec.re.test(raw));
  if(!actual)continue;
  const [key,spec]=actual,expect=units[u];
  if(!expect)continue;
  // Konvertiere ausschließlich ausdrücklich unterstützte Dimensionen.
  if(spec.kind!==expect.kind){out.push({wrongUnit:true});continue;}
  out.push({value:number(m[1])*spec.factor/expect.factor,wrongUnit:false});
 }
 return out;
}
export function scoreSolver(answer,question,exact){
 if(!exact||typeof exact.value!=='number'||!Number.isFinite(exact.value)||
   typeof exact.tol!=='number'||!Number.isFinite(exact.tol)||exact.tol<0||
   typeof exact.unit!=='string')throw Error('Ungültiger Solver-Erwartungsvertrag.');
 if(typeof answer!=='string'||!answer.trim())return {status:'fail',reason:'no_answer'};
 const unit=canonical(exact.unit);
 if(unit==='minuten_seit_mitternacht'){
  let times=clockValues(resultText(answer));
  const questionTimes=new Set(clockValues(question).map(x=>x.time));
  // Eine wiederholte Startzeit ohne Endzeit ist keine Antwort.
  if(times.length>1)times=times.filter(x=>!questionTimes.has(x.time));
  const unique=[...new Set(times.map(x=>x.time))];
  if(!unique.length)return {status:'fail',reason:'no_clock_result'};
  if(unique.length!==1)return {status:'review',reason:'multiple_clock_results'};
  return {status:Math.abs(unique[0]-exact.value)<=exact.tol?'pass':'fail',reason:'clock_checked'};
 }
 if(!units[unit])return {status:'not_evaluated',reason:'unsupported_unit'};
 const q=quantities(answer,unit);
 if(!q.length)return {status:'review',reason:'missing_or_unknown_unit'};
 if(q.some(x=>x.wrongUnit))return {status:'review',reason:'incompatible_units'};
 const unique=[...new Set(q.map(x=>x.value))];
 if(unique.length!==1)return {status:'review',reason:'multiple_quantities'};
 return {status:Math.abs(unique[0]-exact.value)<=exact.tol?'pass':'fail',reason:'number_and_unit_checked'};
}
