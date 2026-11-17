import {runChecks,processKnowledge} from './auto75.js';
import assert from 'node:assert/strict';
const check=runChecks();assert.equal(check.passed,5,JSON.stringify(check));
const empty=processKnowledge({entries:[]});assert.equal(empty.claims.length,0);assert.equal(empty.derived.length,0);
const d=processKnowledge({entries:[{title:'Mars',excerpt:'Mars ist möglicherweise ein Stern.',url:'https://de.wikipedia.org/wiki/Mars'}]});assert.equal(d.claims.length,0);
console.log('Phase 7.5: Tests bestanden',check);
