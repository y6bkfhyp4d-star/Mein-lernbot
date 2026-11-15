
/* Mein LernBot 6.0 – Antwort-KI 1.1 | lesend, ohne externe API */
(() => {
  'use strict';
  const VERSION = '1.1';
  const norm = value => String(value ?? '').toLocaleLowerCase('de').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const compact = value => norm(value).replace(/\s+/g, '');
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phrase = (q, term) => !!term && new RegExp('(?:^|\\s)' + escapeRegExp(norm(term)) + '(?:$|\\s)').test(q);
  const ALIASES = {
    durchmesser:['durchmesser','diameter'], definition:['definition','bedeutung','beschreibung'],
    lebensraum:['lebensraum','habitat','wo lebt','wo wohnt'],
    nahrung:['nahrung','ernahrung','futter','was frisst','was isst'],
    familie:['familie','tierfamilie','zugehorigkeit'],
    aussehen:['aussehen','erscheinungsbild','optik'],
    fellfarbe:['fellfarbe','fellfarbung','farbe des fells'],
    gewicht:['gewicht','wie viel wiegt','wie schwer'],
    groesse:['grosse','korpergrosse','hohe','korperhohe','wie gross','wie hoch'],
    hauptstadt:['hauptstadt','regierungssitz'],
    entdeckung:['entdeckung','entdeckt'], beschrieben:['beschrieben','erstbeschreibung']
  };
  const canonical = p => {
    const key = compact(String(p).replace(/_/g, ' '));
    for (const [name, terms] of Object.entries(ALIASES)) {
      if (compact(name) === key || terms.some(term => compact(term) === key)) return name;
    }
    return key;
  };
  function propertyRequested(q, property) {
    const key = canonical(property);
    const terms = [key, ...(ALIASES[key] || []), String(property).replace(/_/g,' ')];
    return terms.some(term => {
      const t = norm(term), c = compact(term);
      return phrase(q, t) || (c.length >= 4 && q.split(' ').some(word => word.endsWith(c) && word.length > c.length));
    });
  }
  function isOverview(q) {
    return /^(was weisst du (uber|zu|von)|was ist (alles )?bekannt uber|erzahl (mir )?(etwas |mehr )?uber|gib mir (eine )?ubersicht uber|infos? uber)/.test(q);
  }
  function isDefinition(q) {
    return /^(was|wer) ist\b/.test(q) || /^(was bedeutet|definiere|erklar(e|ung))\b/.test(q);
  }
  function isPersonal(q) {
    return /^(was weisst du (uber|von) mich|was hast du dir uber mich gemerkt|was erinnerst du uber mich)/.test(q);
  }
  function subjectsIn(q, facts) {
    const names = [...new Set(facts.map(f => f.subject))];
    return names.filter(s => phrase(q, s) || q.split(' ').some(w => w === compact(s) + 's' || w === compact(s) + 'es'))
      .sort((a,b) => norm(b).length - norm(a).length);
  }
  function validFact(f) {
    return f && typeof f.subject === 'string' && f.subject.trim() &&
      typeof f.property === 'string' && f.property.trim() &&
      typeof f.value === 'string' && f.value.trim();
  }
  function makeSentence(f) {
    const value = f.value.trim(), p = canonical(f.property), s = f.subject.trim();
    if (p === 'definition') return /[.!?]$/.test(value) ? value : value + '.';
    const prefix = {
      durchmesser: `Der gespeicherte Durchmesser von ${s} beträgt `,
      lebensraum: `${s} lebt laut gespeichertem Wissen in `,
      nahrung: `Zur Nahrung von ${s} gehört `,
      familie: `${s} gehört zur Familie `,
      gewicht: `Das gespeicherte Gewicht von ${s} beträgt `,
      groesse: `Die gespeicherte Größe von ${s} beträgt `,
      fellfarbe: `Die gespeicherte Fellfarbe von ${s} ist `,
      hauptstadt: `Die gespeicherte Hauptstadt von ${s} ist `,
      aussehen: `Zum Aussehen von ${s} ist gespeichert: `,
      beschrieben: `Zur Erstbeschreibung von ${s} ist gespeichert: `,
      entdeckung: `Zur Entdeckung von ${s} ist gespeichert: `
    }[p];
    if (!prefix) return `${s} – ${f.property}: ${value}`;
    return prefix + value + (/[.!?]$/.test(value) ? '' : '.');
  }
  function describe(f) {
    const line = makeSentence(f);
    return f.conflict ? line + '\n⚠ Zu dieser Eigenschaft sind widersprüchliche Angaben gespeichert. Bitte prüfe den Faktenkonflikt.' : line;
  }
  function answer(question, database = {}) {
    const q = norm(question);
    if (!q) return null;
    // Die installierte Gedächtnis-KI soll persönliche Fragen selbst bearbeiten.
    if (isPersonal(q)) return null;
    const facts = (Array.isArray(database.facts) ? database.facts : []).filter(validFact);
    if (!facts.length) return null;
    const context = database.context && typeof database.context === 'object' ? database.context : {};
    const names = subjectsIn(q, facts);
    let subject = names[0] || '';
    const followUp = /\b(er|sie|es|ihm|ihr|dessen|deren|davon|dort)\b/.test(q) || /^(und|wie|welche|welcher|welches|was ist mit)\b/.test(q);
    if (!subject && followUp && context.subject) subject = String(context.subject);
    if (!subject) return null;
    const selected = facts.filter(f => norm(f.subject) === norm(subject));
    if (!selected.length) return null;
    const props = [...new Set(selected.map(f => canonical(f.property)))];
    let requested = props.filter(p => propertyRequested(q, p));
    if (!requested.length && isDefinition(q) && props.includes('definition')) requested = ['definition'];
    // Bei expliziter Frage nach einer nicht vorhandenen Eigenschaft keine anderen Fakten als Antwort ausgeben.
    const knownRequested = Object.keys(ALIASES).filter(p => propertyRequested(q,p));
    if (!requested.length && knownRequested.length && !isOverview(q)) return null;
    if (!requested.length && followUp && context.property && !isOverview(q) && !isDefinition(q)) {
      const last = canonical(context.property);
      if (props.includes(last)) requested = [last];
    }
    if (!requested.length && !isOverview(q) && !isDefinition(q)) return null;
    if (!requested.length && isDefinition(q) && !props.includes('definition')) return null;
    let chosen = requested.length ? selected.filter(f => requested.includes(canonical(f.property))) : selected;
    if (!chosen.length) return null;
    // Keine widersprüchlichen Einträge zusammenführen oder stillschweigend entscheiden.
    const unique = new Map();
    for (const f of chosen) {
      const key = canonical(f.property);
      if (!unique.has(key)) unique.set(key, f);
      else if (norm(unique.get(key).value) !== norm(f.value)) {
        const old = unique.get(key);
        unique.set(key, {...old, conflict: true});
      }
    }
    chosen = [...unique.values()].sort((a,b) => (canonical(a.property)==='definition'?-1:canonical(b.property)==='definition'?1:0));
    const limited = chosen.slice(0, 8);
    const body = limited.map(describe).join('\n\n');
    const suffix = chosen.length > limited.length ? `\n\nWeitere ${chosen.length - limited.length} Eigenschaften sind gespeichert.` : '';
    return {
      text: body + suffix,
      subject: limited[0].subject,
      property: requested.length === 1 ? requested[0] : ''
    };
  }
  window.LernBotAntwortKI = Object.freeze({version: VERSION, answer});
  console.log('LernBot Antwort-KI ' + VERSION + ' geladen');
})();
