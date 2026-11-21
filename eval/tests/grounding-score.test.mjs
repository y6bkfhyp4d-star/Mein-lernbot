import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGrounding,scoreGrounding} from '../grounding-score.mjs';
const c=(text,origin='curated')=>({text,origin});
const cases=[
 ['Die Box fasst 4 Liter.',[c('Die Box fasst 4 Liter.')],['supported'],'pass'],
 ['Die Box fasst 4 Liter.',[c('Die Box fasst 4 Liter.','user')],['unverified'],'pass'],
 ['Die Box fasst 7 Liter.',[c('Die Box fasst 4 Liter.')],['contradicted'],'pass'],
 ['Die Box fasst 7 Liter.',[c('Die Box fasst 4 Liter.','user')],['contradicted'],'review'],
 ['Die Box fasst 7 Liter.',[],['unsupported'],'pass'],
 ['Die Box fasst 7 Liter.',[c('Die Lampe leuchtet blau.')],['unsupported'],'review'],
 ['Die Box fasst 4 Liter.',[c('Die Box fasst 4 Liter.')],['contradicted'],'fail'],
 ['Die Box fasst 4 Liter. Die Kiste ist rot.',[c('Die Box fasst 4 Liter.'),c('Die Kiste ist rot.')],['supported','supported'],'pass'],
 ['Die Box fasst 4 Liter. Die Kiste ist rot.',[c('Die Box fasst 4 Liter.'),c('Die Kiste ist rot.')],['supported'],'fail'],
 ['Die Box fasst 7 Liter.',[c('Die Box fasst 4 Liter.'),c('Die Box fasst 5 Liter.')],['contradicted'],'review'],
 ['Die Box fasst 4 Liter.',[c('Die Box fasst 4 Liter.','user'),c('Die Box fasst 4 Liter.')],['supported'],'pass'],
 ['Die Box fasst 4 Liter.',[c('Die Box fasst 4 Liter.','user')],['supported'],'fail'],
 ['Die Box fasst 4 Liter.',[c('Die Box fasst 4 Liter.')],['supported','supported'],'fail']
];
cases.forEach(([draft,ev,gold,want],i)=>test('Grounding Dummy '+(i+1),()=>{
 assert.equal(scoreGrounding(draft,ev,gold).status,want);
}));
test('Reject unknown status',()=>assert.throws(()=>inspectGrounding('Hallo.',[c('Hallo.','unknown')])));
test('Reject unknown label',()=>assert.throws(()=>scoreGrounding('Hallo.',[],['foo'])));
test('Empty draft requires review',()=>assert.equal(inspectGrounding('  ',[]).status,'review'));
