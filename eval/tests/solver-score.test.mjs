import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreSolver} from '../solver-score.mjs';
const clock={value:740,tol:0,unit:'minuten_seit_mitternacht'};
const testcases=[
 ['12:20 Uhr',clock,'pass'],['12.20 Uhr',clock,'pass'],['12 Uhr 20',clock,'pass'],
 ['Antwort: 12:20 Uhr',clock,'pass'],['12:30 Uhr',clock,'fail'],
 ['12.333 Dezimalstunden',clock,'fail'],['09:35 Uhr',clock,'fail'],
 ['09:35 Uhr oder 12:20 Uhr',clock,'pass'],
 ['12:30 Uhr oder 12:20 Uhr',clock,'review'],
 ['12,6 m²',{value:12.6,tol:1e-9,unit:'m2'},'pass'],
 ['12.600000000000001 m2',{value:12.6,tol:1e-9,unit:'m2'},'pass'],
 ['12.6 m3',{value:12.6,tol:1e-9,unit:'m2'},'review'],
 ['12.7 m²',{value:12.6,tol:1e-9,unit:'m2'},'fail'],
 ['2 kg',{value:2000,tol:0,unit:'g'},'pass'],
 ['60 minuten',{value:1,tol:0,unit:'stunden'},'pass'],
 ['6 Stück',{value:6,tol:0,unit:'stueck'},'pass'],
 ['6 Kartons',{value:6,tol:0,unit:'verpackungen'},'pass'],
 ['6 Stück oder 7 Stück',{value:6,tol:0,unit:'stueck'},'review'],
 ['6',{value:6,tol:0,unit:'stueck'},'review'],
 ['6 kg',{value:6,tol:0,unit:'unbekannt'},'not_evaluated']
];
for(const [answer,exp,want] of testcases)test('Dummy-Auswertung '+JSON.stringify(answer)+' '+exp.unit,()=>{
 assert.equal(scoreSolver(answer,'Beginn 09:35 Uhr',exp).status,want);
});
test('ungültige Erwartung wird abgelehnt',()=>assert.throws(()=>scoreSolver('6 kg','',{value:6,tol:-1,unit:'kg'})));

// Regressionen aus unabhängiger Prüfung: keine falschen Bestehenswerte bei Bereichen/Tausendernotation.
test("Regression 1.200 Stück",()=>assert.equal(scoreSolver("1.200 Stück",'',{value:1200,tol:0,unit:"stueck"}).status,"review"));
test("Regression 1.200 Stück",()=>assert.equal(scoreSolver("1.200 Stück",'',{value:1.2,tol:0,unit:"stueck"}).status,"review"));
test("Regression 1,200 Stück",()=>assert.equal(scoreSolver("1,200 Stück",'',{value:1200,tol:0,unit:"stueck"}).status,"review"));
test("Regression 10-12 m2",()=>assert.equal(scoreSolver("10-12 m2",'',{value:12,tol:0,unit:"m2"}).status,"review"));
test("Regression 10–12 m²",()=>assert.equal(scoreSolver("10–12 m²",'',{value:12,tol:0,unit:"m2"}).status,"review"));
test("Regression 10 — 12 m²",()=>assert.equal(scoreSolver("10 — 12 m²",'',{value:12,tol:0,unit:"m2"}).status,"review"));
test("Regression 12 m2 und 3 Anstriche",()=>assert.equal(scoreSolver("12 m2 und 3 Anstriche",'',{value:12,tol:0,unit:"m2"}).status,"review"));
test("Regression 12 m2 und 3 Stück",()=>assert.equal(scoreSolver("12 m2 und 3 Stück",'',{value:12,tol:0,unit:"m2"}).status,"review"));
test("Regression Ergebnis: 12.5 m2",()=>assert.equal(scoreSolver("Ergebnis: 12.5 m2",'',{value:12.5,tol:0,unit:"m2"}).status,"pass"));
test("Regression Ergebnis: 12,5 m²",()=>assert.equal(scoreSolver("Ergebnis: 12,5 m²",'',{value:12.5,tol:0,unit:"m2"}).status,"pass"));
test("Regression -5 kg",()=>assert.equal(scoreSolver("-5 kg",'',{value:-5,tol:0,unit:"kg"}).status,"pass"));
test("Regression 12 m2",()=>assert.equal(scoreSolver("12 m2",'',{value:12,tol:0,unit:"m2"}).status,"pass"));
