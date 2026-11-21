import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function lab(){
 const window={};
 const storage={getItem(){throw Error('Speicherzugriff verboten')},setItem(){throw Error('Speicherschreiben verboten')}};
 const context={window,localStorage:storage,fetch(){throw Error('Netzwerk verboten')},document:{getElementById(){throw Error('DOM-Zugriff verboten')}},eval(){throw Error('Codeausführung verboten')}};
 runInNewContext(readFileSync(new URL('../../modules/genesis-x.js',import.meta.url),'utf8'),context);
 return window.NERYXGenesisX;
}
const p=(x,y)=>({x,y});

test('GENESIS X isoliert und liefert zwei kontrollierte Strategien auf Daten',()=>{
 const x=lab();
 const report=x.compare({training:[p(0,1),p(1,4),p(2,9),p(3,16)],holdout:[p(4,25),p(5,36),p(-2,1)]});
 assert.equal(report.status,'candidate');
 assert.equal(report.selected,'quadratisch');
 assert.equal(report.proposals.length,1);
 assert.equal(report.proposals[0].passed,3);
 assert.equal(report.holdoutCount,3);
});
test('GENESIS X wählt einfachere Methode nur bei bestätigter Prüfleistung',()=>{
 const result=lab().compare({training:[p(0,2),p(1,5),p(2,8)],holdout:[p(10,32),p(-3,-7)]});
 assert.equal(result.status,'candidate');
 assert.equal(result.selected,'linear');
 assert.equal(result.proposals.length,2);
});
test('GENESIS X verleiht weder unbekannten Regeln noch fehlerhaften Kandidaten Erfolg',()=>{
 const x=lab();
 assert.equal(x.compare({training:[p(0,1),p(1,4),p(2,9)],holdout:[p(4,123),p(5,36)]}).status,'unconfirmed');
 assert.equal(x.compare({training:[p(0,0),p(1,1),p(2,3),p(3,7)],holdout:[p(4,15),p(5,31)]}).status,'unconfirmed');
});
test('GENESIS X lehnt Leckage und ungültige Eingaben ab',()=>{
 const x=lab();
 const training=[p(0,1),p(1,4),p(2,9)];
 for(const bad of [
  {training,holdout:[p(2,9),p(5,36)]},
  {training:[p(0,1),p(0,1),p(2,9)],holdout:[p(3,16),p(4,25)]},
  {training,holdout:[p(3,Infinity),p(4,25)]},
  {training,holdout:[p(3,16)]}
 ])assert.equal(x.compare(bad).status,'invalid');
});
test('GENESIS X verarbeitet keine Nutzerdaten und ändert keine globalen Speicher',()=>{
 const x=lab();
 assert.equal(x.version,'0.1');
 assert.equal(x.demo().selected,'quadratisch');
 assert.equal(typeof x.install,'undefined');
 assert.equal(typeof x.write,'undefined');
});
