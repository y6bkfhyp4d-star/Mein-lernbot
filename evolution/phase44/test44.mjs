import {run440Seed,join440,scoreEvents} from './audit440.js';
const base=scoreEvents({seed:111,noise:1.8,changing:false},[{key:'stone|touch',at:50}]);
if(base.falseAlarms!==1||base.keyHits!==0)throw Error('False-alarm test failed');
const rs=[2027,13030,24036].map(seed=>run440Seed(seed));
const all=join440(rs);
for(const r of rs){
 if(r.test.selected.worlds!==36||r.test.selected.changedKeys!==81)throw Error('Wrong world count');
 if(r.test.selected.keyHits>r.test.selected.changedKeys)throw Error('Impossible property count');
 if(r.selectedName.includes('Rückfall')&&JSON.stringify(r.test.blind)!==JSON.stringify(r.test.selected))throw Error('Fallback mismatch');
}
console.log(JSON.stringify({seedRuns:rs.map(r=>({seed:r.seed,selected:r.selectedName,valid:r.safeOnValidation})),aggregate:all.aggregate},null,2));
