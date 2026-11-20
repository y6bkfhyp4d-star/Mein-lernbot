/* Öffentlicher CI-Wächter: prüft ausschließlich die Siegel-Metadaten.
   Lädt weder Fixture/Suite noch echte Frozen-Items. */
import {readFileSync} from 'node:fs';
export function assertInactiveFrozenSeal(seal){
 if(!seal||typeof seal!=='object'||Array.isArray(seal)||seal.schema!==2||
  seal.active!==false)
  throw Error('Frozen-Siegel muss in diesem Entwicklungsstand deaktiviert bleiben.');
 if(seal.files?.fixture?.sha256!==null||seal.files?.suite?.sha256!==null||
  seal.version!==null||seal.claimCount!==null||seal.itemCount!==null)
  throw Error('Frozen-Siegel darf noch keine aktiven Versions-, Hash- oder Zähldaten enthalten.');
 return true;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const seal=JSON.parse(readFileSync(new URL('./frozen.seal.json',import.meta.url),'utf8'));
 assertInactiveFrozenSeal(seal);
 console.log('Frozen seal confirmed inactive; no Frozen files accessed.');
}
