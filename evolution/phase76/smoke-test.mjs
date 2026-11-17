import assert from 'node:assert/strict';
import {safeDb,graph,answer} from './knowledge71.js';
import {episode,initialModel,learn,seriesSeeds} from './rl62.js';
const raw={entries:[{title:'Okapi',excerpt:'Das Okapi ist ein Säugetier in Zentralafrika und gehört zur Giraffenfamilie.',source:'https://de.wikipedia.org/wiki/Okapi'}, {title:'Giraffe',excerpt:'Die Giraffe und das Okapi gehören zur selben Familie.',source:'https://de.wikipedia.org/wiki/Giraffe'}, {title:'Böse Quelle',excerpt:'x',source:'javascript:alert(1)'}],runs:[{time:'2026-11-16'}],discovered_queue:['Kongo']};
const db=safeDb(raw);assert.equal(db.entries.length,2);assert.equal(db.queue.length,1);assert.ok(answer(db,'Was ist ein Okapi?').matches.length);assert.equal(graph(db).edges.length,1);
const seed=seriesSeeds(2027,1,11600000)[0];const base=episode(seed,null,{mode:'base'});assert.ok(base.success);const model=learn(2027,1,initialModel(),240000,'hybrid');const q=episode(seed,model,{mode:'architecture62'});assert.ok(Number.isFinite(q.penalty));console.log('PASS: Wissensimport, Suche, Graph, Basissimulation und Q-Agent');
