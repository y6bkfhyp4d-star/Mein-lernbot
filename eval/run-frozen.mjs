/* NERYX Frozen Evaluation (noch nicht freigegeben).
   Nur extern liegende, SHA-256-versiegelte Testdaten.
   node eval/run-frozen.mjs /ABSOLUT/fixture.json /ABSOLUT/suite.json
   Fehlende NERYX-Antworten und Verifier-Ausgaben bleiben not_evaluated.
   Konsolenausgabe enthält ausschließlich Aggregate, keine Einzeldaten. */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {runInNewContext} from 'node:vm';
import {loadFrozen} from './frozen-loader.mjs';
import {evaluateFrozenBatch} from './frozen-runner-core.mjs';

if(process.argv.length!==4)throw Error('Genau zwei absolute Frozen-Dateipfade erforderlich.');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=p=>readFileSync(resolve(root,p),'utf8');
const seal=JSON.parse(source('eval/frozen.seal.json'));
const frozen=loadFrozen(process.argv[2],process.argv[3],root,seal);
const window={};
runInNewContext(source('modules/document-gate.js'),{window});
const summary=evaluateFrozenBatch(frozen.items,frozen.documents,
 (question,docs,limit)=>window.NERYXDocumentGate.rank(question,docs,limit));
console.log(JSON.stringify({
 ...summary,version:frozen.version,
 hashes:frozen.hashes,exposure:seal.exposure
},null,2));
