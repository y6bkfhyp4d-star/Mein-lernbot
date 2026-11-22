// GENESIS X CodeAnalyzer 2.0 – read-only foundation. Node 22, no dependencies.
// Static heuristics, no execution of analyzed code, writes, network, commits or deploys.
// AST parsing and scope-sensitive diagnostics are future, separate milestones.
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const MAX_BYTES = 2000000;
const severityOrder = {critical:0, high:1, medium:2, low:3, info:4};

function at(source, index) {
  const before = source.slice(0, index);
  const last = before.lastIndexOf('\n');
  return {line: before.split('\n').length, column: index - last};
}

function maskCommentsAndStrings(source) {
  // Keeps every source offset/newline. Not a complete JavaScript lexer.
  let out = '', mode = 'code', escaped = false;
  for (let i=0; i<source.length; i++) {
    const ch=source[i], next=source[i+1];
    if (mode==='line') {
      if (ch==='\n') {mode='code'; out+='\n';} else out+=' ';
    } else if (mode==='block') {
      if (ch==='*' && next==='/') {out+='  ';i++;mode='code';}
      else out+=ch==='\n'?'\n':' ';
    } else if (mode!=='code') {
      if (escaped) {escaped=false;out+=ch==='\n'?'\n':' ';}
      else if (ch==='\\') {escaped=true;out+=' ';}
      else if ((mode==='single'&&ch==="'")||(mode==='double'&&ch==='"')||(mode==='template'&&ch.charCodeAt(0)===96)) {mode='code';out+=' ';}
      else out+=ch==='\n'?'\n':' ';
    } else if(ch==='/'&&next==='/'){mode='line';out+='  ';i++;}
    else if(ch==='/'&&next==='*'){mode='block';out+='  ';i++;}
    else if(ch==="'"||ch==='"'||ch.charCodeAt(0)===96){mode=ch==="'"?'single':ch==='"'?'double':'template';out+=' ';}
    else out+=ch;
  }
  return out;
}

export function analyzeSource(file,source) {
  if(typeof file!=='string'||typeof source!=='string')throw new TypeError('Strings erforderlich');
  const code=source.replace(/\r\n/g,'\n'), masked=maskCommentsAndStrings(code),findings=[];
  function add(rule,severity,index,message,suggestion) {
    findings.push({rule,severity,file,...at(code,index),message,suggestion});
  }
  const patterns=[
    ['JS001','high',/\beval\s*\(/g,'Dynamische Ausführung: eval()','Keine nicht vertrauenswürdigen Eingaben ausführen.'],
    ['JS002','high',/\bnew\s+Function\s*\(/g,'Dynamische Funktionskompilierung','Stattdessen statisch prüfen.'],
    ['JS003','medium',/\.\s*innerHTML\s*=/g,'HTML-Zuweisung','Für fremde Texte textContent verwenden.'],
    ['JS004','high',/\blocalStorage\s*\.\s*clear\s*\(/g,'Gesamter LocalStorage wird gelöscht','Nur eigene Schlüssel gezielt entfernen.'],
    ['JS005','medium',/\bdocument\s*\.\s*write\s*\(/g,'document.write() verwendet','DOM-Methoden verwenden.']
  ];
  for(const [rule,severity,re,message,suggestion] of patterns)
    for(const match of masked.matchAll(re))add(rule,severity,match.index,message,suggestion);
  // Look for key headers in original text, including string literals.
  for(const match of code.matchAll(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g))
    add('SEC001','critical',match.index,'Möglicher privater Schlüssel','Schlüssel unverzüglich prüfen und ggf. rotieren.');
  const functions=new Set();
  for(const match of masked.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)){
    if(functions.has(match[1]))
      add('JS006','low',match.index,'Mehrfache Deklaration: '+match[1],'Scopes manuell prüfen; diese Heuristik ist nicht scope-sensitiv.');
    functions.add(match[1]);
  }
  if(file.endsWith('.js')||file.endsWith('.cjs')){
    try {new vm.Script(code,{filename:file,displayErrors:false});}
    catch(error) {
      // vm.Script only compiles; it never executes the analyzed code.
      if(!/\b(?:import|export)\s/.test(masked))
        add('JS000','high',0,'Möglicher Syntaxfehler: '+String(error.message).slice(0,180),'Mit einem JavaScript-Parser verifizieren.');
    }
  }
  return findings.sort((a,b)=>severityOrder[a.severity]-severityOrder[b.severity]||a.line-b.line||a.column-b.column);
}

export function inspectFiles(paths,{root=process.cwd()}={}){
  if(!Array.isArray(paths)||paths.length<1||paths.length>100)throw new Error('1 bis 100 explizite Dateipfade angeben');
  const base=realpathSync(root),files=[],findings=[];
  for(const input of paths){
    if(typeof input!=='string'||!input||input.includes('\0'))throw new Error('Ungültiger Dateipfad');
    const absolute=realpathSync(resolve(base,input)),rel=relative(base,absolute);
    if(rel==='..'||rel.startsWith('../')||isAbsolute(rel))throw new Error('Pfad außerhalb Projektordner verweigert');
    if(!['.js','.mjs','.cjs'].includes(extname(absolute)))throw new Error('Nur JS/MJS/CJS-Dateien erlaubt');
    const st=statSync(absolute);
    if(!st.isFile()||st.size>MAX_BYTES)throw new Error('Datei zu groß oder kein reguläres File');
    const name=rel.replaceAll('\\','/'),found=analyzeSource(name,readFileSync(absolute,'utf8'));
    files.push({file:name,bytes:st.size,findings:found.length});findings.push(...found);
  }
  findings.sort((a,b)=>severityOrder[a.severity]-severityOrder[b.severity]||a.file.localeCompare(b.file)||a.line-b.line||a.column-b.column);
  return {version:'2.0-foundation',mode:'read-only',parser:'heuristic',files,findings,total:findings.length,changesApplied:false};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length<3)throw new Error('Aufruf: node eval/genesis/code-analyzer.mjs <file.js> [weitere.js]');
    console.log(JSON.stringify(inspectFiles(process.argv.slice(2)),null,2));
  }catch(error){console.error('GENESIS X CodeAnalyzer: '+error.message);process.exitCode=1;}
}
