import {verifyTests,evaluate} from './review76.js';
import assert from 'node:assert/strict';
const t=verifyTests();assert.equal(t.passed,t.total);
const changed=evaluate([{subject:'Wasserstoff',relation:'ist_ein',object:'chemisches Element'}],{schema:76,entities:[{title:'Wasserstoff',status:'ok',classes:['chemisches Element'],source_changed:true}],changes:[],runs:[]});
assert.equal(changed.changed,1);
console.log('Phase 7.6',t,'source-change test OK');
