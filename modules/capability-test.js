/* NERYX Fähigkeitstest 0.1 – neue zufällige Aufgaben und getrennte Bewertung.
   Dies ist KEIN AGI-Nachweis. Keine privaten Nutzerdaten werden benutzt. */
(() => {
'use strict';
function benchmark(seed=Date.now(),solver=window.NERYXReasoner) {
  if(!solver?.inferRule||!solver?.shortestPath||!solver?.compose)
    return {error:'Denkmodul fehlt'};
  let state=(Math.floor(seed)>>>0)||1;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296};
  const integer=(lo,hi)=>lo+Math.floor(random()*(hi-lo+1));
  const outcome={rule:{correct:0,total:0},planning:{correct:0,total:0},composition:{correct:0,total:0}};
  const examples=[];
  function check(kind,ok,description){
    outcome[kind].total++;
    if(ok)outcome[kind].correct++;
    else if(examples.length<6)examples.push(kind+': '+description);
  }
  for(let n=0;n<12;n++){
    const a=integer(-5,5)||1,b=integer(-30,30),xs=[integer(-15,-4),integer(-2,8),integer(9,20)];
    const input=integer(21,50),result=solver.inferRule(xs.map(x=>[x,a*x+b]),input);
    check('rule',!!result&&Math.abs(result.result-(a*input+b))<1e-8,'Neue Zahlenregel nicht übertragen');
  }
  for(let n=0;n<12;n++){
    const size=integer(4,9),grid=Array.from({length:size},()=>Array(size).fill(0));
    for(let r=0;r<size;r++)for(let c=0;c<size;c++)
      if(random()<.23)grid[r][c]=1;
    grid[0][0]=0;grid[size-1][size-1]=0;
    // Independent distance-only reference, not the candidate's route reconstruction.
    const dist=Array.from({length:size},()=>Array(size).fill(-1)),queue=[[0,0]];
    dist[0][0]=0;
    for(let i=0;i<queue.length;i++){
      const [r,c]=queue[i];
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nr=r+dr,nc=c+dc;
        if(nr>=0&&nr<size&&nc>=0&&nc<size&&!grid[nr][nc]&&dist[nr][nc]===-1){
          dist[nr][nc]=dist[r][c]+1;queue.push([nr,nc]);
        }
      }
    }
    const path=solver.shortestPath(grid,[0,0],[size-1,size-1]),expected=dist[size-1][size-1];
    let valid=path===null&&expected===-1;
    if(Array.isArray(path)&&expected>=0){
      valid=path.length===expected+1&&path.every((p,i)=>
        Array.isArray(p)&&p.length===2&&Number.isInteger(p[0])&&Number.isInteger(p[1])&&
        p[0]>=0&&p[0]<size&&p[1]>=0&&p[1]<size&&grid[p[0]][p[1]]===0&&
        (i===0?(p[0]===0&&p[1]===0):
          Math.abs(p[0]-path[i-1][0])+Math.abs(p[1]-path[i-1][1])===1))&&
        path.at(-1)[0]===size-1&&path.at(-1)[1]===size-1;
    }
    check('planning',valid,'Kürzester Weg im unbekannten Raster');
  }
  for(let n=0;n<12;n++){
    const init=integer(-10,10),steps=[],count=integer(3,7);
    let expected=init;
    for(let j=0;j<count;j++){
      const op=['add','subtract','multiply'][integer(0,2)],v=integer(1,6);
      steps.push([op,v]);
      if(op==='add')expected+=v;
      if(op==='subtract')expected-=v;
      if(op==='multiply')expected*=v;
    }
    const actual=solver.compose(init,steps);
    check('composition',typeof actual==='number'&&Math.abs(actual-expected)<1e-8,'Mehrstufiger Rechenweg');
  }
  const correct=Object.values(outcome).reduce((n,x)=>n+x.correct,0),total=36;
  return {seed:Math.floor(seed)>>>0,correct,total,domains:outcome,failures:examples};
}
function report(){
  const result=benchmark();
  if(result.error)return result.error;
  const lines=['NERYX · FÄHIGKEITSTEST 0.1',
    `Neue Testaufgaben: ${result.total}`,
    `Gesamt: ${result.correct}/${result.total}`,
    `Zahlenregeln aus Beispielen ableiten: ${result.domains.rule.correct}/12`,
    `Kürzeste Wege planen: ${result.domains.planning.correct}/12`,
    `Rechenschritte kombinieren: ${result.domains.composition.correct}/12`,
    `Testkennung: ${result.seed}`];
  if(result.failures.length)lines.push('','Fehlversuche:',...result.failures);
  lines.push('','Dies prüft drei enge algorithmische Fähigkeiten, nicht allgemeine Intelligenz.');
  lines.push('Die Tests sind automatisch erzeugt und offen einsehbar; für einen belastbaren Nachweis wären unabhängige, unbekannte Aufgaben und externe Bewertung nötig.');
  return lines.join('\n');
}
window.NERYXCapabilityTest=Object.freeze({version:'0.1',benchmark,report});
})();