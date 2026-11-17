import assert from 'node:assert/strict';
import {validateFacts,infer,askFact,benchmark,candidatesFromDb} from './reasoning72.js';
const d=benchmark();assert.equal(d.correct,4);assert.equal(d.total,4);assert.equal(d.result.conflicts.length,1);
assert.equal(askFact(d.result,'Fabelwesen A','ist_ein','Wirbeltier').proof.length,2);
assert.equal(askFact(d.result,'Fabelwesen A','lebt_in','Wüste').answer,'Unbekannt');
assert.throws(()=>validateFacts([{subject:'x',relation:'exec',object:'y'}]));
const candidates=candidatesFromDb({entries:[{title:'Mars',excerpt:'Beispiel',url:'https://de.wikipedia.org/wiki/Mars'}]});assert.equal(candidates[0].verified,false);
const n=infer(validateFacts([{subject:'A',relation:'ist_ein',object:'B'},{subject:'B',relation:'ist_ein',object:'C'},{subject:'C',relation:'ist_ein',object:'D'}]));assert.equal(askFact(n,'A','ist_ein','D').answer,'Ja');
console.log('Phase 7.2: 6 Prüfgruppen bestanden; Demo 4/4, 1 Widerspruch.');
