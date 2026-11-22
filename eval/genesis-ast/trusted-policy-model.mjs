// GENESIS X Phase 1: pure, read-only policy model for offline attack simulations.
// NOT a GitHub enforcement gate until independently reviewed and deployed on the protected base.
const allowedCandidate=p=>p.startsWith('candidates/')||p.startsWith('eval/candidates/');
const protectedPath=p=>p.startsWith('.github/')||p==='vercel.json'||
  p==='app.js'||p==='sw.js'||p==='index.html'||
  p.startsWith('modules/')||p.startsWith('eval/genesis-ast/')||
  p.startsWith('eval/tests/')||p.startsWith('scripts/');
function safePath(p){
  if(typeof p!=='string'||!p||p.includes('\\')||p.includes('\0')||
     p.startsWith('/')||p.split('/').some(s=>!s||s==='.'||s==='..')||
     /[\u0000-\u001f\u007f]/.test(p))return false;
  return true;
}
export function inspectProposedPaths({headRef,files}){
  if(typeof headRef!=='string'||!headRef||
     !Array.isArray(files)||!files.length||files.length>3000)
    throw new TypeError('A branch and 1..3000 changed-file records are required');
  const changed=[];
  for(const f of files){
    if(!f||typeof f!=='object'||typeof f.filename!=='string'||
       !safePath(f.filename)||f.previous_filename!==undefined&&
       !safePath(f.previous_filename))
      throw new TypeError('Invalid or unsafe changed-file path');
    changed.push(f.filename);
    if(f.previous_filename!==undefined)changed.push(f.previous_filename);
  }
  const unique=[...new Set(changed)].sort();
  const auto=headRef.startsWith('neryx/auto/');
  const denied=auto?unique.filter(p=>!allowedCandidate(p)):[];
  const sensitive=unique.filter(protectedPath);
  return {
    schemaVersion:1,mode:'simulation-only',enforcedOnGitHub:false,
    branch:headRef,autoCandidate:auto,
    changedPaths:unique.length,
    deniedPaths:denied,
    sensitivePaths:sensitive,
    decision:denied.length?'deny':sensitive.length?'manual-trust-review-required':'allow-limited',
    limitations:['Branch names do not prove proposal authorship',
      'No actual GitHub status, ruleset or review requirement is changed',
      'This model is not a substitute for a trusted protected-base workflow']
  };
}
