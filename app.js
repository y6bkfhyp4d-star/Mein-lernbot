/* =====================================================
   LERNBOT 6.0 – NEUFASSUNG
   TEIL 1/3 – KERN, DATENBANK, GEDÄCHTNIS, WISSENSBANK
   ===================================================== */

(() => {
"use strict";

/* =====================================================
   1. GRUNDLAGEN
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
    .filter(word => word.length > 2 && !stop.has(word));
}

function similarity(a, b) {
  const first = new Set(tokenize(a));
  const second = new Set(tokenize(b));

  if (!first.size || !second.size) return 0;

  let common = 0;

  for (const word of first) {
    if (second.has(word)) common++;
  }

  return common / Math.max(first.size, second.size);
}

function formatDate(value) {
  if (!value) return "Unbekannt";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("de-DE");
}

function asReadable(value) {
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

/* =====================================================
   2. DATENBANK UND MIGRATION
   ===================================================== */

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

let data = {};

try {
  const stored = localStorage.getItem(KEY);

  if (stored) {
    const parsed = JSON.parse(stored);

    if (obj(parsed)) data = parsed;
  }
} catch (error) {
  console.error("LernBot: Datenbank konnte nicht geladen werden.", error);
  data = {};
}

if (!obj(data)) data = {};

/*
   Ältere Versionen verwendeten teilweise "memories".
   Die Daten werden einmalig in "memory" übernommen.
*/

if (!Array.isArray(data.memory) && Array.isArray(data.memories)) {
  data.memory = data.memories;
}

if (Array.isArray(data.memory) && Array.isArray(data.memories)) {
  const known = new Set(
    data.memory.map(item =>
      item?.id || `${item?.type}|${item?.content}`
    )
  );

  for (const item of data.memories) {
    const key = item?.id || `${item?.type}|${item?.content}`;

    if (!known.has(key)) {
      data.memory.push(item);
      known.add(key);
    }
  }
}

delete data.memories;

/* Fehlende Datenbereiche ergänzen */

for (const [key, value] of Object.entries(defaults)) {
  if (data[key] === undefined || data[key] === null) {
    data[key] = clone(value);
  }
}

/* Array-Bereiche absichern */

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
  if (!Array.isArray(data[key])) data[key] = [];
}

/* Objekt-Bereiche absichern */

if (!obj(data.agentStats)) data.agentStats = {};
if (!obj(data.settings)) data.settings = {};

/* Einstellungen ergänzen */

data.settings = {
  ...clone(defaults.settings),
  ...data.settings
};

if (typeof data.theme !== "string") {
  data.theme = "dark";
}

data.version = VERSION;

/* =====================================================
   3. DATEN VALIDIEREN
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

for (const key of [
  "documents",
  "projects",
  "tasks",
  "classes",
  "log",
  "audit",
  "improvements",
  "codeProposals",
  "snapshots"
]) {
  data[key] = data[key].filter(obj);
}

/* =====================================================
   4. SPEICHERSYSTEM
   ===================================================== */

function setStatus(message) {
  const status =
    $("status") ||
    $("lb6-status") ||
    $("status-message");

  if (status) status.textContent = String(message ?? "");
}

function save() {
  data.version = VERSION;

  data.log = arr(data.log).slice(-150);
  data.audit = arr(data.audit).slice(-1000);
  data.memory = arr(data.memory).slice(-1000);
  data.snapshots = arr(data.snapshots).slice(-30);

  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("LernBot: Speichern fehlgeschlagen.", error);
    setStatus("Speicherfehler – bitte Daten exportieren.");
    return false;
  }
}

function logAudit(agent, action, detail = "") {
  data.audit.push({
    id: uid(),
    agent: safeText(agent, 100),
    action: typeof action === "string"
      ? safeText(action, 200)
      : safeText(asReadable(action), 200),
    detail: typeof detail === "string"
      ? safeText(detail, 1000)
      : safeText(asReadable(detail), 1000),
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

  if (!type || !content) return null;

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

  limit = Math.max(1, Math.min(100, Number(limit) || 8));

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
  if (!safeText(subject)) return data.facts;

  return data.facts.filter(item =>
    sameSubject(item.subject, subject)
  );
}

function addFact(subject, property, value, source = "user") {
  subject = cleanSubject(subject);
  property = normalize(property);
  value = safeText(value, 5000);
  source = safeText(source, 100);

  if (!subject || !property || !value) return false;

  let existing = data.facts.find(item =>
    sameSubject(item.subject, subject) &&
    normalize(item.property) === property
  );

  if (existing) {
    const oldValue = existing.value;

    if (normalize(oldValue) !== normalize(value)) {
      existing.previous = oldValue;
      existing.conflict = true;
      existing.alternatives = arr(existing.alternatives);

      const oldExists = existing.alternatives.some(item =>
        obj(item) &&
        normalize(item.value) === normalize(oldValue)
      );

      if (oldValue && !oldExists) {
        existing.alternatives.push({
          value: oldValue,
          source: existing.source || "unbekannt",
          time: now()
        });
      }

      const newExists = existing.alternatives.some(item =>
        obj(item) &&
        normalize(item.value) === normalize(value)
      );

      if (!newExists) {
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
    { subject, property, source }
  );

  save();
  return true;
}

/* =====================================================
   7. FAKTEN ERKENNEN UND LERNEN
   ===================================================== */

function parseFact(text) {
  const s = safeText(text);
  if (!s || s.includes("?")) return null;

  let match;

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
  if (!fact) return null;

  const success = addFact(
    fact.subject,
    fact.property,
    fact.value,
    "user"
  );

  if (!success) return null;

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

  if (/\bhauptstadt\b/.test(q)) {
    property = "hauptstadt";
  } else if (
    /\b(wo lebt|wo wohnt|lebensraum|lebensgebiet|in welchem land lebt)\b/.test(q)
  ) {
    property = "lebensraum";
  } else if (
    /\b(was frisst|was isst|nahrung|ernaehrung)\b/.test(q)
  ) {
    property = "nahrung";
  } else if (
    /\b(zu welcher tierart|zu welcher familie|welcher familie|welcher tierart|gehoert zu|tierart)\b/.test(q)
  ) {
    property = "zugehoerigkeit";
  } else if (
    /^(was ist|wer ist|was bedeutet|erklaere)\b/.test(q)
  ) {
    property = "definition";
  }

  if (!property) return null;

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
      /^welcher tierart gehoert (?:der|die|das)?\s*(.+)$/
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

    if (!groups[subject]) groups[subject] = [];
    groups[subject].push(fact);
  }

  const lines = ["MEIN LANGZEITWISSEN", ""];

  for (const [subject, facts] of Object.entries(groups)) {
    lines.push(subject);

    for (const fact of facts) {
      lines.push(`• ${fact.property}: ${fact.value}`);

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

  if (!from || !to || !relation) return false;

  const exists = data.relationships.some(item =>
    sameSubject(item.from, from) &&
    sameSubject(item.to, to) &&
    normalize(item.relation) === normalize(relation)
  );

  if (exists) return true;

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
  if (!safeText(subject)) return [];

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
   ENDE TEIL 1/3
   TEIL 2 DIREKT DARUNTER EINFÜGEN
   ===================================================== */
/* =====================================================
   LERNBOT 6.0 – TEIL 2/3
   AGENTEN, RECHERCHE, DOKUMENTE, PROJEKTE, CODE, BACKUP
   ===================================================== */

/* =====================================================
   1. AGENTENSYSTEM
   ===================================================== */

const agents = {
  lern: {
    name: "Lern-KI",
    description: "Speichert und strukturiert Lerninhalte.",
    run: text => getLearningResponse(text)
  },

  analyse: {
    name: "Analyse-KI",
    description: "Analysiert gespeichertes Wissen und Zusammenhänge.",
    run: text => analyzeKnowledge(text)
  },

  recherche: {
    name: "Recherche-KI",
    description: "Sucht Informationen in externen Wissensquellen.",
    run: text => research(text)
  },

  gedächtnis: {
    name: "Gedächtnis-KI",
    description: "Verwaltet langfristige Erinnerungen.",
    run: text => searchMemory(text)
  },

  projekt: {
    name: "Projekt-KI",
    description: "Verwaltet Projekte und Aufgaben.",
    run: () => listProjects()
  },

  dokument: {
    name: "Dokumenten-KI",
    description: "Importiert, durchsucht und fasst Dokumente zusammen.",
    run: text => searchDocuments(text)
  },

  code: {
    name: "Code-KI",
    description: "Prüft Quellcode anhand statischer Regeln.",
    run: text => inspectCodeReport(text)
  },

  antwort: {
    name: "Antwort-KI",
    description: "Beantwortet Fragen anhand gespeicherter Informationen.",
    run: text => getKnowledgeResponse(text)
  },

  meta: {
    name: "Meta-KI",
    description: "Überwacht und koordiniert die Agenten.",
    run: () => agentOverview()
  }
};

function agentRun(name, input = "") {
  const agent = agents[name];

  if (!agent) {
    return "Unbekannter Agent: " + name;
  }

  countAgent(name);

  logAudit(
    agent.name,
    "Agent ausgeführt",
    safeText(input, 500)
  );

  try {
    const result = agent.run(input);
    save();
    return result;
  } catch (error) {
    console.error("Agentenfehler:", name, error);
    return "Fehler im Agenten " + agent.name + ": " + error.message;
  }
}

async function agentRunAsync(name, callback) {
  const agent = agents[name];

  if (!agent) {
    return "Unbekannter Agent: " + name;
  }

  countAgent(name);

  logAudit(
    agent.name,
    "Agent gestartet",
    "Asynchrone Ausführung"
  );

  try {
    const result = await callback();
    logAudit(agent.name, "Agent abgeschlossen", "");
    save();
    return result;
  } catch (error) {
    logAudit(agent.name, "Agentenfehler", error.message);
    console.error("Agentenfehler:", error);
    return "Der Agent " + agent.name + " ist auf einen Fehler gestoßen: " + error.message;
  }
}

function agentOverview() {
  const lines = [
    "LERNBOT 6.0 – KI-AGENTEN",
    ""
  ];

  for (const [key, agent] of Object.entries(agents)) {
    lines.push(
      `${agent.name}`,
      `Funktion: ${agent.description}`,
      `Ausführungen: ${Number(data.agentStats[key]) || 0}`,
      ""
    );
  }

  return lines.join("\n");
}

/* =====================================================
   2. WISSENSANALYSE
   ===================================================== */

function analyzeKnowledge(topic = "") {
  const facts = arr(data.facts);
  const memories = arr(data.memory);
  const documents = arr(data.documents);
  const relationships = arr(data.relationships);

  const selectedFacts = topic
    ? facts.filter(item =>
        similarity(topic, item.subject) > 0.05 ||
        similarity(topic, item.value) > 0.05
      )
    : facts;

  const selectedMemories = topic
    ? memories.filter(item =>
        similarity(topic, item.content) > 0.05
      )
    : memories;

  const selectedDocuments = topic
    ? documents.filter(item =>
        similarity(topic, item.title) > 0.05 ||
        similarity(topic, item.content || "") > 0.05
      )
    : documents;

  const selectedRelationships = topic
    ? relationships.filter(item =>
        similarity(topic, item.from) > 0.05 ||
        similarity(topic, item.to) > 0.05
      )
    : relationships;

  const conflicts = selectedFacts.filter(item => item.conflict);

  return [
    "WISSENSANALYSE",
    topic ? `Thema: ${topic}` : "Gesamter Wissensbestand",
    "",
    "WISSENSBESTAND",
    `Fakten: ${selectedFacts.length}`,
    `Erinnerungen: ${selectedMemories.length}`,
    `Dokumente: ${selectedDocuments.length}`,
    `Verbindungen: ${selectedRelationships.length}`,
    `Fakten mit widersprüchlichen Angaben: ${conflicts.length}`,
    "",
    "AGENTENAKTIVITÄT",
    ...Object.entries(data.agentStats).map(([name, count]) =>
      `${name}: ${Number(count) || 0} Ausführungen`
    ),
    "",
    conflicts.length
      ? "HINWEIS: Es gibt Fakten mit unterschiedlichen gespeicherten Angaben. Diese sollten geprüft werden."
      : "Keine widersprüchlichen Fakten in der ausgewählten Wissensmenge erkannt."
  ].join("\n");
}

function findRelatedFacts(query, limit = 10) {
  const q = safeText(query);

  if (!q) return [];

  return data.facts
    .map(fact => ({
      ...fact,
      score: Math.max(
        similarity(q, fact.subject),
        similarity(q, fact.property),
        similarity(q, fact.value)
      )
    }))
    .filter(fact => fact.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Number(limit) || 10));
}

function explainTopic(topic) {
  topic = safeText(topic, 1000);

  if (!topic) return "";

  const exactFacts = getFacts(topic);
  const relatedFacts = findRelatedFacts(topic, 8);

  const facts = exactFacts.length
    ? exactFacts
    : relatedFacts;

  if (!facts.length) {
    return `Zu "${topic}" habe ich noch nicht genügend eigenes Wissen gespeichert.`;
  }

  return [
    "GESPEICHERTES WISSEN ZU " + topic.toLocaleUpperCase("de"),
    "",
    ...facts.map(fact =>
      `• ${fact.subject}: ${fact.property} – ${fact.value}`
    )
  ].join("\n");
}

/* =====================================================
   3. EXTERNE RECHERCHE
   ===================================================== */

async function fetchJSON(url, timeout = 10000) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP-Fehler ${response.status}`);
    }

    return await response.json();

  } finally {
    clearTimeout(timer);
  }
}

function encodeQuery(value) {
  return encodeURIComponent(safeText(value, 500));
}

async function searchWikipedia(query) {
  const url =
    "https://de.wikipedia.org/api/rest_v1/page/summary/" +
    encodeQuery(query);

  const result = await fetchJSON(url);

  if (!result || !result.extract) return null;

  return {
    source: "Wikipedia",
    title: result.title || query,
    text: result.extract,
    url: result.content_urls?.desktop?.page || ""
  };
}

async function searchWikidata(query) {
  const url =
    "https://www.wikidata.org/w/api.php?action=wbsearchentities" +
    "&search=" + encodeQuery(query) +
    "&language=de&format=json&origin=*";

  const result = await fetchJSON(url);

  const item = arr(result?.search)[0];

  if (!item) return null;

  return {
    source: "Wikidata",
    title: item.label || query,
    text: [
      item.description || "",
      item.concepturi || ""
    ].filter(Boolean).join("\n"),
    url: item.concepturi || ""
  };
}

async function searchOpenLibrary(query) {
  const url =
    "https://openlibrary.org/search.json?q=" +
    encodeQuery(query) +
    "&limit=5";

  const result = await fetchJSON(url);

  const books = arr(result?.docs).slice(0, 5);

  if (!books.length) return null;

  return {
    source: "Open Library",
    title: "Bücher zu " + query,
    text: books.map(book => {
      const authors = arr(book.author_name).join(", ");

      return [
        book.title || "Unbekannter Titel",
        authors ? "Autor: " + authors : "",
        book.first_publish_year
          ? "Erstveröffentlichung: " + book.first_publish_year
          : ""
      ].filter(Boolean).join(" | ");
    }).join("\n"),
    url: "https://openlibrary.org/search?q=" + encodeQuery(query)
  };
}

async function research(query) {
  query = safeText(query, 1000);

  if (!query) {
    return "Bitte gib ein Recherchethema an.";
  }

  const searches = await Promise.allSettled([
    searchWikipedia(query),
    searchWikidata(query),
    searchOpenLibrary(query)
  ]);

  const results = searches
    .filter(item => item.status === "fulfilled" && item.value)
    .map(item => item.value);

  if (!results.length) {
    return [
      "Ich konnte gerade keine externen Rechercheergebnisse abrufen.",
      "",
      "Mögliche Gründe:",
      "• Keine Internetverbindung",
      "• Die Wissensquelle ist nicht erreichbar",
      "• Der Browser blockiert die Anfrage",
      "",
      "Du kannst den Inhalt stattdessen mit „Lerne: ...“ speichern."
    ].join("\n");
  }

  const imported = [];

  for (const result of results) {
    const text = [
      result.title,
      result.text,
      result.url ? "Quelle: " + result.url : ""
    ].filter(Boolean).join("\n");

    const doc = importDocumentText(
      text,
      result.title,
      "research"
    );

    imported.push({
      ...result,
      documentResult: doc
    });
  }

  return [
    "RECHERCHEERGEBNISSE",
    `Suchbegriff: ${query}`,
    "",
    ...imported.map(result => [
      "QUELLE: " + result.source,
      "Titel: " + result.title,
      result.text,
      result.url ? "Link: " + result.url : ""
    ].filter(Boolean).join("\n\n")),
    "",
    `${results.length} Rechercheergebnis(se) wurden abgerufen und als Dokumente gespeichert.`,
    "",
    "Hinweis: Externe Rechercheergebnisse sollten vor der Verwendung überprüft werden."
  ].join("\n\n");
}

/* =====================================================
   4. DOKUMENTENVERWALTUNG
   ===================================================== */

function importDocumentText(content, title = "Importiertes Dokument", type = "import") {
  content = safeText(content, 1000000);
  title = safeText(title, 250) || "Importiertes Dokument";
  type = safeText(type, 100) || "import";

  if (!content) {
    return "Das Dokument enthält keinen Text.";
  }

  const existing = data.documents.find(document =>
    normalize(document.title) === normalize(title) &&
    normalize(document.content || "") === normalize(content)
  );

  if (existing) {
    return "Dieses Dokument ist bereits gespeichert. Dokument-ID: " + existing.id;
  }

  const document = {
    id: uid(),
    title,
    type,
    content,
    length: content.length,
    created: now(),
    updated: now()
  };

  data.documents.push(document);

  remember(
    "dokument",
    `Dokument importiert: ${title}`,
    { documentId: document.id, type }
  );

  logAudit(
    "Dokumenten-KI",
    "Dokument importiert",
    title
  );

  save();

  return [
    "Dokument erfolgreich gespeichert.",
    "Titel: " + title,
    "Zeichen: " + content.length,
    "Dokument-ID: " + document.id
  ].join("\n");
}

function searchDocuments(query, limit = 10) {
  query = safeText(query, 1000);

  if (!query) return [];

  return data.documents
    .map(document => ({
      document,
      score: Math.max(
        similarity(query, document.title),
        similarity(query, document.content || "")
      )
    }))
    .filter(result => result.score > 0.03)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Number(limit) || 10));
}

function summarizeDocument(id) {
  const document = data.documents.find(item =>
    item.id === id
  );

  if (!document) return "Dokument nicht gefunden.";

  const content = safeText(document.content, 100000);

  if (!content) return "Das Dokument enthält keinen Text.";

  const sentences = content
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];

  if (!sentences.length) return content.slice(0, 1500);

  const selected = [];
  const step = Math.max(1, Math.ceil(sentences.length / 8));

  for (let i = 0; i < sentences.length; i += step) {
    selected.push(sentences[i].trim());
  }

  return [
    "ZUSAMMENFASSUNG",
    "Dokument: " + document.title,
    "",
    ...selected.slice(0, 8).map(sentence => "• " + sentence),
    "",
    "Hinweis: Dies ist eine einfache automatische Textauswahl, keine vollständige semantische Zusammenfassung."
  ].join("\n");
}

/* =====================================================
   5. PROJEKTE UND AUFGABEN
   ===================================================== */

function createProject(title, description = "") {
  title = safeText(title, 250);
  description = safeText(description, 2000);

  if (!title) return "Bitte gib einen Projektnamen an.";

  const project = {
    id: uid(),
    title,
    description,
    created: now(),
    updated: now(),
    status: "offen"
  };

  data.projects.push(project);

  logAudit("Projekt-KI", "Projekt erstellt", title);
  save();

  return [
    "Projekt erstellt!",
    "Name: " + title,
    "Projekt-ID: " + project.id
  ].join("\n");
}

function createTask(title, projectId = "") {
  title = safeText(title, 500);
  projectId = safeText(projectId, 200);

  if (!title) return "Bitte gib einen Aufgabentitel an.";

  if (
    projectId &&
    !data.projects.some(project => project.id === projectId)
  ) {
    return "Das angegebene Projekt wurde nicht gefunden.";
  }

  const task = {
    id: uid(),
    title,
    projectId,
    done: false,
    created: now(),
    completed: null
  };

  data.tasks.push(task);

  logAudit("Projekt-KI", "Aufgabe erstellt", title);
  save();

  return [
    "Aufgabe erstellt!",
    "Titel: " + title,
    "Aufgaben-ID: " + task.id
  ].join("\n");
}

function completeTask(id) {
  id = safeText(id, 200);

  const task = data.tasks.find(item =>
    item.id === id
  );

  if (!task) return "Aufgabe nicht gefunden.";

  task.done = true;
  task.completed = now();

  logAudit(
    "Projekt-KI",
    "Aufgabe abgeschlossen",
    task.title
  );

  save();

  return "Aufgabe erledigt: " + task.title;
}

function listProjects() {
  if (!data.projects.length) {
    return "Es sind noch keine Projekte vorhanden.";
  }

  return [
    "MEINE PROJEKTE",
    "",
    ...data.projects.map((project, index) => [
      `${index + 1}. ${project.title}`,
      `ID: ${project.id}`,
      `Status: ${project.status || "offen"}`,
      project.description || ""
    ].filter(Boolean).join("\n"))
  ].join("\n\n");
}

function listTasks() {
  if (!data.tasks.length) {
    return "Es sind noch keine Aufgaben vorhanden.";
  }

  return [
    "MEINE AUFGABEN",
    "",
    ...data.tasks.map((task, index) => [
      `${index + 1}. ${task.done ? "✓" : "○"} ${task.title}`,
      `ID: ${task.id}`,
      task.projectId ? `Projekt-ID: ${task.projectId}` : "",
      `Erstellt: ${formatDate(task.created)}`
    ].filter(Boolean).join("\n"))
  ].join("\n\n");
}

/* =====================================================
   6. CODE-PRÜFUNG
   ===================================================== */

function inspectCode(code) {
  code = safeText(code, 100000);

  const findings = [];

  if (!code) {
    return {
      valid: false,
      findings: ["Kein Code zum Prüfen angegeben."]
    };
  }

  const rules = [
    {
      pattern: /eval\s*\(/,
      level: "warnung",
      message: "eval() gefunden. Die Ausführung dynamischen Codes kann gefährlich sein."
    },
    {
      pattern: /innerHTML\s*=/,
      level: "warnung",
      message: "innerHTML-Zuweisung gefunden. Bei fremden Inhalten besteht XSS-Risiko."
    },
    {
      pattern: /document\.write\s*\(/,
      level: "hinweis",
      message: "document.write() gefunden. Diese Methode sollte meist vermieden werden."
    },
    {
      pattern: /localStorage\.clear\s*\(/,
      level: "warnung",
      message: "localStorage.clear() kann sämtliche lokalen Webseitendaten löschen."
    },
    {
      pattern: /console\.log\s*\(/,
      level: "hinweis",
      message: "console.log() gefunden. Prüfe, ob Debug-Ausgaben entfernt werden sollen."
    },
    {
      pattern: /TODO|FIXME/,
      level: "hinweis",
      message: "TODO- oder FIXME-Markierungen gefunden."
    },
    {
      pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
      level: "warnung",
      message: "Leerer catch-Block gefunden. Fehler werden möglicherweise verschluckt."
    }
  ];

  for (const rule of rules) {
    if (rule.pattern.test(code)) {
      findings.push({
        level: rule.level,
        message: rule.message
      });
    }
  }

  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    findings.push({
      level: "warnung",
      message: `Klammeranzahl auffällig: ${openBraces} öffnende und ${closeBraces} schließende geschweifte Klammern.`
    });
  }

  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;

  if (openParens !== closeParens) {
    findings.push({
      level: "warnung",
      message: `Klammeranzahl auffällig: ${openParens} öffnende und ${closeParens} schließende runde Klammern.`
    });
  }

  return {
    valid: true,
    findings,
    length: code.length,
    lines: code.split("\n").length
  };
}

function inspectCodeReport(code) {
  const result = inspectCode(code);

  if (!result.valid) {
    return result.findings.join("\n");
  }

  const lines = [
    "CODE-PRÜFUNG",
    "",
    `Zeichen: ${result.length}`,
    `Zeilen: ${result.lines}`,
    ""
  ];

  if (!result.findings.length) {
    lines.push("Keine Auffälligkeiten durch die einfachen Prüfregeln gefunden.");
  } else {
    lines.push(
      ...result.findings.map(item =>
        `[${item.level.toUpperCase()}] ${item.message}`
      )
    );
  }

  lines.push(
    "",
    "Wichtig: Diese Prüfung ist eine einfache statische Musterprüfung. Sie ersetzt keinen JavaScript-Parser, Compiler oder Sicherheitstest."
  );

  return lines.join("\n");
}

/* =====================================================
   7. SICHERUNGEN
   ===================================================== */

function createSnapshot(label = "Automatische Sicherung") {
  const snapshotData = clone(data);

  /*
     Sicherungen nicht ineinander verschachteln.
     Sonst wächst jede neue Sicherung unnötig.
  */

  snapshotData.snapshots = [];

  const snapshot = {
    id: uid(),
    label: safeText(label, 200) || "Sicherung",
    created: now(),
    data: snapshotData
  };

  data.snapshots.push(snapshot);
  data.snapshots = data.snapshots.slice(-30);

  logAudit(
    "System",
    "Sicherung erstellt",
    snapshot.label
  );

  save();

  return snapshot;
}

function restoreSnapshot(id) {
  id = safeText(id, 200);

  const snapshot = data.snapshots.find(item =>
    item.id === id
  );

  if (!snapshot || !obj(snapshot.data)) {
    return "Sicherung nicht gefunden oder beschädigt.";
  }

  const currentSnapshots = arr(data.snapshots);
  const backup = clone(snapshot.data);

  for (const key of Object.keys(defaults)) {
    if (key === "snapshots") continue;

    if (backup[key] !== undefined) {
      data[key] = clone(backup[key]);
    }
  }

  data.snapshots = currentSnapshots;

  for (const key of arrayKeys) {
    if (!Array.isArray(data[key])) data[key] = [];
  }

  if (!obj(data.settings)) {
    data.settings = clone(defaults.settings);
  }

  if (!obj(data.agentStats)) {
    data.agentStats = {};
  }

  data.version = VERSION;

  logAudit(
    "System",
    "Sicherung wiederhergestellt",
    snapshot.label
  );

  save();

  return "Die Sicherung wurde wiederhergestellt. Bitte lade die Seite neu, falls die Oberfläche nicht alle Änderungen anzeigt.";
}

/* =====================================================
   8. DATENEXPORT
   ===================================================== */

function exportData() {
  const output = clone(data);

  output.version = VERSION;
  output.exportedAt = now();
  output.application = NAME;

  return JSON.stringify(output, null, 2);
}

/* =====================================================
   9. DATENIMPORT
   ===================================================== */

function importData(json) {
  let parsed;

  try {
    parsed = typeof json === "string"
      ? JSON.parse(json)
      : json;
  } catch {
    return "Import fehlgeschlagen: Die JSON-Datei ist ungültig.";
  }

  if (!obj(parsed)) {
    return "Import fehlgeschlagen: Das Datenformat ist ungültig.";
  }

  const before = clone(data);
  const imported = clone(parsed);

  /*
     Legacy-Kompatibilität:
     "memories" wird zu "memory".
  */

  if (!Array.isArray(imported.memory) && Array.isArray(imported.memories)) {
    imported.memory = imported.memories;
  }

  const allowedArrays = [
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

  try {
    for (const key of allowedArrays) {
      if (Array.isArray(imported[key])) {
        data[key] = imported[key].filter(obj);
      }
    }

    if (obj(imported.agentStats)) {
      data.agentStats = imported.agentStats;
    }

    if (obj(imported.settings)) {
      data.settings = {
        ...clone(defaults.settings),
        ...imported.settings
      };
    }

    if (typeof imported.theme === "string") {
      data.theme = imported.theme;
    }

    data.version = VERSION;

    /*
       Nach dem Import erneut normalisieren.
    */

    data.facts = data.facts.filter(item =>
      typeof item.subject === "string" &&
      typeof item.property === "string" &&
      typeof item.value === "string"
    );

    data.qa = data.qa.filter(item =>
      typeof item.k === "string" &&
      typeof item.a === "string"
    );

    data.relationships = data.relationships.filter(item =>
      typeof item.from === "string" &&
      typeof item.to === "string" &&
      typeof item.relation === "string"
    );

    data.memory = data.memory.filter(item =>
      typeof item.content === "string" &&
      typeof item.type === "string"
    );

    delete data.memories;

    if (!save()) {
      data = before;
      save();

      return "Import fehlgeschlagen: Die Daten konnten nicht dauerhaft gespeichert werden. Der vorherige Datenstand wurde wiederhergestellt.";
    }

    logAudit(
      "System",
      "Datenimport abgeschlossen",
      "JSON-Import"
    );

    save();

    return [
      "Datenimport erfolgreich abgeschlossen.",
      "",
      `Fakten: ${data.facts.length}`,
      `Erinnerungen: ${data.memory.length}`,
      `Dokumente: ${data.documents.length}`,
      `Projekte: ${data.projects.length}`,
      `Aufgaben: ${data.tasks.length}`,
      `Wissensverbindungen: ${data.relationships.length}`
    ].join("\n");

  } catch (error) {
    data = before;
    save();

    console.error("Importfehler:", error);

    return "Import fehlgeschlagen. Der vorherige Datenstand wurde wiederhergestellt:\n" + error.message;
  }
}

/* =====================================================
   ENDE TEIL 2/3
   TEIL 3 DIREKT DARUNTER EINFÜGEN
   ===================================================== */
 /* =====================================================
   LERNBOT 6.0 – TEIL 3/3
   CHAT, LERNEN, BEFEHLE, DATEIEN UND BENUTZEROBERFLÄCHE
   ===================================================== */

/* =====================================================
   1. BENUTZEROBERFLÄCHE
   ===================================================== */

const UI = {
  input() {
    return $("input") ||
      $("lb6-input") ||
      $("chat-input") ||
      $("user-input");
  },

  chat() {
    return $("log") ||
      $("lb6-chat") ||
      $("chat-messages") ||
      $("messages");
  },

  send() {
    return $("send") ||
      $("lb6-send") ||
      $("send-button") ||
      $("send-btn");
  },

  form() {
    return $("bar");
  },

  status() {
    return $("status");
  }
};

let lb6Busy = false;
let lb6MessageCounter = 0;

/* =====================================================
   2. CHAT-NACHRICHTEN
   ===================================================== */

function addMessage(role, content) {
  const chat = UI.chat();
  const messageText = asReadable(content);

  if (!chat) {
    console.log(`[LernBot ${role}]`, messageText);
    return null;
  }

  const message = document.createElement("div");

  /*
     Die Klassen passen zur neuen HTML-Oberfläche:
     .msg, .user und .bot
  */

  message.className =
    role === "user"
      ? "msg user"
      : role === "system"
        ? "msg bot system"
        : "msg bot";

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

  element.className = "msg bot lb6-typing";
  element.textContent = "LernBot denkt nach ...";

  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;

  return element;
}

function removeTyping(element) {
  if (element?.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function clearChat() {
  const chat = UI.chat();

  if (chat) {
    chat.replaceChildren();
  }

  addMessage(
    "assistant",
    "Neuer Chat gestartet. Dein gespeichertes Wissen bleibt erhalten."
  );
}

/* =====================================================
   3. MINIMALE ZUSATZSTILE
   ===================================================== */

function installStyles() {
  if ($("lb6-styles")) return;

  const style = document.createElement("style");
  style.id = "lb6-styles";

  style.textContent = `
    .lb6-message-content {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .lb6-typing {
      opacity: .7;
      font-style: italic;
    }

    .lb6-hidden-file {
      display: none !important;
    }

    .lb6-message-content a {
      overflow-wrap: anywhere;
    }
  `;

  (document.head || document.documentElement)
    .appendChild(style);
}

/* =====================================================
   4. FALLBACK-OBERFLÄCHE
   ===================================================== */

function createFallbackUI() {
  let root = $("lb6-fallback-root");

  if (root) return root;

  root = document.createElement("section");
  root.id = "lb6-fallback-root";

  root.style.cssText = [
    "max-width:900px",
    "margin:20px auto",
    "padding:20px",
    "background:#20202e",
    "color:#f5f3ff",
    "border-radius:16px",
    "font-family:Arial,sans-serif"
  ].join(";");

  const heading = document.createElement("h2");
  heading.textContent = NAME;

  const chat = document.createElement("div");
  chat.id = "lb6-fallback-chat";
  chat.style.cssText =
    "height:400px;overflow:auto;padding:12px;margin-bottom:12px;background:#11111a;border-radius:12px;";

  const controls = document.createElement("div");
  controls.style.cssText =
    "display:flex;gap:8px;flex-wrap:wrap;";

  const input = document.createElement("textarea");
  input.id = "lb6-fallback-input";
  input.placeholder = "Schreibe eine Nachricht ...";
  input.style.cssText =
    "flex:1;min-width:180px;padding:12px;border-radius:8px;";

  const send = document.createElement("button");
  send.id = "lb6-fallback-send";
  send.type = "button";
  send.textContent = "Senden";

  controls.append(input, send);
  root.append(heading, chat, controls);
  document.body.appendChild(root);

  return root;
}

/* =====================================================
   5. LERNEN
   ===================================================== */

function getLearningResponse(value) {
  const content = safeText(value, 100000);

  if (!content) {
    return "Bitte gib einen Lerninhalt an.";
  }

  const factResult = learnFact(content);

  const existing = data.documents.find(document =>
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
    updated: now(),
    length: content.length
  };

  data.documents.push(document);

  remember(
    "lerninhalt",
    "Lerninhalt gespeichert: " + document.title,
    { documentId: document.id }
  );

  logAudit(
    "Lern-KI",
    "Lerninhalt gespeichert",
    document.title
  );

  if (!save()) {
    return "Der Inhalt wurde verarbeitet, konnte aber nicht dauerhaft gespeichert werden. Prüfe deinen Browser-Speicher.";
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
    "Du kannst den Inhalt später mit „Dokument suchen: ...“ wiederfinden."
  ].join("\n");
}

async function getResearchResponse(query) {
  const content = safeText(query, 1000);

  if (!content) return "Bitte gib ein Recherchethema an.";

  return await research(content);
}

/* =====================================================
   6. GEDÄCHTNIS
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
    `Erstellt: ${formatDate(item.created)}`
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

  if (!query) {
    return "Bitte gib einen Suchbegriff zum Löschen an.";
  }

  const removed = forgetMemory(query);

  return removed
    ? `${removed} Erinnerung(en) wurden gelöscht.`
    : "Ich habe keine passende Erinnerung gefunden.";
}

/* =====================================================
   7. DOKUMENTENWISSEN FÜR FRAGEN
   ===================================================== */

function getDocumentKnowledge(query) {
  query = safeText(query, 1000);

  if (!query) return null;

  const results = searchDocuments(query);

  if (!results.length) return null;

  const output = [];

  for (const result of results.slice(0, 3)) {
    const document = result.document;

    if (!document?.content) continue;

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
      selected.push(safeText(document.content, 500));
    }

    output.push([
      "QUELLE: " + document.title,
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
   8. WISSEN ABRUFEN
   ===================================================== */

function getKnowledgeResponse(topic) {
  topic = safeText(topic, 1000);

  if (!topic) return "Bitte gib ein Thema an.";

  const directAnswer = answerFact(topic);

  if (directAnswer) {
    return directAnswer;
  }

  const facts = findRelatedFacts(topic, 10);
  const documentKnowledge = getDocumentKnowledge(topic);
  const explanation = explainTopic(topic);

  const hasExplanation =
    explanation &&
    !normalize(explanation).includes(
      "noch nicht genug eigenes wissen"
    ) &&
    !normalize(explanation).includes(
      "noch nicht genuegend eigenes wissen"
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
      ...facts.map(fact =>
        `• ${fact.subject}: ${fact.property} – ${fact.value}`
      )
    ].join("\n");
  }

  return `Zu "${topic}" habe ich noch keine passenden Informationen gespeichert.`;
}

/* =====================================================
   9. DOKUMENTENVERWALTUNG
   ===================================================== */

function getDocumentList() {
  const documents = arr(data.documents);

  if (!documents.length) {
    return "Es sind noch keine Dokumente gespeichert.";
  }

  return documents.map((document, index) => [
    `${index + 1}. ${document.title || "Ohne Titel"}`,
    `ID: ${document.id || "Keine ID"}`,
    `Typ: ${document.type || "Unbekannt"}`,
    `Zeichen: ${document.length || document.content?.length || 0}`,
    `Erstellt: ${formatDate(document.created)}`
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
    const document = result.document;

    return [
      `${index + 1}. ${document.title || "Ohne Titel"}`,
      `ID: ${document.id}`,
      `Trefferwert: ${Number(result.score).toFixed(2)}`,
      `Inhalt: ${safeText(document.content || "", 500)}`
    ].join("\n");
  }).join("\n\n");
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

  const document = data.documents.find(item =>
    item.id === query ||
    normalize(item.title) === normalize(query)
  );

  if (!document) {
    return [
      "Dokument nicht gefunden.",
      "",
      getDocumentList()
    ].join("\n");
  }

  return summarizeDocument(document.id);
}

/* =====================================================
   10. PROJEKTE UND AUFGABEN
   ===================================================== */

function getProjectResponse() {
  return listProjects();
}

function getTaskResponse() {
  return listTasks();
}

function createTaskResponse(title) {
  title = safeText(title, 500);

  if (!title) return "Bitte gib einen Aufgabentitel an.";

  return createTask(title);
}

function completeTaskResponse(id) {
  id = safeText(id, 200);

  if (!id) return "Bitte gib die genaue Aufgaben-ID an.";

  const task = data.tasks.find(item =>
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
   11. SICHERUNGEN UND EXPORT
   ===================================================== */

function getSnapshotList() {
  const snapshots = arr(data.snapshots);

  if (!snapshots.length) {
    return "Es sind noch keine Sicherungen vorhanden.";
  }

  return snapshots.map((snapshot, index) => [
    `${index + 1}. ${snapshot.label || "Sicherung"}`,
    `ID: ${snapshot.id || "Keine ID"}`,
    `Datum: ${formatDate(snapshot.created || snapshot.time)}`
  ].join("\n")).join("\n\n");
}

function createSnapshotResponse() {
  const result = createSnapshot("Manuelle Sicherung");

  return [
    "Sicherung erstellt.",
    "Sicherungs-ID: " + result.id,
    "Datum: " + formatDate(result.created)
  ].join("\n");
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

  return restoreSnapshot(id);
}

function downloadExport() {
  let url = null;

  try {
    const json = exportData();

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

    return "Export fehlgeschlagen:\n" + error.message;

  } finally {
    if (url) {
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }
}

/* =====================================================
   12. DATEIIMPORT
   ===================================================== */

function getFileInput() {
  let file = $("lb6-file");

  if (file) return file;

  file = document.createElement("input");
  file.type = "file";
  file.id = "lb6-file";
  file.accept = ".txt,.md,.json,.csv,.html,.js,.css";
  file.className = "lb6-hidden-file";

  document.body.appendChild(file);

  file.addEventListener("change", handleFileUpload);

  return file;
}

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

      if (!obj(parsed)) {
        throw new Error("Das JSON enthält kein gültiges Datenobjekt.");
      }

      result = importData(parsed);

    } else {
      result = importDocumentText(
        content,
        file.name,
        "file-import"
      );
    }

    removeTyping(typing);
    addMessage("assistant", result);

  } catch (error) {
    removeTyping(typing);

    console.error("Dateiimport fehlgeschlagen:", error);

    addMessage(
      "assistant",
      "Dateiimport fehlgeschlagen:\n" + error.message
    );

  } finally {
    if (event?.target) event.target.value = "";
  }
}

/* =====================================================
   13. HILFE
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
   14. BEFEHLSVERARBEITUNG
   ===================================================== */

function getCommandValue(text, prefix) {
  const original = String(text ?? "").trim();
  const colon = original.indexOf(":");

  if (colon < 0) return null;

  const enteredPrefix = original.slice(0, colon + 1);

  if (normalize(enteredPrefix) !== normalize(prefix)) {
    return null;
  }

  return original.slice(colon + 1).trim();
}

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

    let value;

    /* LERNEN */

    value = getCommandValue(text, "Lerne:");

    if (value !== null) {
      return getLearningResponse(value);
    }

    /* WISSENSÜBERSICHT */

    if (lower === "wissensübersicht" || lower === "wissensuebersicht") {
      return knowledgeOverview();
    }

    /* WISSENSANALYSE */

    if (lower === "wissensanalyse") {
      return analyzeKnowledge();
    }

    /* WISSENSGRAPH */

    value = getCommandValue(text, "Wissensgraph:");

    if (value !== null) {
      return value
        ? graphReport(value)
        : "Bitte gib ein Thema an.";
    }

    /* WISSEN UND ERKLÄREN */

    value = getCommandValue(text, "Wissen:");

    if (value !== null) return getKnowledgeResponse(value);

    value = getCommandValue(text, "Erkläre:");

    if (value !== null) return getKnowledgeResponse(value);

    /* RECHERCHE */

    value = getCommandValue(text, "Recherchiere:");

    if (value !== null) return await getResearchResponse(value);

    /* GEDÄCHTNIS SPEICHERN */

    value = getCommandValue(text, "Merke dir:");

    if (value !== null) return rememberResponse(value);

    value = getCommandValue(text, "Merke:");

    if (value !== null) return rememberResponse(value);

    /* GEDÄCHTNIS ANZEIGEN */

    if (
      lower === "erinnerungen" ||
      lower === "zeige erinnerungen"
    ) {
      return getMemoryList();
    }

    /* GEDÄCHTNIS LÖSCHEN */

    value = getCommandValue(text, "Vergiss:");

    if (value !== null) return forgetResponse(value);

    /* DOKUMENTE */

    if (lower === "dokumente") return getDocumentList();

    value = getCommandValue(text, "Dokument suchen:");

    if (value !== null) return searchDocumentResponse(value);

    value = getCommandValue(text, "Dokument zusammenfassen:");

    if (value !== null) return summarizeDocumentResponse(value);

    /* PROJEKTE */

    if (lower === "projekte") return getProjectResponse();

    value = getCommandValue(text, "Projekt erstellen:");

    if (value !== null) {
      return value
        ? createProject(value)
        : "Bitte gib einen Projektnamen an.";
    }

    /* AUFGABEN */

    if (lower === "aufgaben") return getTaskResponse();

    value = getCommandValue(text, "Aufgabe erstellen:");

    if (value !== null) return createTaskResponse(value);

    value = getCommandValue(text, "Aufgabe erledigt:");

    if (value !== null) return completeTaskResponse(value);

    /* AGENTEN */

    if (lower === "agenten") return agentOverview();

    /* SICHERUNGEN */

    if (
      lower === "sicherung erstellen" ||
      lower === "sicherung speichern"
    ) {
      return createSnapshotResponse();
    }

    if (lower === "sicherungen") return getSnapshotList();

    value = getCommandValue(text, "Sicherung wiederherstellen:");

    if (value !== null) return restoreSnapshotResponse(value);

    /* EXPORT */

    if (
      lower === "export" ||
      lower === "daten exportieren"
    ) {
      return downloadExport();
    }

    /* CODEPRÜFUNG */

    value = getCommandValue(text, "Code prüfen:");

    if (value !== null) {
      return value
        ? inspectCodeReport(value)
        : "Bitte füge den zu prüfenden Code ein.";
    }

    /* ANALYSE */

    value = getCommandValue(text, "Analysiere:");

    if (value !== null) {
      if (!value) return "Bitte gib ein Thema an.";

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
            ? facts.map(fact =>
                `• ${fact.subject}: ${fact.property} – ${fact.value}`
              ).join("\n")
            : "Keine verwandten Fakten gefunden."
        ].filter(Boolean).join("\n");
      });
    }

    /* ALLGEMEINE FRAGEN */

    const knowledge = getKnowledgeResponse(text);

    if (
      knowledge &&
      !normalize(knowledge).includes(
        "noch keine passenden informationen gespeichert"
      )
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
      error?.message || String(error)
    ].join("\n");
  }
}

/* =====================================================
   15. NACHRICHTEN SENDEN
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

    removeTyping(typing);

    addMessage(
      "assistant",
      response === undefined || response === null
        ? "Die Verarbeitung hat keine Antwort zurückgegeben."
        : response
    );

    save();

  } catch (error) {
    removeTyping(typing);

    console.error("LernBot Sendefehler:", error);

    addMessage(
      "assistant",
      "Unerwarteter Fehler:\n" +
      (error?.message || String(error))
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
   16. CHAT-EINRICHTUNG
   ===================================================== */

function setupChat() {
  const input = UI.input();
  const send = UI.send();
  const form = UI.form();

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

    send.addEventListener("click", event => {
      event.preventDefault();
      sendMessage();
    });
  }

  if (form && form.dataset.lb6Bound !== "true") {
    form.dataset.lb6Bound = "true";

    form.addEventListener("submit", event => {
      event.preventDefault();
      sendMessage();
    });
  }
}

/* =====================================================
   17. VORSCHLÄGE
   ===================================================== */

function setupSuggestions() {
  document.querySelectorAll("#suggestions [data-msg]").forEach(button => {
    if (button.dataset.lb6Bound === "true") return;

    button.dataset.lb6Bound = "true";

    button.addEventListener("click", () => {
      const message = safeText(button.dataset.msg, 100000);
      const input = UI.input();

      if (!message || !input) return;

      input.value = message;
      input.focus();

      sendMessage();
    });
  });
}

/* =====================================================
   18. DATEI-EINRICHTUNG
   ===================================================== */

function setupFileUpload() {
  const file = getFileInput();

  if (!file || file.dataset.lb6Bound === "true") return;

  file.dataset.lb6Bound = "true";
  file.addEventListener("change", handleFileUpload);
}

/* =====================================================
   19. SIDEBAR UND NAVIGATION
   ===================================================== */

function showSection(title, content) {
  addMessage(
    "assistant",
    `${title}\n\n${asReadable(content)}`
  );
}

function handleSidebarAction(label) {
  const key = normalize(label);

  if (key.includes("neuer chat")) {
    clearChat();
    return;
  }

  if (key.includes("chatverlauf")) {
    const history = arr(data.log);

    showSection(
      "CHATVERLAUF",
      history.length
        ? history.map(item =>
            `${formatDate(item.time)} – ${item.text || item.content || ""}`
          ).join("\n")
        : "Noch kein gespeicherter Chatverlauf vorhanden."
    );

    return;
  }

  if (key.includes("wissensspeicher")) {
    showSection("WISSENSSPEICHER", knowledgeOverview());
    return;
  }

  if (key.includes("ki-agenten") || key === "agenten") {
    showSection("KI-AGENTEN", agentOverview());
    return;
  }

  if (key.includes("projekte")) {
    showSection("PROJEKTE", listProjects());
    return;
  }

  if (key.includes("dokumente")) {
    showSection("DOKUMENTE", getDocumentList());
    return;
  }

  if (key.includes("code-labor")) {
    showSection(
      "CODE-LABOR",
      "Nutze den Befehl:\n\nCode prüfen: DEIN QUELLCODE"
    );
    return;
  }

  if (key.includes("einstellungen")) {
    showSection(
      "EINSTELLUNGEN",
      [
        `Automatische Recherche: ${data.settings.autoResearch ? "Aktiv" : "Aus"}`,
        `Automatisches Lernen: ${data.settings.autoLearn ? "Aktiv" : "Aus"}`,
        `Änderungen bestätigen: ${data.settings.confirmChanges ? "Ja" : "Nein"}`,
        `Maximale Verlaufseinträge: ${data.settings.maxHistory}`,
        `Theme: ${data.theme}`
      ].join("\n")
    );
  }
}

function setupSidebar() {
  const drawer = $("drawer");

  if (!drawer) return;

  drawer.querySelectorAll(".side-button").forEach(button => {
    if (button.dataset.lb6Bound === "true") return;

    button.dataset.lb6Bound = "true";

    button.addEventListener("click", () => {
      const command = normalize(button.dataset.cmd || "");
      const label = normalize(button.textContent || "");

      if (command === "theme" || label.includes("theme")) {
        toggleTheme();
        return;
      }

      if (command === "hilfe" || label === "hilfe") {
        addMessage("assistant", getHelpText());
        return;
      }

      if (command === "was weißt du?" || command === "was weisst du?") {
        addMessage("assistant", knowledgeOverview());
        return;
      }

      if (command === "export" || label.includes("export")) {
        addMessage("system", downloadExport());
        return;
      }

      if (command === "import" || label.includes("import")) {
        getFileInput().click();
        return;
      }

      if (command === "verlauf löschen" || command === "verlauf loeschen") {
        const confirmed = window.confirm(
          "Möchtest du den Chatverlauf wirklich löschen? Dein gespeichertes Wissen bleibt erhalten."
        );

        if (!confirmed) return;

        data.log = [];
        save();
        clearChat();
        return;
      }

      if (command === "refresh" || label.includes("aktualisieren")) {
        window.location.reload();
        return;
      }

      handleSidebarAction(button.textContent || "");
    });
  });
}

/* =====================================================
   20. THEME
   ===================================================== */

function toggleTheme() {
  data.theme = data.theme === "dark" ? "light" : "dark";

  document.documentElement.dataset.theme = data.theme;
  document.body.dataset.theme = data.theme;

  save();

  addMessage(
    "system",
    "Theme geändert: " + data.theme
  );
}

/* =====================================================
   21. EXPORT-BUTTONS
   ===================================================== */

function setupExportButtons() {
  const buttons = document.querySelectorAll(
    "[data-lb6-export], #lb6-export, #export-button, #export-btn"
  );

  buttons.forEach(button => {
    if (button.dataset.lb6Bound === "true") return;

    button.dataset.lb6Bound = "true";

    button.addEventListener("click", event => {
      event.preventDefault();
      addMessage("system", downloadExport());
    });
  });
}

/* =====================================================
   22. START UND INITIALISIERUNG
   ===================================================== */

function startLernBot() {
  if (document.documentElement.dataset.lb6Started === "true") {
    return;
  }

  try {
    installStyles();

    /*
       Die neue HTML-Oberfläche wird verwendet.
       Nur wenn wichtige Elemente fehlen, wird
       eine einfache Ersatzoberfläche erstellt.
    */

    if (!UI.input() || !UI.chat()) {
      createFallbackUI();
    }

    setupChat();
    setupSuggestions();
    setupFileUpload();
    setupSidebar();
    setupExportButtons();

    document.documentElement.dataset.lb6Started = "true";

    if (UI.chat() && !UI.chat().children.length) {
      addMessage(
        "assistant",
        "Hallo! Ich bin " + NAME + ".\n\n" +
        "Dein LernBot ist bereit.\n\n" +
        "Schreibe „Hilfe“, um alle Funktionen und Befehle zu sehen."
      );
    }

    setStatus("Bereit");

    console.log(NAME + " erfolgreich gestartet.");

  } catch (error) {
    console.error("LernBot Startfehler:", error);

    document.documentElement.dataset.lb6Started = "false";

    addMessage(
      "assistant",
      "Der LernBot konnte nicht vollständig gestartet werden:\n" +
      (error?.message || String(error))
    );
  }
}

/* =====================================================
   23. SYSTEMSTART
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
   ENDE LERNBOT 6.0
   ===================================================== */

})();
