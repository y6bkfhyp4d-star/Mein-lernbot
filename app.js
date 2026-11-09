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
const obj = x => x && typeof x === "object" && !Array.isArray(x);
const uid = () => "LB-" + now().toString(36) +
  "-" + Math.random().toString(36).slice(2,8);

const safeText = (v, max = 20000) =>
  String(v ?? "").slice(0, max).trim();

function normalize(text) {
  return safeText(text).toLocaleLowerCase("de")
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

  return normalize(text).split(" ")
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
   1. DATENBANK UND MIGRATION
   ===================================================== */

let data = {};

try {
  data = JSON.parse(localStorage.getItem(KEY) || "{}");
} catch {
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

for (const [key, value] of Object.entries(defaults)) {
  if (data[key] === undefined) {
    data[key] = Array.isArray(value) ? [] :
      obj(value) ? structuredClone(value) : value;
  }
}

data.facts = arr(data.facts).filter(x =>
  obj(x) && typeof x.subject === "string" &&
  typeof x.property === "string" &&
  typeof x.value === "string"
);

data.qa = arr(data.qa).filter(x =>
  obj(x) && typeof x.k === "string" &&
  typeof x.a === "string"
);

data.projects = arr(data.projects).filter(obj);
data.tasks = arr(data.tasks).filter(obj);
data.documents = arr(data.documents).filter(obj);
data.relationships = arr(data.relationships).filter(obj);
data.memory = arr(data.memory).filter(obj);
data.audit = arr(data.audit).filter(obj);
data.snapshots = arr(data.snapshots).filter(obj);
data.codeProposals = arr(data.codeProposals).filter(obj);

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
    setStatus("Speicher voll – bitte Sicherung exportieren.");
    return false;
  }
}

function logAudit(agent, action, detail = "") {
  data.audit.push({
    id: uid(),
    agent,
    action,
    detail: safeText(detail, 1000),
    time: now()
  });
}

function countAgent(name) {
  data.agentStats[name] = (data.agentStats[name] || 0) + 1;
}

/* =====================================================
   2. LANGZEITGEDÄCHTNIS
   ===================================================== */

function remember(type, content, meta = {}) {
  content = safeText(content, 10000);
  if (!content) return null;

  const entry = {
    id: uid(),
    type,
    content,
    meta: obj(meta) ? meta : {},
    created: now(),
    updated: now()
  };

  const existing = data.memory.find(x =>
    x.type === type &&
    normalize(x.content) === normalize(content)
  );

  if (existing) {
    existing.updated = now();
    existing.meta = { ...existing.meta, ...entry.meta };
    save();
    return existing;
  }

  data.memory.push(entry);
  logAudit("Gedächtnis-KI", "Erinnerung gespeichert", type);
  save();

  return entry;
}

function searchMemory(query, limit = 8) {
  const q = normalize(query);
  if (!q) return [];

  return data.memory.map(item => ({
    item,
    score: similarity(q, item.content)
  }))
  .filter(x => x.score > 0.08)
  .sort((a,b) => b.score - a.score)
  .slice(0, limit)
  .map(x => x.item);
}

function forgetMemory(query) {
  const q = normalize(query);
  const before = data.memory.length;

  data.memory = data.memory.filter(x =>
    !normalize(x.content).includes(q)
  );

  save();
  return before - data.memory.length;
}

/* =====================================================
   3. WISSENSBANK
   ===================================================== */

function cleanSubject(text) {
  return safeText(text)
    .replace(/^(der|die|das|ein|eine|einen|einem|einer)\s+/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function sameSubject(a,b) {
  return normalize(cleanSubject(a)) ===
    normalize(cleanSubject(b));
}

function getFacts(subject = "") {
  if (!subject) return data.facts;

  return data.facts.filter(f =>
    sameSubject(f.subject, subject)
  );
}

function addFact(subject, property, value, source = "user") {
  subject = cleanSubject(subject);
  property = normalize(property);
  value = safeText(value, 5000);

  if (!subject || !property || !value) return false;

  const existing = data.facts.find(f =>
    sameSubject(f.subject, subject) &&
    normalize(f.property) === property
  );

  if (existing) {
    if (normalize(existing.value) !== normalize(value)) {
      existing.previous = existing.value;
      existing.conflict = true;
      existing.alternatives = arr(existing.alternatives);
      existing.alternatives.push({
        value,
        source,
        time: now()
      });
    }

    existing.value = value;
    existing.source = source;
    existing.updated = now();
  } else {
    data.facts.push({
      id: uid(),
      subject,
      property,
      value,
      source,
      confidence: source === "user" ? 1 : 0.7,
      created: now(),
      updated: now()
    });
  }

  remember("fakt", `${subject}: ${property} = ${value}`, {
    subject, property, source
  });

  save();
  return true;
}

function parseFact(text) {
  const s = safeText(text);

  if (!s || s.includes("?")) return null;

  let m;

  m = s.match(/^die\s+hauptstadt\s+von\s+(.+?)\s+ist\s+(.+)$/i);
  if (m) return {
    subject: cleanSubject(m[1]),
    property: "hauptstadt",
    value: safeText(m[2]).replace(/[.!]+$/, "")
  };

  m = s.match(/^(.+?)\s+(lebt|wohnt)\s+(?:in|im|am|auf)\s+(.+)$/i);
  if (m) return {
    subject: cleanSubject(m[1]),
    property: "lebensraum",
    value: safeText(m[3]).replace(/[.!]+$/, "")
  };

  m = s.match(/^(.+?)\s+(frisst|isst)\s+(.+)$/i);
  if (m) return {
    subject: cleanSubject(m[1]),
    property: "nahrung",
    value: safeText(m[3]).replace(/[.!]+$/, "")
  };

  m = s.match(/^(.+?)\s+gehört\s+zu\s+(.+)$/i);
  if (m) return {
    subject: cleanSubject(m[1]),
    property: "zugehörigkeit",
    value: safeText(m[2]).replace(/[.!]+$/, "")
  };

  m = s.match(/^(.+?)\s+(?:ist|sind|heißt)\s+(.+)$/i);
  if (m) return {
    subject: cleanSubject(m[1]),
    property: "definition",
    value: safeText(m[2]).replace(/[.!]+$/, "")
  };

  return null;
}

function learnFact(text) {
  const fact = parseFact(text);
  if (!fact) return null;

  addFact(
    fact.subject,
    fact.property,
    fact.value,
    "user"
  );

  return `Gelernt und gespeichert!

Thema: ${fact.subject}
Eigenschaft: ${fact.property}
Wissen: ${fact.value}

Gespeicherte Fakten: ${data.facts.length}`;
}

function answerFact(question) {
  const q = normalize(question);

  let property = null;

  if (/\b(hauptstadt)\b/.test(q)) property = "hauptstadt";
  else if (/\b(wo lebt|wo wohnt|lebensraum)\b/.test(q)) property = "lebensraum";
  else if (/\b(was frisst|was isst|nahrung)\b/.test(q)) property = "nahrung";
  else if (/\b(zu welcher|gehört zu|welche familie)\b/.test(q)) property = "zugehörigkeit";
  else if (/^(was ist|wer ist|was bedeutet)\b/.test(q)) property = "definition";

  if (!property) return null;

  let subject = question
    .replace(/^(was ist|wer ist|was bedeutet|wo lebt|wo wohnt|was frisst|was isst|in welchem land|zu welcher tierart)\s+/i, "")
    .replace(/[?!.]+$/, "");

  subject = cleanSubject(subject);

  const fact = data.facts.find(f =>
    sameSubject(f.subject, subject) &&
    f.property === property
  );

  return fact ? fact.value : null;
}

function knowledgeOverview() {
  if (!data.facts.length) return "Mein Wissensspeicher ist noch leer.";

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

  lines.push("", `Gesamt: ${data.facts.length} Fakten`);
  lines.push(`Erinnerungen: ${data.memory.length}`);

  return lines.join("\n");
}

/* =====================================================
   4. WISSENSGRAPH
   ===================================================== */

function connectKnowledge(from, relation, to) {
  from = cleanSubject(from);
  to = cleanSubject(to);
  relation = safeText(relation, 100);

  if (!from || !to || !relation) return false;

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

  save();
  return true;
}

function graphFor(subject) {
  const s = normalize(subject);

  return data.relationships.filter(r =>
    normalize(r.from) === s ||
    normalize(r.to) === s
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
   5. AGENTEN-SYSTEM
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
    return fn();
  } catch (error) {
    console.error(name, error);
    return `Fehler in ${name}: ${error.message}`;
  } finally {
    save();
  }
}

function agentOverview() {
  return Object.entries(agents).map(([key, agent]) => {
    return `${agent.name}\n${agent.description}\nAusführungen: ${data.agentStats[key] || 0}`;
  }).join("\n\n");
}

/* =====================================================
   6. LERN- UND ANALYSE-KI
   ===================================================== */

function analyzeKnowledge() {
  return agentRun("analyse", () => {
    const subjects = new Set(data.facts.map(f => normalize(f.subject)));
    const properties = new Set(data.facts.map(f => f.property));

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
      ...Object.entries(data.agentStats).map(([k,v]) => `${k}: ${v}`)
    ].join("\n");
  });
}

function findRelatedFacts(query, limit = 10) {
  return data.facts
    .map(f => ({
      fact: f,
      score: similarity(query, `${f.subject} ${f.property} ${f.value}`)
    }))
    .filter(x => x.score > 0.08)
    .sort((a,b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.fact);
}

function explainTopic(topic) {
  const facts = findRelatedFacts(topic, 20);
  const memories = searchMemory(topic, 5);
  const connections = graphFor(topic);

  if (!facts.length && !memories.length && !connections.length) {
    return `Ich habe zu "${topic}" noch nicht genügend eigenes Wissen gespeichert.`;
  }

  const result = [`WISSEN ÜBER ${topic.toUpperCase()}`, ""];

  if (facts.length) {
    result.push("Gespeicherte Fakten:");

    facts.forEach(f => {
      result.push(`• ${f.subject}: ${f.property} – ${f.value}`);
    });
  }

  if (connections.length) {
    result.push("", "Verbindungen:");

    connections.forEach(r => {
      result.push(`• ${r.from} —${r.relation}→ ${r.to}`);
    });
  }

  if (memories.length) {
    result.push("", "Erinnerungen:");

    memories.forEach(m => {
      result.push(`• ${m.content}`);
    });
  }

  return result.join("\n");
}

/* =====================================================
   7. INTERNET-RECHERCHE
   ===================================================== */

async function fetchJSON(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
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
  const pages = Object.values(json.query?.pages || {});

  return pages.map(p => ({
    title: p.title,
    text: safeText(p.extract, 3000),
    url: "https://de.wikipedia.org/wiki/" +
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
    title: item.label || "",
    text: item.description || "Keine Beschreibung verfügbar.",
    url: item.concepturi || "",
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
    title: item.title || "Unbekannter Titel",
    text: [
      item.author_name?.join(", "),
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
  return agentRunAsync("recherche", async () => {
    const results = [];
    const errors = [];

    const searches = [
      ["Wikipedia", () => searchWikipedia(query)],
      ["Wikidata", () => searchWikidata(query)]
    ];

    for (const [name, search] of searches) {
      try {
        results.push(...await search());
      } catch (error) {
        errors.push(`${name}: ${error.message}`);
      }
    }

    const unique = [];
    const seen = new Set();

    results.forEach(item => {
      const key = normalize(item.title);

      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    if (!unique.length) {
      return "Ich konnte keine Rechercheergebnisse abrufen.\n" +
        errors.join("\n") +
        "\n\nPrüfe deine Internetverbindung oder versuche es später erneut.";
    }

    data.documents.push({
      id: uid(),
      title: "Recherche: " + query,
      type: "research",
      created: now(),
      results: unique
    });

    save();

    return [
      `RECHERCHE: ${query}`,
      "",
      ...unique.map((r,i) =>
        `${i+1}. ${r.title}\n${r.text}\nQuelle: ${r.source}\n${r.url}`
      ),
      "",
      errors.length
        ? "Einige Quellen waren nicht erreichbar: " + errors.join("; ")
        : ""
    ].join("\n\n");
  });
}

async function agentRunAsync(name, fn) {
  countAgent(name);
  logAudit(name, "Recherche gestartet");

  try {
    return await fn();
  } catch (error) {
    console.error(name, error);
    return `Fehler in ${name}: ${error.message}`;
  } finally {
    save();
  }
}

/* =====================================================
   8. DOKUMENTEN-KI
   ===================================================== */

function importDocumentText(text, filename = "Textimport") {
  return agentRun("dokument", () => {
    text = safeText(text, 100000);

    if (!text) return "Das Dokument enthält keinen lesbaren Text.";

    const entry = {
      id: uid(),
      title: filename,
      type: "document",
      content: text,
      created: now(),
      length: text.length
    };

    data.documents.push(entry);
    remember("dokument", `Dokument importiert: ${filename}`);

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
  const q = normalize(query);

  return data.documents
    .filter(d => d.type === "document" && d.content)
    .map(d => ({
      document: d,
      score: similarity(q, d.title + " " + d.content)
    }))
    .filter(x => x.score > 0.03)
    .sort((a,b) => b.score - a.score)
    .slice(0, 5);
}

function summarizeDocument(id) {
  const doc = data.documents.find(d =>
    d.id === id && d.content
  );

  if (!doc) return "Dokument nicht gefunden.";

  const sentences = doc.content
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+/g) || [doc.content];

  const ranked = sentences.map(sentence => ({
    sentence: sentence.trim(),
    score: tokenize(sentence).length
  }));

  return [
    `ZUSAMMENFASSUNG: ${doc.title}`,
    "",
    ...ranked
      .sort((a,b) => b.score - a.score)
      .slice(0, 8)
      .map(x => "• " + x.sentence)
  ].join("\n");
}

/* =====================================================
   9. PROJEKT- UND AUFGABEN-KI
   ===================================================== */

function createProject(name, description = "") {
  name = safeText(name, 150);

  if (!name) return "Bitte gib einen Projektnamen an.";

  const project = {
    id: uid(),
    name,
    description: safeText(description, 3000),
    status: "aktiv",
    created: now(),
    updated: now()
  };

  data.projects.push(project);
  save();

  return `Projekt erstellt: ${name}\nProjekt-ID: ${project.id}`;
}

function createTask(title, projectId = null, due = null) {
  title = safeText(title, 300);

  if (!title) return "Bitte gib eine Aufgabe an.";

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
  save();

  return `Aufgabe erstellt: ${title}`;
}

function completeTask(id) {
  const task = data.tasks.find(t => t.id === id);

  if (!task) return "Aufgabe nicht gefunden.";

  task.done = true;
  task.updated = now();
  save();

  return `Erledigt: ${task.title}`;
}

function listProjects() {
  if (!data.projects.length) return "Noch keine Projekte vorhanden.";

  return data.projects.map(p => {
    const tasks = data.tasks.filter(t => t.projectId === p.id);
    const done = tasks.filter(t => t.done).length;

    return [
      p.name,
      `Status: ${p.status}`,
      `Aufgaben: ${done}/${tasks.length} erledigt`,
      p.description || ""
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

function listTasks() {
  if (!data.tasks.length) return "Noch keine Aufgaben vorhanden.";

  return data.tasks.map(t =>
    `${t.done ? "[X]" : "[ ]"} ${t.title}\nID: ${t.id}`
  ).join("\n\n");
}

/* =====================================================
   10. CODE-KI
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
      name: "Möglicher fehlender Fehlerfang bei fetch",
      regex: /fetch\s*\(/g,
      severity: "info",
      advice: "Netzwerkzugriffe mit try/catch absichern."
    }
  ];

  rules.forEach(rule => {
    let match;

    while ((match = rule.regex.exec(source)) !== null) {
      const line = source.slice(0, match.index).split("\n").length;

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
      ? "Hinweis: Das sind statische Prüfhilfen, kein vollständiger JavaScript-Compiler."
      : "Keine Treffer in den eingebauten Prüfregeln."
  ].join("\n");
}

/* =====================================================
   11. SICHERUNG UND VERSIONSVERLAUF
   ===================================================== */

function createSnapshot(label = "Manuelle Sicherung") {
  const snapshot = {
    id: uid(),
    label,
    time: now(),
    facts: structuredClone(data.facts),
    memory: structuredClone(data.memory),
    relationships: structuredClone(data.relationships),
    projects: structuredClone(data.projects),
    tasks: structuredClone(data.tasks)
  };

  data.snapshots.push(snapshot);
  data.snapshots = data.snapshots.slice(-30);

  save();

  return `Sicherung erstellt: ${label}`;
}

function restoreSnapshot(id) {
  const snapshot = data.snapshots.find(s => s.id === id);

  if (!snapshot) return "Sicherung nicht gefunden.";

  data.facts = structuredClone(snapshot.facts);
  data.memory = structuredClone(snapshot.memory);
  data.relationships = structuredClone(snapshot.relationships);
  data.projects = structuredClone(snapshot.projects);
  data.tasks = structuredClone(snapshot.tasks);

  save();

  return `Sicherung wiederhergestellt: ${snapshot.label}`;
}

function exportData() {
  return JSON.stringify({
    app: NAME,
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

  const incoming = obj(parsed.data) ? parsed.data : parsed;

  if (!obj(incoming)) return "Ungültiges Datenformat.";

  const allowed = [
    "facts", "qa", "classes", "memory",
    "relationships", "projects", "tasks",
    "documents", "audit", "improvements",
    "codeProposals", "agentStats"
  ];

  for (const key of allowed) {
    if (Array.isArray(incoming[key])) {
      data[key] = incoming[key].filter(obj);
    } else if (key === "agentStats" && obj(incoming[key])) {
      data.agentStats = incoming[key];
    }
  }

  save();

  return "Datenimport abgeschlossen.";
}

/* =====================================================
   TEIL 2 ENDE – TEIL 3 FOLGT
   ===================================================== */

/* =====================================================
   LERNBOT 6.0 – TEIL 3/3
   CHAT, BEFEHLE, DATEIEN, OBERFLÄCHE, START
   ===================================================== */

/* =====================================================
   12. STATUS UND CHAT
   ===================================================== */

function setStatus(message) {
  const status = $("status") ||
    $("statusText") ||
    $("connectionStatus");

  if (status) status.textContent = safeText(message, 500);
}

function findElement(ids) {
  for (const id of ids) {
    const element = $(id);
    if (element) return element;
  }
  return null;
}

const UI = {
  input: () => findElement([
    "userInput", "messageInput", "chatInput",
    "input", "prompt", "questionInput"
  ]),
  send: () => findElement([
    "sendBtn", "sendButton", "send",
    "submitBtn", "chatSend"
  ]),
  chat: () => findElement([
    "chatMessages", "messages", "chat",
    "chatContainer", "chatHistory", "conversation"
  ]),
  file: () => findElement([
    "fileInput", "uploadInput", "documentInput",
    "fileUpload"
  ])
};

function addMessage(role, content) {
  const container = UI.chat();

  if (!container) {
    console.log(`[${role}]`, content);
    return;
  }

  const message = document.createElement("div");
  message.className = "lb6-message lb6-" + role;

  const label = document.createElement("strong");
  label.textContent = role === "user" ? "Du" : NAME;

  const body = document.createElement("div");
  body.className = "lb6-message-content";
  body.textContent = String(content ?? "");

  message.append(label, body);
  container.appendChild(message);

  container.scrollTop = container.scrollHeight;
}

function addTyping() {
  const container = UI.chat();
  if (!container) return null;

  const element = document.createElement("div");
  element.className = "lb6-typing";
  element.textContent = "LernBot 6.0 denkt nach ...";

  container.appendChild(element);
  container.scrollTop = container.scrollHeight;

  return element;
}

function removeTyping(element) {
  if (element?.parentNode) element.remove();
}

function installStyles() {
  if ($("lb6-styles")) return;

  const style = document.createElement("style");
  style.id = "lb6-styles";

  style.textContent = `
    .lb6-message {
      padding: 12px 15px;
      margin: 10px 0;
      border-radius: 12px;
      overflow-wrap: anywhere;
      white-space: normal;
    }

    .lb6-user {
      background: rgba(70,120,220,.13);
      margin-left: 8%;
    }

    .lb6-assistant {
      background: rgba(120,120,120,.12);
      margin-right: 4%;
    }

    .lb6-message strong {
      display: block;
      margin-bottom: 6px;
    }

    .lb6-message-content {
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .lb6-typing {
      opacity: .7;
      padding: 10px;
      font-style: italic;
    }
  `;

  document.head.appendChild(style);
}

/* =====================================================
   13. INTELLIGENTE ANTWORTEN
   ===================================================== */

function findQA(question) {
  const q = normalize(question);

  const matches = data.qa.map(item => ({
    item,
    score: similarity(q, item.k)
  }))
  .filter(x => x.score >= 0.75)
  .sort((a,b) => b.score - a.score);

  return matches[0]?.item?.a || null;
}

function saveQA(question, answer) {
  question = safeText(question);
  answer = safeText(answer);

  if (!question || !answer) return false;

  const existing = data.qa.find(x =>
    normalize(x.k) === normalize(question)
  );

  if (existing) {
    existing.a = answer;
    existing.updated = now();
  } else {
    data.qa.push({
      id: uid(),
      k: question,
      a: answer,
      created: now()
    });
  }

  save();
  return true;
}

function getLearningResponse(text) {
  const fact = learnFact(text);

  if (fact) return fact;

  const existing = parseFact(text);

  if (existing) {
    return "Ich konnte die Information leider nicht speichern.";
  }

  return null;
}

function helpText() {
  return [
    "LERNBOT 6.0 – BEFEHLE",
    "",
    "LERNEN",
    "Lerne: Das Okapi lebt im Kongo.",
    "",
    "WISSEN",
    "Wissen: Okapi",
    "Erkläre: Okapi",
    "Wissensübersicht",
    "",
    "RECHERCHE",
    "Recherchiere: Schwarze Löcher",
    "Suche im Internet: Geschichte Roms",
    "",
    "GEDÄCHTNIS",
    "Erinnere dich: Mein Projekt heißt LernBot.",
    "Erinnerungen: Schule",
    "",
    "ANALYSE",
    "Analysiere mein Wissen",
    "Zeige Agenten",
    "",
    "PROJEKTE",
    "Projekt erstellen: LernBot 6",
    "Aufgabe erstellen: Code verbessern",
    "Zeige Projekte",
    "Zeige Aufgaben",
    "",
    "DOKUMENTE",
    "Dokumente anzeigen",
    "Dokumente können auch über den Datei-Upload importiert werden.",
    "",
    "CODE",
    "Code prüfen",
    "Code-Prüfung erfolgt über den Datei-Upload oder die Code-Funktion.",
    "",
    "SICHERUNG",
    "Sicherung erstellen",
    "Daten exportieren",
    "Daten importieren",
    "",
    "HILFE",
    "Hilfe"
  ].join("\n");
}

/* =====================================================
   14. BEFEHLSERKENNUNG
   ===================================================== */

async function handle(text) {
  text = safeText(text, 20000);

  if (!text) return "Schreib mir etwas.";

  const q = normalize(text);

  /* Hilfe */

  if (/^(hilfe|help|befehle|was kannst du)$/.test(q)) {
    return helpText();
  }

  /* Gedächtnis */

  if (/^(erinnere dich|merke dir|merk dir)\b/.test(q)) {
    const content = text.replace(
      /^(erinnere dich|merke dir|merk dir)\s*:?\s*/i,
      ""
    );

    if (!content) return "Was soll ich mir merken?";

    remember("nutzer", content);
    return "Ich habe die Information in meinem Langzeitgedächtnis gespeichert.";
  }

  if (/^(erinnerungen|gedaechtnis|gedächtnis)\b/.test(q)) {
    const search = text.replace(
      /^(erinnerungen|gedaechtnis|gedächtnis)\s*:?\s*/i,
      ""
    );

    const results = search
      ? searchMemory(search, 15)
      : data.memory.slice(-15).reverse();

    if (!results.length) return "Keine passenden Erinnerungen gefunden.";

    return results.map(x =>
      `• ${x.content}`
    ).join("\n");
  }

  /* Wissen lernen */

  if (/^(lerne|lernen|speichere wissen|merke als fakt)\b/.test(q)) {
    const content = text.replace(
      /^(lerne|lernen|speichere wissen|merke als fakt)\s*:?\s*/i,
      ""
    );

    const response = getLearningResponse(content);

    if (response) return response;

    return "Ich konnte daraus keinen eindeutigen Fakt erkennen. Beispiel:\nLerne: Berlin ist die Hauptstadt von Deutschland.";
  }

  /* Wissensübersicht */

  if (/^(wissensübersicht|zeige mein wissen|alle fakten)$/.test(q)) {
    return knowledgeOverview();
  }

  /* Wissensabfrage */

  if (/^(wissen|erkläre|erklaere|was weißt du über|was weisst du ueber)\b/.test(q)) {
    const topic = text.replace(
      /^(wissen|erkläre|erklaere|was weißt du über|was weisst du ueber)\s*:?\s*/i,
      ""
    );

    if (!topic) return "Zu welchem Thema möchtest du etwas wissen?";

    return explainTopic(topic);
  }

  /* Fakten direkt beantworten */

  const knownFact = answerFact(text);

  if (knownFact) {
    return knownFact;
  }

  /* Wissensverbindungen */

  if (/^(verbindungen|wissensgraph|graph)\b/.test(q)) {
    const topic = text.replace(
      /^(verbindungen|wissensgraph|graph)\s*:?\s*/i,
      ""
    );

    if (!topic) {
      return `Gespeicherte Wissensverbindungen: ${data.relationships.length}`;
    }

    return graphReport(topic);
  }

  /* Recherche */

  if (/^(recherchiere|recherche|suche im internet|google|wiki)\b/.test(q)) {
    const topic = text.replace(
      /^(recherchiere|recherche|suche im internet|google|wiki)\s*:?\s*/i,
      ""
    );

    if (!topic) return "Was soll ich recherchieren?";

    return await research(topic);
  }

  /* Analyse */

  if (/^(analysiere mein wissen|wissensanalyse|analyse)$/.test(q)) {
    return analyzeKnowledge();
  }

  if (/^(zeige agenten|agenten|module)$/.test(q)) {
    return agentOverview();
  }

  /* Projekte */

  if (/^projekt erstellen\b/.test(q)) {
    const name = text.replace(
      /^projekt erstellen\s*:?\s*/i,
      ""
    );

    return createProject(name);
  }

  if (/^(zeige projekte|meine projekte)$/.test(q)) {
    return listProjects();
  }

  /* Aufgaben */

  if (/^aufgabe erstellen\b/.test(q)) {
    const title = text.replace(
      /^aufgabe erstellen\s*:?\s*/i,
      ""
    );

    return createTask(title);
  }

  if (/^(zeige aufgaben|meine aufgaben)$/.test(q)) {
    return listTasks();
  }

  /* Dokumente */

  if (/^(dokumente anzeigen|meine dokumente)$/.test(q)) {
    if (!data.documents.length) return "Noch keine Dokumente vorhanden.";

    return data.documents.map(d =>
      `${d.title}\nTyp: ${d.type}\nID: ${d.id}`
    ).join("\n\n");
  }

  if (/^dokument suchen\b/.test(q)) {
    const topic = text.replace(/^dokument suchen\s*:?\s*/i, "");
    const results = searchDocuments(topic);

    if (!results.length) return "Keine passenden Dokumente gefunden.";

    return results.map(x =>
      `${x.document.title}\nTrefferwert: ${Math.round(x.score * 100)}%`
    ).join("\n\n");
  }

  /* Sicherungen */

  if (/^(sicherung erstellen|backup erstellen)$/.test(q)) {
    return createSnapshot();
  }

  if (/^sicherungen anzeigen$/.test(q)) {
    if (!data.snapshots.length) return "Noch keine Sicherungen vorhanden.";

    return data.snapshots.map(s =>
      `${s.label}\nID: ${s.id}\n${new Date(s.time).toLocaleString("de-DE")}`
    ).join("\n\n");
  }

  /* Code-KI */

  if (/^(code prüfen|code pruefen|codeanalyse)$/.test(q)) {
    return "Lade eine JavaScript-Datei über den Datei-Upload hoch. Ich prüfe sie dann mit meiner Code-KI.";
  }

  /* Export */

  if (/^(export|daten exportieren)$/.test(q)) {
    downloadData();
    return "Der Datenexport wurde vorbereitet.";
  }

  /* Gespeicherte Fragen und Antworten */

  const savedAnswer = findQA(text);

  if (savedAnswer) return savedAnswer;

  /* Ähnliches Wissen suchen */

  const related = findRelatedFacts(text, 3);

  if (related.length) {
    return [
      "Ich habe dazu verwandtes Wissen gefunden:",
      "",
      ...related.map(f =>
        `• ${f.subject}: ${f.property} – ${f.value}`
      ),
      "",
      "Stelle deine Frage etwas genauer oder nutze „Wissen: Thema“."
    ].join("\n");
  }

  /* Langzeitgedächtnis durchsuchen */

  const memories = searchMemory(text, 3);

  if (memories.length) {
    return "Dazu habe ich folgende Erinnerungen:\n\n" +
      memories.map(m => "• " + m.content).join("\n");
  }

  return "Das weiß ich noch nicht sicher.\n\nDu kannst mir die Information beibringen mit:\nLerne: Deine Information\n\nOder ich kann danach recherchieren mit:\nRecherchiere: Dein Thema";
}

/* =====================================================
   15. DATEI-IMPORT
   ===================================================== */

async function readFile(file) {
  if (!file) return "Keine Datei ausgewählt.";

  const name = file.name || "Datei";
  const extension = name.split(".").pop().toLowerCase();

  const supported = [
    "txt", "md", "csv", "json", "js",
    "html", "css", "xml", "log"
  ];

  if (extension === "json" && name.toLowerCase().includes("backup")) {
    return importData(await file.text());
  }

  if (extension === "js") {
    const source = await file.text();

    return [
      "CODE-DATEI GELADEN",
      "",
      `Datei: ${name}`,
      `Zeichen: ${source.length}`,
      "",
      inspectCodeReport(source)
    ].join("\n");
  }

  if (!supported.includes(extension)) {
    return `Dateiformat .${extension} wird derzeit nicht direkt unterstützt.\nUnterstützt werden: ${supported.join(", ")}.\n\nPDF- und Word-Dateien benötigen eine zusätzliche Dokumentenverarbeitung.`;
  }

  const content = await file.text();

  if (extension === "json") {
    try {
      const parsed = JSON.parse(content);

      if (obj(parsed) && (parsed.data || parsed.facts)) {
        return importData(content);
      }
    } catch {
      return "Die JSON-Datei ist ungültig.";
    }
  }

  return importDocumentText(content, name);
}

function setupFileUpload() {
  const input = UI.file();

  if (!input || input.dataset.lb6Bound) return;

  input.dataset.lb6Bound = "1";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    const typing = addTyping();

    try {
      const result = await readFile(file);
      addMessage("assistant", result);
    } catch (error) {
      addMessage("assistant", "Dateifehler: " + error.message);
    } finally {
      removeTyping(typing);
      input.value = "";
    }
  });
}

/* =====================================================
   16. EXPORT UND IMPORT
   ===================================================== */

function downloadData() {
  const content = exportData();
  const blob = new Blob([content], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "lernbot-6-sicherung.json";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setupExportButtons() {
  const exportButton = findElement([
    "exportBtn", "exportButton", "downloadBackup"
  ]);

  if (exportButton && !exportButton.dataset.lb6Bound) {
    exportButton.dataset.lb6Bound = "1";
    exportButton.addEventListener("click", downloadData);
  }

  const importButton = findElement([
    "importBtn", "importButton"
  ]);

  if (importButton && !importButton.dataset.lb6Bound) {
    importButton.dataset.lb6Bound = "1";
    importButton.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";

      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;

        const result = importData(await file.text());
        addMessage("assistant", result);
      });

      input.click();
    });
  }
}

/* =====================================================
   17. CHAT-START
   ===================================================== */

let busy = false;

async function send() {
  if (busy) return;

  const input = UI.input();
  if (!input) {
    console.error("LernBot: Kein Chat-Eingabefeld gefunden.");
    setStatus("Chat-Eingabefeld nicht gefunden.");
    return;
  }

  const text = safeText(input.value, 20000);
  if (!text) return;

  input.value = "";

  addMessage("user", text);

  const typing = addTyping();
  busy = true;
  setStatus("LernBot 6.0 arbeitet ...");

  try {
    const response = await handle(text);
    removeTyping(typing);
    addMessage("assistant", response);
    setStatus("Bereit");
  } catch (error) {
    removeTyping(typing);
    console.error(error);

    addMessage(
      "assistant",
      "Es ist ein Fehler aufgetreten: " + error.message
    );

    setStatus("Fehler");
  } finally {
    busy = false;
    save();
  }
}

function setupChat() {
  const input = UI.input();
  const button = UI.send();

  if (!input) {
    console.warn(
      "LernBot 6.0: Kein passendes Eingabefeld gefunden."
    );
    return;
  }

  if (button && !button.dataset.lb6Bound) {
    button.dataset.lb6Bound = "1";
    button.addEventListener("click", send);
  }

  if (!input.dataset.lb6Bound) {
    input.dataset.lb6Bound = "1";

    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    });
  }
}

/* =====================================================
   18. OPTIONALE HTML-OBERFLÄCHE
   ===================================================== */

function createFallbackUI() {
  if (UI.input() && UI.chat()) return;

  if ($("lb6-fallback")) return;

  const root = document.createElement("section");
  root.id = "lb6-fallback";

  root.innerHTML = `
    <div class="lb6-fallback-header">
      <h2>LernBot 6.0</h2>
      <p>Dein persönlicher Lernassistent</p>
    </div>
    <div id="lb6-fallback-chat"></div>
    <div class="lb6-fallback-controls">
      <textarea id="lb6-fallback-input"
        placeholder="Schreib dem LernBot ..."
        rows="3"></textarea>
      <button id="lb6-fallback-send">Senden</button>
      <button id="lb6-fallback-export">Daten exportieren</button>
      <label>
        Datei importieren
        <input id="lb6-fallback-file" type="file">
      </label>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #lb6-fallback {
      max-width: 850px;
      margin: 20px auto;
      padding: 18px;
      font-family: system-ui, sans-serif;
    }

    #lb6-fallback-chat {
      min-height: 300px;
      max-height: 55vh;
      overflow-y: auto;
      padding: 12px;
      border: 1px solid #8885;
      border-radius: 12px;
    }

    .lb6-fallback-controls {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }

    #lb6-fallback textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      border-radius: 9px;
    }

    #lb6-fallback button {
      padding: 12px;
      border-radius: 9px;
      cursor: pointer;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(root);

  document.getElementById("lb6-fallback-send")
    .addEventListener("click", send);

  document.getElementById("lb6-fallback-export")
    .addEventListener("click", downloadData);

  document.getElementById("lb6-fallback-file")
    .addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;

      addMessage("assistant", await readFile(file));
      event.target.value = "";
    });
}

/* =====================================================
   19. SYSTEMSTART
   ===================================================== */

function startLernBot() {
  installStyles();

  createFallbackUI();

  setupChat();
  setupFileUpload();
  setupExportButtons();

  save();

  logAudit("System", "LernBot 6.0 gestartet");

  console.log(
    "%cLernBot 6.0 gestartet",
    "font-weight:bold;color:#4caf50;font-size:16px"
  );

  console.log("Fakten:", data.facts.length);
  console.log("Erinnerungen:", data.memory.length);
  console.log("Projekte:", data.projects.length);
  console.log("Aufgaben:", data.tasks.length);

  setStatus("LernBot 6.0 bereit");

  if (!data.memory.some(m =>
    m.type === "system" && m.content === "LernBot 6.0 gestartet"
  )) {
    remember("system", "LernBot 6.0 gestartet");
  }

  addMessage(
    "assistant",
    "Hallo! Ich bin LernBot 6.0.\n\n" +
    "Mein Gedächtnis, meine Wissensbank und meine Agenten sind bereit.\n\n" +
    "Schreib „Hilfe“, um meine Befehle zu sehen."
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startLernBot, {
    once: true
  });
} else {
  startLernBot();
}

/* =====================================================
   LERNBOT 6.0 – ENDE
   ===================================================== */

})();
