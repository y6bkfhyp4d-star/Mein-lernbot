/* Research-only extension of the previously reviewed SW overlay.
   Never writes or modifies the real sw.js. */
import {makeOverlay,GENESIS_WORKER_ASSETS} from './genesis-x-sw-overlay.mjs';
const extra=Object.freeze([
 'modules/genesis-x-ambiguity-gate.js',
 'modules/genesis-x-ambiguity-worker.js',
 'modules/genesis-x-ambiguity-client.js'
]);
export const GENESIS_AMBIGUITY_ASSETS=Object.freeze([...GENESIS_WORKER_ASSETS,...extra]);
export function makeAmbiguityOverlay(original){
 const previous=makeOverlay(original);
 const anchor='const GENESIS_PREVIEW_ASSETS=Object.freeze('+JSON.stringify(GENESIS_WORKER_ASSETS)+');';
 if(previous.split(anchor).length!==2)throw Error('SW overlay layout changed; review needed');
 if(new Set(GENESIS_AMBIGUITY_ASSETS).size!==GENESIS_AMBIGUITY_ASSETS.length)
  throw Error('Repeated research asset');
 return previous.replace(anchor,'const GENESIS_PREVIEW_ASSETS=Object.freeze('+
  JSON.stringify(GENESIS_AMBIGUITY_ASSETS)+');');
}
