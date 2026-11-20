import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreAnswerMode as score} from '../answer-mode-score.mjs';
const q='Welche Farbe hat die Selno-Klemme?';
const cases=[
 ['','abstain',{},'fail'],
 ['Die Selno-Klemme ist rot.','abstain',{},'fail'],
 ['Mir fehlen Angaben zur Farbe der Selno-Klemme.','abstain',{},'review'],
 ['Mir fehlen Angaben zur Farbe der Selno-Klemme.','abstain',{missingEvidenceConfirmed:true},'pass'],
 ['Das weiß ich nicht.','abstain',{missingEvidenceConfirmed:true},'review'],
 ['Zur Selno-Klemme habe ich keine Angaben; sie kostet 50 Euro.','abstain',{missingEvidenceConfirmed:true},'review'],
 ['Die Farbe ist nicht dokumentiert, aber 12 kg sind möglich.','abstain',{missingEvidenceConfirmed:true},'review'],
 ['Welche Farbe hat die Selno-Klemme?','answer',{},'fail'],
 ['Ich weiß es nicht.','answer',{},'fail'],
 ['Rot.','answer',{},'fail'],
 ['Die Selno-Klemme ist rot und besteht aus einem robusten Material.','answer',{},'review'],
 ['Die Daten belegen eine rote Farbe der Selno-Klemme.','answer',{missingEvidenceConfirmed:true},'review']
];
for(const [answer,mode,ctx,expected] of cases)test('Dummy '+mode+' '+JSON.stringify(answer),()=>{
 assert.equal(score(answer,q,mode,ctx).status,expected);
});
test('invalid mode rejected',()=>assert.throws(()=>score('Ja',q,'unknown')));
test('question missing rejected',()=>assert.throws(()=>score('Ja','','answer')));
