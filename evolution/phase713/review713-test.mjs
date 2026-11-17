import {test713,assess713} from './review713.js';
import assert from 'node:assert/strict';
assert.equal(test713().passed,4);
assert.equal(assess713(null).available,false);
console.log('Phase 7.13: client parser tests passed');
