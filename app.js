(() => {
"use strict";

   
(() => {
"use strict";

/* =====================================================
   LERNBOT 6.0 – MULTI-AGENTEN LERNSYSTEM
   TEIL 1/3 – KERN, SPEICHER, GEDÄCHTNIS
   ÜBERARBEITETE VERSION
   ===================================================== */

const $ = id => document.getElementById(id);

const KEY = "meinLernBot.v1";
const VERSION = 6;
const NAME = "LernBot 6.0";

const now = () => Date.now();

const arr = value =>
  Array.isArray(value) ? value : [];

const obj = value =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const uid = () =>
  "LB-" +
  now().toString(36) +
  "-" +
  Math.random().toString(36).slice(2, 9);

const safeText = (value, max = 20000) =>
  String(value ?? "").slice(0, max).trim();

function clone(value) {
  try {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
  } catch (error) {
    console.warn("LernBot: structuredClone fehlgeschlagen.", error);
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn("LernBot: Kopieren fehlgeschlagen.", error);
    return value;
  }
}

/* =====================================================
   1. TEXTVERARBEITUNG
   ===================================================== */

function normalize(text) {
  return safeText(text)
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const stop = new Set(
    "der die das den dem des ein eine einer eines einem und oder ist sind war wie was wer wo wann warum ich du er sie es wir ihr mit von zu im am an auf für als aber auch sich".split(" ")
  );

  return normalize(text)
    .split(" ")
    .filter(word =>
      word.length > 2 &&
      !stop.has(word)
    );
}

function similarity(a, b) {
  const first = new Set(tokenize(a));
  const second = new Set(tokenize(b));

  if (!first.size || !second.size) {
    return 0;
  }

  let common = 0;

  for (const word of first) {
    if (second.has(word)) {
      common++;
    }
  }

  return common / Math.max(first.size, second.size);
}

/* =====================================================
   2. DATENBANK UND MIGRATION
   ===================================================== */

let data = {};

const defaults = {
  version: VERSION,

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

  theme: "dark"
};

/* Vorhandene Daten laden */

try {
  const stored = localStorage.getItem(KEY);

  if (stored) {
    const parsed = JSON.parse(stored);

    if (obj(parsed)) {
      data = parsed;
    }
  }
} catch (error) {
  console.error(
    "LernBot: Datenbank konnte nicht geladen werden.",
    error
  );

  data = {};
}

if (!obj(data)) {
  data = {};
}

/* Fehlende Datenbereiche ergänzen */

for (const [key, value] of Object.entries(defaults)) {
  if (data[key] === undefined || data[key] === null) {
    data[key] = clone(value);
  }
}

/* Array-Datenbereiche absichern */

const arrayKeys = [
  "facts",
  "qa",
  "classes",
  "log",
  "audit",
  "improvements",
  "codeProposals",
  "projects",
  "tasks",
  "documents",
  "relationships",
  "memory",
  "snapshots"
];

for (const key of arrayKeys) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }
}

/* Objekt-Datenbereiche absichern */

if (!obj(data.agentStats)) {
  data.agentStats = {};
}

if (!obj(data.settings)) {
  data.settings = {};
}

/* Standardwerte übernehmen, bestehende Einstellungen behalten */

data.settings = {
  ...clone(defaults.settings),
  ...data.settings
};

/* Theme absichern */

if (typeof data.theme !== "string") {
  data.theme = "dark";
}

/* Datenbankversion aktualisieren */

data.version = VERSION;

/* =====================================================
   3. DATENVALIDIERUNG
   ===================================================== */

data.facts = data.facts.filter(item =>
  obj(item) &&
  typeof item.subject === "string" &&
  typeof item.property === "string" &&
  typeof item.value === "string"
);

data.qa = data.qa.filter(item =>
  obj(item) &&
  typeof item.k === "string" &&
  typeof item.a === "string"
);

data.relationships = data.relationships.filter(item =>
  obj(item) &&
  typeof item.from === "string" &&
  typeof item.to === "string" &&
  typeof item.relation === "string"
);

data.memory = data.memory.filter(item =>
  obj(item) &&
  typeof item.content === "string" &&
  typeof item.type === "string"
);

data.documents = data.documents.filter(item =>
  obj(item)
);

data.projects = data.projects.filter(item =>
  obj(item)
);

data.tasks = data.tasks.filter(item =>
  obj(item)
);

data.classes = data.classes.filter(obj);
data.log = data.log.filter(obj);
data.audit = data.audit.filter(obj);
data.improvements = data.improvements.filter(obj);
data.codeProposals = data.codeProposals.filter(obj);
data.snapshots = data.snapshots.filter(obj);

/* =====================================================
   4. SPEICHERSYSTEM
   ===================================================== */

function save() {
  data.version = VERSION;

  data.log = arr(data.log).slice(-150);
  data.audit = arr(data.audit).slice(-1000);
  data.memory = arr(data.memory).slice(-1000);
  data.snapshots = arr(data.snapshots).slice(-30);

  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(data)
    );

    return true;

  } catch (error) {
    console.error(
      "LernBot: Speichern fehlgeschlagen.",
      error
    );

    if (typeof setStatus === "function") {
      setStatus(
        "Speicherfehler – bitte Daten exportieren."
      );
    }

    return false;
  }
}

function logAudit(agent, action, detail = "") {
  data.audit.push({
    id: uid(),
    agent: safeText(agent, 100),
    action: safeText(action, 200),
    detail: safeText(detail, 1000),
    time: now()
  });

  if (data.audit.length > 1000) {
    data.audit = data.audit.slice(-1000);
  }
}

function countAgent(name) {
  name = safeText(name, 100);

  if (!name) return;

  data.agentStats[name] =
    (Number(data.agentStats[name]) || 0) + 1;
}

/* =====================================================
   5. LANGZEITGEDÄCHTNIS
   ===================================================== */

function remember(type, content, meta = {}) {
  type = safeText(type, 100);
  content = safeText(content, 10000);

  if (!type || !content) {
    return null;
  }

  const existing = data.memory.find(item =>
    item.type === type &&
    normalize(item.content) === normalize(content)
  );

  if (existing) {
    existing.updated = now();

    existing.meta = {
      ...(obj(existing.meta) ? existing.meta : {}),
      ...(obj(meta) ? clone(meta) : {})
    };

    save();

    return existing;
  }

  const entry = {
    id: uid(),
    type,
    content,
    meta: obj(meta) ? clone(meta) : {},
    created: now(),
    updated: now()
  };

  data.memory.push(entry);

  logAudit(
    "Gedächtnis-KI",
    "Erinnerung gespeichert",
    type
  );

  save();

  return entry;
}

function searchMemory(query, limit = 8) {
  const q = normalize(query);

  if (!q) return [];

  limit = Math.max(
    1,
    Math.min(100, Number(limit) || 8)
  );

  return data.memory
    .map(item => ({
      item,
      score: Math.max(
        similarity(q, item.content),
        similarity(q, item.type)
      )
    }))
    .filter(result => result.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(result => result.item);
}

function forgetMemory(query) {
  const q = normalize(query);

  if (!q) return 0;

  const before = data.memory.length;

  data.memory = data.memory.filter(item =>
    !normalize(item.content).includes(q) &&
    !normalize(item.type).includes(q)
  );

  const removed = before - data.memory.length;

  if (removed > 0) {
    logAudit(
      "Gedächtnis-KI",
      "Erinnerungen gelöscht",
      `${removed} Einträge`
    );

    save();
  }

  return removed;
}

/* =====================================================
   6. WISSENSBANK
   ===================================================== */

function cleanSubject(text) {
  return safeText(text)
    .replace(
      /^(der|die|das|ein|eine|einen|einem|einer|eines)\s+/i,
      ""
    )
    .replace(/[.!?,;:]+$/, "")
    .trim();
}

function sameSubject(a, b) {
  return normalize(cleanSubject(a)) ===
    normalize(cleanSubject(b));
}

function getFacts(subject = "") {
  if (!safeText(subject)) {
    return data.facts;
  }

  return data.facts.filter(item =>
    sameSubject(item.subject, subject)
  );
}

function addFact(subject, property, value, source = "user") {
  subject = cleanSubject(subject);
  property = normalize(property);
  value = safeText(value, 5000);
  source = safeText(source, 100);

  if (!subject || !property || !value) {
    return false;
  }

  let existing = data.facts.find(item =>
    sameSubject(item.subject, subject) &&
    normalize(item.property) === property
  );

  if (existing) {
    const oldValue = existing.value;

    if (normalize(oldValue) !== normalize(value)) {
      existing.previous = oldValue;
      existing.conflict = true;

      existing.alternatives = arr(
        existing.alternatives
      );

      const oldAlternativeExists =
        existing.alternatives.some(item =>
          obj(item) &&
          normalize(item.value) === normalize(oldValue)
        );

      if (
        oldValue &&
        !oldAlternativeExists
      ) {
        existing.alternatives.push({
          value: oldValue,
          source: existing.source || "unbekannt",
          time: now()
        });
      }

      const newAlternativeExists =
        existing.alternatives.some(item =>
          obj(item) &&
          normalize(item.value) === normalize(value)
        );

      if (!newAlternativeExists) {
        existing.alternatives.push({
          value,
          source,
          time: now()
        });
      }

      existing.value = value;
    }

    existing.source = source;
    existing.updated = now();

  } else {
    existing = {
      id: uid(),
      subject,
      property,
      value,
      source,
      confidence: source === "user" ? 1 : 0.7,
      conflict: false,
      alternatives: [],
      created: now(),
      updated: now()
    };

    data.facts.push(existing);
  }

  remember(
    "fakt",
    `${subject}: ${property} = ${value}`,
    {
      subject,
      property,
      source
    }
  );

  save();

  return true;
}

/* =====================================================
   7. FAKTEN ERKENNEN UND LERNEN
   ===================================================== */

function parseFact(text) {
  const s = safeText(text);

  if (!s || s.includes("?")) {
    return null;
  }

  let match;

  /* Hauptstadt:
     Die Hauptstadt von Deutschland ist Berlin.
  */

  match = s.match(
    /^die\s+hauptstadt\s+von\s+(.+?)\s+ist\s+(.+?)[.!]*$/i
  );

  if (match) {
    return {
      subject: cleanSubject(match[1]),
      property: "hauptstadt",
      value: safeText(match[2])
    };
  }

  /* Hauptstadt:
     Deutschland hat die Hauptstadt Berlin.
  */

  match = s.match(
    /^(.+?)\s+hat\s+(?:die\s+)?hauptstadt\s+(.+?)[.!]*$/i
  );

  if (match) {
    return {
      subject: cleanSubject(match[1]),
      property: "hauptstadt",
      value: safeText(match[2])
    };
  }

  /* Lebensraum:
     Der Fuchs lebt in Europa.
  */

  match = s.match(
    /^(.+?)\s+(lebt|wohnt)\s+(?:in|im|am|auf|unter)\s+(.+?)[.!]*$/i
  );

  if (match) {
    return {
      subject: cleanSubject(match[1]),
      property: "lebensraum",
      value: safeText(match[3])
    };
  }

  /* Nahrung:
     Der Panda frisst Bambus.
  */

  match = s.match(
    /^(.+?)\s+(frisst|isst|ernährt sich von)\s+(.+?)[.!]*$/i
  );

  if (match) {
    return {
      subject: cleanSubject(match[1]),
      property: "nahrung",
      value: safeText(match[3])
    };
  }

  /* Zugehörigkeit:
     Das Okapi gehört zu den Giraffenartigen.
  */

  match = s.match(
    /^(.+?)\s+gehört\s+zu\s+(.+?)[.!]*$/i
  );

  if (match) {
    return {
      subject: cleanSubject(match[1]),
      property: "zugehoerigkeit",
      value: safeText(match[2])
    };
  }

  /* Zugehörigkeit:
     Das Okapi ist ein Säugetier.
  */

  match = s.match(
    /^(.+?)\s+ist\s+(?:ein|eine|einer|eines)\s+(.+?)[.!]*$/i
  );

  if (match) {
    return {
      subject: cleanSubject(match[1]),
      property: "definition",
      value: safeText(match[2])
    };
  }

  /* Allgemeine Definition */

  match = s.match(
    /^(.+?)\s+(?:ist|sind|heißt|bedeutet)\s+(.+?)[.!]*$/i
  );

  if (match) {
    return {
      subject: cleanSubject(match[1]),
      property: "definition",
      value: safeText(match[2])
    };
  }

  return null;
}

function learnFact(text) {
  const fact = parseFact(text);

  if (!fact) {
    return null;
  }

  const success = addFact(
    fact.subject,
    fact.property,
    fact.value,
    "user"
  );

  if (!success) {
    return null;
  }

  return [
    "Gelernt und gespeichert!",
    "",
    `Thema: ${fact.subject}`,
    `Eigenschaft: ${fact.property}`,
    `Wissen: ${fact.value}`,
    "",
    `Gespeicherte Fakten: ${data.facts.length}`
  ].join("\n");
}

/* =====================================================
   8. WISSEN ABRUFEN
   ===================================================== */

function answerFact(question) {
  const q = normalize(question);

  if (!q) return null;

  let property = null;
  let subject = "";

  /* Eigenschaft erkennen */

  if (/\bhauptstadt\b/.test(q)) {
    property = "hauptstadt";
  }

  else if (
    /\b(wo lebt|wo wohnt|lebensraum|lebensgebiet|in welchem land lebt)\b/.test(q)
  ) {
    property = "lebensraum";
  }

  else if (
    /\b(was frisst|was isst|nahrung|ernaehrung)\b/.test(q)
  ) {
    property = "nahrung";
  }

  else if (
    /\b(zu welcher tierart|zu welcher familie|welcher familie|welcher tierart|gehoert zu|tierart)\b/.test(q)
  ) {
    property = "zugehoerigkeit";
  }

  else if (
    /^(was ist|wer ist|was bedeutet|erklaere)\b/.test(q)
  ) {
    property = "definition";
  }

  if (!property) return null;

  /* Thema aus der Frage extrahieren */

  const patterns = {
    hauptstadt: [
      /^was ist die hauptstadt von (.+)$/,
      /^was ist hauptstadt von (.+)$/,
      /^hauptstadt von (.+)$/,
      /^welche stadt ist die hauptstadt von (.+)$/
    ],

    lebensraum: [
      /^wo lebt (?:der|die|das|ein|eine)?\s*(.+)$/,
      /^wo wohnt (?:der|die|das|ein|eine)?\s*(.+)$/,
      /^in welchem land lebt (?:der|die|das|ein|eine)?\s*(.+)$/,
      /^lebensraum von (.+)$/
    ],

    nahrung: [
      /^was frisst (?:der|die|das|ein|eine)?\s*(.+)$/,
      /^was isst (?:der|die|das|ein|eine)?\s*(.+)$/,
      /^nahrung von (.+)$/,
      /^was ist die nahrung von (.+)$/
    ],

    zugehoerigkeit: [
      /^zu welcher tierart gehoert (?:der|die|das)?\s*(.+)$/,
      /^zu welcher familie gehoert (?:der|die|das)?\s*(.+)$/,
      /^welcher familie gehoert (?:der|die|das)?\s*(.+)$/,
      /^welcher tierart gehoert (?:der|die|das)?\s*(.+)$/,
      /^zu welcher tierart gehoert (.+)$/,
      /^zu welcher familie gehoert (.+)$/,
      /^zu welcher familie gehoert das (.+)$/
    ],

    definition: [
      /^was ist (.+)$/,
      /^wer ist (.+)$/,
      /^was bedeutet (.+)$/,
      /^erklaere (.+)$/
    ]
  };

  for (const pattern of patterns[property]) {
    const match = q.match(pattern);

    if (match && match[1]) {
      subject = match[1].trim();
      break;
    }
  }

  /* Zusätzliche Fallback-Erkennung */

  if (!subject) {
    subject = q
      .replace(
        /^(was ist|wer ist|was bedeutet|erklaere)\s+/,
        ""
      )
      .trim();
  }

  subject = cleanSubject(subject);

  if (!subject) return null;

  /* Passenden Fakt suchen */

  const fact = data.facts.find(item =>
    sameSubject(item.subject, subject) &&
    normalize(item.property) === property
  );

  return fact ? fact.value : null;
}

/* =====================================================
   9. WISSENSÜBERSICHT
   ===================================================== */

function knowledgeOverview() {
  if (!data.facts.length) {
    return "Mein Wissensspeicher ist noch leer.";
  }

  const groups = {};

  for (const fact of data.facts) {
    const subject = fact.subject || "Unbekannt";

    if (!groups[subject]) {
      groups[subject] = [];
    }

    groups[subject].push(fact);
  }

  const lines = [
    "MEIN LANGZEITWISSEN",
    ""
  ];

  for (const [subject, facts] of Object.entries(groups)) {
    lines.push(subject);

    for (const fact of facts) {
      lines.push(
        `• ${fact.property}: ${fact.value}`
      );

      if (fact.conflict) {
        lines.push(
          "  Hinweis: Für diesen Fakt existieren unterschiedliche Angaben."
        );
      }
    }

    lines.push("");
  }

  lines.push(
    `Gesamt: ${data.facts.length} Fakten`,
    `Erinnerungen: ${data.memory.length}`,
    `Wissensverbindungen: ${data.relationships.length}`
  );

  return lines.join("\n");
}

/* =====================================================
   10. WISSENSGRAPH
   ===================================================== */

function connectKnowledge(from, relation, to) {
  from = cleanSubject(from);
  to = cleanSubject(to);
  relation = safeText(relation, 100);

  if (!from || !to || !relation) {
    return false;
  }

  const exists = data.relationships.some(item =>
    sameSubject(item.from, from) &&
    sameSubject(item.to, to) &&
    normalize(item.relation) === normalize(relation)
  );

  if (exists) {
    return true;
  }

  data.relationships.push({
    id: uid(),
    from,
    relation,
    to,
    created: now()
  });

  logAudit(
    "Wissensgraph",
    "Verbindung erstellt",
    `${from} ${relation} ${to}`
  );

  save();

  return true;
}

function graphFor(subject) {
  if (!safeText(subject)) {
    return [];
  }

  return data.relationships.filter(item =>
    sameSubject(item.from, subject) ||
    sameSubject(item.to, subject)
  );
}

function graphReport(subject) {
  const links = graphFor(subject);

  if (!links.length) {
    return `Zu ${subject} habe ich noch keine Verbindungen gespeichert.`;
  }

  return [
    "WISSENSVERKNÜPFUNGEN",
    "",
    ...links.map(item =>
      `${item.from} —${item.relation}→ ${item.to}`
    )
  ].join("\n");
}

/* =====================================================
   11. INITIALISIERUNG ABSCHLIESSEN
   ===================================================== */

/*
   Bestehende Daten bleiben erhalten.
   Fehlende Bereiche werden ergänzt.
   Die Datenbank wird auf Version 6 gesetzt.
*/

save();

/* =====================================================
   TEIL 1 ENDE
   TEIL 2 FOLGT DIREKT DANACH
   ===================================================== */

   
/* =====================================================
   LERNBOT 6.0 – TEIL 2/3
   AGENTEN, ANALYSE, RECHERCHE, DOKUMENTE,
   PROJEKTE, CODE-KI, SICHERUNGEN UND DATENIMPORT
   ===================================================== */

/* =====================================================
   1. AGENTEN-SYSTEM
   ===================================================== */

const agents = {
  lern: {
    name: "Lern-KI",
    description: "Lernt neue Informationen und speichert Wissen."
  },
  analyse: {
    name: "Analyse-KI",
    description: "Analysiert Wissen, Zusammenhänge und Fragen."
  },
  recherche: {
    name: "Recherche-KI",
    description: "Sucht Informationen in öffentlichen Wissensquellen."
  },
  gedächtnis: {
    name: "Gedächtnis-KI",
    description: "Verwaltet Erinnerungen und Langzeitwissen."
  },
  projekt: {
    name: "Projekt-KI",
    description: "Verwaltet Projekte und Aufgaben."
  },
  dokument: {
    name: "Dokumenten-KI",
    description: "Verarbeitet importierte Texte und Dokumente."
  },
  code: {
    name: "Code-KI",
    description: "Prüft Quellcode auf typische Fehler."
  },
  antwort: {
    name: "Antwort-KI",
    description: "Erstellt verständliche Antworten."
  },
  meta: {
    name: "Meta-KI",
    description: "Koordiniert die anderen Agenten."
  }
};

function agentRun(name, fn) {
  if (typeof fn !== "function") {
    return "Fehler: Ungültige Agentenfunktion.";
  }

  const agent = agents[name];

  if (!agent) {
    return "Fehler: Agent '" + name + "' existiert nicht.";
  }

  try {
    countAgent(name);

    const result = fn();

    logAudit("agent", {
      name,
      status: "success"
    });

    return result;
  } catch (error) {
    logAudit("agent", {
      name,
      status: "error",
      message: String(error?.message || error)
    });

    return "Agentenfehler (" + agent.name + "): " +
      String(error?.message || error);
  } finally {
    save();
  }
}

async function agentRunAsync(name, fn) {
  if (typeof fn !== "function") {
    return "Fehler: Ungültige Agentenfunktion.";
  }

  const agent = agents[name];

  if (!agent) {
    return "Fehler: Agent '" + name + "' existiert nicht.";
  }

  try {
    countAgent(name);

    const result = await fn();

    logAudit("agent", {
      name,
      status: "success"
    });

    return result;
  } catch (error) {
    logAudit("agent", {
      name,
      status: "error",
      message: String(error?.message || error)
    });

    return "Agentenfehler (" + agent.name + "): " +
      String(error?.message || error);
  } finally {
    save();
  }
}

function agentOverview() {
  const stats = obj(data.agentStats) ? data.agentStats : {};

  return Object.entries(agents).map(([key, agent]) => {
    const count = Number(stats[key]) || 0;

    return {
      id: key,
      name: agent.name,
      description: agent.description,
      runs: count
    };
  });
}

/* =====================================================
   2. WISSENSANALYSE
   ===================================================== */

function analyzeKnowledge() {
  const facts = arr(data.facts);
  const memories = arr(data.memories);
  const documents = arr(data.documents);
  const projects = arr(data.projects);
  const tasks = arr(data.tasks);

  const subjects = new Set();
  const properties = new Set();

  for (const fact of facts) {
    if (fact && typeof fact === "object") {
      if (fact.subject) {
        subjects.add(normalize(fact.subject));
      }

      if (fact.property) {
        properties.add(normalize(fact.property));
      }
    }
  }

  const completedTasks = tasks.filter(task =>
    task && task.done === true
  ).length;

  const openTasks = tasks.length - completedTasks;

  const conflicts = facts.filter(fact =>
    fact && (
      fact.conflict === true ||
      fact.status === "conflict"
    )
  ).length;

  let graphConnections = 0;

  try {
    const graph = graphReport();

    if (typeof graph === "number") {
      graphConnections = graph;
    } else if (graph && typeof graph === "object") {
      graphConnections =
        Number(graph.connections) ||
        Number(graph.relationships) ||
        Number(graph.edges) ||
        0;
    }
  } catch {
    graphConnections = 0;
  }

  return {
    facts: facts.length,
    subjects: subjects.size,
    properties: properties.size,
    conflicts,
    graphConnections,
    memories: memories.length,
    documents: documents.length,
    projects: projects.length,
    tasks: tasks.length,
    completedTasks,
    openTasks,
    agents: agentOverview()
  };
}

function findRelatedFacts(query, limit = 10) {
  const q = String(query || "").trim();

  if (!q) return [];

  const max = Math.max(
    1,
    Math.min(100, Number(limit) || 10)
  );

  const facts = arr(data.facts);
  const results = [];

  for (const fact of facts) {
    if (!fact || typeof fact !== "object") continue;

    const content = [
      fact.subject,
      fact.property,
      fact.value,
      fact.description
    ].filter(Boolean).join(" ");

    const score = similarity(q, content);

    if (score > 0.08) {
      results.push({
        fact,
        score
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

function explainTopic(topic) {
  const query = String(topic || "").trim();

  if (!query) {
    return "Bitte gib ein Thema an.";
  }

  const facts = findRelatedFacts(query, 20);

  let memories = [];

  try {
    memories = searchMemory(query) || [];
  } catch {
    memories = [];
  }

  let graph = [];

  try {
    graph = graphFor(query) || [];
  } catch {
    graph = [];
  }

  const lines = [
    "WISSENSANALYSE: " + query,
    ""
  ];

  if (facts.length) {
    lines.push("GESPEICHERTES WISSEN:");

    for (const item of facts) {
      const fact = item.fact;

      lines.push(
        "- " +
        [fact.subject, fact.property, fact.value]
          .filter(Boolean)
          .join(" – ")
      );
    }
  } else {
    lines.push("Keine passenden Fakten gefunden.");
  }

  if (arr(memories).length) {
    lines.push("");
    lines.push("ERINNERUNGEN:");

    for (const memory of memories.slice(0, 10)) {
      const content =
        typeof memory === "string"
          ? memory
          : memory.content || memory.text || "";

      if (content) lines.push("- " + content);
    }
  }

  if (arr(graph).length) {
    lines.push("");
    lines.push("ZUSAMMENHÄNGE:");

    for (const item of graph.slice(0, 10)) {
      lines.push(
        "- " +
        (typeof item === "string"
          ? item
          : item.label || item.name || item.subject || JSON.stringify(item))
      );
    }
  }

  lines.push("");
  lines.push(
    "Gefundene Fakten: " + facts.length
  );

  return lines.join("\n");
}

/* =====================================================
   3. RECHERCHE-SYSTEM
   ===================================================== */

async function fetchJSON(url, timeout = 10000) {
  if (typeof fetch !== "function") {
    throw new Error("Dieser Browser unterstützt fetch nicht.");
  }

  const duration = Math.max(
    1000,
    Math.min(30000, Number(timeout) || 10000)
  );

  let controller = null;
  let timer = null;

  try {
    if (typeof AbortController !== "undefined") {
      controller = new AbortController();

      timer = setTimeout(() => {
        controller.abort();
      }, duration);
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      signal: controller ? controller.signal : undefined
    });

    if (!response.ok) {
      throw new Error(
        "HTTP-Fehler " + response.status
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (
      contentType &&
      !contentType.includes("json")
    ) {
      throw new Error("Die Quelle lieferte kein JSON.");
    }

    return await response.json();

  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Zeitüberschreitung bei der Recherche.");
    }

    throw error;

  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

function encodeQuery(query) {
  return encodeURIComponent(
    String(query || "").trim()
  );
}

async function searchWikipedia(query) {
  const q = String(query || "").trim();

  if (!q) return [];

  const url =
    "https://de.wikipedia.org/w/api.php" +
    "?action=query" +
    "&list=search" +
    "&srsearch=" + encodeQuery(q) +
    "&srlimit=6" +
    "&format=json" +
    "&origin=*";

  const result = await fetchJSON(url);

  return arr(result?.query?.search).map(item => ({
    source: "Wikipedia",
    title: String(item.title || ""),
    description: String(item.snippet || "")
      .replace(/<[^>]*>/g, ""),
    url:
      "https://de.wikipedia.org/wiki/" +
      encodeURIComponent(
        String(item.title || "").replace(/ /g, "_")
      )
  }));
}

async function searchWikidata(query) {
  const q = String(query || "").trim();

  if (!q) return [];

  const url =
    "https://www.wikidata.org/w/api.php" +
    "?action=wbsearchentities" +
    "&search=" + encodeQuery(q) +
    "&language=de" +
    "&limit=6" +
    "&format=json" +
    "&origin=*";

  const result = await fetchJSON(url);

  return arr(result?.search).map(item => ({
    source: "Wikidata",
    title: String(item.label || ""),
    description: String(item.description || ""),
    url: String(item.concepturi || "")
  }));
}

async function searchOpenLibrary(query) {
  const q = String(query || "").trim();

  if (!q) return [];

  const url =
    "https://openlibrary.org/search.json" +
    "?q=" + encodeQuery(q) +
    "&limit=5";

  const result = await fetchJSON(url);

  return arr(result?.docs).map(item => ({
    source: "Open Library",
    title: String(item.title || ""),
    description: [
      item.author_name?.[0],
      item.first_publish_year
        ? "Erstveröffentlichung: " + item.first_publish_year
        : ""
    ].filter(Boolean).join(" – "),
    url: item.key
      ? "https://openlibrary.org" + item.key
      : ""
  }));
}

async function research(query) {
  return agentRunAsync("recherche", async () => {
    const q = String(query || "").trim();

    if (!q) {
      return "Bitte gib einen Suchbegriff ein.";
    }

    if (q.length > 300) {
      return "Der Suchbegriff ist zu lang.";
    }

    const results = await Promise.allSettled([
      searchWikipedia(q),
      searchWikidata(q)
    ]);

    const collected = [];
    const errors = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      if (result.status === "fulfilled") {
        collected.push(...arr(result.value));
      } else {
        errors.push(
          (i === 0 ? "Wikipedia" : "Wikidata") +
          ": " +
          String(result.reason?.message || result.reason)
        );
      }
    }

    const seen = new Set();

    const unique = collected.filter(item => {
      const key = normalize(item.title);

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    });

    const documentContent = [
      "Recherche: " + q,
      "Datum: " + now(),
      "",
      ...unique.map(item =>
        "[" + item.source + "] " +
        item.title +
        (item.description
          ? "\n" + item.description
          : "") +
        (item.url
          ? "\n" + item.url
          : "")
      )
    ].join("\n\n");

    if (unique.length) {
      importDocumentText(
        documentContent,
        "Recherche: " + q
      );
    }

    const lines = [
      "RECHERCHE: " + q,
      ""
    ];

    if (!unique.length) {
      lines.push(
        "Es konnten keine Ergebnisse abgerufen werden."
      );
    } else {
      unique.forEach((item, index) => {
        lines.push(
          (index + 1) + ". " + item.title
        );

        lines.push(
          "Quelle: " + item.source
        );

        if (item.description) {
          lines.push(item.description);
        }

        if (item.url) {
          lines.push(item.url);
        }

        lines.push("");
      });
    }

    if (errors.length) {
      lines.push("HINWEISE:");

      errors.forEach(error => {
        lines.push("- " + error);
      });
    }

    lines.push(
      "Ergebnisse: " + unique.length
    );

    lines.push(
      "Hinweis: Rechercheergebnisse sollten anhand der Originalquellen überprüft werden."
    );

    return lines.join("\n");
  });
}

/* =====================================================
   4. DOKUMENTEN-SYSTEM
   ===================================================== */

function importDocumentText(text, filename = "Textimport") {
  const content = String(text || "").trim();

  if (!content) {
    return "Fehler: Das Dokument ist leer.";
  }

  if (content.length > 2000000) {
    return "Fehler: Das Dokument ist größer als 2 MB Text.";
  }

  const title = String(filename || "Textimport")
    .trim()
    .slice(0, 200);

  const document = {
    id: uid(),
    title: title || "Textimport",
    content,
    created: now(),
    length: content.length,
    type: "document"
  };

  if (!Array.isArray(data.documents)) {
    data.documents = [];
  }

  data.documents.push(document);

  try {
    remember(
      "Dokument importiert: " + document.title
    );
  } catch {
    // Der Dokumentimport bleibt auch ohne Erinnerung möglich.
  }

  logAudit("document_import", {
    id: document.id,
    title: document.title,
    length: document.length
  });

  save();

  return (
    "Dokument erfolgreich importiert.\n" +
    "Titel: " + document.title + "\n" +
    "Zeichen: " + document.length + "\n" +
    "ID: " + document.id
  );
}

function searchDocuments(query) {
  const q = String(query || "").trim();

  if (!q) return [];

  const documents = arr(data.documents);
  const results = [];

  for (const document of documents) {
    if (!document || typeof document !== "object") {
      continue;
    }

    const content = [
      document.title,
      document.content
    ].filter(Boolean).join(" ");

    const score = similarity(q, content);

    if (score > 0.03) {
      results.push({
        document,
        score
      });
    }
  }

  return results.sort(
    (a, b) => b.score - a.score
  );
}

function summarizeDocument(id) {
  const document = arr(data.documents).find(item =>
    item && String(item.id) === String(id)
  );

  if (!document) {
    return "Dokument nicht gefunden.";
  }

  const content = String(document.content || "")
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!content) {
    return "Das Dokument enthält keinen Text.";
  }

  const sentences = content
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [content];

  if (sentences.length <= 4) {
    return (
      "ZUSAMMENFASSUNG: " +
      document.title +
      "\n\n" +
      content
    );
  }

  const stopWords = new Set([
    "aber", "alle", "als", "also", "am", "an", "auch",
    "auf", "aus", "bei", "bin", "bis", "da", "dadurch",
    "daher", "damit", "dann", "das", "dass", "dem",
    "den", "der", "des", "die", "dies", "diese",
    "dieser", "doch", "dort", "durch", "ein", "eine",
    "einem", "einen", "einer", "eines", "er", "es",
    "für", "hat", "haben", "hier", "ich", "im", "in",
    "ist", "ja", "kann", "kein", "mit", "nach", "nicht",
    "noch", "nur", "oder", "sein", "sich", "sie", "sind",
    "so", "um", "und", "uns", "unter", "vom", "von",
    "vor", "war", "was", "wenn", "werden", "wie", "wir",
    "wird", "zu", "zum", "zur"
  ]);

  const words = content
    .toLowerCase()
    .match(/[a-zäöüß]{3,}/g) || [];

  const frequencies = Object.create(null);

  for (const word of words) {
    if (stopWords.has(word)) continue;

    frequencies[word] =
      (frequencies[word] || 0) + 1;
  }

  const scored = sentences.map((sentence, index) => {
    const sentenceWords =
      sentence.toLowerCase().match(/[a-zäöüß]{3,}/g) || [];

    let score = 0;

    for (const word of sentenceWords) {
      if (!stopWords.has(word)) {
        score += frequencies[word] || 0;
      }
    }

    const lengthPenalty =
      Math.max(1, Math.sqrt(sentenceWords.length));

    score /= lengthPenalty;

    // Der Anfang eines Dokuments enthält oft wichtige Einführungen.
    if (index === 0) score *= 1.35;
    if (index === 1) score *= 1.15;

    // Sehr kurze Sätze enthalten häufig wenig Kontext.
    if (sentenceWords.length < 5) score *= 0.5;

    return {
      sentence: sentence.trim(),
      index,
      score
    };
  });

  const selected = scored
    .filter(item => item.sentence.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(5, sentences.length))
    .sort((a, b) => a.index - b.index);

  const summary = selected
    .map(item => item.sentence)
    .join(" ");

  return [
    "ZUSAMMENFASSUNG: " + document.title,
    "",
    summary,
    "",
    "Hinweis: Automatische, extraktive Zusammenfassung. " +
    "Die wichtigsten Sätze wurden anhand von Wortgewichtung und Position ausgewählt."
  ].join("\n");
}

/* =====================================================
   5. PROJEKT- UND AUFGABENVERWALTUNG
   ===================================================== */

function createProject(name, description = "") {
  const projectName = String(name || "").trim();

  if (!projectName) {
    return "Fehler: Ein Projektname ist erforderlich.";
  }

  if (projectName.length > 150) {
    return "Fehler: Der Projektname ist zu lang.";
  }

  if (!Array.isArray(data.projects)) {
    data.projects = [];
  }

  const project = {
    id: uid(),
    name: projectName,
    description: String(description || "").slice(0, 2000),
    created: now(),
    status: "active"
  };

  data.projects.push(project);

  logAudit("project_created", {
    id: project.id,
    name: project.name
  });

  save();

  return (
    "Projekt erstellt: " +
    project.name +
    "\nID: " + project.id
  );
}

function createTask(title, projectId = null, due = null) {
  const taskTitle = String(title || "").trim();

  if (!taskTitle) {
    return "Fehler: Ein Aufgabentitel ist erforderlich.";
  }

  if (taskTitle.length > 300) {
    return "Fehler: Der Aufgabentitel ist zu lang.";
  }

  if (!Array.isArray(data.tasks)) {
    data.tasks = [];
  }

  if (projectId !== null) {
    const projectExists = arr(data.projects).some(project =>
      project && String(project.id) === String(projectId)
    );

    if (!projectExists) {
      return "Fehler: Das angegebene Projekt existiert nicht.";
    }
  }

  let dueDate = null;

  if (due !== null && due !== "") {
    const parsed = new Date(due);

    if (Number.isNaN(parsed.getTime())) {
      return "Fehler: Das Fälligkeitsdatum ist ungültig.";
    }

    dueDate = parsed.toISOString();
  }

  const task = {
    id: uid(),
    title: taskTitle,
    projectId,
    due: dueDate,
    created: now(),
    done: false,
    completed: null
  };

  data.tasks.push(task);

  logAudit("task_created", {
    id: task.id,
    title: task.title
  });

  save();

  return (
    "Aufgabe erstellt: " +
    task.title +
    "\nID: " + task.id
  );
}

function completeTask(id) {
  const task = arr(data.tasks).find(item =>
    item && String(item.id) === String(id)
  );

  if (!task) {
    return "Fehler: Aufgabe nicht gefunden.";
  }

  if (task.done === true) {
    return "Diese Aufgabe ist bereits erledigt.";
  }

  task.done = true;
  task.completed = now();

  logAudit("task_completed", {
    id: task.id,
    title: task.title
  });

  save();

  return "Aufgabe erledigt: " + task.title;
}

function listProjects() {
  const projects = arr(data.projects);
  const tasks = arr(data.tasks);

  if (!projects.length) {
    return "Es sind noch keine Projekte vorhanden.";
  }

  return projects.map(project => {
    const projectTasks = tasks.filter(task =>
      task && String(task.projectId) === String(project.id)
    );

    const completed = projectTasks.filter(task =>
      task.done === true
    ).length;

    return [
      project.name,
      "Status: " + (project.status || "active"),
      "Aufgaben: " + projectTasks.length,
      "Erledigt: " + completed,
      "ID: " + project.id,
      project.description || ""
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

function listTasks() {
  const tasks = arr(data.tasks);

  if (!tasks.length) {
    return "Es sind noch keine Aufgaben vorhanden.";
  }

  return tasks.map(task => {
    const status =
      task.done === true ? "Erledigt" : "Offen";

    const project = arr(data.projects).find(item =>
      item && String(item.id) === String(task.projectId)
    );

    return [
      "[" + status + "] " + task.title,
      project ? "Projekt: " + project.name : "",
      task.due ? "Fällig: " + task.due : "",
      "ID: " + task.id
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

/* =====================================================
   6. CODE-KI
   ===================================================== */

function inspectCode(source) {
  const code = String(source || "");

  if (!code.trim()) {
    return [];
  }

  const findings = [];
  const lines = code.split("\n");

  const rules = [
    {
      name: "Unsichere HTML-Ausgabe mit innerHTML",
      pattern: /\.innerHTML\s*(?:\+?=)/g,
      severity: "warning",
      advice:
        "Prüfe, ob Benutzereingaben in innerHTML gelangen. " +
        "Für reinen Text ist textContent sicherer."
    },
    {
      name: "Unsichere HTML-Einfügung mit insertAdjacentHTML",
      pattern: /\.insertAdjacentHTML\s*\(/g,
      severity: "warning",
      advice:
        "Prüfe die eingefügten Inhalte auf nicht vertrauenswürdigen HTML-Code."
    },
    {
      name: "Veraltete HTML-Ausgabe mit document.write",
      pattern: /document\.write\s*\(/g,
      severity: "warning",
      advice:
        "Verwende besser DOM-Methoden wie createElement und textContent."
    },
    {
      name: "eval() gefunden",
      pattern: /\beval\s*\(/g,
      severity: "critical",
      advice:
        "eval() kann beliebigen Code ausführen. Vermeide es."
    },
    {
      name: "new Function() gefunden",
      pattern: /new\s+Function\s*\(/g,
      severity: "warning",
      advice:
        "Dynamisch erzeugter JavaScript-Code ist schwer zu kontrollieren."
    },
    {
      name: "Möglicher unsicherer JSON-Import",
      pattern: /JSON\.parse\s*\(/g,
      severity: "info",
      advice:
        "Prüfe fremde JSON-Daten nach dem Parsen auf ihre Struktur."
    },
    {
      name: "Möglicherweise fest eingebauter API-Schlüssel",
      pattern:
        /(?:api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/gi,
      severity: "critical",
      advice:
        "API-Schlüssel gehören nicht in öffentlich ausgelieferten Quellcode."
    },
    {
      name: "Unsichere HTTP-Verbindung",
      pattern: /https?:\/\/(?!localhost)[^\s"'`]+/gi,
      severity: "info",
      advice:
        "Prüfe, ob externe Verbindungen HTTPS verwenden."
    },
    {
      name: "Netzwerkanfrage gefunden",
      pattern: /\bfetch\s*\(/g,
      severity: "info",
      advice:
        "Behandle Netzwerkfehler und prüfe HTTP-Statuscodes."
    },
    {
      name: "localStorage-Zugriff gefunden",
      pattern: /\blocalStorage\.(?:getItem|setItem|removeItem)\s*\(/g,
      severity: "info",
      advice:
        "Beachte Speicherlimits und mögliche Fehler beim Zugriff."
    },
    {
      name: "Möglicher unsicherer HTML-String",
      pattern: /\.innerHTML\s*\+=/g,
      severity: "warning",
      advice:
        "Das Anhängen von HTML-Strings kann Sicherheitsprobleme verursachen."
    }
  ];

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;

    let match;

    while ((match = rule.pattern.exec(code)) !== null) {
      const line =
        code.slice(0, match.index).split("\n").length;

      findings.push({
        name: rule.name,
        line,
        severity: rule.severity,
        advice: rule.advice
      });

      if (!rule.pattern.global) break;

      // Schutz vor Endlosschleifen bei leeren Treffern.
      if (match[0] === "") {
        rule.pattern.lastIndex++;
      }
    }
  }

  // Doppelte Treffer derselben Regel auf derselben Zeile entfernen.
  const unique = [];
  const seen = new Set();

  for (const finding of findings) {
    const key =
      finding.name + ":" + finding.line;

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(finding);
  }

  return unique.sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;

    const severity = {
      critical: 0,
      warning: 1,
      info: 2
    };

    return severity[a.severity] - severity[b.severity];
  });
}

function inspectCodeReport(source) {
  const code = String(source || "");

  if (!code.trim()) {
    return "Kein Quellcode zum Prüfen vorhanden.";
  }

  const findings = inspectCode(code);

  const critical = findings.filter(item =>
    item.severity === "critical"
  ).length;

  const warnings = findings.filter(item =>
    item.severity === "warning"
  ).length;

  const infos = findings.filter(item =>
    item.severity === "info"
  ).length;

  const lines = [
    "CODE-KI – PRÜFBERICHT",
    "",
    "Geprüfte Zeilen: " + code.split("\n").length,
    "Gefundene Hinweise: " + findings.length,
    "Kritisch: " + critical,
    "Warnungen: " + warnings,
    "Informationen: " + infos,
    ""
  ];

  if (!findings.length) {
    lines.push(
      "Keine der eingebauten Prüfroutinen hat Auffälligkeiten gefunden."
    );
  } else {
    findings.forEach((finding, index) => {
      lines.push(
        (index + 1) + ". " + finding.name
      );

      lines.push(
        "Zeile: " + finding.line
      );

      lines.push(
        "Schweregrad: " + finding.severity.toUpperCase()
      );

      lines.push(
        "Empfehlung: " + finding.advice
      );

      lines.push("");
    });
  }

  lines.push(
    "WICHTIG: Diese Code-KI verwendet statische Musterprüfungen. " +
    "Sie ersetzt keinen JavaScript-Parser, Compiler oder echten Laufzeittest."
  );

  return lines.join("\n");
}

/* =====================================================
   7. SNAPSHOT- UND BACKUP-SYSTEM
   ===================================================== */

function createSnapshot(label = "Manuelle Sicherung") {
  const snapshot = {
    id: uid(),
    label: String(label || "Manuelle Sicherung").slice(0, 150),
    created: now(),
    data: {
      facts: clone(arr(data.facts)),
      memories: clone(arr(data.memories)),
      documents: clone(arr(data.documents)),
      projects: clone(arr(data.projects)),
      tasks: clone(arr(data.tasks)),
      snapshots: clone(arr(data.snapshots)),
      settings: clone(obj(data.settings) ? data.settings : {}),
      theme: data.theme,
      agentStats: clone(
        obj(data.agentStats) ? data.agentStats : {}
      )
    }
  };

  if (!Array.isArray(data.snapshots)) {
    data.snapshots = [];
  }

  data.snapshots.push(snapshot);

  // Höchstens 30 Sicherungen behalten.
  if (data.snapshots.length > 30) {
    data.snapshots =
      data.snapshots.slice(-30);
  }

  logAudit("snapshot_created", {
    id: snapshot.id,
    label: snapshot.label
  });

  save();

  return (
    "Sicherung erstellt: " +
    snapshot.label +
    "\nID: " + snapshot.id
  );
}

function restoreSnapshot(id) {
  const snapshot = arr(data.snapshots).find(item =>
    item && String(item.id) === String(id)
  );

  if (!snapshot || !obj(snapshot.data)) {
    return "Fehler: Sicherung nicht gefunden oder beschädigt.";
  }

  const source = snapshot.data;

  const arrayKeys = [
    "facts",
    "memories",
    "documents",
    "projects",
    "tasks"
  ];

  const backup = {};

  for (const key of arrayKeys) {
    backup[key] = clone(arr(data[key]));
  }

  backup.settings = clone(
    obj(data.settings) ? data.settings : {}
  );

  backup.theme = data.theme;

  backup.agentStats = clone(
    obj(data.agentStats) ? data.agentStats : {}
  );

  try {
    for (const key of arrayKeys) {
      if (Array.isArray(source[key])) {
        data[key] = clone(source[key]);
      }
    }

    if (obj(source.settings)) {
      data.settings = clone(source.settings);
    }

    if (typeof source.theme === "string") {
      data.theme = source.theme;
    }

    if (obj(source.agentStats)) {
      data.agentStats = clone(source.agentStats);
    }

    logAudit("snapshot_restored", {
      id: snapshot.id,
      label: snapshot.label
    });

    save();

    return (
      "Sicherung wiederhergestellt: " +
      snapshot.label
    );

  } catch (error) {
    for (const key of arrayKeys) {
      data[key] = backup[key];
    }

    data.settings = backup.settings;
    data.theme = backup.theme;
    data.agentStats = backup.agentStats;

    try {
      save();
    } catch {
      // Ursprünglicher Fehler bleibt maßgeblich.
    }

    return (
      "Fehler beim Wiederherstellen: " +
      String(error?.message || error)
    );
  }
}

/* =====================================================
   8. DATENEXPORT
   ===================================================== */

function exportData() {
  const payload = {
    app: NAME,
    version: VERSION,
    exported: now(),
    data: clone(data)
  };

  return JSON.stringify(payload, null, 2);
}

/* =====================================================
   9. SICHERER DATENIMPORT
   ===================================================== */

function importData(json) {
  let incoming;

  try {
    incoming =
      typeof json === "string"
        ? JSON.parse(json)
        : json;
  } catch {
    return "Fehler: Die Importdatei enthält ungültiges JSON.";
  }

  if (!obj(incoming)) {
    return "Fehler: Ungültiges Importformat.";
  }

  const source =
    obj(incoming.data)
      ? incoming.data
      : incoming;

  if (!obj(source)) {
    return "Fehler: Der Datenbereich fehlt.";
  }

  const arrayKeys = [
    "facts",
    "memories",
    "documents",
    "projects",
    "tasks",
    "snapshots"
  ];

  const validators = {
    facts: item =>
      obj(item) &&
      typeof item.subject === "string" &&
      item.subject.trim().length > 0,

    memories: item =>
      typeof item === "string" ||
      obj(item),

    documents: item =>
      obj(item) &&
      typeof item.title === "string" &&
      item.title.trim().length > 0,

    projects: item =>
      obj(item) &&
      typeof item.name === "string" &&
      item.name.trim().length > 0,

    tasks: item =>
      obj(item) &&
      typeof item.title === "string" &&
      item.title.trim().length > 0,

    snapshots: item =>
      obj(item) &&
      typeof item.id === "string" &&
      obj(item.data)
  };

  const prepared = {};
  const rejected = [];

  for (const key of arrayKeys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    if (!Array.isArray(source[key])) {
      rejected.push(
        key + ": Kein gültiges Array."
      );

      continue;
    }

    const original = source[key];

    const valid = original.filter(item => {
      try {
        return validators[key](item);
      } catch {
        return false;
      }
    });

    /*
      Wichtige Schutzregel:
      Ein nicht leeres Array mit ausschließlich ungültigen
      Einträgen darf vorhandene Daten nicht löschen.
    */

    if (original.length > 0 && valid.length === 0) {
      rejected.push(
        key + ": Alle Einträge waren ungültig. Vorhandene Daten bleiben erhalten."
      );

      continue;
    }

    prepared[key] = clone(valid);
  }

  const hasSettings =
    Object.prototype.hasOwnProperty.call(source, "settings") &&
    obj(source.settings);

  const hasTheme =
    Object.prototype.hasOwnProperty.call(source, "theme") &&
    typeof source.theme === "string";

  const hasAgentStats =
    Object.prototype.hasOwnProperty.call(source, "agentStats") &&
    obj(source.agentStats);

  if (
    !Object.keys(prepared).length &&
    !hasSettings &&
    !hasTheme &&
    !hasAgentStats
  ) {
    return (
      "Import abgebrochen: Es wurden keine gültigen Daten gefunden.\n" +
      rejected.join("\n")
    );
  }

  // Vor dem Import einen vollständigen Arbeitsspeicher-Abzug erstellen.
  const backup = clone(data);

  try {
    for (const key of arrayKeys) {
      if (
        Object.prototype.hasOwnProperty.call(prepared, key)
      ) {
        data[key] = prepared[key];
      }
    }

    if (hasSettings) {
      data.settings = clone(source.settings);
    }

    if (hasTheme) {
      data.theme = source.theme.slice(0, 100);
    }

    if (hasAgentStats) {
      const cleanStats = {};

      for (const [key, value] of Object.entries(source.agentStats)) {
        if (
          Object.prototype.hasOwnProperty.call(agents, key) &&
          Number.isFinite(Number(value)) &&
          Number(value) >= 0
        ) {
          cleanStats[key] = Math.floor(Number(value));
        }
      }

      data.agentStats = cleanStats;
    }

    logAudit("data_imported", {
      version: incoming.version || "unbekannt",
      importedSections: Object.keys(prepared)
    });

    save();

  } catch (error) {
    // Bei einem Fehler wird der vorherige Zustand wiederhergestellt.
    for (const key of Object.keys(data)) {
      delete data[key];
    }

    Object.assign(data, backup);

    try {
      save();
    } catch {
      // Keine weitere Änderung am ursprünglichen Fehler.
    }

    return (
      "Import fehlgeschlagen. Die vorherigen Daten wurden wiederhergestellt.\n" +
      String(error?.message || error)
    );
  }

  const importedCount = Object.values(prepared)
    .reduce((sum, items) => sum + items.length, 0);

  const lines = [
    "Datenimport erfolgreich.",
    "",
    "Importierte Einträge: " + importedCount,
    "Importierte Bereiche: " +
      (Object.keys(prepared).join(", ") || "Keine"),
    "Version: " + (incoming.version || "Unbekannt")
  ];

  if (rejected.length) {
    lines.push("");
    lines.push("HINWEISE:");

    rejected.forEach(message => {
      lines.push("- " + message);
    });
  }

  return lines.join("\n");
}

/* =====================================================
   TEIL 2 ENDE – TEIL 3 FOLGT
   ===================================================== */


/* =====================================================
   LERNBOT 6.0 – TEIL 3/3
   VERBESSERTE VERSION
   CHAT, LERNEN, WISSENSABRUF, DATEIEN UND UI
   ===================================================== */

/* =====================================================
   1. STATUS
   ===================================================== */

function setStatus(message) {
  const status =
    $("lb6-status") ||
    $("status") ||
    $("status-message");

  if (status) {
    status.textContent = String(message ?? "");
  } else {
    console.warn("[LernBot]", message);
  }
}

/* =====================================================
   2. BENUTZEROBERFLÄCHE
   ===================================================== */

const UI = {
  input() {
    return (
      $("lb6-input") ||
      $("chat-input") ||
      $("user-input") ||
      $("message-input") ||
      $("lb6-fallback-input")
    );
  },

  chat() {
    return (
      $("lb6-chat") ||
      $("chat-messages") ||
      $("messages") ||
      $("lb6-fallback-chat")
    );
  },

  send() {
    return (
      $("lb6-send") ||
      $("send-button") ||
      $("send-btn") ||
      $("lb6-fallback-send")
    );
  },

  file() {
    return (
      $("lb6-file") ||
      $("file-input") ||
      $("lb6-fallback-file")
    );
  }
};

let lb6Busy = false;
let lb6MessageCounter = 0;

/* =====================================================
   3. HILFSFUNKTIONEN
   ===================================================== */

function lb6Text(value) {
  if (value === null || value === undefined) return "";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function lb6Command(text, prefix) {
  const original = String(text ?? "").trim();
  const colon = original.indexOf(":");

  if (colon < 0) return null;

  const enteredPrefix = original.slice(0, colon + 1);

  if (normalize(enteredPrefix) !== normalize(prefix)) {
    return null;
  }

  return original.slice(colon + 1).trim();
}

function lb6Date(value) {
  if (!value) return "Unbekannt";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("de-DE");
}

function lb6Id(item) {
  return String(item?.id ?? "");
}

function lb6Title(item) {
  return String(
    item?.title ||
    item?.name ||
    item?.label ||
    item?.filename ||
    "Ohne Titel"
  );
}

function lb6RemoveTyping(element) {
  if (element?.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function lb6Error(error) {
  return error?.message || String(error);
}

/* =====================================================
   4. CHAT-NACHRICHTEN
   ===================================================== */

function addMessage(role, content) {
  const chat = UI.chat();
  const messageText = lb6Text(content);

  if (!chat) {
    console.log(`[LernBot ${role}]`, messageText);
    return null;
  }

  const message = document.createElement("div");

  message.className = "lb6-message lb6-" + role;
  message.dataset.messageId =
    "lb6-message-" + (++lb6MessageCounter);

  const body = document.createElement("div");

  body.className = "lb6-message-content";
  body.textContent = messageText;

  message.appendChild(body);
  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;

  return message;
}

function addTyping() {
  const chat = UI.chat();

  if (!chat) return null;

  const element = document.createElement("div");

  element.className = "lb6-typing";
  element.textContent = "LernBot denkt nach ...";

  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;

  return element;
}

function clearChat() {
  const chat = UI.chat();

  if (chat) chat.replaceChildren();
}

/* =====================================================
   5. DESIGN
   ===================================================== */

function installStyles() {
  if ($("lb6-styles")) return;

  const style = document.createElement("style");

  style.id = "lb6-styles";

  style.textContent = `
    .lb6-message {
      box-sizing: border-box;
      width: fit-content;
      max-width: 90%;
      padding: 11px 14px;
      margin: 9px 0;
      border-radius: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 14px;
    }

    .lb6-user {
      margin-left: auto;
      background: #2563eb;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .lb6-assistant {
      margin-right: auto;
      background: #252b38;
      color: #f4f4f5;
      border-bottom-left-radius: 4px;
    }

    .lb6-system {
      margin-left: auto;
      margin-right: auto;
      background: #454b58;
      color: white;
    }

    .lb6-message-content {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .lb6-typing {
      padding: 10px;
      opacity: .7;
      font-style: italic;
    }

    #lb6-fallback-root {
      box-sizing: border-box;
      width: 100%;
      max-width: 900px;
      margin: 20px auto;
      padding: 16px;
      border-radius: 16px;
      background: #171b24;
      color: white;
      font-family: Arial, sans-serif;
    }

    #lb6-fallback-root * {
      box-sizing: border-box;
    }

    #lb6-fallback-chat {
      height: 420px;
      overflow-y: auto;
      padding: 12px;
      margin-bottom: 12px;
      background: #10141c;
      border-radius: 12px;
    }

    #lb6-fallback-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    #lb6-fallback-input {
      flex: 1;
      min-width: 150px;
      padding: 12px;
      border: 1px solid #454c5c;
      border-radius: 9px;
      background: #242b38;
      color: white;
      font-size: 15px;
    }

    #lb6-fallback-root button,
    #lb6-fallback-file-label {
      padding: 12px 15px;
      border: 0;
      border-radius: 9px;
      background: #2563eb;
      color: white;
      cursor: pointer;
    }

    #lb6-fallback-root button:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    #lb6-fallback-file {
      display: none;
    }

    @media(max-width: 600px) {
      #lb6-fallback-chat {
        height: 55vh;
      }

      .lb6-message {
        max-width: 96%;
      }
    }
  `;

  (document.head || document.documentElement).appendChild(style);
}

/* =====================================================
   6. FALLBACK-OBERFLÄCHE
   ===================================================== */

function createFallbackUI() {
  let root = $("lb6-fallback-root");

  if (root) return root;

  root = document.createElement("section");
  root.id = "lb6-fallback-root";

  const heading = document.createElement("h2");
  heading.textContent = NAME;

  const description = document.createElement("p");
  description.textContent =
    "Dein persönlicher Lernassistent.";

  const chat = document.createElement("div");
  chat.id = "lb6-fallback-chat";

  const controls = document.createElement("div");
  controls.id = "lb6-fallback-controls";

  const input = document.createElement("input");
  input.id = "lb6-fallback-input";
  input.type = "text";
  input.placeholder = "Schreibe eine Nachricht ...";
  input.autocomplete = "off";

  const send = document.createElement("button");
  send.id = "lb6-fallback-send";
  send.type = "button";
  send.textContent = "Senden";

  const file = document.createElement("input");
  file.id = "lb6-fallback-file";
  file.type = "file";
  file.accept = ".txt,.md,.json,.csv,.html,.js,.css";

  const fileLabel = document.createElement("label");
  fileLabel.id = "lb6-fallback-file-label";
  fileLabel.htmlFor = "lb6-fallback-file";
  fileLabel.textContent = "Datei importieren";

  controls.append(input, send, fileLabel, file);
  root.append(heading, description, chat, controls);

  document.body.appendChild(root);

  return root;
}

/* =====================================================
   7. VERBESSERTES LERNSYSTEM
   ===================================================== */

/*
   Speichert jeden Lerninhalt als Dokument.

   Einfache Fakten werden zusätzlich in der
   strukturierten Wissensbank gespeichert.

   Dadurch gehen auch lange Texte nicht verloren.
*/

function getLearningResponse(value) {
  const content = safeText(value, 100000);

  if (!content) {
    return "Bitte gib einen Lerninhalt an.";
  }

  const factResult = learnFact(content);

  const existing = data.documents.find(document =>
    obj(document) &&
    document.type === "learned-text" &&
    normalize(document.content || "") === normalize(content)
  );

  if (existing) {
    return [
      factResult || "Der Inhalt ist bereits gespeichert.",
      "",
      "Dokument-ID: " + existing.id
    ].join("\n");
  }

  const document = {
    id: uid(),
    title: "Lerninhalt: " + content.slice(0, 75),
    type: "learned-text",
    content,
    created: now(),
    length: content.length
  };

  data.documents.push(document);

  remember(
    "lerninhalt",
    "Lerninhalt gespeichert: " + document.title,
    {
      documentId: document.id
    }
  );

  logAudit(
    "Lern-KI",
    "Lerninhalt gespeichert",
    document.title
  );

  const saved = save();

  if (!saved) {
    return "Der Inhalt wurde verarbeitet, aber nicht dauerhaft gespeichert. Prüfe deinen Browser-Speicher.";
  }

  return [
    factResult || "Neuer Lerninhalt erfolgreich gespeichert!",
    "",
    "DOKUMENT GESPEICHERT",
    "Titel: " + document.title,
    "Zeichen: " + content.length,
    "Wörter: " + content.split(/\s+/).filter(Boolean).length,
    "Dokument-ID: " + document.id,
    "",
    "Du kannst den Inhalt später mit „Dokument suchen:“ wiederfinden."
  ].join("\n");
}

async function getResearchResponse(query) {
  const content = safeText(query, 1000);

  if (!content) {
    return "Bitte gib ein Recherchethema an.";
  }

  return await research(content);
}

/* =====================================================
   8. GEDÄCHTNIS
   ===================================================== */

function getMemoryList() {
  const memories = arr(data.memory);

  if (!memories.length) {
    return "Es sind noch keine Erinnerungen gespeichert.";
  }

  return memories.map((item, index) => [
    `${index + 1}. ${item.content || ""}`,
    `ID: ${item.id || "Keine ID"}`,
    `Typ: ${item.type || "Allgemein"}`,
    `Erstellt: ${lb6Date(item.created)}`
  ].join("\n")).join("\n\n");
}

function rememberResponse(value) {
  const content = safeText(value, 10000);

  if (!content) {
    return "Bitte gib einen Inhalt an, den ich mir merken soll.";
  }

  const result = remember("notiz", content);

  if (!result) {
    return "Die Erinnerung konnte nicht gespeichert werden.";
  }

  return [
    "Erinnerung erfolgreich gespeichert.",
    "",
    content,
    "",
    "Erinnerungs-ID: " + result.id
  ].join("\n");
}

function forgetResponse(value) {
  const query = safeText(value, 500);

  if (!query || !normalize(query)) {
    return "Bitte gib einen konkreten Suchbegriff zum Löschen an.";
  }

  const removed = forgetMemory(query);

  if (!removed) {
    return "Ich habe keine passende Erinnerung gefunden.";
  }

  return `${removed} Erinnerung(en) wurden gelöscht.`;
}

/* =====================================================
   9. DOKUMENTENWISSEN FÜR FRAGEN
   ===================================================== */

/*
   Sucht passende Dokumente und zeigt relevante
   Textstellen an.

   Der Bot gibt dabei gespeicherte Inhalte wieder
   und behauptet nicht, unbekanntes Wissen zu besitzen.
*/

function getDocumentKnowledge(query) {
  query = safeText(query, 1000);

  if (!query) return null;

  const results = searchDocuments(query);

  if (!results.length) return null;

  const output = [];

  for (const result of results.slice(0, 3)) {
    const document = result.document;

    if (!document || !document.content) continue;

    const sentences = document.content
      .replace(/\s+/g, " ")
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];

    const queryWords = new Set(tokenize(query));

    const ranked = sentences
      .map(sentence => {
        const words = tokenize(sentence);
        let score = 0;

        for (const word of words) {
          if (queryWords.has(word)) score++;
        }

        return {
          sentence: sentence.trim(),
          score
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const selected = ranked
      .slice(0, 4)
      .map(item => "• " + item.sentence);

    if (!selected.length) {
      selected.push(
        safeText(document.content, 500)
      );
    }

    output.push([
      "QUELLE: " + lb6Title(document),
      ...selected
    ].join("\n"));
  }

  if (!output.length) return null;

  return [
    "IN MEINEN GESPEICHERTEN DOKUMENTEN GEFUNDEN:",
    "",
    ...output
  ].join("\n\n");
}

/* =====================================================
   10. WISSEN ABRUFEN
   ===================================================== */

function getKnowledgeResponse(topic) {
  topic = safeText(topic, 1000);

  if (!topic) {
    return "Bitte gib ein Thema an.";
  }

  const directAnswer = answerFact(topic);

  if (directAnswer) {
    return directAnswer;
  }

  const facts = findRelatedFacts(topic, 10);
  const documentKnowledge = getDocumentKnowledge(topic);

  const explanation = explainTopic(topic);

  const hasExplanation =
    explanation &&
    !explanation.includes(
      "noch nicht genügend eigenes Wissen"
    );

  if (hasExplanation && documentKnowledge) {
    return [
      explanation,
      "",
      documentKnowledge
    ].join("\n\n");
  }

  if (hasExplanation) return explanation;

  if (documentKnowledge) return documentKnowledge;

  if (facts.length) {
    return [
      "VERWANDTES GESPEICHERTES WISSEN",
      "",
      ...facts.map(f =>
        `• ${f.subject}: ${f.property} – ${f.value}`
      )
    ].join("\n");
  }

  return `Zu "${topic}" habe ich noch keine passenden Informationen gespeichert.`;
}

/* =====================================================
   11. DOKUMENTENVERWALTUNG
   ===================================================== */

function getDocumentList() {
  const documents = arr(data.documents);

  if (!documents.length) {
    return "Es sind noch keine Dokumente gespeichert.";
  }

  return documents.map((document, index) => [
    `${index + 1}. ${lb6Title(document)}`,
    `ID: ${lb6Id(document) || "Keine ID"}`,
    `Typ: ${document.type || "Unbekannt"}`,
    `Zeichen: ${document.length || document.content?.length || 0}`,
    `Erstellt: ${lb6Date(document.created)}`
  ].join("\n")).join("\n\n");
}

function searchDocumentResponse(query) {
  query = safeText(query, 500);

  if (!query) return getDocumentList();

  const results = searchDocuments(query);

  if (!results.length) {
    return "Keine passenden Dokumente gefunden.";
  }

  return results.map((result, index) => {
    const document = result?.document;

    if (!document) return null;

    const score = Number(result.score);

    return [
      `${index + 1}. ${lb6Title(document)}`,
      `ID: ${lb6Id(document)}`,
      `Trefferwert: ${
        Number.isFinite(score) ? score.toFixed(2) : "Unbekannt"
      }`,
      `Inhalt: ${safeText(document.content || "", 500)}`
    ].join("\n");
  }).filter(Boolean).join("\n\n");
}

function summarizeDocumentResponse(query) {
  query = safeText(query, 500);

  if (!query) {
    return [
      "Bitte gib eine Dokument-ID oder einen Titel an.",
      "",
      getDocumentList()
    ].join("\n");
  }

  const documents = arr(data.documents);

  const document = documents.find(item =>
    lb6Id(item) === query ||
    normalize(lb6Title(item)) === normalize(query)
  );

  if (!document) {
    return [
      "Dokument nicht gefunden.",
      "",
      getDocumentList()
    ].join("\n");
  }

  if (!document.content) {
    return "Dieses Dokument besitzt keinen gespeicherten Textinhalt.";
  }

  return summarizeDocument(document.id);
}

/* =====================================================
   12. PROJEKTE UND AUFGABEN
   ===================================================== */

function getProjectResponse() {
  return listProjects();
}

function getTaskResponse() {
  return listTasks();
}

function createTaskResponse(title) {
  title = safeText(title, 500);

  if (!title) {
    return "Bitte gib einen Aufgabentitel an.";
  }

  const previousIds = new Set(
    arr(data.tasks).map(task => task.id)
  );

  const result = createTask(title);

  const createdTask = arr(data.tasks).find(
    task => !previousIds.has(task.id)
  );

  if (!createdTask) return lb6Text(result);

  return lb6Text(result) +
    "\nAufgaben-ID: " + createdTask.id;
}

function completeTaskResponse(id) {
  id = safeText(id, 200);

  if (!id) {
    return "Bitte gib die genaue Aufgaben-ID an.";
  }

  const task = arr(data.tasks).find(item =>
    item.id === id
  );

  if (!task) {
    return "Ich konnte keine Aufgabe mit dieser ID finden.";
  }

  if (task.done) {
    return "Diese Aufgabe ist bereits erledigt.";
  }

  return completeTask(id);
}

/* =====================================================
   13. SICHERUNGEN UND EXPORT
   ===================================================== */

function getSnapshotList() {
  const snapshots = arr(data.snapshots);

  if (!snapshots.length) {
    return "Es sind noch keine Sicherungen vorhanden.";
  }

  return snapshots.map((snapshot, index) => [
    `${index + 1}. ${snapshot.label || "Sicherung"}`,
    `ID: ${snapshot.id || "Keine ID"}`,
    `Datum: ${lb6Date(snapshot.time)}`
  ].join("\n")).join("\n\n");
}

function createSnapshotResponse() {
  const result = createSnapshot("Manuelle Sicherung");

  const snapshots = arr(data.snapshots);
  const newest = snapshots[snapshots.length - 1];

  return lb6Text(result) +
    (newest ? "\nSicherungs-ID: " + newest.id : "");
}

function restoreSnapshotResponse(id) {
  id = safeText(id, 200);

  if (!id) {
    return [
      "Bitte gib eine Sicherungs-ID an.",
      "",
      getSnapshotList()
    ].join("\n");
  }

  const exists = arr(data.snapshots).some(snapshot =>
    snapshot.id === id
  );

  if (!exists) {
    return "Diese Sicherung wurde nicht gefunden.";
  }

  return restoreSnapshot(id);
}

function downloadExport() {
  let url = null;

  try {
    const json = exportData();

    if (typeof json !== "string") {
      throw new Error("Ungültiges Exportformat.");
    }

    const blob = new Blob(
      [json],
      { type: "application/json;charset=utf-8" }
    );

    url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download =
      "LernBot-6-Backup-" +
      new Date().toISOString().slice(0, 10) +
      ".json";

    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    return "Der JSON-Datenexport wurde gestartet.";

  } catch (error) {
    console.error("Exportfehler:", error);

    return "Export fehlgeschlagen:\n" + lb6Error(error);

  } finally {
    if (url) {
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }
}

/* =====================================================
   14. DATEIIMPORT
   ===================================================== */

async function handleFileUpload(event) {
  const file = event?.target?.files?.[0];

  if (!file) return;

  addMessage("system", "Importiere: " + file.name);

  const typing = addTyping();

  try {
    const content = await file.text();

    if (!content.trim()) {
      throw new Error("Die Datei ist leer.");
    }

    let result;

    if (file.name.toLowerCase().endsWith(".json")) {
      let parsed;

      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error("Die JSON-Datei ist ungültig.");
      }

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error("Das JSON enthält kein gültiges Datenobjekt.");
      }

      result = importData(content);

    } else {
      result = importDocumentText(content, file.name);
    }

    lb6RemoveTyping(typing);
    addMessage("assistant", result);

    save();

  } catch (error) {
    lb6RemoveTyping(typing);

    console.error("Dateiimport fehlgeschlagen:", error);

    addMessage(
      "assistant",
      "Dateiimport fehlgeschlagen:\n" + lb6Error(error)
    );

  } finally {
    if (event?.target) {
      event.target.value = "";
    }
  }
}

/* =====================================================
   15. HILFE
   ===================================================== */

function getHelpText() {
  return `
LERNBOT 6.0 – BEFEHLE

LERNEN
Lerne: Die Hauptstadt von Deutschland ist Berlin.
Lerne: Hier kommt ein längerer Text über ein Thema.

WISSEN
Wissensübersicht
Wissen: Okapi
Erkläre: Photosynthese
Wissensgraph: Okapi
Wissensanalyse
Analysiere: Okapi

GEDÄCHTNIS
Merke dir: Ich lerne gerne.
Erinnerungen
Vergiss: Suchbegriff

RECHERCHE
Recherchiere: Schwarze Löcher

AGENTEN
Agenten

PROJEKTE
Projekt erstellen: Mein Projekt
Projekte

AUFGABEN
Aufgabe erstellen: Mathematik lernen
Aufgaben
Aufgabe erledigt: AUFGABEN-ID

DOKUMENTE
Dokumente
Dokument suchen: Suchbegriff
Dokument zusammenfassen: DOKUMENT-ID

SICHERUNGEN
Sicherung erstellen
Sicherungen
Sicherung wiederherstellen: SICHERUNGS-ID
Export

CODE
Code prüfen: DEIN QUELLCODE

Du kannst auch normale Fragen stellen.
  `.trim();
}

/* =====================================================
   16. ZENTRALE BEFEHLSVERARBEITUNG
   ===================================================== */

async function handle(text) {
  text = safeText(text, 100000);

  if (!text) {
    return "Bitte schreibe zuerst eine Nachricht.";
  }

  const lower = normalize(text);

  try {

    /* HILFE */

    if (
      lower === "hilfe" ||
      lower === "/hilfe" ||
      lower === "befehle"
    ) {
      return getHelpText();
    }

    /* BEGRÜSSUNG */

    if (
      ["hi", "hallo", "hey", "guten tag"].includes(lower)
    ) {
      return "Hallo! Ich bin " + NAME + ". Was möchtest du lernen?";
    }

    /* LERNEN */

    let value = lb6Command(text, "Lerne:");

    if (value !== null) {
      return getLearningResponse(value);
    }

    /* WISSENSÜBERSICHT */

    if (lower === "wissensübersicht") {
      return knowledgeOverview();
    }

    /* WISSENSANALYSE */

    if (lower === "wissensanalyse") {
      return analyzeKnowledge();
    }

    /* WISSENSGRAPH */

    value = lb6Command(text, "Wissensgraph:");

    if (value !== null) {
      if (!value) return "Bitte gib ein Thema an.";

      return graphReport(value);
    }

    /* WISSEN UND ERKLÄREN */

    value = lb6Command(text, "Wissen:");

    if (value !== null) {
      return getKnowledgeResponse(value);
    }

    value = lb6Command(text, "Erkläre:");

    if (value !== null) {
      return getKnowledgeResponse(value);
    }

    /* RECHERCHE */

    value = lb6Command(text, "Recherchiere:");

    if (value !== null) {
      return await getResearchResponse(value);
    }

    /* GEDÄCHTNIS SPEICHERN */

    value = lb6Command(text, "Merke dir:");

    if (value !== null) {
      return rememberResponse(value);
    }

    value = lb6Command(text, "Merke:");

    if (value !== null) {
      return rememberResponse(value);
    }

    /* GEDÄCHTNIS ANZEIGEN */

    if (
      lower === "erinnerungen" ||
      lower === "zeige erinnerungen"
    ) {
      return getMemoryList();
    }

    /* GEDÄCHTNIS LÖSCHEN */

    value = lb6Command(text, "Vergiss:");

    if (value !== null) {
      return forgetResponse(value);
    }

    /* DOKUMENTE */

    if (lower === "dokumente") {
      return getDocumentList();
    }

    value = lb6Command(text, "Dokument suchen:");

    if (value !== null) {
      return searchDocumentResponse(value);
    }

    value = lb6Command(text, "Dokument zusammenfassen:");

    if (value !== null) {
      return summarizeDocumentResponse(value);
    }

    /* PROJEKTE */

    if (lower === "projekte") {
      return getProjectResponse();
    }

    value = lb6Command(text, "Projekt erstellen:");

    if (value !== null) {
      if (!value) return "Bitte gib einen Projektnamen an.";

      return createProject(value);
    }

    /* AUFGABEN */

    if (lower === "aufgaben") {
      return getTaskResponse();
    }

    value = lb6Command(text, "Aufgabe erstellen:");

    if (value !== null) {
      return createTaskResponse(value);
    }

    value = lb6Command(text, "Aufgabe erledigt:");

    if (value !== null) {
      return completeTaskResponse(value);
    }

    /* AGENTEN */

    if (lower === "agenten") {
      return agentOverview();
    }

    /* SICHERUNGEN */

    if (
      lower === "sicherung erstellen" ||
      lower === "sicherung speichern"
    ) {
      return createSnapshotResponse();
    }

    if (lower === "sicherungen") {
      return getSnapshotList();
    }

    value = lb6Command(text, "Sicherung wiederherstellen:");

    if (value !== null) {
      return restoreSnapshotResponse(value);
    }

    /* EXPORT */

    if (
      lower === "export" ||
      lower === "daten exportieren"
    ) {
      return downloadExport();
    }

    /* CODEPRÜFUNG */

    value = lb6Command(text, "Code prüfen:");

    if (value !== null) {
      if (!value) {
        return "Bitte füge den zu prüfenden Code ein.";
      }

      return inspectCodeReport(value);
    }

    /* ANALYSE */

    value = lb6Command(text, "Analysiere:");

    if (value !== null) {
      if (!value) {
        return "Bitte gib einen Inhalt oder ein Thema an.";
      }

      return await agentRunAsync("analyse", async () => {
        const facts = findRelatedFacts(value, 10);
        const explanation = explainTopic(value);
        const documents = getDocumentKnowledge(value);

        return [
          "ANALYSEERGEBNIS",
          "",
          explanation,
          documents || "",
          "",
          "VERWANDTE FAKTEN",
          facts.length
            ? facts.map(f =>
                `• ${f.subject}: ${f.property} – ${f.value}`
              ).join("\n")
            : "Keine verwandten Fakten gefunden."
        ].filter(Boolean).join("\n");
      });
    }

    /* ALLGEMEINE FRAGEN */

    const knowledge = getKnowledgeResponse(text);

    if (
      knowledge &&
      !knowledge.includes("noch keine passenden Informationen gespeichert")
    ) {
      return knowledge;
    }

    return [
      "Dazu habe ich noch keine ausreichenden Informationen in meiner Wissensbank.",
      "",
      "Du kannst mir das Thema mit „Lerne: ...“ beibringen oder mit „Recherchiere: ...“ recherchieren."
    ].join("\n");

  } catch (error) {
    console.error("LernBot Befehlsfehler:", error);

    return [
      "Bei der Verarbeitung ist ein Fehler aufgetreten:",
      "",
      lb6Error(error)
    ].join("\n");
  }
}

/* =====================================================
   17. NACHRICHTEN SENDEN
   ===================================================== */

async function sendMessage() {
  if (lb6Busy) return;

  const input = UI.input();

  if (!input) {
    console.error("LernBot: Eingabefeld nicht gefunden.");
    return;
  }

  const messageText = String(input.value || "").trim();

  if (!messageText) return;

  lb6Busy = true;

  const send = UI.send();

  if (send) send.disabled = true;

  input.value = "";

  addMessage("user", messageText);

  const typing = addTyping();

  try {
    const response = await handle(messageText);

    lb6RemoveTyping(typing);

    addMessage(
      "assistant",
      response === undefined || response === null
        ? "Die Verarbeitung hat keine Antwort zurückgegeben."
        : response
    );

    save();

  } catch (error) {
    lb6RemoveTyping(typing);

    console.error("LernBot Sendefehler:", error);

    addMessage(
      "assistant",
      "Unerwarteter Fehler:\n" + lb6Error(error)
    );

  } finally {
    lb6Busy = false;

    if (send) send.disabled = false;

    if (document.activeElement !== input) {
      input.focus();
    }
  }
}

/* =====================================================
   18. CHAT-EINRICHTUNG
   ===================================================== */

function setupChat() {
  const input = UI.input();
  const send = UI.send();

  if (!input) {
    console.warn("LernBot: Kein Eingabefeld vorhanden.");
    return;
  }

  if (input.dataset.lb6Bound !== "true") {
    input.dataset.lb6Bound = "true";

    input.addEventListener("keydown", event => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.isComposing
      ) {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  if (send && send.dataset.lb6Bound !== "true") {
    send.dataset.lb6Bound = "true";
    send.addEventListener("click", sendMessage);
  }
}

/* =====================================================
   19. DATEI-EINRICHTUNG
   ===================================================== */

function setupFileUpload() {
  const file = UI.file();

  if (!file || file.dataset.lb6Bound === "true") {
    return;
  }

  file.dataset.lb6Bound = "true";

  file.addEventListener("change", handleFileUpload);
}

/* =====================================================
   20. EXPORT-BUTTONS
   ===================================================== */

function setupExportButtons() {
  const buttons = document.querySelectorAll(
    "[data-lb6-export], #lb6-export, #export-button, #export-btn"
  );

  buttons.forEach(button => {
    if (button.dataset.lb6Bound === "true") return;

    button.dataset.lb6Bound = "true";

    button.addEventListener("click", () => {
      const result = downloadExport();
      addMessage("system", result);
    });
  });
}

/* =====================================================
   21. SYSTEMSTART
   ===================================================== */

function startLernBot() {
  if (
    document.documentElement.dataset.lb6Started === "true"
  ) {
    return;
  }

  document.documentElement.dataset.lb6Started = "true";

  try {
    installStyles();

    if (!UI.input() || !UI.chat()) {
      createFallbackUI();
    }

    setupChat();
    setupFileUpload();
    setupExportButtons();

    if (UI.chat() && !UI.chat().children.length) {
      addMessage(
        "assistant",
        "Hallo! Ich bin " + NAME + ".\n\n" +
        "Dein LernBot ist bereit.\n\n" +
        "Schreibe „Hilfe“, um alle Funktionen und Befehle zu sehen."
      );
    }

    console.log(NAME + " erfolgreich gestartet.");

  } catch (error) {
    console.error("LernBot Startfehler:", error);

    document.documentElement.dataset.lb6Started = "false";

    addMessage(
      "assistant",
      "Der LernBot konnte nicht vollständig gestartet werden:\n" +
      lb6Error(error)
    );
  }
}

/* =====================================================
   22. SYSTEMSTART AUSFÜHREN
   ===================================================== */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startLernBot,
    { once: true }
  );
} else {
  startLernBot();
}

/* =====================================================
   ENDE LERNBOT 6.0 – TEIL 3/3
   ===================================================== */

})();
