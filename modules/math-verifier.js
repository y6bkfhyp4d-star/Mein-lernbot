/* NERYX Rechenprüfer 1.0 – überprüfbare Wandflächen-Aufgaben.
   Nur explizite Räume, Wände, Breite und Höhe in Metern.
   Keine Schätzungen, kein Modelltext als Rechenquelle. */
(() => {
'use strict';
const clean=s=>String(s??'').toLocaleLowerCase('de').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const number=x=>Number(String(x).replace(',','.'));
const capture=(s,re)=>{const m=s.match(re);return m?number(m[1]):null};
const round=x=>Number(x.toPrecision(12));
function wallArea(input){
 const s=clean(input);
 if(s.length<25||s.length>1200||!/\b(?:wand|wände|waende|wandfläche|wandflaeche)\b/.test(s)||!/\b(?:raum|räume|raeume|zimmer)\b/.test(s))return null;
 const rooms=capture(s,/\b(\d{1,3})\s*(?:räume|raeume|zimmer|räumen|raeumen)\b/);
 const walls=capture(s,/\b(?:jeweils\s+|je\s+|pro\s+(?:raum|zimmer)\s+)?(\d{1,3})\s*wänd(?:e|en)\b|\b(?:jeweils\s+|je\s+)(\d{1,3})\s*wänden\b/);
 // Nur eindeutige Mengen; unterschiedliche Wandhöhen/-breiten werden nicht geschätzt.
 const widths=[...s.matchAll(/\b(\d+(?:[,.]\d+)?)\s*(?:meter|metern|m)\s*breit\b/g)].map(m=>number(m[1]));
 const heights=[...s.matchAll(/\b(\d+(?:[,.]\d+)?)\s*(?:meter|metern|m)\s*hoch\b/g)].map(m=>number(m[1]));
 if(rooms===null||walls===null||widths.length!==1||heights.length!==1)return null;
 const width=widths[0],height=heights[0];
 if(![rooms,walls,width,height].every(x=>Number.isFinite(x)&&x>0&&x<=1000)||rooms%1||walls%1)return null;
 const allSame=/\b(?:jede|jeder|alle|jeweils|pro wand|gleich|identisch)\b/.test(s);
 if(!allSame)return {error:'Es ist nicht eindeutig, ob alle Wände gleich groß sind. Bitte bestätigen, dass jede Wand die angegebenen Maße hat.'};
 const exclusions=/\b(?:fenster|tür|tueren|türen|öffnung|oeffnung|abzieh|abzüglich|ausspar|unterschiedlich|verschieden)\b/.test(s);
 if(exclusions)return {error:'Für Fenster, Türen oder unterschiedliche Wandmaße fehlen hier überprüfbare Angaben. Bitte die einzelnen Flächen nennen.'};
 const total=rooms*walls*width*height;
 if(!Number.isFinite(total)||total>1e9)return {error:'Zahlen außerhalb des geprüften Rechenbereichs.'};
 return {kind:'wall-area',rooms,walls,width,height,total:round(total),perWall:round(width*height),count:rooms*walls};
}
function solve(input){
 const data=wallArea(input);if(!data)return null;
 if(data.error)return 'NERYX · RECHENPRÜFER\n'+data.error+'\nKeine ungesicherte Flächenberechnung.';
 return ['NERYX · GEPRÜFTE WANDFLÄCHE',
  data.rooms+' Räume × '+data.walls+' Wände je Raum = '+data.count+' Wände',
  'Eine Wand: '+data.width+' m × '+data.height+' m = '+data.perWall+' m²',
  'Gesamte Wandfläche: '+data.count+' × '+data.perWall+' m² = '+data.total+' m²',
  'Ergebnis: '+data.total+' m²',
  'Annahmen: Alle Wände haben dieselben angegebenen Maße. Keine Fenster oder Türen abgezogen.',
  'Berechnet durch den überprüfbaren Rechenkern, NICHT vom Sprachmodell geschätzt.'].join('\n');
}
window.NERYXMathVerifier=Object.freeze({version:'1.0',wallArea,solve});
})();