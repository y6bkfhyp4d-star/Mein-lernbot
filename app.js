
/* Mein LernBot 6.0 – Paket 2
   Teil 1/3 – Kern und Speicher
   Alle Teile gehören in dieselbe app.js.
*/
(() => {
'use strict';

const $ = id => document.getElementById(id);
const KEY = 'meinLernBot.v1';
const VERSION = 6;
const NAME = 'LernBot 6.0 – Paket 2';

const now = () => Date.now();
const arr = x => Array.isArray(x) ? x : [];
const obj = x =>
  !!x && typeof x === 'object' && !Array.isArray(x);

const safe = (x, n = 20000) =>
  String(x ?? '').trim().slice(0, n);

const uid = () =>
  `LB-${now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const copy = x => {
  try {
    return structuredClone(x);
  } catch {
    return JSON.parse(JSON.stringify(x));
  }
};

const norm = x => safe(x)
  .toLocaleLowerCase('de')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/ß/g, 'ss')
  .replace(/ae/g, 'a')
  .replace(/oe/g, 'o')
  .replace(/ue/g, 'u')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const words = x => norm(x).split(' ').filter(Boolean);

const STOP = new Set(
  'der die das den dem des ein eine einer eines einem ' +
  'und oder ist sind war wie was wer wo wann warum ' +
  'ich du er sie es wir ihr mit von zu im am an auf ' +
  'fur als aber auch sich bitte mir nach uber welche ' +
  'welcher welches welchen hat haben kann kannst ' +
  'wurde wird denn'
    .split(' ')
);

const tokens = x =>
  words(x).filter(w => w.length > 2 && !STOP.has(w));

function sim(a, b) {
  const x = new Set(tokens(a));
  const y = new Set(tokens(b));

  if (!x.size || !y.size) return 0;

  let n = 0;
  for (const t of x) {
    if (y.has(t)) n++;
  }

  return n / Math.max(x.size, y.size);
}

function date(x) {
  const d = new Date(x);
  return isNaN(d)
    ? 'Unbekannt'
    : d.toLocaleString('de-DE');
}

function text(x) {
  if (typeof x === 'string') return x;
  if (x == null) return '';
  if (typeof x === 'object') {
    return JSON.stringify(x, null, 2);
  }
  return String(x);
}

const defaults = {
  version: 6,
  facts: [],
  qa: [],
  classes: [],
  log: [],
  audit: [],
  agentStats: {},
  improvements: [],
  codeProposals: [],
  projects: [],
  tasks: [],
  documents: [],
  relationships: [],
  memory: [],
  snapshots: [],
  settings: {
    autoResearch: true,
    autoLearn: true,
    confirmChanges: true,
    maxHistory: 100
  },
  theme: 'dark'
};

const arrays = [
  'facts',
  'qa',
  'classes',
  'log',
  'audit',
  'improvements',
  'codeProposals',
  'projects',
  'tasks',
  'documents',
  'relationships',
  'memory',
  'snapshots'
];

const BP = KEY + '.sicherung.';

let data = copy(defaults);
let locked = false;
let notices = [];
let pending = null;

let context = {
  subject: '',
  property: '',
  awaiting: null
};

let busy = false;
let started = false;

function backupNames(kind = '') {
  const out = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);

      if (k?.startsWith(BP + kind)) {
        out.push(k);
      }
    }
  } catch {}

  return out.sort((a, b) =>
    Number(a.match(/\d+$/)?.[0] || 0) -
    Number(b.match(/\d+$/)?.[0] || 0)
  );
}

function backup(kind, raw, keep = 0) {
  if (!raw) return null;

  try {
    const old = backupNames(kind + '.')
      .find(k => localStorage.getItem(k) === raw);

    if (old) return old;

    let k = BP + kind + '.' + now();

    while (localStorage.getItem(k) !== null) {
      k += '1';
    }

    localStorage.setItem(k, raw);

    if (keep > 0) {
      const list = backupNames(kind + '.');

      while (list.length > keep) {
        localStorage.removeItem(list.shift());
      }
    }

    return k;
  } catch (e) {
    console.warn('Sicherung fehlgeschlagen', e);
    return null;
  }
}

function prepare(raw) {
  const d = obj(raw) ? raw : {};

  if (Array.isArray(d.memories)) {
    d.memory = arr(d.memory);

    const seen = new Set(
      d.memory.map(x =>
        x?.id || `${x?.type}:${x?.content}`
      )
    );

    for (const x of d.memories) {
      const k =
        x?.id || `${x?.type}:${x?.content}`;

      if (!seen.has(k)) {
        d.memory.push(x);
        seen.add(k);
      }
    }

    delete d.memories;
  }

  for (const [k, v] of Object.entries(defaults)) {
    if (d[k] == null) {
      d[k] = copy(v);
    }
  }

  for (const k of arrays) {
    if (!Array.isArray(d[k])) {
      d[k] = [];
    }
  }

  if (!obj(d.settings)) {
    d.settings = {};
  }

  d.settings = {
    ...defaults.settings,
    ...d.settings
  };

  if (!obj(d.agentStats)) {
    d.agentStats = {};
  }

  if (typeof d.theme !== 'string') {
    d.theme = 'dark';
  }

  d.version = 6;
  return d;
}

try {
  const raw = localStorage.getItem(KEY);

  if (raw) {
    const parsed = JSON.parse(raw);

    if (!obj(parsed)) {
      throw Error('Daten sind kein Objekt');
    }

    if (
      parsed.version !== 6 ||
      Array.isArray(parsed.memories)
    ) {
      const b = backup('vorMigration', raw);

      notices.push(
        b
          ? 'Sicherung vor Migration: ' + b
          : 'Warnung: Sicherung vor Migration fehlgeschlagen.'
      );
    }

    data = prepare(parsed);
  }
} catch (e) {
  locked = true;

  let raw = null;

  try {
    raw = localStorage.getItem(KEY);
  } catch {}

  const b = backup('beschaedigt', raw);

  notices.push(
    'ACHTUNG: Der gespeicherte Datenbestand konnte ' +
    'nicht gelesen werden. Original bleibt unverändert. ' +
    'Speichern ist gesperrt.' +
    (b ? ' Rettungskopie: ' + b : '')
  );

  console.error(e);
}

function status(s) {
  const e = $('status') || $('lb6-status');
  if (e) e.textContent = s;
}

function save() {
  if (locked) {
    status('Speicher gesperrt – nichts wird überschrieben');
    return false;
  }

  try {
    data.version = 6;
    data.log = arr(data.log).slice(-150);
    data.audit = arr(data.audit).slice(-1000);
    data.snapshots = arr(data.snapshots).slice(-30);

    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    status('Speicherfehler – bitte Export versuchen');
    console.error(e);
    return false;
  }
}

function audit(agent, action, detail = '') {
  data.audit.push({
    id: uid(),
    agent,
    action,
    detail: safe(detail, 1000),
    time: now()
  });

  if (data.audit.length > 1000) {
    data.audit = data.audit.slice(-1000);
  }
}

function remember(type, content, meta = {}) {
  content = safe(content, 10000);
  if (!content) return null;

  let x = data.memory.find(i =>
    i.type === type &&
    norm(i.content) === norm(content)
  );

  if (x) {
    x.updated = now();
    x.meta = {
      ...(obj(x.meta) ? x.meta : {}),
      ...meta
    };
  } else {
    x = {
      id: uid(),
      type,
      content,
      meta,
      created: now(),
      updated: now()
    };

    data.memory.push(x);
  }

  save();
  return x;
}

function searchMemory(q, limit = 8) {
  return data.memory
    .map(item => ({
      item,
      score: Math.max(
        sim(q, item.content),
        sim(q, item.type)
      )
    }))
    .filter(x => x.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
}

const clean = x => safe(x, 250)
  .replace(
    /^(?:der|die|das|ein|eine|einen|einem|einer|eines)\s+/i,
    ''
  )
  .replace(/[.!?,;:]+$/, '')
  .trim();

const subj = x => norm(clean(x));

const prop = x => norm(x)
  .replace(/\s+/g, '_')
  .slice(0, 80);

const aliases = {
  familie: [
    'familie',
    'tierfamilie',
    'zugehorigkeit',
    'tierart'
  ],
  lebensraum: [
    'lebensraum',
    'lebensgebiet',
    'wohnort',
    'verbreitung',
    'habitat'
  ],
  nahrung: [
    'nahrung',
    'ernahrung',
    'futter'
  ],
  aussehen: [
    'aussehen',
    'erscheinungsbild',
    'optik'
  ],
  fellfarbe: [
    'fellfarbe',
    'fellfarbung',
    'farbe_des_fells'
  ],
  durchmesser: [
    'durchmesser',
    'diameter'
  ],
  gewicht: [
    'gewicht',
    'masse'
  ],
  groesse: [
    'grosse',
    'korpergrosse',
    'hohe',
    'korperhohe'
  ],
  hauptstadt: [
    'hauptstadt',
    'regierungssitz'
  ],
  definition: [
    'definition',
    'bedeutung',
    'beschreibung',
    'erklarung'
  ],
  entdeckung: [
    'entdeckung',
    'entdeckt'
  ],
  beschrieben: [
    'beschrieben',
    'erstbeschreibung'
  ]
};

function canonical(p) {
  const key = prop(p);

  for (const [k, group] of Object.entries(aliases)) {
    if (group.includes(key)) {
      return k;
    }
  }

  return key;
}

function sameProp(a, b) {
  return canonical(a) === canonical(b);
}

function knownProps() {
  return [
    ...new Set(data.facts.map(x => x.property))
  ].sort();
}

function factsFor(s, p = '') {
  return data.facts.filter(f =>
    subj(f.subject) === subj(s) &&
    (!p || sameProp(f.property, p))
  );
}


function findFact(s,p){
  return factsFor(s,p)[0] || null;
}

function sourceName(x){
  return safe(x,200) || 'unbekannt';
}

function sameValue(a,b){
  return norm(a) === norm(b);
}

function addFact(s,p,v,source='user',options={}){
  s=clean(s);
  p=prop(p);
  v=safe(v,5000);
  if(!s||!p||!v)return null;

  let f=findFact(s,p);
  const t=now();

  if(f){
    f.alternatives=arr(f.alternatives);

    if(!sameValue(f.value,v)){
      if(!f.alternatives.some(a=>sameValue(a.value,f.value))){
        f.alternatives.push({
          value:f.value,
          source:f.source||'unbekannt',
          time:t
        });
      }

      if(!f.alternatives.some(a=>sameValue(a.value,v))){
        f.alternatives.push({value:v,source,time:t});
      }

      if(options.replace){
        f.previous=f.value;
        f.value=v;
        f.source=source;
        f.conflict=false;
        f.resolvedAt=t;
      }else{
        f.conflict=true;
      }
    }

    f.updated=t;
    f.confidence=Number.isFinite(f.confidence)
      ? f.confidence
      : (source==='user'?1:.7);
  }else{
    f={
      id:uid(),
      subject:s,
      property:p,
      value:v,
      source,
      confidence:source==='user'?1:.7,
      conflict:false,
      alternatives:[],
      created:t,
      updated:t
    };
    data.facts.push(f);
  }

  remember('fakt',`${s}: ${p} = ${v}`,{
    subject:s,
    property:p,
    source
  });

  audit(
    'Wissensbank',
    options.replace?'Fakt korrigiert':'Fakt gespeichert',
    `${s}: ${p}`
  );

  save();
  context.subject=s;
  context.property=p;
  return f;
}

function factInfo(f,detail=false){
  let out=`${f.subject} – ${f.property}: ${f.value}`;

  if(f.conflict){
    out+='\n⚠ Unterschiedliche Angaben gespeichert. Mit „Konflikte“ prüfen.';
  }

  if(detail){
    out+=`\nID: ${f.id}`;
    out+=`\nQuelle: ${f.source||'unbekannt'}`;
    out+=`\nVertrauen: ${Math.round((Number(f.confidence)||0)*100)} %`;

    if(arr(f.alternatives).length){
      out+='\nWeitere Angaben: '+
        f.alternatives.map(a=>
          `${a.value} (${a.source||'unbekannt'})`
        ).join('; ');
    }
  }

  return out;
}

function parseFact(s){
  s=safe(s,10000)
    .replace(/^lerne\s*:\s*/i,'')
    .trim();

  if(!s||s.includes('\n')||s.length>400||s.includes('?')){
    return null;
  }

  let m=s.match(
    /^([^:]{1,100})\s*:\s*([^:=–—-]{1,90})\s*(?:=|–|—|\s-\s)\s*(.{1,5000})$/
  );

  if(m){
    return {
      subject:clean(m[1]),
      property:prop(m[2]),
      value:m[3].trim()
    };
  }

  const rules=[
    [
      /^die hauptstadt von (.+?) ist (.+?)[.!]?$/i,
      'hauptstadt',1,2
    ],
    [
      /^(.+?) hat (?:die )?hauptstadt (.+?)[.!]?$/i,
      'hauptstadt',1,2
    ],
    [
      /^(.+?) (?:lebt|wohnt) (?:in|im|am|auf|unter) (.+?)[.!]?$/i,
      'lebensraum',1,2
    ],
    [
      /^(.+?) (?:frisst|isst|ernährt sich von) (.+?)[.!]?$/i,
      'nahrung',1,2
    ],
    [
      /^(.+?) gehört zu (.+?)[.!]?$/i,
      'zugehoerigkeit',1,2
    ],
    [
      /^(.+?) ist (?:ein|eine|einer|eines) (.+?)[.!]?$/i,
      'definition',1,2
    ],
    [
      /^(.+?) (?:heißt|bedeutet) (.+?)[.!]?$/i,
      'definition',1,2
    ]
  ];

  for(const [re,p,a,b] of rules){
    m=s.match(re);

    if(m&&clean(m[a]).split(' ').length<=5){
      return {
        subject:clean(m[a]),
        property:p,
        value:m[b].replace(/[.!]$/,'').trim()
      };
    }
  }

  return null;
}

function learnLong(s){
  const sentences=s.replace(/\r/g,'')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(x=>x.trim())
    .filter(Boolean);

  const extracted=[];
  let last='';

  for(const sentence of sentences){
    const f=parseFact(sentence);

    if(
      f&&
      f.subject.length<90&&
      f.subject.split(' ').length<=5
    ){
      if(
        /^(er|sie|es|dieser|diese|dieses)$/i.test(f.subject)&&
        last
      ){
        f.subject=last;
      }else if(
        !/^(er|sie|es|dieser|diese|dieses)$/i.test(f.subject)
      ){
        last=f.subject;
      }

      extracted.push(f);
    }
  }

  return extracted;
}

function importDocumentText(
  content,
  title='Importiertes Dokument',
  type='import',
  meta={}
){
  content=safe(content,1000000);
  title=safe(title,250)||'Importiertes Dokument';

  if(!content)return'Dokument ist leer.';

  let d=data.documents.find(x=>
    norm(x.title)===norm(title)&&
    x.content===content
  );

  if(d)return'Dokument bereits vorhanden. ID: '+d.id;

  d={
    id:uid(),
    title,
    type,
    content,
    length:content.length,
    created:now(),
    updated:now(),
    ...meta
  };

  data.documents.push(d);

  remember('dokument','Dokument importiert: '+title,{
    documentId:d.id,
    type
  });

  audit('Dokumenten-KI','Dokument importiert',title);
  save();

  return'Dokument gespeichert: '+title+'\nID: '+d.id;
}

function learn(s){
  s=safe(s,100000);

  if(!s)return'Bitte Lerninhalt angeben.';

  const isLong=
    s.length>400||
    s.includes('\n')||
    s.split(/[.!?]\s+/).length>2;

  const found=isLong
    ? learnLong(s)
    : (parseFact(s)?[parseFact(s)]:[]);

  let added=0;
  let conflicts=0;

  for(const f of found){
    const old=findFact(f.subject,f.property);
    const conflict=old&&!sameValue(old.value,f.value);

    addFact(f.subject,f.property,f.value,'user');
    added++;

    if(conflict)conflicts++;
  }

  const document=importDocumentText(
    s,
    'Lerninhalt: '+s.slice(0,75),
    'learned-text'
  );

  return [
    added
      ? `${added} Fakt(en) erkannt und verarbeitet.`
      : 'Text als Dokument gespeichert. Keine eindeutig erkennbaren Fakten automatisch übernommen.',
    conflicts
      ? `${conflicts} abweichende Angabe(n) zur Prüfung vorgemerkt.`
      : '',
    document,
    'Bei längeren Texten werden unklare Sätze bewusst nicht als Fakten geraten.'
  ].filter(Boolean).join('\n');
}

function listFacts(){
  if(!data.facts.length){
    return'Mein Wissensspeicher ist noch leer.';
  }

  const groups=new Map();

  for(const f of data.facts){
    if(!groups.has(f.subject)){
      groups.set(f.subject,[]);
    }
    groups.get(f.subject).push(f);
  }

  let out='MEIN LANGZEITWISSEN\n';

  for(const [s,fs] of groups){
    out+='\n'+s+'\n'+fs.map(f=>
      '• '+f.property+': '+f.value+
      (f.conflict?' [Konflikt]':'')
    ).join('\n')+'\n';
  }

  return out+
    `\nGesamt: ${data.facts.length} Fakten | `+
    `${data.memory.length} Erinnerungen | `+
    `${data.relationships.length} Verbindungen`;
}

function containsPhrase(q,p){
  return (' '+q+' ').includes(' '+p+' ');
}

function subjectIn(q,s){
  const k=subj(s);
  return containsPhrase(q,k)||
    containsPhrase(q,k+'s')||
    containsPhrase(q,k+'es');
}

function propertyIn(q,p){
  const keys=[
    canonical(p),
    prop(p),
    ...arr(aliases[canonical(p)])
  ].map(x=>x.replace(/_/g,' '));

  return keys.some(k=>
    containsPhrase(q,k)||
    q.split(' ').some(w=>
      w.endsWith(k.replace(/ /g,''))&&
      w.length>k.length+1
    )
  );
}

function parseQuestion(q){
  const n=norm(q);
  let m;

  const patterns=[
    [
      /^welche[rns]? (.+?) (?:hat|besitzt) (?:der |die |das |ein |eine )?(.+)$/,
      'ps'
    ],
    [
      /^(?:was ist|was betragt|wie lautet|nenne|nenn|zeige|gib mir) (?:der |die |das |den )?(.+?) (?:von|vom|des|der|dem) (?:der |die |das )?(.+)$/,
      'ps'
    ],
    [
      /^(?:wo lebt|wo wohnt) (?:der |die |das )?(.+)$/,
      's:lebensraum'
    ],
    [
      /^(?:was frisst|was isst) (?:der |die |das )?(.+)$/,
      's:nahrung'
    ],
    [
      /^zu welcher (?:familie|tierart) gehort (?:der |die |das )?(.+)$/,
      's:familie'
    ],
    [
      /^(?:was ist|was bedeutet|wer ist|erklare) (.+)$/,
      's:definition'
    ]
  ];

  for(const [re,mode] of patterns){
    m=n.match(re);

    if(m){
      if(mode==='ps'){
        return {
          subject:clean(m[2]),
          property:canonical(m[1])
        };
      }

      return {
        subject:clean(m[1]),
        property:mode.split(':')[1]
      };
    }
  }

  return null;
}

function question(q){
  const n=norm(q);
  let parsed=parseQuestion(q);
  let matches=[];

  if(parsed){
    matches=factsFor(parsed.subject,parsed.property);

    if(
      !matches.length&&
      /^(er|sie|es|ihm|ihr|davon|dessen|deren)$/.test(subj(parsed.subject))&&
      context.subject
    ){
      matches=factsFor(context.subject,parsed.property);
    }
  }

  if(!matches.length){
    matches=data.facts.filter(f=>
      subjectIn(n,f.subject)&&
      propertyIn(n,f.property)
    );

    if(!matches.length){
      for(const f of data.facts){
        const s=subj(f.subject).replace(/ /g,'');

        const ps=[
          canonical(f.property),
          prop(f.property),
          ...arr(aliases[canonical(f.property)])
        ].map(p=>p.replace(/_/g,''));

        if(n.split(' ').some(w=>
          ps.some(p=>
            w===s+p||
            w===s+'s'+p||
            w===s+'es'+p
          )
        )){
          matches.push(f);
        }
      }
    }
  }

  if(!matches.length&&context.subject){
    const props=knownProps().filter(p=>propertyIn(n,p));

    if(props.length===1){
      matches=factsFor(context.subject,props[0]);
    }else if(
      /^(?:und |wie |was |welche |welcher |welches |wie viel |wie gross |wie groß )/.test(n)&&
      context.property&&
      /\b(er|sie|es|davon|dessen|diese|dieser)\b/.test(n)
    ){
      matches=factsFor(context.subject,context.property);
    }
  }

  if(matches.length===1){
    const f=matches[0];

    context.subject=f.subject;
    context.property=f.property;

    return f.conflict
      ? factInfo(f,true)
      : f.value;
  }

  if(matches.length>1){
    const subjects=[
      ...new Set(matches.map(f=>f.subject))
    ];

    const properties=[
      ...new Set(matches.map(f=>canonical(f.property)))
    ];

    if(subjects.length>1&&properties.length===1){
      context.awaiting={
        type:'subject',
        choices:subjects,
        property:properties[0]
      };

      return'Welches Thema meinst du? '+
        subjects.map((s,i)=>`${i+1}. ${s}`).join(' | ');
    }

    return matches.slice(0,10)
      .map(f=>factInfo(f))
      .join('\n');
  }

  return null;
}

function clarify(s){
  if(!context.awaiting)return null;

  const a=context.awaiting;
  const n=norm(s);

  let selected=a.choices.find(x=>subj(x)===n);

  if(!selected&&/^\d+$/.test(n)){
    selected=a.choices[Number(n)-1];
  }

  if(!selected)return null;

  context.awaiting=null;

  return question(
    'Was ist '+a.property+' von '+selected+'?'
  )||'Dazu habe ich keinen passenden Fakt.';
}

function related(q,limit=10){
  return data.facts
    .map(f=>({
      f,
      score:Math.max(
        sim(q,f.subject),
        sim(q,f.value),
        sim(q,f.property)
      )
    }))
    .filter(x=>x.score>.05)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit)
    .map(x=>x.f);
}

function explain(q){
  const fs=factsFor(q);
  const found=fs.length?fs:related(q,8);

  return found.length
    ? 'GESPEICHERTES WISSEN\n'+
      found.map(f=>'• '+factInfo(f)).join('\n')
    : `Zu „${q}“ habe ich noch keine passenden Fakten.`;
}

function graph(from,relation,to){
  from=clean(from);
  to=clean(to);
  relation=safe(relation,100);

  if(!from||!to||!relation)return false;

  if(!data.relationships.some(r=>
    subj(r.from)===subj(from)&&
    subj(r.to)===subj(to)&&
    norm(r.relation)===norm(relation)
  )){
    data.relationships.push({
      id:uid(),
      from,
      relation,
      to,
      created:now()
    });
  }

  save();
  return true;
}

function graphReport(q){
  const fs=data.relationships.filter(r=>
    subj(r.from)===subj(q)||
    subj(r.to)===subj(q)
  );

  return fs.length
    ? fs.map(r=>
        `${r.from} —${r.relation}→ ${r.to}`
      ).join('\n')
    : 'Keine Wissensverbindungen zu '+q;
}

function analyze(q=''){
  const fs=q?related(q,10000):data.facts;
  const conflicts=fs.filter(f=>f.conflict);

  return `WISSENSANALYSE
Fakten: ${fs.length}
Erinnerungen: ${data.memory.length}
Dokumente: ${data.documents.length}
Verbindungen: ${data.relationships.length}
Konflikte: ${conflicts.length}`+
    (
      conflicts.length
        ? '\n\n'+conflicts.map(f=>
            factInfo(f,true)
          ).join('\n\n')
        : ''
    );
}

function conflictList(){
  const fs=data.facts.filter(f=>f.conflict);

  return fs.length
    ? 'OFFENE KONFLIKTE\n\n'+
      fs.map(f=>factInfo(f,true)).join('\n\n')
    : 'Keine offenen Faktenkonflikte.';
}

function editFact(s){
  const m=s.match(
    /^(.+?)\s*:\s*(.+?)\s*(?:=|–|—|\s-\s)\s*(.+)$/
  );

  if(!m){
    return'Format: Fakt korrigieren: Thema: Eigenschaft = neuer Wert';
  }

  const old=findFact(m[1],m[2]);

  if(!old){
    return'Kein vorhandener Fakt gefunden. Zum Hinzufügen nutze „Lerne: ...“.';
  }

  pending={
    type:'edit',
    id:old.id,
    value:safe(m[3],5000)
  };

  return `Fakt ändern?
Alt: ${factInfo(old)}
Neu: ${pending.value}
Bestätige mit „Änderung bestätigen“ oder „Änderung abbrechen“.`;
}

function deleteFact(s){
  let f=data.facts.find(x=>x.id===safe(s));

  if(!f){
    const m=s.match(/^(.+?)\s*:\s*(.+)$/);
    if(m)f=findFact(m[1],m[2]);
  }

  if(!f){
    return'Fakt nicht gefunden. Format: Fakt löschen: Thema: Eigenschaft';
  }

  pending={
    type:'deleteFact',
    id:f.id
  };

  return `Diesen Fakt löschen?
${factInfo(f,true)}
Schreibe „Änderung bestätigen“ oder „Änderung abbrechen“.`;
}

function forget(s){
  const n=norm(s);

  const fs=data.memory.filter(x=>
    x.id?.toLowerCase()===s.toLowerCase()||
    (n.length>=3&&norm(x.content).includes(n))
  );

  if(!fs.length){
    return'Keine passende Erinnerung gefunden (mindestens 3 Zeichen oder genaue ID).';
  }

  if(fs.length>5){
    return `${fs.length} Treffer – bitte präziser suchen oder genaue ID nutzen.`;
  }

  pending={
    type:'forget',
    ids:fs.map(x=>x.id)
  };

  return `Diese ${fs.length} Erinnerung(en) löschen?
${fs.map(x=>
  `${x.content}\nID: ${x.id}`
).join('\n\n')}
Schreibe „Vergiss bestätigen“ oder „Vergiss abbrechen“.`;
}

function confirmChange(){
  if(!pending){
    return'Keine Änderung wartet auf Bestätigung.';
  }

  const p=pending;
  pending=null;

  if(locked){
    return'Speicher ist gesperrt. Keine Änderung ausgeführt.';
  }

  const b=backup(
    'vorAenderung',
    JSON.stringify({...data,snapshots:[]}),
    3
  );

  if(!b){
    return'Abgebrochen: Sicherheitskopie konnte nicht erstellt werden.';
  }

  if(p.type==='edit'){
    const f=data.facts.find(x=>x.id===p.id);

    if(!f)return'Fakt nicht mehr vorhanden.';

    addFact(
      f.subject,
      f.property,
      p.value,
      'user',
      {replace:true}
    );

    return'Fakt korrigiert: '+factInfo(f);
  }

  if(p.type==='deleteFact'){
    const f=data.facts.find(x=>x.id===p.id);

    if(!f)return'Fakt nicht mehr vorhanden.';

    data.facts=data.facts.filter(x=>x.id!==p.id);

    audit('Wissensbank','Fakt gelöscht',f.id);
    save();

    return'Fakt gelöscht: '+factInfo(f);
  }

  if(p.type==='forget'){
    const n=data.memory.length;

    data.memory=data.memory.filter(x=>
      !p.ids.includes(x.id)
    );

    audit(
      'Gedächtnis-KI',
      'Erinnerungen gelöscht',
      String(n-data.memory.length)
    );

    save();

    return `${n-data.memory.length} Erinnerung(en) gelöscht.`;
  }

  return'Unbekannte Änderung.';
}

function docs(q=''){
  if(!q){
    return data.documents.length
      ? data.documents.map((d,i)=>
          `${i+1}. ${d.title}\nID: ${d.id}\nTyp: ${d.type}`
        ).join('\n\n')
      : 'Keine Dokumente vorhanden.';
  }

  const scored=data.documents
    .map(d=>({
      d,
      s:Math.max(
        sim(q,d.title),
        sim(q,d.content||'')
      )
    }))
    .filter(x=>x.s>.03)
    .sort((a,b)=>b.s-a.s)
    .slice(0,8);

  return scored.length
    ? scored.map(x=>
        `${x.d.title}\nID: ${x.d.id}\n${safe(x.d.content,350)}`
      ).join('\n\n')
    : 'Keine passenden Dokumente.';
}

function docAnswer(q){
  const query=new Set(tokens(q));
  const scored=[];

  for(const d of data.documents){
    const sentences=safe(d.content,100000)
      .replace(/\s+/g,' ')
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];

    for(const sentence of sentences){
      const score=tokens(sentence)
        .filter(w=>query.has(w)).length;

      if(score>0){
        scored.push({
          d,
          sentence:sentence.trim(),
          score
        });
      }
    }
  }

  scored.sort((a,b)=>b.score-a.score);

  return scored.length
    ? 'IN GESPEICHERTEN DOKUMENTEN:\n'+
      scored.slice(0,4).map(x=>
        `• ${x.sentence}\nQuelle: ${x.d.title}`
      ).join('\n\n')
    : null;
}

function summarize(s){
  const d=data.documents.find(x=>
    x.id===s||
    norm(x.title)===norm(s)
  );

  if(!d){
    return'Dokument nicht gefunden.\n'+docs();
  }

  const sentences=safe(d.content,100000)
    .replace(/\s+/g,' ')
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];

  const step=Math.max(
    1,
    Math.ceil(sentences.length/8)
  );

  return 'ZUSAMMENFASSUNG (Auswahl, keine echte KI-Zusammenfassung)\n'+
    sentences
      .filter((_,i)=>i%step===0)
      .slice(0,8)
      .map(x=>'• '+x.trim())
      .join('\n');
}

function project(s){
  const x={
    id:uid(),
    title:safe(s,250),
    description:'',
    created:now(),
    updated:now(),
    status:'offen'
  };

  data.projects.push(x);
  save();

  return'Projekt erstellt: '+x.title+'\nID: '+x.id;
}

function projects(){
  return data.projects.length
    ? data.projects.map(x=>
        `${x.title} | ${x.status||'offen'} | ${x.id}`
      ).join('\n')
    : 'Keine Projekte.';
}

function task(s){
  const x={
    id:uid(),
    title:safe(s,500),
    projectId:'',
    done:false,
    created:now(),
    completed:null
  };

  data.tasks.push(x);
  save();

  return'Aufgabe erstellt: '+x.title+'\nID: '+x.id;
}

function tasks(){
  return data.tasks.length
    ? data.tasks.map(x=>
        `${x.done?'✓':'○'} ${x.title} | ${x.id}`
      ).join('\n')
    : 'Keine Aufgaben.';
}

function taskDone(s){
  const x=data.tasks.find(x=>x.id===s);

  if(!x){
    return'Aufgabe nicht gefunden.';
  }

  x.done=true;
  x.completed=now();
  save();

  return'Aufgabe erledigt: '+x.title;
}

/* =====================================================
   LERNBOT 6.0 – PAKET 2
   TEIL 3/3 – SICHERUNGEN, AGENTEN, CHAT UND START
   ===================================================== */

function snapshot() {
  const state = copy(data);
  state.snapshots = [];

  const x = {
    id: uid(),
    label: 'Manuelle Sicherung',
    created: now(),
    data: state
  };

  data.snapshots.push(x);
  save();

  return 'Sicherung erstellt. ID: ' + x.id;
}

function snapshots() {
  return data.snapshots.length
    ? data.snapshots.map(x =>
        `${x.label} | ${date(x.created)} | ${x.id}`
      ).join('\n')
    : 'Keine Sicherungen.';
}

function restoreObject(objData, label) {
  if (locked) {
    return 'Speicher gesperrt – Original wird nicht überschrieben.';
  }

  const b = backup(
    'vorRestore',
    JSON.stringify({...data, snapshots: []}),
    2
  );

  if (!b) {
    return 'Abgebrochen: Sicherung des aktuellen Standes fehlgeschlagen.';
  }

  const old = copy(data);
  data = prepare(copy(objData));

  if (!data.snapshots.length) {
    data.snapshots = old.snapshots;
  }

  audit('System', 'Wiederherstellung', label);

  if (!save()) {
    data = old;
    return 'Wiederherstellung fehlgeschlagen. Alter Stand bleibt im Arbeitsspeicher.';
  }

  return 'Wiederhergestellt. Vorheriger Stand gesichert unter ' + b;
}

function restoreSnapshot(s) {
  const x = data.snapshots.find(x => x.id === s);

  return x && obj(x.data)
    ? restoreObject(x.data, x.label)
    : 'Sicherung nicht gefunden.';
}

function autoList() {
  const names = backupNames();

  return names.length
    ? 'AUTO-SICHERUNGEN\n' +
      names.map((k, i) =>
        `${i + 1}. ${k}`
      ).join('\n') +
      '\nExport: Auto-Sicherung exportieren: NUMMER' +
      '\nRestore: Auto-Sicherung wiederherstellen: NUMMER'
    : 'Keine Auto-Sicherungen.';
}

function autoResolve(s) {
  const names = backupNames();

  return /^\d+$/.test(s)
    ? names[Number(s) - 1]
    : names.includes(s) ? s : null;
}

function autoRestore(s) {
  const k = autoResolve(s);

  if (!k) return 'Sicherung nicht gefunden.';

  try {
    const d = JSON.parse(localStorage.getItem(k));

    if (!obj(d)) {
      throw Error('Kein Datenobjekt');
    }

    return restoreObject(d, k);
  } catch (e) {
    return 'Wiederherstellung nicht möglich: ' + e.message;
  }
}

function download(
  filename,
  content,
  mime = 'application/json;charset=utf-8'
) {
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function exportData() {
  download(
    'LernBot-Paket2-' +
      new Date().toISOString().slice(0, 10) +
      '.json',
    JSON.stringify({
      ...data,
      application: NAME,
      exportedAt: now()
    }, null, 2)
  );

  return locked
    ? 'Export gestartet. ACHTUNG: Originalspeicher ist gesperrt.'
    : 'Datenexport gestartet.';
}

function autoExport(s) {
  const k = autoResolve(s);

  if (!k) return 'Sicherung nicht gefunden.';

  const raw = localStorage.getItem(k);

  if (!raw) return 'Sicherung nicht lesbar.';

  download(
    'LernBot-Auto-Sicherung-' + now() + '.json',
    raw
  );

  return 'Download gestartet.';
}

const IMPORT_AREAS = [
  'facts',
  'qa',
  'classes',
  'log',
  'audit',
  'improvements',
  'codeProposals',
  'projects',
  'tasks',
  'documents',
  'relationships',
  'memory',
  'snapshots'
];

function importData(input) {
  let incoming;

  try {
    incoming = typeof input === 'string'
      ? JSON.parse(input)
      : copy(input);
  } catch {
    return 'Ungültiges JSON.';
  }

  if (!obj(incoming)) {
    return 'Kein gültiges Datenobjekt.';
  }

  if (
    !Array.isArray(incoming.memory) &&
    Array.isArray(incoming.memories)
  ) {
    incoming.memory = incoming.memories;
  }

  if (
    !IMPORT_AREAS.some(k => Array.isArray(incoming[k])) &&
    !obj(incoming.agentStats)
  ) {
    return 'Keine bekannten LernBot-Daten.';
  }

  if (locked) {
    return 'Speicher gesperrt. Import wird nicht gespeichert.';
  }

  const b = backup(
    'vorImport',
    JSON.stringify({...data, snapshots: []}),
    2
  );

  if (!b) {
    return 'Import abgebrochen: Sicherung konnte nicht angelegt werden.';
  }

  const old = copy(data);
  let added = 0;
  let conflicts = 0;

  try {
    for (const f of arr(incoming.facts)) {
      if (
        !obj(f) ||
        typeof f.subject !== 'string' ||
        typeof f.property !== 'string' ||
        typeof f.value !== 'string'
      ) continue;

      const current = findFact(f.subject, f.property);

      if (!current) {
        data.facts.push(copy(f));
        added++;
      } else if (!sameValue(current.value, f.value)) {
        current.alternatives = arr(current.alternatives);

        if (!current.alternatives.some(x =>
          sameValue(x.value, f.value)
        )) {
          current.alternatives.push({
            value: f.value,
            source: f.source || 'import',
            time: now()
          });
        }

        current.conflict = true;
        conflicts++;
      }
    }

    for (const area of IMPORT_AREAS.filter(k => k !== 'facts')) {
      const target = data[area];

      for (const item of arr(incoming[area])) {
        if (!obj(item)) continue;

        if (
          area === 'memory' &&
          !(
            typeof item.type === 'string' &&
            typeof item.content === 'string'
          )
        ) continue;

        if (
          area === 'relationships' &&
          !(
            typeof item.from === 'string' &&
            typeof item.to === 'string' &&
            typeof item.relation === 'string'
          )
        ) continue;

        const duplicate = target.some(x =>
          (item.id && x.id === item.id) ||
          (
            area === 'memory' &&
            x.type === item.type &&
            norm(x.content) === norm(item.content)
          ) ||
          (
            area === 'documents' &&
            x.title === item.title &&
            x.content === item.content
          )
        );

        if (!duplicate) {
          target.push(copy(item));
          added++;
        }
      }
    }

    if (obj(incoming.agentStats)) {
      for (const [k, v] of Object.entries(incoming.agentStats)) {
        data.agentStats[k] = Math.max(
          Number(data.agentStats[k]) || 0,
          Number(v) || 0
        );
      }
    }

    audit('System', 'Import', 'ergänzend');

    if (!save()) {
      throw Error('Speichern fehlgeschlagen');
    }

    return `Import abgeschlossen. ${added} neue Einträge, ${conflicts} Faktenkonflikte. Vorheriger Stand: ${b}`;
  } catch (e) {
    data = old;
    return 'Import abgebrochen: ' + e.message;
  }
}

/* =====================================================
   RECHERCHE
   ===================================================== */

async function fetchJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const r = await fetch(url, {
      headers: {Accept: 'application/json'},
      signal: controller.signal
    });

    if (!r.ok) throw Error('HTTP ' + r.status);

    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function research(q) {
  q = safe(q, 500);

  if (!q) return 'Bitte Thema angeben.';

  const requests = [
    async () => {
      const x = await fetchJSON(
        'https://de.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(q)
      );

      return x?.extract ? {
        source: 'Wikipedia',
        title: x.title || q,
        content: x.extract,
        url: x.content_urls?.desktop?.page || ''
      } : null;
    },

    async () => {
      const x = await fetchJSON(
        'https://www.wikidata.org/w/api.php?' +
        'action=wbsearchentities&search=' +
        encodeURIComponent(q) +
        '&language=de&format=json&origin=*'
      );

      const y = arr(x.search)[0];

      return y ? {
        source: 'Wikidata',
        title: y.label || q,
        content: y.description || '',
        url: y.concepturi || ''
      } : null;
    },

    async () => {
      const x = await fetchJSON(
        'https://openlibrary.org/search.json?q=' +
        encodeURIComponent(q) +
        '&limit=5'
      );

      return arr(x.docs).length ? {
        source: 'Open Library',
        title: 'Bücher zu ' + q,
        content: x.docs.slice(0, 5).map(d =>
          `${d.title} (${arr(d.author_name).join(', ')})`
        ).join('\n'),
        url: 'https://openlibrary.org/search?q=' +
          encodeURIComponent(q)
      } : null;
    }
  ];

  const results = await Promise.allSettled(
    requests.map(fn => fn())
  );

  const rs = results
    .filter(x => x.status === 'fulfilled' && x.value)
    .map(x => x.value);

  if (!rs.length) {
    return 'Keine externen Ergebnisse abrufbar. Prüfe Internetverbindung oder Browser-Zugriff.';
  }

  for (const r of rs) {
    importDocumentText(
      r.content + '\nQuelle: ' + r.url,
      r.title,
      'research',
      {source: r.source, url: r.url}
    );
  }

  return 'RECHERCHEERGEBNISSE\n\n' +
    rs.map(r =>
      `${r.source}: ${r.title}\n${r.content}\n${r.url}`
    ).join('\n\n') +
    '\n\nAls Dokumente gespeichert. Externe Angaben bitte prüfen.';
}

/* =====================================================
   CODE-KI UND AGENTEN
   ===================================================== */

function inspectCode(code) {
  code = safe(code, 100000);

  if (!code) return 'Bitte Quellcode angeben.';

  const warnings = [];

  const rules = [
    [/\beval\s*\(/, 'eval() gefunden'],
    [/\.innerHTML\s*=/, 'innerHTML-Zuweisung: XSS-Risiko'],
    [/localStorage\.clear\s*\(/, 'localStorage.clear() löscht lokale Daten'],
    [/document\.write\s*\(/, 'document.write() gefunden'],
    [/\bTODO\b|\bFIXME\b/, 'TODO/FIXME gefunden']
  ];

  for (const [re, msg] of rules) {
    if (re.test(code)) {
      warnings.push('• ' + msg);
    }
  }

  return `CODE-PRÜFUNG
Zeilen: ${code.split('\n').length}
${warnings.join('\n') || 'Keine einfachen Musterwarnungen.'}

Hinweis: Keine vollständige Syntax- oder Sicherheitsprüfung.`;
}

function agents() {
  const names = [
    'Lern-KI',
    'Analyse-KI',
    'Recherche-KI',
    'Gedächtnis-KI',
    'Projekt-KI',
    'Dokumenten-KI',
    'Code-KI',
    'Antwort-KI',
    'Meta-KI'
  ];

  return 'KI-AGENTEN\n' +
    names.map(x => '• ' + x).join('\n') +
    '\nRegelbasierte Module, kein lokal installiertes Sprachmodell.';
}

function help() {
  return `LERNBOT 6.0 – PAKET 2

Lerne: Mars: Durchmesser – 6.779 Kilometer
Lerne: [längerer Text]
Wissen: Mars
Erkläre: Mars
Wissensübersicht
Wissensanalyse
Analysiere: Mars
Konflikte
Fakt anzeigen: Mars: Durchmesser
Fakt korrigieren: Mars: Durchmesser = 6.780 Kilometer
Fakt löschen: Mars: Durchmesser
Änderung bestätigen
Änderung abbrechen
Verbinde: Mars: ist ein: Planet
Wissensgraph: Mars
Merke dir: ...
Erinnerungen
Vergiss: ...
Vergiss bestätigen
Vergiss abbrechen
Recherchiere: Mars
Dokumente
Dokument suchen: ...
Dokument zusammenfassen: ID
Projekt erstellen: ...
Projekte
Aufgabe erstellen: ...
Aufgaben
Aufgabe erledigt: ID
Agenten
Sicherung erstellen
Sicherungen
Sicherung wiederherstellen: ID
Auto-Sicherungen
Auto-Sicherung exportieren: NUMMER
Auto-Sicherung wiederherstellen: NUMMER
Export
Code prüfen: ...

Normale Fragen und kurze Rückfragen zum letzten Thema sind möglich.`;
}

function command(s, prefix) {
  const i = s.indexOf(':');

  return i >= 0 &&
    norm(s.slice(0, i)) === norm(prefix)
    ? s.slice(i + 1).trim()
    : null;
}

function knowledge(q) {
  const direct = question(q);

  if (direct) return direct;

  const fs = factsFor(q);

  if (fs.length) {
    return fs.map(f => factInfo(f)).join('\n');
  }

  const d = docAnswer(q);

  if (d) return d;

  const r = related(q, 5);

  return r.length
    ? 'VERWANDTES WISSEN\n' +
      r.map(f => '• ' + factInfo(f)).join('\n')
    : `Zu „${q}“ habe ich noch keine passenden Informationen gespeichert.`;
}

/* =====================================================
   ZENTRALE BEFEHLSVERARBEITUNG
   ===================================================== */

async function handle(input) {
  const s = safe(input, 100000);
  const n = norm(s);

  if (!s) return 'Bitte Nachricht eingeben.';

  let v;

  if (
    (pending?.type === 'forget' && n === 'vergiss bestatigen') ||
    n === 'anderung bestatigen'
  ) {
    return confirmChange();
  }

  if (
    n === 'vergiss abbrechen' ||
    n === 'anderung abbrechen'
  ) {
    pending = null;
    return 'Änderung abgebrochen.';
  }

  if (context.awaiting) {
    const answer = clarify(s);

    if (answer) return answer;

    context.awaiting = null;
  }

  if (n === 'hilfe' || n === 'befehle') {
    return help();
  }

  if (['hi', 'hallo', 'hey', 'guten tag'].includes(n)) {
    return 'Hallo! Ich bin ' + NAME + '.';
  }

  if ((v = command(s, 'Lerne')) !== null) {
    return learn(v);
  }

  if (
    (v = command(s, 'Merke dir')) !== null ||
    (v = command(s, 'Merke')) !== null
  ) {
    const x = remember('notiz', v);

    return x
      ? 'Erinnerung gespeichert. ID: ' + x.id
      : 'Bitte Inhalt angeben.';
  }

  if (
    n === 'erinnerungen' ||
    n === 'zeige erinnerungen'
  ) {
    return data.memory.length
      ? data.memory.map((x, i) =>
          `${i + 1}. ${x.content}
ID: ${x.id}
Typ: ${x.type}
Erstellt: ${date(x.created)}`
        ).join('\n\n')
      : 'Keine Erinnerungen.';
  }

  if ((v = command(s, 'Vergiss')) !== null) {
    return forget(v);
  }

  if (
    n === 'wissensubersicht' ||
    n === 'was weisst du'
  ) {
    return listFacts();
  }

  if (n === 'wissensanalyse') {
    return analyze();
  }

  if (n === 'konflikte') {
    return conflictList();
  }

  if ((v = command(s, 'Fakt anzeigen')) !== null) {
    const m = v.match(/^(.+?)\s*:\s*(.+)$/);
    const f = m && findFact(m[1], m[2]);

    return f
      ? factInfo(f, true)
      : 'Fakt nicht gefunden. Format: Fakt anzeigen: Thema: Eigenschaft';
  }

  if ((v = command(s, 'Fakt korrigieren')) !== null) {
    return editFact(v);
  }

  if ((v = command(s, 'Fakt löschen')) !== null) {
    return deleteFact(v);
  }

  if ((v = command(s, 'Verbinde')) !== null) {
    const m = v.match(/^(.+?)\s*:\s*(.+?)\s*:\s*(.+)$/);

    return m && graph(m[1], m[2], m[3])
      ? 'Verbindung gespeichert.'
      : 'Format: Verbinde: Thema A: Beziehung: Thema B';
  }

  if ((v = command(s, 'Wissensgraph')) !== null) {
    return graphReport(v);
  }

  if (
    (v = command(s, 'Wissen')) !== null ||
    (v = command(s, 'Erkläre')) !== null
  ) {
    return knowledge(v);
  }

  if ((v = command(s, 'Analysiere')) !== null) {
    return analyze(v);
  }

  if ((v = command(s, 'Recherchiere')) !== null) {
    return await research(v);
  }

  if (n === 'dokumente') {
    return docs();
  }

  if ((v = command(s, 'Dokument suchen')) !== null) {
    return docs(v);
  }

  if ((v = command(s, 'Dokument zusammenfassen')) !== null) {
    return summarize(v);
  }

  if (n === 'projekte') {
    return projects();
  }

  if ((v = command(s, 'Projekt erstellen')) !== null) {
    return v
      ? project(v)
      : 'Bitte Projektnamen angeben.';
  }

  if (n === 'aufgaben') {
    return tasks();
  }

  if ((v = command(s, 'Aufgabe erstellen')) !== null) {
    return v
      ? task(v)
      : 'Bitte Aufgabentitel angeben.';
  }

  if ((v = command(s, 'Aufgabe erledigt')) !== null) {
    return taskDone(v);
  }

  if (n === 'agenten') {
    return agents();
  }

  if (
    n === 'sicherung erstellen' ||
    n === 'sicherung speichern'
  ) {
    return snapshot();
  }

  if (n === 'sicherungen') {
    return snapshots();
  }

  if ((v = command(s, 'Sicherung wiederherstellen')) !== null) {
    return restoreSnapshot(v);
  }

  if (
    n === 'auto sicherungen' ||
    n === 'autosicherungen'
  ) {
    return autoList();
  }

  if ((v = command(s, 'Auto-Sicherung wiederherstellen')) !== null) {
    return autoRestore(v);
  }

  if ((v = command(s, 'Auto-Sicherung exportieren')) !== null) {
    return autoExport(v);
  }

  if (
    n === 'export' ||
    n === 'daten exportieren'
  ) {
    return exportData();
  }

  if ((v = command(s, 'Code prüfen')) !== null) {
    return inspectCode(v);
  }

  return knowledge(s);
}

/* =====================================================
   BENUTZEROBERFLÄCHE
   ===================================================== */

const UI = {
  input: () =>
    $('input') ||
    $('lb6-input') ||
    $('chat-input') ||
    $('user-input') ||
    $('lb6-fallback-input'),

  chat: () =>
    $('log') ||
    $('lb6-chat') ||
    $('chat-messages') ||
    $('messages') ||
    $('lb6-fallback-chat'),

  send: () =>
    $('send') ||
    $('lb6-send') ||
    $('send-button') ||
    $('send-btn') ||
    $('lb6-fallback-send')
};

function addMessage(role, content) {
  const chat = UI.chat();

  if (!chat) {
    console.log('LernBot', role, content);
    return;
  }

  const e = document.createElement('div');

  e.className = role === 'user'
    ? 'msg user'
    : 'msg bot' + (role === 'system' ? ' system' : '');

  const body = document.createElement('div');
  body.className = 'lb6-message-content';
  body.textContent = text(content);

  e.appendChild(body);
  chat.appendChild(e);
  chat.scrollTop = chat.scrollHeight;
}

function clearChat() {
  UI.chat()?.replaceChildren();

  addMessage(
    'assistant',
    'Neuer Chat. Dein gespeichertes Wissen bleibt erhalten.'
  );

  context = {
    subject: '',
    property: '',
    awaiting: null
  };
}

async function send() {
  if (busy) return;

  const input = UI.input();
  const btn = UI.send();

  if (!input) return;

  const s = safe(input.value, 100000);

  if (!s) return;

  busy = true;

  if (btn) btn.disabled = true;

  input.value = '';
  addMessage('user', s);

  const typing = document.createElement('div');
  typing.className = 'msg bot lb6-typing';
  typing.textContent = 'LernBot denkt nach ...';

  UI.chat()?.appendChild(typing);

  try {
    const response = await handle(s);

    typing.remove();
    addMessage('assistant', response);

    data.log.push({
      id: uid(),
      time: now(),
      text: s,
      response: safe(response, 1000)
    });

    save();
  } catch (e) {
    typing.remove();
    console.error(e);

    addMessage(
      'assistant',
      'Fehler: ' + e.message
    );
  } finally {
    busy = false;

    if (btn) btn.disabled = false;
  }
}

function bind(el, event, fn) {
  if (!el || el.dataset.lb6Bound === 'true') {
    return;
  }

  el.dataset.lb6Bound = 'true';
  el.addEventListener(event, fn);
}

/* =====================================================
   DATEIIMPORT
   ===================================================== */

function fileInput() {
  let el = $('lb6-file');

  if (el) return el;

  el = document.createElement('input');
  el.id = 'lb6-file';
  el.type = 'file';
  el.accept = '.txt,.md,.json,.csv,.html,.js,.css';
  el.style.display = 'none';

  document.body.appendChild(el);

  return el;
}

async function fileChanged(e) {
  const f = e.target.files?.[0];

  if (!f) return;

  try {
    const s = await f.text();

    const response = f.name.toLowerCase().endsWith('.json')
      ? importData(s)
      : importDocumentText(s, f.name, 'file-import');

    addMessage('assistant', response);
  } catch (err) {
    addMessage(
      'assistant',
      'Dateiimport fehlgeschlagen: ' + err.message
    );
  } finally {
    e.target.value = '';
  }
}

/* =====================================================
   ERSATZOBERFLÄCHE
   ===================================================== */

function fallback() {
  if (UI.input() && UI.chat()) return;

  const root = document.createElement('section');

  root.style.cssText =
    'max-width:850px;margin:20px auto;padding:20px;' +
    'background:#20202e;color:white;border-radius:16px;' +
    'font-family:Arial';

  root.innerHTML = `
    <h2>LernBot 6.0</h2>
    <div
      id="lb6-fallback-chat"
      style="height:55vh;overflow:auto;padding:12px;background:#11111a"
    ></div>
    <textarea
      id="lb6-fallback-input"
      style="width:85%;height:65px"
    ></textarea>
    <button id="lb6-fallback-send">Senden</button>
  `;

  document.body.appendChild(root);
}

/* =====================================================
   SIDEBAR
   ===================================================== */

function sidebar(label, cmd) {
  const c = norm(cmd);
  const l = norm(label);

  if (c === 'theme' || l.includes('theme')) {
    data.theme = data.theme === 'dark'
      ? 'light'
      : 'dark';

    document.documentElement.dataset.theme = data.theme;
    document.body.dataset.theme = data.theme;

    save();
    addMessage('system', 'Theme: ' + data.theme);
    return;
  }

  if (c === 'import' || l.includes('import')) {
    fileInput().click();
    return;
  }

  if (c === 'export' || l.includes('export')) {
    addMessage('system', exportData());
    return;
  }

  if (
    c === 'refresh' ||
    l.includes('aktualisieren')
  ) {
    location.reload();
    return;
  }

  if (c === 'verlauf loschen') {
    if (confirm('Chatverlauf wirklich löschen? Wissen bleibt erhalten.')) {
      data.log = [];
      save();
      clearChat();
    }

    return;
  }

  if (l.includes('neuer chat')) {
    clearChat();
    return;
  }

  if (l.includes('chatverlauf')) {
    addMessage(
      'assistant',
      data.log.length
        ? data.log.map(x =>
            `${date(x.time)} – ${x.text || x.content || ''}`
          ).join('\n')
        : 'Kein Chatverlauf.'
    );

    return;
  }

  if (l.includes('einstellungen')) {
    addMessage(
      'assistant',
      JSON.stringify(data.settings, null, 2) +
      '\nTheme: ' + data.theme
    );

    return;
  }

  if (l.includes('code labor')) {
    addMessage(
      'assistant',
      'Code prüfen: DEIN QUELLCODE'
    );

    return;
  }

  const target =
    c === 'hilfe' || l === 'hilfe'
      ? 'Hilfe'
      : c === 'was weisst du' || l.includes('wissensspeicher')
        ? 'Wissensübersicht'
        : l.includes('agenten')
          ? 'Agenten'
          : l.includes('projekte')
            ? 'Projekte'
            : l.includes('dokumente')
              ? 'Dokumente'
              : null;

  if (target) {
    handle(target).then(x =>
      addMessage('assistant', x)
    );
  }
}

/* =====================================================
   START
   ===================================================== */

function start() {
  if (
    started ||
    document.documentElement.dataset.lb6Started === 'true'
  ) {
    return;
  }

  started = true;

  const style = document.createElement('style');
  style.id = 'lb6-paket2-style';

  style.textContent = `
    .lb6-message-content {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .lb6-typing {
      opacity: .7;
      font-style: italic;
    }
  `;

  document.head.appendChild(style);

  fallback();

  bind(UI.input(), 'keydown', e => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.isComposing
    ) {
      e.preventDefault();
      send();
    }
  });

  bind(UI.send(), 'click', e => {
    e.preventDefault();
    send();
  });

  bind($('bar'), 'submit', e => {
    e.preventDefault();
    send();
  });

  bind(fileInput(), 'change', fileChanged);

  document.querySelectorAll(
    '#suggestions [data-msg]'
  ).forEach(el => {
    bind(el, 'click', () => {
      const input = UI.input();

      input.value = el.dataset.msg;
      send();
    });
  });

  document.querySelectorAll(
    '#drawer .side-button'
  ).forEach(el => {
    bind(el, 'click', () =>
      sidebar(el.textContent, el.dataset.cmd || '')
    );
  });

  document.querySelectorAll(
    '[data-lb6-export], #lb6-export, #export-button, #export-btn'
  ).forEach(el => {
    bind(el, 'click', () =>
      addMessage('system', exportData())
    );
  });

  document.documentElement.dataset.lb6Started = 'true';
  document.documentElement.dataset.theme = data.theme;
  document.body.dataset.theme = data.theme;

  if (UI.chat() && !UI.chat().children.length) {
    addMessage(
      'assistant',
      'Hallo! Ich bin ' + NAME +
      '.\nDein Wissen bleibt auf diesem Gerät.' +
      '\nSchreibe „Hilfe“ für alle Befehle.'
    );
  }

  for (const n of notices) {
    addMessage('system', n);
  }

  status(locked ? 'Speicher gesperrt' : 'Bereit');

  console.log(NAME + ' gestartet');
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    start,
    {once: true}
  );
} else {
  start();
}

})();
 
