// Candidate sandbox launcher. Fixed images, no shell, no fallback.
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {realpathSync,lstatSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {validateAstResult} from './neryx-codebrain.mjs';
const specs=Object.freeze({
 python:{image:'python@sha256:a61cbd76a882645de7f91423329fe43a67eed60d7da24f9e5331414bb3618b20',entry:'/usr/local/bin/python3',args:['-I','-S','/parser/neryx-python-syntax.py'],memory:'64m',pids:'16'},
 yaml:{image:'ruby@sha256:a9ec8f8f22bdcfff3747e9080fedce2b86f487bdec856ca56464ec63603e49c9',entry:'/usr/local/bin/ruby',args:['-W0','/parser/neryx-yaml-syntax.rb'],memory:'64m',pids:'16'},
 js:{image:'node@sha256:12f54cafa58d0e96554ae05871e29663ff7241836377dc9a7916449b8adb062c',entry:'/usr/local/bin/node',args:['--max-old-space-size=96','/parser/codebrain-worker.mjs'],memory:'192m',pids:'32'}
});
const env=()=>({PATH:'/usr/bin:/bin',LANG:'C.UTF-8'});
function docker(args,input,timeout,maxBuffer){
 return execFileSync('/usr/bin/docker',args,{input,timeout,maxBuffer,killSignal:'SIGKILL',env:env(),stdio:['pipe','pipe','pipe']});
}
const stageFiles=new Set(['neryx-python-syntax.py','neryx-yaml-syntax.rb','analyzer.mjs','codebrain-worker.mjs','node_modules/acorn/package.json','node_modules/acorn/CHANGELOG.md','node_modules/acorn/LICENSE','node_modules/acorn/README.md','node_modules/acorn/bin/acorn','node_modules/acorn/dist/acorn.js','node_modules/acorn/dist/acorn.mjs','node_modules/acorn/dist/acorn.d.ts','node_modules/acorn/dist/acorn.d.mts','node_modules/acorn/dist/bin.js']);
const stageDirs=new Set(['node_modules','node_modules/acorn','node_modules/acorn/bin','node_modules/acorn/dist']);
const requiredFiles=['neryx-python-syntax.py','neryx-yaml-syntax.rb','analyzer.mjs','codebrain-worker.mjs','node_modules/acorn/package.json','node_modules/acorn/dist/acorn.mjs','node_modules/acorn/dist/acorn.js'];
export function validateSandboxStage(stage){
 const fail=()=>{throw Error('Invalid sandbox stage');};
 if(typeof stage!=='string'||!stage.startsWith('/')||/[,\r\n]/.test(stage))fail();
 const root=realpathSync(stage);
 if(root!==stage||root==='/'||!lstatSync(root).isDirectory())fail();
 const found=new Set();
 let total=0;
 function walk(relative){
  const dir=relative?join(root,relative):root;
  const names=readdirSync(dir);
  if(names.length>32)fail();
  for(const name of names){
   const path=relative?relative+'/'+name:name;
   const st=lstatSync(join(root,path));
   if(st.isDirectory()&&stageDirs.has(path)){walk(path);continue;}
   if(!st.isFile()||st.nlink!==1||!stageFiles.has(path)||st.size>1048576||(st.mode&0o022))fail();
   total+=st.size;
   if(total>4194304)fail();
   found.add(path);
  }
 }
 walk('');
 if(requiredFiles.some(path=>!found.has(path)))fail();
 return root;
}
export function createSandboxParsers({stage,invoke=docker}){
 const root=validateSandboxStage(stage);
 function parse(language,source,path){
  if(typeof source!=='string'||Buffer.byteLength(source)>70000)throw Error('Invalid sandbox input');
  if(language==='js'&&(typeof path!=='string'||path.length>240))throw Error('Invalid sandbox path');
  const spec=specs[language],name='neryx-parser-'+randomUUID();
  const input=language==='js'?JSON.stringify({path,source}):source;
  if(Buffer.byteLength(input)>130000)throw Error('Invalid sandbox transport size');
  const args=['run','-i','--name',name,'--pull','never','--platform','linux/amd64',
   '--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true',
   '--user','65534:65534','--memory',spec.memory,'--memory-swap',spec.memory,'--cpus','0.5',
   '--pids-limit',spec.pids,'--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=1m',
   '--mount','type=bind,source='+root+',target=/parser,readonly','--entrypoint',spec.entry,spec.image,...spec.args];
  let data,failed=false,attempted=false;
  try{
   validateSandboxStage(root);
   attempted=true;
   const raw=invoke(args,input,15000,language==='js'?131072:4096);
   data=JSON.parse(raw.toString('utf8'));
   if(language==='js'){
    if(Object.keys(data).sort().join(',')!=='findings,parsed'||data.findings.some(f=>Object.keys(f).sort().join(',')!=='line,rule'))throw Error('Bad AST shape');
    validateAstResult(data);
   }else if(!data||Object.keys(data).sort().join(',')!=='line,parsed'||typeof data.parsed!=='boolean'||(data.parsed?data.line!==null:!Number.isSafeInteger(data.line)||data.line<1))throw Error('Bad parser result');
  }catch{failed=true;}
  finally{
   if(attempted){
    try{invoke(['rm','-f',name],'',10000,4096);}catch{failed=true;}
    try{
     const remaining=invoke(['ps','-a','--filter','name=^/'+name+'
  }
  if(failed)throw Error('Sandbox parser or cleanup failed');
  return data;
 }
 return Object.freeze({pythonSyntax:source=>parse('python',source),yamlSyntax:source=>parse('yaml',source),ast:(path,source)=>parse('js',source,path)});
}
,'--format','{{.Names}}'],'',10000,4096);
     if(remaining.toString('utf8').trim()!=='')failed=true;
    }catch{failed=true;}
   }
  }
  if(failed)throw Error('Sandbox parser or cleanup failed');
  return data;
 }
 return Object.freeze({pythonSyntax:source=>parse('python',source),yamlSyntax:source=>parse('yaml',source),ast:(path,source)=>parse('js',source,path)});
}
