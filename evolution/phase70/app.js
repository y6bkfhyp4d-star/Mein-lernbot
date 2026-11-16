'use strict';
const $ = id => document.getElementById(id);
let knowledge = {entries:[], runs:[], discovered_queue:[]};
function dateLabel(value){try{return new Date(value).toLocaleString('de-DE')}catch{return String(value)}}
function make(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(className)el.className=className;return el}
function render(){
 $('nEntries').textContent=knowledge.entries.length;
 $('nRuns').textContent=knowledge.runs.length;
 $('nQueue').textContent=knowledge.discovered_queue.length;
 const q=$('search').value.toLocaleLowerCase('de').trim();
 const list=knowledge.entries.filter(x=>[x.title,x.excerpt].join(' ').toLocaleLowerCase('de').includes(q)).slice().reverse();
 const area=$('entries');area.replaceChildren();
 if(!list.length)area.append(make('p','Keine passenden Einträge vorhanden.'));
 for(const item of list){
   const box=make('article',undefined,'entry');box.append(make('h3',item.title),make('p',item.excerpt));
   const meta=make('div',undefined,'meta');const source=make('a','Quelle: '+(item.source_name||'Wikipedia'));
   if(/^https:\/\/de\.wikipedia\.org\/wiki\//.test(item.source||'')){source.href=item.source;source.target='_blank';source.rel='noopener noreferrer'}
   meta.append(source,make('span',' · '+dateLabel(item.collected_at)+' · Nur eine Quelle; nicht unabhängig geprüft'));
   box.append(meta);area.append(box);
 }
 const runs=$('runs');runs.replaceChildren();
 for(const r of knowledge.runs.slice(-8).reverse())runs.append(make('div',`${dateLabel(r.time)} · versucht ${r.attempted} · neu ${r.added} · Fehler ${r.errors}${r.new_titles?.length?' · '+r.new_titles.join(', '):''}`,'run'));
 if(!knowledge.runs.length)runs.append(make('p','Noch kein automatischer Lernlauf ausgeführt.'));
 $('status').textContent=knowledge.runs.length?`Letzter Lauf: ${dateLabel(knowledge.runs.at(-1).time)}. Quellen-Auszüge sind nicht unabhängig verifiziert.`:'Noch keine Lernläufe. Starte den GitHub-Workflow einmal manuell.';
}
async function load(){ $('status').textContent='Lade Wissensdatenbank …';try{const r=await fetch('./knowledge.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();if(!Array.isArray(d.entries)||!Array.isArray(d.runs)||!Array.isArray(d.discovered_queue))throw new Error('Ungueltige Datenstruktur');knowledge=d;render()}catch(e){ $('status').textContent='Laden fehlgeschlagen: '+e.message+' – prüfe, ob knowledge.json hochgeladen wurde.' }}
$('search').addEventListener('input',render);$('refresh').addEventListener('click',load);
$('copy').addEventListener('click',async()=>{const lines=['LERNBOT 7.0 – PHASE 7.0','Einträge: '+knowledge.entries.length,'Lernläufe: '+knowledge.runs.length,'Warteschlange: '+knowledge.discovered_queue.length,...knowledge.runs.slice(-5).reverse().map(r=>`${r.time}: versucht ${r.attempted}, neu ${r.added}, Fehler ${r.errors}; ${r.new_titles?.join(', ')||'-'}`),'Hinweis: Quellenauszüge, nicht unabhängig verifiziert.'];const report=lines.join('\n');try{await navigator.clipboard.writeText(report);$('copy').textContent='Kopiert!'}catch{const ta=make('textarea',report);document.body.append(ta);ta.select();try{document.execCommand('copy');$('copy').textContent='Kopiert!'}catch{$('copy').textContent='Kopieren fehlgeschlagen'}ta.remove()} });
load();
