/* NERYX GENESIS – Gegenprobe 1.0. Read-only tests of the actual answer engine. */
(() => {
  'use strict';
  const fmt = x => String(x ?? '').toLocaleLowerCase('de').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}]/gu, '');
  // Compare complete word/number sequences, never substring matches (12 != 112).
  const pieces = value => String(value ?? '').toLocaleLowerCase('de')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss')
    .replace(/(\d)[.,](?=\d{3}(?:\D|$))/g,'$1')
    .match(/[\p{L}\p{N}]+/gu) || [];
  function containsValue(answer, expected) {
    const actual = pieces(answer), needed = pieces(expected);
    if (!needed.length || needed.length > actual.length) return false;
    return actual.some((_, i) => i+needed.length<=actual.length &&
      needed.every((word,j)=>word===actual[i+j]));
  }
  const template = {
    definition:s=>[`Was ist ${s}?`,`Erkläre ${s}.`,`Was bedeutet ${s}?`],
    durchmesser:s=>[`Welchen Durchmesser hat ${s}?`,`Wie groß ist der Durchmesser von ${s}?`,`Was ist der Durchmesser von ${s}?`],
    hauptstadt:s=>[`Was ist die Hauptstadt von ${s}?`,`Welche Hauptstadt hat ${s}?`],
    gewicht:s=>[`Wie viel wiegt ${s}?`,`Was ist das Gewicht von ${s}?`],
    lebensraum:s=>[`Wo lebt ${s}?`,`Welchen Lebensraum hat ${s}?`],
    nahrung:s=>[`Was frisst ${s}?`,`Welche Nahrung hat ${s}?`],
    familie:s=>[`Zu welcher Familie gehört ${s}?`,`Was ist die Familie von ${s}?`],
    fellfarbe:s=>[`Welche Fellfarbe hat ${s}?`,`Was ist die Fellfarbe von ${s}?`],
    aussehen:s=>[`Wie sieht ${s} aus?`,`Beschreibe das Aussehen von ${s}.`],
    groesse:s=>[`Wie groß ist ${s}?`,`Welche Größe hat ${s}?`]
  };
  const cleanProperty = p => String(p??'').trim().toLocaleLowerCase('de')
    .replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ä/g,'ae');
  function examine(facts, responder, limit=20) {
    const valid = (Array.isArray(facts)?facts:[]).filter(f =>
      f && typeof f.subject==='string' && typeof f.property==='string' &&
      typeof f.value==='string' && f.subject.trim() && f.value.trim());
    const groups = new Map();
    for (const f of valid) {
      const key = fmt(f.subject)+'|'+fmt(f.property);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    }
    const conflicts = [...groups.values()].filter(group =>
      new Set(group.map(x=>fmt(x.value))).size>1);
    const problems = [], tested = [], seen = new Set();
    for (const f of valid) {
      if (seen.size >= Math.min(50,Math.max(1,Number.isFinite(limit)?Math.floor(limit):20))) break;
      const key = fmt(f.subject)+'|'+fmt(f.property);
      if (seen.has(key)) continue;
      seen.add(key);
      const questions = template[cleanProperty(f.property)]?.(f.subject);
      if (!questions) continue;
      const group = groups.get(key);
      if (group?.some(x=>fmt(x.value)!==fmt(f.value))) {
        problems.push({subject:f.subject,property:f.property,kind:'widerspruch',
          detail:'Unterschiedliche Werte im gespeicherten Wissen'});
        continue;
      }
      for (const question of questions) {
        let answer;
        try {answer=responder(question)?.text || '';}
        catch (e) {answer='';}
        const success = containsValue(answer, f.value);
        tested.push({subject:f.subject,property:f.property,question,success});
        if (!success) problems.push({subject:f.subject,property:f.property,kind:'antwortluecke',question});
      }
    }
    return {facts:valid.length,checked:tested.length,
      passed:tested.filter(x=>x.success).length,conflicts:conflicts.length,
      problems:problems.slice(0,12)};
  }
  function report() {
    const bridge = window.LernBotBridge, ai=window.LernBotAntwortKI;
    if (!bridge?.getFacts || !ai?.answer) return 'GENESIS: Wissensschnittstelle oder Antwort-KI nicht geladen.';
    const facts=bridge.getFacts();
    const r=examine(facts,q=>ai.answer(q,{facts,documents:[],context:{}}));
    const lines=[`NERYX GENESIS · GEGENPROBE 1.0`,
      `Wissenseinträge: ${r.facts}`,`Getestete Fragevarianten: ${r.checked}`,
      `Erfolgreich beantwortet: ${r.passed}/${r.checked}`,
      `Widersprüchliche Fakten-Gruppen: ${r.conflicts}`];
    if (!r.checked) lines.push('Noch keine geeigneten Fakten für Fragevarianten vorhanden.');
    if (!r.problems.length) lines.push('Keine Probleme in den getesteten Varianten erkannt.');
    else {
      lines.push('','LERNCHANCEN (keine automatischen Änderungen):');
      r.problems.forEach((p,i)=>lines.push(`${i+1}. ${p.subject} · ${p.property}: ${p.kind==='widerspruch'?'Widerspruch prüfen':'Frage nicht zuverlässig beantwortet'}${p.question?' – '+p.question:''}`));
    }
    lines.push('','Die Gegenprobe ist ein begrenzter Selbsttest, kein Wahrheitsbeweis.');
    return lines.join('\n');
  }
  window.NERYXGenesis=Object.freeze({version:'1.0',examine,report});
})();
