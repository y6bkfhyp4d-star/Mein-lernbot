// GENESIS X Phase 2: deterministic, read-only AST findings report.
// Findings are diagnostic leads, NOT confirmed bugs or security verdicts.
import {createHash} from 'node:crypto';
import {analyzeAST} from './analyzer.mjs';

const severityOrder={critical:0,high:1,medium:2,low:3,info:4};
const sha256=s=>createHash('sha256').update(s,'utf8').digest('hex');
const allowedTypes=new Set(['.js','.mjs','.cjs']);
function validate(file,source,gitSha){
  if(typeof file!=='string'||!file||file.includes('\\')||file.includes('\0')||
     file.startsWith('/')||file.split('/').some(s=>!s||s==='.'||s==='..')||
     ![...allowedTypes].some(ext=>file.endsWith(ext)))
    throw new TypeError('Relative JS source path required');
  if(typeof source!=='string'||Buffer.byteLength(source,'utf8')>2_000_000)
    throw new TypeError('Source must be a UTF-8 string <=2 MB');
  if(gitSha!==null&&(typeof gitSha!=='string'||!/^[0-9a-f]{40}$/.test(gitSha)))
    throw new TypeError('gitSha must be a verified 40-char commit SHA or null');
}
function confidenceClass(f){
  // Static signatures may be harmless (sandboxed code, sanitized input, tests).
  // Flag uncertainty explicitly, never mislabel a potential issue as proven.
  if(f.rule==='AST000')return 'parser-syntax-error';
  if(f.rule==='SEC001')return 'signature-may-be-in-comment-or-string';
  if(f.rule==='AST006')return 'duplicate-declaration-may-be-intentional';
  return 'static-pattern-requires-context';
}
export function createFindingReport(file,source,{gitSha=null}={}){
  validate(file,source,gitSha);
  const ast=analyzeAST(file,source);
  const sourceSha256=sha256(source);
  const findings=ast.findings.map((f,i)=>({
    id:f.rule+':'+f.line+':'+f.column+':'+i,
    ruleId:f.rule,severity:f.severity,file:f.file,
    line:f.line,column:f.column,
    message:f.message,
    evidence:{kind:f.rule==='AST000'?'parser-error':'static-ast-or-signature',sourceSha256},
    confidence:f.confidence,
    falsePositiveClass:confidenceClass(f),
    suggestion:f.suggestion,
    verification:'manual-review-required'
  })).sort((a,b)=>
    severityOrder[a.severity]-severityOrder[b.severity]||
    a.file.localeCompare(b.file)||a.line-b.line||
    a.column-b.column||a.ruleId.localeCompare(b.ruleId)||a.id.localeCompare(b.id));
  return {
    schemaVersion:1,analyzer:'GENESIS-X-Phase2-AST',analyzerVersion:'2.7-findings-prototype',
    mode:'read-only',changesApplied:false,
    source:{file,gitSha,sha256:sourceSha256,bytes:Buffer.byteLength(source,'utf8')},
    parser:ast.parser,parsed:ast.parsed,
    findings,summary:{total:findings.length,bySeverity:Object.fromEntries(
      Object.keys(severityOrder).map(key=>[key,findings.filter(x=>x.severity===key).length])
    )},
    limitations:[
      'AST rule matches are potential findings, not independently confirmed bugs',
      'gitSha is an externally supplied reference, not a verified Git source read',
      'No dependency resolution, code execution, automatic patch, merge or deployment'
    ]
  };
}
