import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('NERYX sidebar links integrated GENESIS X research entrypoint once',()=>{
 const main=read('../../index.html'),page=read('../genesis-x-integrated.html');
 assert.equal((main.match(/id="genesis-x-open"/g)||[]).length,1);
 assert.match(main,/<a class="side-button" id="genesis-x-open" href="eval\/genesis-x-integrated.html"/);
 assert.match(page,/href="\.\.\/index\.html"/);
 assert.doesNotMatch(page,/src="\.\.\/app\.js"/);
});
test('all GENESIS #60–65 modules use one bounded, never-autostart research page',()=>{
 const html=read('../genesis-x-integrated.html');
 const expected=[
 'modules/orchestrator.js','modules/genesis-x-ambiguity-client.js',
 'modules/neryx-genesis-x-research-bridge.js',
 'eval/neryx-genesis-x-routed-research.js','eval/neryx-genesis-x-61-decision-gate.js',
 'modules/local-model-bridge.js','eval/neryx-genesis-x-62-qwen-intent.js',
 'eval/neryx-genesis-x-63-natural-intent.js','eval/neryx-genesis-x-64-quality-gate.js',
 'eval/neryx-genesis-x-64-quality-ui.js'
 ];
 for(const part of expected)assert.ok(html.includes(part.split('/').at(-1)),part);
 assert.equal((html.match(/id="qwen-run"/g)||[]).length,1);
 assert.equal((html.match(/id="genesis-only"/g)||[]).length,1);
 assert.equal((html.match(/id="qwen-load"/g)||[]).length,1);
 const ui=read('../neryx-genesis-x-64-quality-ui.js');
 assert.match(ui,/load\.addEventListener\('click'/);
 assert.match(ui,/run\.addEventListener\('click'/);
 assert.match(ui,/direct\.addEventListener\('click'/);
 assert.match(ui,/Antwortfreigabe: GESPERRT/);
});
test('integrated page never launches Qwen automatically and cannot claim verified answer',()=>{
 const html=read('../genesis-x-integrated.html');
 const q=read('../neryx-genesis-x-64-quality-gate.js');
 assert.doesNotMatch(html,/<script[^>]+src="[^"]*app\.js/);
 assert.match(q,/publishable:false/);
 assert.match(q,/reviewOnly:true/);
 assert.doesNotMatch(q,/localStorage|fetch\(|\.load\(/);
});
