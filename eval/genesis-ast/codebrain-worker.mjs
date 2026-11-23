// Trusted child worker. Receives inert JavaScript text, parses only, never imports source.
import {readFileSync} from 'node:fs';
import {analyzeAST} from './analyzer.mjs';
try{
 const body=readFileSync(0,'utf8');
 if(body.length>130000)throw Error('worker-input-limit');
 const {path,source}=JSON.parse(body);
 if(typeof path!=='string'||typeof source!=='string'||source.length>60000)throw Error('invalid-source');
 const r=analyzeAST(path,source);
 const output={parsed:r.parsed,findings:r.findings.slice(0,41).map(({rule,line})=>({rule,line}))};
 process.stdout.write(JSON.stringify(output));
}catch{
 process.stderr.write('AST worker failed\n');
 process.exitCode=1;
}
