export const boundaryCases=[
{id:'negative-width',label:'Negative Wandbreite',method:'math',input:'Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist -5 Meter breit und 2,5 Meter hoch.',expect:'reject'},
{id:'ragged-grid',label:'Ungleich lange Rasterzeilen',method:'route',input:'000;01;000',expect:'Format: Weg planen:'},
{id:'invalid-grid',label:'Ungültiges Rasterzeichen',method:'route',input:'000;0X0;000',expect:'Format: Weg planen:'},
{id:'huge-area',label:'Überdimensionierte Wandfläche',method:'math',input:'Ein Maler hat 999 Räume mit jeweils 999 Wänden. Jede Wand ist 1000 Meter breit und 1000 Meter hoch.',expect:'Zahlen außerhalb des geprüften Rechenbereichs.'},
{id:'empty-input',label:'Leere Eingabe',method:'plan',input:'',expect:'invalid'},
{id:'zero-width',label:'Wandbreite null',method:'math',input:'Ein Maler hat 3 Räume mit jeweils 4 Wänden. Jede Wand ist 0 Meter breit und 2,5 Meter hoch.',expect:'reject'}
];
export function runBoundaryCase(m,e){
 const answer=e.method==='math'?m.math.solve(e.input):e.method==='route'?m.system.route(e.input):m.orchestrator.plan(e.input).type;
 return {id:e.id,label:e.label,input:e.input,answer:answer??null,expected:e.expect,
  passed:e.expect==='reject'?answer===null:typeof answer==='string'&&answer.includes(e.expect)};
}