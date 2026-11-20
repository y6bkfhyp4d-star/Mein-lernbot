import test from 'node:test';
import assert from 'node:assert/strict';
import {draftHash,checkVerifierCaptureBinding as verify} from '../verifier-capture-contract.mjs';
const item={id:'dummy-007',input:{question:'Prüfe.',draft:'Die Lampe ist blau.'},
 expect:{labels:['supported']}};
const valid=()=>({itemId:item.id,draftSha256:draftHash(item.input.draft),labels:['supported']});
test('Gültig gebundene Daten sind nur strukturell geprüft',()=>{
 const r=verify(item,valid());assert.equal(r.ok,true);
 assert.equal(r.reason,'capture_structure_only');
});
test('Falsche Test-ID blockiert',()=>assert.equal(verify(item,{...valid(),itemId:'dummy-008'}).ok,false));
test('Anderer Draft-Hash blockiert',()=>assert.equal(verify(item,{...valid(),draftSha256:draftHash('Andere Aussage')}).ok,false));
test('Leeres Label-Array blockiert',()=>assert.equal(verify(item,{...valid(),labels:[]}).ok,false));
test('Unbekanntes Label blockiert',()=>assert.equal(verify(item,{...valid(),labels:['true']}).ok,false));
test('Fehlendes Capture blockiert',()=>assert.equal(verify(item,null).ok,false));
test('Unvollständige Capture-Labels blockieren',()=>assert.equal(verify({...item,expect:{labels:['supported','unverified']}},valid()).ok,false));
test('Leeres Gold-Array wirft Fehler',()=>assert.throws(()=>verify({...item,expect:{labels:[]}},valid())));
test('Manipulierter Entwurf bindet nicht an ursprüngliches Capture',()=>{
 const modified={...item,input:{...item.input,draft:'Die Lampe ist rot.'}};
 assert.equal(verify(modified,valid()).ok,false);
});
