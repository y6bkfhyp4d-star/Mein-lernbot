import {assess,tests77} from './research77.js';
import assert from 'node:assert/strict';
assert.deepEqual(tests77(),{passed:4,total:4});
assert.equal(assess({schema:77,questions:[],runs:[]}).independentVerified,0);
console.log('Phase 7.7 browser module tests: OK');
