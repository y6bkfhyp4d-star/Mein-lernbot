import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAST} from '../analyzer.mjs';
import {version} from 'acorn';
assert.equal(version,'8.15.0');

test('browser globals',()=>{
const rules=s=>[...new Set(analyzeAST('fixture.js',s).findings.map(f=>f.rule))];
let n=0;
for(const g of ['window','self','globalThis']) for(const [expr,rule] of [['eval("1")','AST001'],['Function("return 1")','AST002'],['document.write(x)','AST005'],['localStorage.clear()','AST004']]){
 assert.deepEqual(rules(`${g}.${expr};`),[rule]);n++;
 assert.deepEqual(rules(`function f(${g}){ ${g}.${expr}; }`),[]);n++;
 assert.deepEqual(rules(`{ const ${g} = {}; ${g}.${expr}; }`),[]);n++;
}
for(const g of ['window','self']) for(const [member,method,rule] of [['document','write(x)','AST005'],['localStorage','clear()','AST004']]){
 assert.deepEqual(rules(`const d=${g}["${member}"]; d.${method};`),[rule]);n++;
 assert.deepEqual(rules(`const ${g}={}; const d=${g}["${member}"]; d.${method};`),[]);n++;
}
});

test('secret headers',()=>{
let n=0;
function check(source, expected){assert.equal(analyzeAST('fixture.js',source).findings.filter(x=>x.rule==='SEC001').length,expected,source);n++;}
for(const label of ['PRIVATE KEY','RSA PRIVATE KEY','EC PRIVATE KEY','OPENSSH PRIVATE KEY','DSA PRIVATE KEY','ENCRYPTED PRIVATE KEY','PGP PRIVATE KEY BLOCK']){
 const header=`-----BEGIN ${label}-----`;
 check(`const x=${JSON.stringify(header)};`,1);
 check(`// ${header}\nconst x=1;`,1);
 check(`/* ${header} */`,1);
 check(`const x=\`${header}\`;`,1);
 check(`const x=${JSON.stringify(header+'\n'+header)};`,2);
 check(`const x=${JSON.stringify(header.replace('BEGIN','END'))};`,0);
}
for(const label of ['PUBLIC KEY','RSA PUBLIC KEY','PGP PUBLIC KEY BLOCK','PGP MESSAGE','CERTIFICATE','CERTIFICATE REQUEST','EC PARAMETERS','FAKE PRIVATE KEY','PGP PRIVATE KEY','PRIVATE KEY BLOCK','DSA PUBLIC KEY','private key']) check(`const x="-----BEGIN ${label}-----";`,0);
const findings=analyzeAST('fixture.js','// placeholder\n// -----BEGIN DSA PRIVATE KEY-----').findings;assert.equal(findings[0].line,2);assert.equal(findings[0].column,4);n++;
});

test('invalid syntax and secret headers',()=>{
let n=0;
for(const file of ['fixture.js','fixture.cjs','fixture.mjs']) for(const sep of ['\n','\r\n','\r','\u2028','\u2029']){
 const src='// synthetic'+sep+'// -----BEGIN DSA PRIVATE KEY-----'+sep+'const x = ;';
 const r=analyzeAST(file,src);assert.equal(r.parsed,false);assert.deepEqual(r.findings.map(f=>f.rule),['SEC001','AST000']);assert.equal(r.findings[0].line,2);assert.equal(r.findings[0].column,4);assert.deepEqual(r.calls,[]);n++;
 const neg=analyzeAST(file,'// -----BEGIN PUBLIC KEY-----'+sep+'const x = ;');assert.deepEqual(neg.findings.map(f=>f.rule),['AST000']);n++;
}
});

test('global rebinding',()=>{
let n=0;
for(const [obj,method,rule] of [['document','write','AST005'],['localStorage','clear','AST004']]){
 const check=(source,expected)=>{assert.equal(analyzeAST('fixture.js',source).findings.some(f=>f.rule===rule),expected,source);n++;};
 const prefix=`const a=${obj}; a.${method}=()=>{}; `;
 check(prefix+`a.${method}();`,false);
 for(const g of ['globalThis','window','self']){
  check(prefix+`${g}.${obj}=other; const b=${g}.${obj}; b.${method}();`,true);
  check(prefix+`${g}[key]=other; a.${method}();`,true);
  check(prefix+`${g}=other; a.${method}();`,true);
  check(`function f(${g}){${g}.${obj}.${method}();}`,false);
 }
 check(prefix+`${obj}=other; const b=${obj}; b.${method}();`,true);
 check(prefix+`delete globalThis.${obj}; a.${method}();`,true);
 check(prefix+`if(flag)globalThis.${obj}=other; a.${method}();`,true);
 check(`${obj}=other; ${obj}.${method}();`,true);
}
});

test('named class expression scope',()=>{
 for(const g of ['window','self','globalThis']) for(const [expr,rule] of [['eval(input)','AST001'],['Function(input)','AST002'],['document.write(input)','AST005'],['localStorage.clear()','AST004']]){
  const rules=source=>analyzeAST('fixture.js',source).findings.map(f=>f.rule);
  assert.deepEqual(rules(`const C=class ${g}{method(){${g}.${expr};}};`),[]);
  assert.deepEqual(rules(`const C=class Other{method(){${g}.${expr};}};`),[rule]);
  assert.deepEqual(rules(`const C=class ${g}{}; ${g}.${expr};`),[rule]);
 }
});
