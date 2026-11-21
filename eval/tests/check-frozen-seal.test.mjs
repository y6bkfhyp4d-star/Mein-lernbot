import test from 'node:test';
import assert from 'node:assert/strict';
import {assertInactiveFrozenSeal as check} from '../check-frozen-seal.mjs';
const good=()=>({schema:2,active:false,version:null,claimCount:null,itemCount:null,
 files:{fixture:{sha256:null},suite:{sha256:null}}});
test('Inaktives Dummy-Siegel ist gültig',()=>assert.equal(check(good()),true));
test('Aktives Siegel wird zurückgewiesen',()=>assert.throws(()=>check({...good(),active:true})));
test('Fehlendes active wird zurückgewiesen',()=>{const x=good();delete x.active;assert.throws(()=>check(x));});
test('Hash-Aktivierung wird zurückgewiesen',()=>{const x=good();x.files.fixture.sha256='0'.repeat(64);assert.throws(()=>check(x));});
test('Version darf nicht vorzeitig gesetzt werden',()=>assert.throws(()=>check({...good(),version:'v1'})));
test('Zähler dürfen nicht vorzeitig gesetzt werden',()=>assert.throws(()=>check({...good(),itemCount:50})));
test('Fehlender Siegelaufbau wird zurückgewiesen',()=>assert.throws(()=>check({schema:2,active:false})));
