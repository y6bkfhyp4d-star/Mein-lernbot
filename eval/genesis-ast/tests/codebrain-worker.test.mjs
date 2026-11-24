import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {astWorkerDefault} from '../../../.github/scripts/neryx-codebrain.mjs';
test('separate AST worker safely parses ES modules without executing source',()=>{
 globalThis.codebrainWorkerProbe=0;
 const output=astWorkerDefault('untrusted.mjs','export const x = 1; globalThis.codebrainWorkerProbe=999; eval("never");');
 assert.equal(output.parsed,true);
 assert.ok(output.findings.some(x=>x.rule==='AST001'));
 assert.equal(globalThis.codebrainWorkerProbe,0);
 delete globalThis.codebrainWorkerProbe;
});
test('separate AST worker returns only fixed field names, never source contents',()=>{
 const output=astWorkerDefault('unsafe.mjs','eval("FAKE_TOKEN_NEVER_PRINT");');
 assert.doesNotMatch(JSON.stringify(output),/FAKE_TOKEN_NEVER_PRINT/);
 assert.ok(output.findings.some(x=>x.rule==='AST001'));
});
test('separate AST worker recognizes confirmed parse errors',()=>{
 const output=astWorkerDefault('broken.mjs','export const = ;');
 assert.equal(output.parsed,false);
 assert.equal(output.findings[0].rule,'AST000');
});
test('separate AST worker bounds finding output to a maximum of 41',()=>{
 const output=astWorkerDefault('many.js','eval("x");'.repeat(55));
 assert.equal(output.findings.length,41);
});

test('AST worker rejects inputs above 70 KB including multibyte UTF-8',()=>{
 assert.throws(()=>astWorkerDefault('oversized.mjs','a'.repeat(70001)));
 assert.throws(()=>astWorkerDefault('oversized.mjs','ä'.repeat(35001)));
});
test('AST worker caps raw stdin bytes before JSON parsing',()=>{
 const helper=new URL('../codebrain-worker.mjs',import.meta.url);
 const output=spawnSync(process.execPath,[new URL(helper).pathname],{
  input:' '.repeat(130001),encoding:'utf8',timeout:2500,maxBuffer:16384
 });
 assert.equal(output.status,1);
 assert.match(output.stderr,/AST worker failed/);
 assert.equal(output.stdout,'');
});
