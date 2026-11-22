/* EXPERIMENTAL: generate an opt-in overlay in memory from actual NERYX sw.js.
   Never writes sw.js or registers a second test-only SW. */
export const GENESIS_WORKER_ASSETS=Object.freeze([
 'modules/genesis-x.js','modules/genesis-x-tools.js',
 'modules/genesis-x-logic.js','modules/genesis-x-router.js',
 'modules/genesis-x-chain.js','modules/genesis-x-verifier.js',
 'modules/genesis-x-verified-chain.js','modules/genesis-x-diagnostics.js',
 'modules/genesis-x-research.js','modules/genesis-x-research-lab.js',
 'modules/genesis-x-integration-preview.js',
 'modules/genesis-x-worker.js','modules/genesis-x-worker-client.js'
]);
export function makeOverlay(source){
 const anchor="const CACHE='neryx-offline-v4';";
 const stageAnchor=" const cache=await caches.open(CACHE);\n await cache.put(index.href,page);";
 const writeAnchor=" for(const [url,response] of staged)await cache.put(url,response);";
 if(typeof source!=='string'||source.split(anchor).length!==2||
    source.split(stageAnchor).length!==2||source.split(writeAnchor).length!==2)
  throw Error('Unexpected production SW layout; overlay must be reviewed before use.');
 const list=JSON.stringify(GENESIS_WORKER_ASSETS);
 return source
  .replace(anchor,anchor+"\nconst GENESIS_PREVIEW_ASSETS=Object.freeze("+list+");")
  .replace(stageAnchor,` // Opt-in research cache: all optional files must pass before any are written.
 // Failed research fetches never fail the normal app-shell install.
 let genesisStaged=[];
 try{
  genesisStaged=await Promise.all(GENESIS_PREVIEW_ASSETS.map(async relative=>{
   const url=new URL('./'+relative,scope).href;
   const response=await fetchFresh(url);
   if(!response.ok||response.redirected||(response.url&&response.url!==url))
    throw Error('GENESIS preview asset unavailable: '+relative);
   await response.clone().text();
   return [url,response];
  }));
 }catch{genesisStaged=[];}
 const cache=await caches.open(CACHE);
 await cache.put(index.href,page);`)
  .replace(writeAnchor,writeAnchor+"\n for(const [url,response] of genesisStaged)await cache.put(url,response);");
}
