/* NERYX S3: Zwei externe Frozen-Dateien mit getrennten SHA-256-Siegeln.
   Kein Testwissen im Repository; keine Verarbeitung bei inaktivem Siegel. */
import {readFileSync} from 'node:fs';
import {externalFrozenPath,assertFrozenNotCI} from './frozen-path-policy.mjs';
import {createHash} from 'node:crypto';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);

export function claimsToDocuments(claims){
 if(!Array.isArray(claims)||!claims.length||claims.length>200)throw Error('Ungültige Claim-Anzahl.');
 const ids=new Set();
 return claims.map(c=>{
  if(!c||typeof c.id!=='string'||!/^fz-c\d{3}$/.test(c.id)||ids.has(c.id)||
   typeof c.text!=='string'||!c.text.trim())throw Error('Ungültiger oder doppelter Claim.');
  ids.add(c.id);
  // Keine angereicherten Titel/Topics: nur der ursprüngliche Belegtext ist suchbar.
  return {id:c.id,title:'',content:c.text};
 });
}
export function loadFrozen(fixturePath,suitePath,root,seal){
 assertFrozenNotCI();
 if(seal?.schema!==2||seal.active!==true||typeof seal.version!=='string'||!seal.version||
  seal.adapterVersion!==1||!hex(seal.files?.fixture?.sha256)||!hex(seal.files?.suite?.sha256)||
  !Number.isSafeInteger(seal.claimCount)||seal.claimCount<1||
  !Number.isSafeInteger(seal.itemCount)||seal.itemCount<1)
  throw Error('Frozen-Evaluation ist nicht freigegeben: Schema-2-Siegel fehlt.');
 if(!fixturePath||!suitePath)throw Error('Fixture und Suite als absolute Pfade angeben.');
 const fp=externalFrozenPath(fixturePath,root),sp=externalFrozenPath(suitePath,root);
 if(fp===sp)throw Error('Fixture und Suite müssen getrennte Dateien sein.');
 const fb=readFileSync(fp),sb=readFileSync(sp);
 const hashes={fixture:sha(fb),suite:sha(sb)};
 if(hashes.fixture!==seal.files.fixture.sha256||hashes.suite!==seal.files.suite.sha256)
  throw Error('Frozen-Siegel stimmt nicht mit den Dateien überein.');
 const fixture=JSON.parse(fb.toString('utf8')),raw=JSON.parse(sb.toString('utf8'));
 const items=Array.isArray(raw)?raw:raw?.items;
 if(fixture.schema!==1||fixture.fixtureId!=='fx-frozen-v1'||!Array.isArray(items)||
  fixture.claims?.length!==seal.claimCount||items.length!==seal.itemCount)
  throw Error('Frozen-Dateiformat oder Siegel-Zählung stimmt nicht.');
 const documents=claimsToDocuments(fixture.claims),ids=new Set();
 for(const t of items){
  if(t?.schema!==1||t.suite!=='frozen'||typeof t.id!=='string'||ids.has(t.id)||
   !Array.isArray(t.layers)||!t.layers.length||
   t.layers.some(x=>!['retrieval','generation','verifier'].includes(x)))
   throw Error('Ungültiger Frozen-Testfall.');
  ids.add(t.id);
  if(t.fixture!==null&&t.fixture!==fixture.fixtureId)throw Error('Ungültige Fixture-Zuordnung.');
  if(t.layers.includes('retrieval')&&!t.expect?.retrieval)
   throw Error('Retrieval-Erwartung fehlt.');
 }
 return {items,documents,hashes,version:seal.version};
}
