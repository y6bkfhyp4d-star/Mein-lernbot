(() => {
"use strict";


/* =====================================================
   LERNBOT 6.0 – MULTI-AGENTEN LERNSYSTEM
   TEIL 1/3 – KERN, SPEICHER, GEDÄCHTNIS
   ===================================================== */

const $ = id => document.getElementById(id);
const KEY = "meinLernBot.v1";
const VERSION = 6;
const NAME = "LernBot 6.0";

const now = () => Date.now();
const arr = x => Array.isArray(x) ? x : [];
const obj = x => x !== null && typeof x === "object" && !Array.isArray(x);

const uid = () =>
  "LB-" + now().toString(36) +
  "-" + Math.random().toString(36).slice(2, 8);

const safeText = (v, max = 20000) =>
  String(v ?? "").slice(0, max).trim();

const clone = value => {
  try {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
  } catch (error) {
    console.warn("LernBot: structuredClone fehlgeschlagen.", error);
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

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
    "der die das den dem des ein eine einer eines und oder ist sind war wie was wer wo wann warum ich du er sie es wir ihr mit von zu im am an auf für".split(" ")
  );

  return normalize(text)
    .split(" ")
    .filter(x => x.length > 2 && !stop.has(x));
}

function similarity(a, b) {
  const aa = new Set(tokenize(a));
  const bb = new Set(tokenize(b));

  if (!aa.size || !bb.size) return 0;

  let common = 0;

  aa.forEach(x => {
    if (bb.has(x)) common++;
  });

  return common / Math.max(aa.size, bb.size);
}

/* =====================================================
   2. DATENBANK UND MIGRATION
   ===================================================== */

let data = {};

try {
  const stored = localStorage.getItem(KEY);
  data = stored ? JSON.parse(stored) : {};
} catch (error) {
  console.error("LernBot: Datenbank konnte nicht geladen werden.", error);
  data = {};
}

if (!obj(data)) data = {};

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

/* Fehlende Standardwerte ergänzen */

for (const [key, value] of Object.entries(defaults)) {
  if (data[key] === undefined || data[key] === null) {
    data[key] = clone(value);
  }
}

/* Datenstrukturen absichern */

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

if (!obj(data.agentStats)) {
  data.agentStats = {};
}

if (!obj(data.settings)) {
  data.settings = {};
}

/* Einstellungen mit Standardwerten zusammenführen */

data.settings = {
  ...clone(defaults.settings),
  ...data.settings
};

if (typeof data.theme !== "string") {
  data.theme = "dark";
}

/* Einzelne Datenbankeinträge überprüfen */

data.facts = data.facts.filter(x =>
  obj(x) &&
  typeof x.subject === "string" &&
  typeof x.property === "string" &&
  typeof x.value === "string"
);

data.qa = data.qa.filter(x =>
  obj(x) &&
  typeof x.k === "string" &&
  typeof x.a === "string"
);

data.projects = data.projects.filter(obj);
data.tasks = data.tasks.filter(obj);

data.documents = data.documents.filter(x =>
  obj(x) && typeof x === "object"
);

data.relationships = data.relationships.filter(x =>
  obj(x) &&
  typeof x.from === "string" &&
  typeof x.to === "string" &&
  typeof x.relation === "string"
);

data.memory = data.memory.filter(x =>
  obj(x) &&
  typeof x.content === "string" &&
  typeof x.type === "string"
);

data.audit = data.audit.filter(obj);
data.snapshots = data.snapshots.filter(obj);
data.codeProposals = data.codeProposals.filter(obj);
data.classes = data.classes.filter(obj);
data.log = data.log.filter(obj);
data.improvements = data.improvements.filter(obj);

/* =====================================================
   3. SPEICHERSYSTEM
   ===================================================== */

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
    console.error("LernBot Speicherfehler:", error);

    if (typeof setStatus === "function") {
      setStatus("Speicher voll – bitte Sicherung exportieren.");
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

  const current = Number(data.agentStats[name]) || 0;
  data.agentStats[name] = current + 1;
}

/* =====================================================
   4. LANGZEITGEDÄCHTNIS
   ===================================================== */

function remember(type, content, meta = {}) {
  type = safeText(type, 100);
  content = safeText(content, 10000);

  if (!type || !content) return null;

  const entry = {
    id: uid(),
    type,
    content,
    meta: obj(meta) ? clone(meta) : {},
    created: now(),
    updated: now()
  };

  const existing = data.memory.find(x =>
    x.type === type &&
    normalize(x.content) === normalize(content)
  );

  if (existing) {
    existing.updated = now();

    existing.meta = {
      ...(obj(existing.meta) ? existing.meta : {}),
      ...entry.meta
    };

    save();
    return existing;
  }

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
      score: similarity(q, item.content)
    }))
    .filter(x => x.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
}

function forgetMemory(query) {
  const q = normalize(query);

  /* Schutz vor versehentlichem Löschen aller Erinnerungen */

  if (!q) return 0;

  const before = data.memory.length;

  data.memory = data.memory.filter(x =>
    !normalize(x.content).includes(q)
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
   5. WISSENSBANK
   ===================================================== */

function cleanSubject(text) {
  return safeText(text)
    .replace(/^(der|die|das|ein|eine|einen|einem|einer)\s+/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function sameSubject(a, b) {
  return normalize(cleanSubject(a)) ===
    normalize(cleanSubject(b));
}

function getFacts(subject = "") {
  if (!safeText(subject)) return data.facts;

  return data.facts.filter(f =>
    sameSubject(f.subject, subject)
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

  let existing = data.facts.find(f =>
    sameSubject(f.subject, subject) &&
    normalize(f.property) === property
  );

  if (existing) {
    const oldValue = existing.value;

    /* Nur echte Änderungen als Konflikt speichern */

    if (normalize(oldValue) !== normalize(value)) {
      existing.previous = oldValue;
      existing.conflict = true;

      existing.alternatives = arr(existing.alternatives);

      const alreadyExists = existing.alternatives.some(x =>
        obj(x) && normalize(x.value) === normalize(value)
      );

      if (!alreadyExists) {
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
   6. FAKTEN ERKENNEN UND LERNEN
   ===================================================== */

function parseFact(text) {
  const s = safeText(text);

  if (!s || s.includes("?")) return null;

  let m;

  /* Hauptstadt */

  m = s.match(
    /^die\s+hauptstadt\s+von\s+(.+?)\s+ist\s+(.+)$/i
  );

  if (m) {
    return {
      subject: cleanSubject(m[1]),
      property: "hauptstadt",
      value: safeText(m[2]).replace(/[.!]+$/, "")
    };
  }

  /* Lebensraum */

  m = s.match(
    /^(.+?)\s+(lebt|wohnt)\s+(?:in|im|am|auf)\s+(.+)$/i
  );

  if (m) {
    return {
      subject: cleanSubject(m[1]),
      property: "lebensraum",
      value: safeText(m[3]).replace(/[.!]+$/, "")
    };
  }

  /* Nahrung */

  m = s.match(
    /^(.+?)\s+(frisst|isst)\s+(.+)$/i
  );

  if (m) {
    return {
      subject: cleanSubject(m[1]),
      property: "nahrung",
      value: safeText(m[3]).replace(/[.!]+$/, "")
    };
  }

  /* Zugehörigkeit */

  m = s.match(
    /^(.+?)\s+gehört\s+zu\s+(.+)$/i
  );

  if (m) {
    return {
      subject: cleanSubject(m[1]),
      property: "zugehörigkeit",
      value: safeText(m[2]).replace(/[.!]+$/, "")
    };
  }

  /* Allgemeine Definition */

  m = s.match(
    /^(.+?)\s+(?:ist|sind|heißt)\s+(.+)$/i
  );

  if (m) {
    return {
      subject: cleanSubject(m[1]),
      property: "definition",
      value: safeText(m[2]).replace(/[.!]+$/, "")
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

  return `Gelernt und gespeichert!

Thema: ${fact.subject}
Eigenschaft: ${fact.property}
Wissen: ${fact.value}

Gespeicherte Fakten: ${data.facts.length}`;
}

/* =====================================================
   7. WISSEN ABRUFEN
   ===================================================== */

function answerFact(question) {
  const q = normalize(question);

  if (!q) return null;

  let property = null;

  if (/\b(hauptstadt)\b/.test(q)) {
    property = "hauptstadt";
  }

  else if (/\b(wo lebt|wo wohnt|lebensraum)\b/.test(q)) {
    property = "lebensraum";
  }

  else if (/\b(was frisst|was isst|nahrung)\b/.test(q)) {
    property = "nahrung";
  }

  else if (/\b(zu welcher|gehört zu|welche familie)\b/.test(q)) {
    property = "zugehörigkeit";
  }

  else if (/^(was ist|wer ist|was bedeutet)\b/.test(q)) {
    property = "definition";
  }

  if (!property) return null;

  let subject = safeText(question)
    .replace(
      /^(was ist|wer ist|was bedeutet|wo lebt|wo wohnt|was frisst|was isst|in welchem land|zu welcher tierart)\s+/i,
      ""
    )
    .replace(/[?!.]+$/, "");

  subject = cleanSubject(subject);

  if (!subject) return null;

  const fact = data.facts.find(f =>
    sameSubject(f.subject, subject) &&
    normalize(f.property) === property
  );

  return fact ? fact.value : null;
}

/* =====================================================
   8. WISSENSÜBERSICHT
   ===================================================== */

function knowledgeOverview() {
  if (!data.facts.length) {
    return "Mein Wissensspeicher ist noch leer.";
  }

  const groups = {};

  data.facts.forEach(f => {
    (groups[f.subject] ||= []).push(f);
  });

  const lines = ["MEIN LANGZEITWISSEN"];

  Object.entries(groups).forEach(([subject, facts]) => {
    lines.push("", subject);

    facts.forEach(f => {
      lines.push(`• ${f.property}: ${f.value}`);
    });
  });

  lines.push(
    "",
    `Gesamt: ${data.facts.length} Fakten`,
    `Erinnerungen: ${data.memory.length}`
  );

  return lines.join("\n");
}

/* =====================================================
   9. WISSENSGRAPH
   ===================================================== */

function connectKnowledge(from, relation, to) {
  from = cleanSubject(from);
  to = cleanSubject(to);
  relation = safeText(relation, 100);

  if (!from || !to || !relation) {
    return false;
  }

  const exists = data.relationships.some(r =>
    sameSubject(r.from, from) &&
    sameSubject(r.to, to) &&
    normalize(r.relation) === normalize(relation)
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

  return data.relationships.filter(r =>
    sameSubject(r.from, subject) ||
    sameSubject(r.to, subject)
  );
}

function graphReport(subject) {
  const links = graphFor(subject);

  if (!links.length) {
    return `Zu ${subject} habe ich noch keine Verbindungen gespeichert.`;
  }

  return "WISSENSVERKNÜPFUNGEN\n\n" +
    links.map(r =>
      `${r.from} —${r.relation}→ ${r.to}`
    ).join("\n");
}

/* =====================================================
   TEIL 1 ENDE
   TEIL 2 FOLGT DIREKT DANACH
   ===================================================== */

   

/* =====================================================
   LERNBOT 6.0 – TEIL 2/3
   AGENTEN, RECHERCHE, DOKUMENTE, PROJEKTE
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
  countAgent(name);
  logAudit(name, "Agent ausgeführt");

  try {
    if (typeof fn !== "function") {
      throw new Error("Ungültige Agentenfunktion.");
    }

    return fn();

  } catch (error) {
    console.error(name, error);
    return `Fehler in ${name}: ${error.message}`;

  } finally {
    save();
  }
}

async function agentRunAsync(name, fn) {
  countAgent(name);
  logAudit(name, "Agent gestartet");

  try {
    if (typeof fn !== "function") {
      throw new Error("Ungültige Agentenfunktion.");
    }

    return await fn();

  } catch (error) {
    console.error(name, error);
    return `Fehler in ${name}: ${error.message}`;

  } finally {
    save();
  }
}

function agentOverview() {
  return Object.entries(agents).map(([key, agent]) => {
    return [
      agent.name,
      agent.description,
      `Ausführungen: ${Number(data.agentStats[key]) || 0}`
    ].join("\n");
  }).join("\n\n");
}

/* =====================================================
   2. LERN- UND ANALYSE-KI
   ===================================================== */

function analyzeKnowledge() {
  return agentRun("analyse", () => {
    const subjects = new Set(
      data.facts.map(f => normalize(f.subject))
    );

    const properties = new Set(
      data.facts.map(f => f.property)
    );

    const conflicts = data.facts.filter(f => f.conflict);

    return [
      "WISSENSANALYSE",
      "",
      `Gespeicherte Fakten: ${data.facts.length}`,
      `Unterschiedliche Themen: ${subjects.size}`,
      `Eigenschaftsarten: ${properties.size}`,
      `Wissensverbindungen: ${data.relationships.length}`,
      `Erinnerungen: ${data.memory.length}`,
      `Erkannte Konflikte: ${conflicts.length}`,
      "",
      "Agentenstatistik:",
      ...Object.entries(data.agentStats).map(([key, value]) =>
        `${key}: ${Number(value) || 0}`
      )
    ].join("\n");
  });
}

function findRelatedFacts(query, limit = 10) {
  const q = safeText(query);

  if (!q) return [];

  limit = Math.max(1, Math.min(100, Number(limit) || 10));

  return data.facts
    .map(f => ({
      fact: f,
      score: similarity(
        q,
        `${f.subject} ${f.property} ${f.value}`
      )
    }))
    .filter(x => x.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.fact);
}

function explainTopic(topic) {
  topic = safeText(topic, 1000);

  if (!topic) {
    return "Bitte gib ein Thema an.";
  }

  const facts = findRelatedFacts(topic, 20);
  const memories = searchMemory(topic, 5);
  const connections = graphFor(topic);

  if (!facts.length && !memories.length && !connections.length) {
    return `Ich habe zu "${topic}" noch nicht genügend eigenes Wissen gespeichert.`;
  }

  const result = [
    `WISSEN ÜBER ${topic.toUpperCase()}`,
    ""
  ];

  if (facts.length) {
    result.push("GESPEICHERTE FAKTEN");

    facts.forEach(f => {
      result.push(
        `• ${f.subject}: ${f.property} – ${f.value}`
      );
    });
  }

  if (connections.length) {
    result.push("", "WISSENSVERBINDUNGEN");

    connections.forEach(r => {
      result.push(
        `• ${r.from} —${r.relation}→ ${r.to}`
      );
    });
  }

  if (memories.length) {
    result.push("", "ERINNERUNGEN");

    memories.forEach(m => {
      result.push(`• ${m.content}`);
    });
  }

  return result.join("\n");
}

/* =====================================================
   3. INTERNET-RECHERCHE
   ===================================================== */

async function fetchJSON(url, timeout = 10000) {
  if (typeof fetch !== "function") {
    throw new Error("Dieser Browser unterstützt fetch nicht.");
  }

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();

  } finally {
    clearTimeout(timer);
  }
}

function encodeQuery(query) {
  return encodeURIComponent(safeText(query, 500));
}

async function searchWikipedia(query) {
  const url =
    "https://de.wikipedia.org/w/api.php" +
    "?action=query&generator=search" +
    "&gsrsearch=" + encodeQuery(query) +
    "&gsrlimit=5&prop=extracts" +
    "&exintro=1&explaintext=1&format=json&origin=*";

  const json = await fetchJSON(url);

  const pages = Object.values(
    json.query?.pages || {}
  );

  return pages.map(p => ({
    title: safeText(p.title, 500),
    text: safeText(p.extract, 3000),
    url:
      "https://de.wikipedia.org/wiki/" +
      encodeURIComponent(p.title.replace(/ /g, "_")),
    source: "Wikipedia"
  }));
}

async function searchWikidata(query) {
  const url =
    "https://www.wikidata.org/w/api.php" +
    "?action=wbsearchentities&search=" +
    encodeQuery(query) +
    "&language=de&format=json&origin=*";

  const json = await fetchJSON(url);

  return arr(json.search).slice(0, 5).map(item => ({
    title: safeText(item.label, 500),
    text: safeText(
      item.description || "Keine Beschreibung verfügbar.",
      2000
    ),
    url: safeText(item.concepturi, 1000),
    source: "Wikidata"
  }));
}

async function searchOpenLibrary(query) {
  const url =
    "https://openlibrary.org/search.json?q=" +
    encodeQuery(query) +
    "&limit=5";

  const json = await fetchJSON(url);

  return arr(json.docs).slice(0, 5).map(item => ({
    title: safeText(item.title || "Unbekannter Titel", 500),
    text: [
      arr(item.author_name).join(", "),
      item.first_publish_year
        ? "Erstveröffentlichung: " + item.first_publish_year
        : ""
    ].filter(Boolean).join(" – "),
    url: item.key
      ? "https://openlibrary.org" + item.key
      : "",
    source: "Open Library"
  }));
}

async function research(query) {
  query = safeText(query, 500);

  if (!query) {
    return "Bitte gib ein Recherchethema an.";
  }

  return agentRunAsync("recherche", async () => {
    const results = [];
    const errors = [];

    const searches = [
      ["Wikipedia", () => searchWikipedia(query)],
      ["Wikidata", () => searchWikidata(query)]
    ];

    /* Buchthemen zusätzlich in Open Library suchen */

    if (
      /\b(buch|bücher|roman|autor|autorin|isbn|literatur)\b/i.test(query)
    ) {
      searches.push([
        "Open Library",
        () => searchOpenLibrary(query)
      ]);
    }

    for (const [name, search] of searches) {
      try {
        const found = await search();
        results.push(...found);

      } catch (error) {
        errors.push(`${name}: ${error.message}`);
      }
    }

    /* Leere Ergebnisse entfernen */

    const cleaned = results.filter(item =>
      item && item.title && item.text
    );

    /* Doppelte Titel entfernen */

    const unique = [];
    const seen = new Set();

    cleaned.forEach(item => {
      const key = normalize(item.title);

      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    if (!unique.length) {
      return [
        "Ich konnte keine Rechercheergebnisse abrufen.",
        "",
        errors.join("\n"),
        "",
        "Prüfe deine Internetverbindung oder versuche es später erneut."
      ].filter(Boolean).join("\n");
    }

    /* Recherche auch als durchsuchbaren Dokumenttext speichern */

    const combinedText = unique.map(item => [
      item.title,
      item.text,
      "Quelle: " + item.source,
      item.url
    ].filter(Boolean).join("\n")).join("\n\n");

    const document = {
      id: uid(),
      title: "Recherche: " + query,
      type: "research",
      content: combinedText,
      results: unique,
      created: now(),
      length: combinedText.length
    };

    data.documents.push(document);

    logAudit(
      "Recherche-KI",
      "Recherche abgeschlossen",
      `${unique.length} Ergebnisse für ${query}`
    );

    save();

    return [
      `RECHERCHE: ${query}`,
      "",
      ...unique.map((r, i) =>
        `${i + 1}. ${r.title}\n${r.text}\nQuelle: ${r.source}\n${r.url}`
      ),
      "",
      errors.length
        ? "Nicht erreichbare Quellen:\n" + errors.join("\n")
        : ""
    ].filter(Boolean).join("\n\n");
  });
}

/* =====================================================
   4. DOKUMENTEN-KI
   ===================================================== */

function importDocumentText(text, filename = "Textimport") {
  return agentRun("dokument", () => {
    text = safeText(text, 100000);
    filename = safeText(filename, 300) || "Textimport";

    if (!text) {
      return "Das Dokument enthält keinen lesbaren Text.";
    }

    const entry = {
      id: uid(),
      title: filename,
      type: "document",
      content: text,
      created: now(),
      length: text.length
    };

    data.documents.push(entry);

    remember(
      "dokument",
      `Dokument importiert: ${filename}`
    );

    save();

    return [
      "DOKUMENT IMPORTIERT",
      "",
      `Datei: ${filename}`,
      `Zeichen: ${text.length}`,
      `Wörter: ${tokenize(text).length}`,
      "",
      "Die Inhalte sind jetzt im Dokumentenspeicher verfügbar."
    ].join("\n");
  });
}

function searchDocuments(query) {
  const q = safeText(query);

  if (!q) return [];

  return data.documents
    .filter(d =>
      obj(d) &&
      typeof d.content === "string" &&
      d.content.length > 0
    )
    .map(d => ({
      document: d,
      score: similarity(
        q,
        `${d.title || ""} ${d.content}`
      )
    }))
    .filter(x => x.score > 0.03)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function summarizeDocument(id) {
  const doc = data.documents.find(d =>
    d.id === id &&
    typeof d.content === "string" &&
    d.content.length > 0
  );

  if (!doc) {
    return "Dokument nicht gefunden.";
  }

  const sentences = (
    doc.content
      .replace(/\s+/g, " ")
      .match(/[^.!?]+[.!?]+/g) || [doc.content]
  )
    .map(s => s.trim())
    .filter(Boolean);

  if (!sentences.length) {
    return "Das Dokument enthält keinen zusammenfassbaren Text.";
  }

  /* Häufige Begriffe als einfache Relevanzhilfe */

  const frequency = {};

  sentences.forEach(sentence => {
    tokenize(sentence).forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
  });

  const ranked = sentences.map((sentence, index) => {
    const words = tokenize(sentence);

    const score = words.reduce(
      (sum, word) => sum + (frequency[word] || 0),
      0
    );

    return {
      sentence,
      index,
      score: words.length
        ? score / Math.sqrt(words.length)
        : 0
    };
  });

  const selected = ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .sort((a, b) => a.index - b.index);

  return [
    `ZUSAMMENFASSUNG: ${doc.title || "Dokument"}`,
    "",
    ...selected.map(x => "• " + x.sentence),
    "",
    "Hinweis: Automatisch ausgewählte Kernaussagen, keine vollständige KI-Zusammenfassung."
  ].join("\n");
}

/* =====================================================
   5. PROJEKT- UND AUFGABEN-KI
   ===================================================== */

function createProject(name, description = "") {
  name = safeText(name, 150);
  description = safeText(description, 3000);

  if (!name) {
    return "Bitte gib einen Projektnamen an.";
  }

  const project = {
    id: uid(),
    name,
    description,
    status: "aktiv",
    created: now(),
    updated: now()
  };

  data.projects.push(project);

  logAudit(
    "Projekt-KI",
    "Projekt erstellt",
    name
  );

  save();

  return `Projekt erstellt: ${name}\nProjekt-ID: ${project.id}`;
}

function createTask(title, projectId = null, due = null) {
  title = safeText(title, 300);

  if (!title) {
    return "Bitte gib eine Aufgabe an.";
  }

  if (projectId !== null) {
    projectId = safeText(projectId, 200);

    const projectExists = data.projects.some(p =>
      p.id === projectId
    );

    if (!projectExists) {
      return "Das angegebene Projekt wurde nicht gefunden.";
    }
  }

  const task = {
    id: uid(),
    title,
    projectId,
    due,
    done: false,
    created: now(),
    updated: now()
  };

  data.tasks.push(task);

  logAudit(
    "Projekt-KI",
    "Aufgabe erstellt",
    title
  );

  save();

  return `Aufgabe erstellt: ${title}`;
}

function completeTask(id) {
  id = safeText(id, 200);

  const task = data.tasks.find(t =>
    t.id === id
  );

  if (!task) {
    return "Aufgabe nicht gefunden.";
  }

  if (task.done) {
    return `Die Aufgabe ist bereits erledigt: ${task.title}`;
  }

  task.done = true;
  task.updated = now();

  logAudit(
    "Projekt-KI",
    "Aufgabe abgeschlossen",
    task.title
  );

  save();

  return `Erledigt: ${task.title}`;
}

function listProjects() {
  if (!data.projects.length) {
    return "Noch keine Projekte vorhanden.";
  }

  return data.projects.map(p => {
    const tasks = data.tasks.filter(t =>
      t.projectId === p.id
    );

    const done = tasks.filter(t => t.done).length;

    return [
      p.name,
      `Status: ${p.status || "aktiv"}`,
      `Aufgaben: ${done}/${tasks.length} erledigt`,
      p.description || "",
      `Projekt-ID: ${p.id}`
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

function listTasks() {
  if (!data.tasks.length) {
    return "Noch keine Aufgaben vorhanden.";
  }

  return data.tasks.map(t =>
    [
      `${t.done ? "[X]" : "[ ]"} ${t.title}`,
      `ID: ${t.id}`,
      t.projectId ? `Projekt: ${t.projectId}` : "",
      t.due ? `Fällig: ${t.due}` : ""
    ].filter(Boolean).join("\n")
  ).join("\n\n");
}

/* =====================================================
   6. CODE-KI
   ===================================================== */

function inspectCode(source) {
  source = String(source || "");

  const findings = [];

  const rules = [
    {
      name: "Mögliche unsichere HTML-Ausgabe",
      regex: /\.innerHTML\s*=/g,
      severity: "warning",
      advice: "Bei Benutzereingaben textContent oder sichere Sanitizer verwenden."
    },
    {
      name: "Möglicher unsicherer eval-Aufruf",
      regex: /\beval\s*\(/g,
      severity: "critical",
      advice: "eval vermeiden. Stattdessen sichere Funktionen verwenden."
    },
    {
      name: "Möglicher ungeschützter localStorage-Zugriff",
      regex: /JSON\.parse\s*\(\s*localStorage\.getItem/g,
      severity: "warning",
      advice: "JSON.parse in try/catch absichern."
    },
    {
      name: "Möglicher fest eingebauter API-Schlüssel",
      regex: /(?:sk-[A-Za-z0-9_-]{15,}|api[_-]?key\s*[:=]\s*["'][^"']+)/gi,
      severity: "critical",
      advice: "API-Schlüssel niemals im Browsercode speichern."
    },
    {
      name: "Möglicher fetch-Aufruf",
      regex: /\bfetch\s*\(/g,
      severity: "info",
      advice: "Netzwerkzugriffe mit try/catch absichern."
    }
  ];

  rules.forEach(rule => {
    let match;

    while ((match = rule.regex.exec(source)) !== null) {
      const line = source
        .slice(0, match.index)
        .split("\n").length;

      findings.push({
        name: rule.name,
        line,
        severity: rule.severity,
        advice: rule.advice
      });
    }
  });

  return findings;
}

function inspectCodeReport(source) {
  const findings = inspectCode(source);

  const critical = findings.filter(x =>
    x.severity === "critical"
  ).length;

  const warnings = findings.filter(x =>
    x.severity === "warning"
  ).length;

  return [
    "CODE-PRÜFUNG LERNBOT 6.0",
    "",
    `Gefundene Hinweise: ${findings.length}`,
    `Kritisch: ${critical}`,
    `Warnungen: ${warnings}`,
    "",
    ...findings.map(f =>
      `[${f.severity.toUpperCase()}] Zeile ${f.line}: ${f.name}\n${f.advice}`
    ),
    "",
    findings.length
      ? "Hinweis: Statische Prüfhilfen, kein vollständiger JavaScript-Compiler."
      : "Keine Treffer in den eingebauten Prüfregeln."
  ].join("\n");
}

/* =====================================================
   7. SICHERUNGEN UND VERSIONSVERLAUF
   ===================================================== */

function createSnapshot(label = "Manuelle Sicherung") {
  const snapshot = {
    id: uid(),
    label: safeText(label, 200) || "Manuelle Sicherung",
    time: now(),

    facts: clone(data.facts),
    qa: clone(data.qa),
    classes: clone(data.classes),
    memory: clone(data.memory),
    relationships: clone(data.relationships),
    projects: clone(data.projects),
    tasks: clone(data.tasks),
    documents: clone(data.documents),
    agentStats: clone(data.agentStats),
    settings: clone(data.settings),
    theme: data.theme
  };

  data.snapshots.push(snapshot);
  data.snapshots = data.snapshots.slice(-30);

  logAudit(
    "Sicherungssystem",
    "Sicherung erstellt",
    snapshot.label
  );

  save();

  return `Sicherung erstellt: ${snapshot.label}`;
}

function restoreSnapshot(id) {
  id = safeText(id, 200);

  const snapshot = data.snapshots.find(s =>
    s.id === id
  );

  if (!snapshot) {
    return "Sicherung nicht gefunden.";
  }

  const fields = [
    "facts",
    "qa",
    "classes",
    "memory",
    "relationships",
    "projects",
    "tasks",
    "documents"
  ];

  for (const key of fields) {
    if (!Array.isArray(snapshot[key])) {
      return `Wiederherstellung abgebrochen: ${key} ist beschädigt.`;
    }
  }

  /* Vorherigen Stand automatisch sichern */

  const previous = {
    facts: data.facts,
    qa: data.qa,
    classes: data.classes,
    memory: data.memory,
    relationships: data.relationships,
    projects: data.projects,
    tasks: data.tasks,
    documents: data.documents
  };

  try {
    for (const key of fields) {
      data[key] = clone(snapshot[key]);
    }

    if (obj(snapshot.agentStats)) {
      data.agentStats = clone(snapshot.agentStats);
    }

    if (obj(snapshot.settings)) {
      data.settings = {
        ...data.settings,
        ...clone(snapshot.settings)
      };
    }

    if (typeof snapshot.theme === "string") {
      data.theme = snapshot.theme;
    }

    if (!save()) {
      throw new Error("Speichern der Wiederherstellung fehlgeschlagen.");
    }

    logAudit(
      "Sicherungssystem",
      "Sicherung wiederhergestellt",
      snapshot.label
    );

    save();

    return `Sicherung wiederhergestellt: ${snapshot.label}`;

  } catch (error) {
    Object.assign(data, previous);
    save();

    return `Wiederherstellung fehlgeschlagen: ${error.message}`;
  }
}

/* =====================================================
   8. EXPORT UND IMPORT
   ===================================================== */

function exportData() {
  return JSON.stringify({
    app: NAME,
    version: VERSION,
    exported: new Date().toISOString(),
    data
  }, null, 2);
}

function importData(json) {
  let parsed;

  try {
    parsed = JSON.parse(json);
  } catch {
    return "Import fehlgeschlagen: Ungültiges JSON.";
  }

  const incoming = obj(parsed?.data)
    ? parsed.data
    : parsed;

  if (!obj(incoming)) {
    return "Ungültiges Datenformat.";
  }

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

  const replacements = {};

  /* Alle Arrays zuerst prüfen */

  for (const key of arrayKeys) {
    if (incoming[key] === undefined) continue;

    if (!Array.isArray(incoming[key])) {
      return `Import abgebrochen: ${key} ist kein gültiges Array.`;
    }

    replacements[key] = incoming[key].filter(obj);
  }

  /* Fakten besonders prüfen */

  if (replacements.facts) {
    replacements.facts = replacements.facts.filter(f =>
      typeof f.subject === "string" &&
      typeof f.property === "string" &&
      typeof f.value === "string"
    );
  }

  if (replacements.qa) {
    replacements.qa = replacements.qa.filter(q =>
      typeof q.k === "string" &&
      typeof q.a === "string"
    );
  }

  if (replacements.memory) {
    replacements.memory = replacements.memory.filter(m =>
      typeof m.content === "string" &&
      typeof m.type === "string"
    );
  }

  if (replacements.relationships) {
    replacements.relationships = replacements.relationships.filter(r =>
      typeof r.from === "string" &&
      typeof r.to === "string" &&
      typeof r.relation === "string"
    );
  }

  if (replacements.documents) {
    replacements.documents = replacements.documents.filter(d =>
      typeof d.title === "string" ||
      typeof d.content === "string"
    );
  }

  /* Objektfelder prüfen */

  if (
    incoming.agentStats !== undefined &&
    !obj(incoming.agentStats)
  ) {
    return "Import abgebrochen: agentStats ist ungültig.";
  }

  if (
    incoming.settings !== undefined &&
    !obj(incoming.settings)
  ) {
    return "Import abgebrochen: settings ist ungültig.";
  }

  if (
    incoming.theme !== undefined &&
    typeof incoming.theme !== "string"
  ) {
    return "Import abgebrochen: theme ist ungültig.";
  }

  /* Erst nach erfolgreicher Prüfung übernehmen */

  for (const [key, value] of Object.entries(replacements)) {
    data[key] = clone(value);
  }

  if (obj(incoming.agentStats)) {
    const stats = {};

    for (const [key, value] of Object.entries(incoming.agentStats)) {
      const number = Number(value);

      if (Number.isFinite(number) && number >= 0) {
        stats[key] = number;
      }
    }

    data.agentStats = stats;
  }

  if (obj(incoming.settings)) {
    data.settings = {
      ...data.settings,
      ...incoming.settings
    };
  }

  if (typeof incoming.theme === "string") {
    data.theme = incoming.theme;
  }

  if (!save()) {
    return "Daten wurden übernommen, konnten aber nicht dauerhaft gespeichert werden.";
  }

  logAudit(
    "Import-System",
    "Datenimport abgeschlossen",
    "JSON-Import"
  );

  save();

  return "Datenimport erfolgreich abgeschlossen.";
}

/* =====================================================
   TEIL 2 ENDE – TEIL 3 FOLGT
   ===================================================== */


/* =====================================================
   LERNBOT 6.0 – TEIL 3/3
   FINAL: CHAT, BEFEHLE, DATEIEN, UI UND SYSTEMSTART
   ===================================================== */

/* =====================================================
   1. STATUS-FALLBACK
   Wird auch von save() aus Teil 1 benötigt.
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
   3. ALLGEMEINE HILFSFUNKTIONEN
   ===================================================== */

function lb6Text(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
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

  if (colon < 0) {
    return null;
  }

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

  if (chat) {
    chat.replaceChildren();
  }
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
   Erstellt nur HTML – keine doppelten Listener.
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
   7. LERNEN UND RECHERCHIEREN
   Diese beiden Funktionen fehlten im bisherigen Teil 3.
   ===================================================== */

function getLearningResponse(value) {
  const content = safeText(value, 100000);

  if (!content) {
    return "Bitte gib einen Lerninhalt an.";
  }

  return learnFact(content);
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

  return memories.map((item, index) => {
    return [
      `${index + 1}. ${item.content || ""}`,
      `ID: ${item.id || "Keine ID"}`,
      `Typ: ${item.type || "Allgemein"}`,
      `Erstellt: ${lb6Date(item.created)}`
    ].join("\n");
  }).join("\n\n");
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

  return (
    "Erinnerung erfolgreich gespeichert.\n\n" +
    content +
    "\n\nErinnerungs-ID: " + result.id
  );
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
   9. WISSEN
   ===================================================== */

function getKnowledgeResponse(topic) {
  topic = safeText(topic, 500);

  if (!topic) {
    return "Bitte gib ein Thema an.";
  }

  const directAnswer = answerFact(topic);

  if (directAnswer) {
    return directAnswer;
  }

  const explanation = explainTopic(topic);

  if (explanation) {
    return explanation;
  }

  return "Zu diesem Thema habe ich noch keine Informationen.";
}


/* =====================================================
   10. DOKUMENTENVERWALTUNG
   ===================================================== */

function getDocumentList() {
  const documents = arr(data.documents);

  if (!documents.length) {
    return "Es sind noch keine Dokumente gespeichert.";
  }

  return documents.map((document, index) => {
    return [
      `${index + 1}. ${lb6Title(document)}`,
      `ID: ${lb6Id(document) || "Keine ID"}`,
      `Typ: ${document.type || "Unbekannt"}`,
      `Erstellt: ${lb6Date(document.created)}`
    ].join("\n");
  }).join("\n\n");
}

function searchDocumentResponse(query) {
  query = safeText(query, 500);

  if (!query) {
    return getDocumentList();
  }

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
      `Inhalt: ${safeText(document.content || "", 350)}`
    ].join("\n");
  }).filter(Boolean).join("\n\n");
}

function summarizeDocumentResponse(query) {
  query = safeText(query, 500);

  if (!query) {
    return (
      "Bitte gib eine Dokument-ID oder einen Titel an.\n\n" +
      getDocumentList()
    );
  }

  const documents = arr(data.documents);

  const document = documents.find(item =>
    lb6Id(item) === query ||
    normalize(lb6Title(item)) === normalize(query)
  );

  if (!document) {
    return (
      "Dokument nicht gefunden.\n\n" +
      getDocumentList()
    );
  }

  if (!document.content) {
    return "Dieses Dokument besitzt keinen gespeicherten Textinhalt.";
  }

  return summarizeDocument(document.id);
}


/* =====================================================
   11. PROJEKTE UND AUFGABEN
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

  if (!createdTask) {
    return lb6Text(result);
  }

  return (
    lb6Text(result) +
    "\nAufgaben-ID: " + createdTask.id
  );
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
   12. SICHERUNGEN UND EXPORT
   ===================================================== */

function getSnapshotList() {
  const snapshots = arr(data.snapshots);

  if (!snapshots.length) {
    return "Es sind noch keine Sicherungen vorhanden.";
  }

  return snapshots.map((snapshot, index) => {
    return [
      `${index + 1}. ${snapshot.label || "Sicherung"}`,
      `ID: ${snapshot.id || "Keine ID"}`,
      `Datum: ${lb6Date(snapshot.time)}`
    ].join("\n");
  }).join("\n\n");
}

function createSnapshotResponse() {
  const result = createSnapshot("Manuelle Sicherung");

  const snapshots = arr(data.snapshots);
  const newest = snapshots[snapshots.length - 1];

  return (
    lb6Text(result) +
    (newest ? "\nSicherungs-ID: " + newest.id : "")
  );
}

function restoreSnapshotResponse(id) {
  id = safeText(id, 200);

  if (!id) {
    return (
      "Bitte gib eine Sicherungs-ID an.\n\n" +
      getSnapshotList()
    );
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

    return (
      "Export fehlgeschlagen:\n" +
      lb6Error(error)
    );

  } finally {
    if (url) {
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1500);
    }
  }
}


/* =====================================================
   13. DATEIIMPORT
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
        throw new Error(
          "Das JSON enthält kein gültiges Datenobjekt."
        );
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
      "Dateiimport fehlgeschlagen:\n" +
      lb6Error(error)
    );

  } finally {
    if (event?.target) {
      event.target.value = "";
    }
  }
}


/* =====================================================
   14. HILFE
   ===================================================== */

function getHelpText() {
  return `
LERNBOT 6.0 – BEFEHLE

LERNEN
Lerne: Die Hauptstadt von Deutschland ist Berlin.

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
   15. ZENTRALE BEFEHLSVERARBEITUNG
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
      if (!value) {
        return "Bitte gib ein Recherchethema an.";
      }

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
      if (!value) {
        return "Bitte gib einen Projektnamen an.";
      }

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

        const output = [
          "ANALYSEERGEBNIS",
          "",
          explanation,
          "",
          "VERWANDTE FAKTEN",
          facts.length
            ? facts.map(f =>
                `• ${f.subject}: ${f.property} – ${f.value}`
              ).join("\n")
            : "Keine verwandten Fakten gefunden."
        ];

        return output.join("\n");
      });
    }


    /* ALLGEMEINE FRAGEN */

    const directAnswer = answerFact(text);

    if (directAnswer) {
      return directAnswer;
    }

    const explanation = explainTopic(text);

    if (
      explanation &&
      !String(explanation).includes(
        "noch nicht genügend eigenes Wissen"
      )
    ) {
      return explanation;
    }

    return (
      "Dazu habe ich noch keine ausreichenden Informationen " +
      "in meiner Wissensbank.\n\n" +
      "Du kannst mir das Thema mit „Lerne: ...“ beibringen " +
      "oder mit „Recherchiere: ...“ recherchieren."
    );

  } catch (error) {
    console.error("LernBot Befehlsfehler:", error);

    return (
      "Bei der Verarbeitung ist ein Fehler aufgetreten:\n\n" +
      lb6Error(error)
    );
  }
}


/* =====================================================
   16. NACHRICHTEN SENDEN
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

  if (send) {
    send.disabled = true;
  }

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

    if (send) {
      send.disabled = false;
    }

    if (document.activeElement !== input) {
      input.focus();
    }
  }
}


/* =====================================================
   17. CHAT-EINRICHTUNG
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
   18. DATEI-EINRICHTUNG
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
   19. EXPORT-BUTTONS
   ===================================================== */

function setupExportButtons() {
  const buttons = document.querySelectorAll(
    "[data-lb6-export], #lb6-export, #export-button, #export-btn"
  );

  buttons.forEach(button => {
    if (button.dataset.lb6Bound === "true") {
      return;
    }

    button.dataset.lb6Bound = "true";

    button.addEventListener("click", () => {
      const result = downloadExport();
      addMessage("system", result);
    });
  });
}


/* =====================================================
   20. SYSTEMSTART
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
   21. SYSTEMSTART AUSFÜHREN
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
