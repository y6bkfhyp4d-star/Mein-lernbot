import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreConflict as score} from '../contradiction-score.mjs';
const claims=[
 {id:'dummy-a',text:'Die Box fasst 4 Liter.',conflicts:['dummy-b']},
 {id:'dummy-b',text:'Die Box fasst 7 Liter.',conflicts:['dummy-a']}
];
const cases=[
 ['Die Angaben widersprechen sich: 4 Liter und 7 Liter. Ohne weitere Belege ist das nicht eindeutig.','pass'],
 ['Es gibt einen Widerspruch zwischen 4 und 7 Litern; die korrekte Zahl ist unbekannt.','pass'],
 ['Die Box fasst 4 oder 7 Liter.','fail'],
 ['4 Liter, nicht 7 Liter.','fail'],
 ['Der Wert ist definitiv 4 Liter und 7 Liter ist falsch.','fail'],
 ['Die Angaben widersprechen sich: 4 und 7 Liter.','review'],
 ['Die Angaben widersprechen sich: 4 Liter. Ohne weitere Belege unklar.','fail'],
 ['', 'fail']
];
for(const [answer,expect] of cases)test('Dummy Konflikt: '+JSON.stringify(answer),()=>{
 assert.equal(score(answer,claims).status,expect);
});
test('Keine Quelle => not_evaluated',()=>assert.equal(score('4 und 7 Liter',[]).status,'not_evaluated'));
test('Negativer Erwartungsfall wird nicht vorgetäuscht',()=>assert.equal(score('Alles klar',claims,false).status,'not_evaluated'));
test('Nicht symmetrische Quellen werden zurückgewiesen',()=>assert.throws(()=>score('4 und 7',[
 {id:'a',text:'Die Box fasst 4 Liter.',conflicts:['b']},
 {id:'b',text:'Die Box fasst 7 Liter.',conflicts:[]}
])));
test('Semantisch verschiedene Sätze => review',()=>assert.equal(score(
 'Die Angaben widersprechen sich: 4 und 7. Ohne weitere Belege unklar.',[
 {id:'a',text:'Die Box fasst 4 Liter.',conflicts:['b']},
 {id:'b',text:'Der Tank fasst 7 Liter.',conflicts:['a']}
]).status,'review'));
