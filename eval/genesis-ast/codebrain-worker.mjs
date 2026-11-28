// Trusted child worker. Receives inert JavaScript text, parses only, never imports source.
import {readSync} from 'node:fs';
import {analyzeAST} from './analyzer.mjs';
try{
 const maxInput=130000,buffer=Buffer.alloc(maxInput+1);
 let size=0;
 while(size<buffer.length){
  const n=readSync(0,buffer,size,buffer.length-size,null);
  if(n===0)break;
  size+=n;
 }
 if(size>maxInput)throw Error('worker-input-limit');
 const body=buffer.toString('utf8',0,size);
 const {path,source}=JSON.parse(body);
 if(typeof path!=='string'||typeof source!=='string'||Buffer.byteLength(source,'utf8')>70000)throw Error('invalid-source');
 const r=analyzeAST(path,source);
 const output={parsed:r.parsed,findings:r.findings.slice(0,41).map(({rule,line})=>({rule,line}))};
 process.stdout.write(JSON.stringify(output));
}catch{
 process.stderr.write('AST worker failed\n');
 process.exitCode=1;
}
