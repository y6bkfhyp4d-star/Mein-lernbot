/* NERYX: gemeinsame kanonische Pfadkontrolle für vertrauliche Frozen-Dateien.
   Alle Verzeichnisse werden vor dem Vergleich via realpath aufgelöst. */
import {realpathSync} from 'node:fs';
import {isAbsolute,relative,sep} from 'node:path';

export function externalFrozenPath(path,root){
 if(typeof path!=='string'||!isAbsolute(path))throw Error('Frozen-Pfade müssen absolut sein.');
 if(typeof root!=='string'||!root)throw Error('Repository-Wurzel fehlt.');
 const repo=realpathSync(root),file=realpathSync(path);
 const rel=relative(repo,file);
 if(rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel)))
  throw Error('Frozen-Testdaten dürfen nicht im Repository liegen.');
 return file;
}
export function assertFrozenNotCI(env=process.env){
 if(env.GITHUB_ACTIONS==='true'||env.CI==='true')
  throw Error('Frozen-Evaluation in CI/GitHub Actions gesperrt.');
}
