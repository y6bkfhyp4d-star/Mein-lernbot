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
   BENUTZEROBERFLÄCHE, BEFEHLE UND SYSTEMINTEGRATION
   ===================================================== */

/*
  Dieser Teil setzt voraus, dass Teil 1 und Teil 2
  innerhalb derselben IIFE bereits ausgeführt wurden.

  WICHTIG:
  Dieser Teil enthält am Ende auch das abschließende
  `})();` für die gesamte LernBot-Datei.
*/

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
   1. ALLGEMEINE HILFSFUNKTIONEN
   ===================================================== */

function lb6String(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function lb6Normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function lb6Command(text, prefix) {
  const normalized = lb6Normalize(text);
  const wanted = lb6Normalize(prefix);

  if (!normalized.startsWith(wanted)) {
    return null;
  }

  return String(text).trim().slice(prefix.length).trim();
}

function lb6FormatDate(value) {
  if (!value) {
    return "Unbekannt";
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("de-DE");
  } catch {
    return String(value);
  }
}

function lb6SafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function lb6GetId(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  return String(
    item.id ||
    item.uid ||
    item.key ||
    ""
  );
}

function lb6GetTitle(item) {
  if (!item || typeof item !== "object") {
    return "Ohne Titel";
  }

  return String(
    item.title ||
    item.name ||
    item.filename ||
    item.label ||
    item.topic ||
    "Ohne Titel"
  );
}

function lb6GetContent(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  return String(
    item.content ||
    item.text ||
    item.description ||
    ""
  );
}

function lb6GetError(error) {
  if (error && error.message) {
    return error.message;
  }

  return String(error || "Unbekannter Fehler");
}


/* =====================================================
   2. CHAT-NACHRICHTEN
   ===================================================== */

function addMessage(role, content) {
  const chat = UI.chat();

  if (!chat) {
    return null;
  }

  const message = document.createElement("div");

  message.className =
    "lb6-message lb6-message-" +
    String(role || "assistant");

  message.dataset.messageId =
    "lb6-message-" + (++lb6MessageCounter);

  const body = document.createElement("div");

  body.className = "lb6-message-content";

  body.textContent = lb6String(content);

  message.appendChild(body);
  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;

  return message;
}

function addTyping() {
  const chat = UI.chat();

  if (!chat) {
    return null;
  }

  const element = document.createElement("div");

  element.className =
    "lb6-message lb6-message-assistant lb6-typing";

  element.textContent = "LernBot denkt nach ...";

  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;

  return element;
}

function removeTyping(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function clearChat() {
  const chat = UI.chat();

  if (!chat) {
    return;
  }

  chat.replaceChildren();
}


/* =====================================================
   3. DESIGN UND STYLES
   ===================================================== */

function installStyles() {
  if ($("lb6-styles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "lb6-styles";

  style.textContent = `
    .lb6-message {
      box-sizing: border-box;
      max-width: 90%;
      width: fit-content;
      padding: 12px 15px;
      margin: 10px 0;
      border-radius: 14px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      line-height: 1.5;
      font-size: 14px;
    }

    .lb6-message-user {
      margin-left: auto;
      background: #2563eb;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .lb6-message-assistant {
      margin-right: auto;
      background: #252b38;
      color: #f4f4f5;
      border-bottom-left-radius: 4px;
    }

    .lb6-message-system {
      margin-left: auto;
      margin-right: auto;
      background: #343b49;
      color: #e5e7eb;
    }

    .lb6-message-content {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .lb6-typing {
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

    #lb6-fallback-input {
      min-width: 0;
      flex: 1;
      padding: 13px;
      border: 1px solid #454c5c;
      border-radius: 10px;
      background: #242b38;
      color: white;
      font-size: 15px;
      outline: none;
    }

    #lb6-fallback-send,
    #lb6-fallback-file-label {
      padding: 12px 16px;
      border: 0;
      border-radius: 10px;
      background: #2563eb;
      color: white;
      cursor: pointer;
      font-size: 14px;
    }

    #lb6-fallback-send:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    #lb6-fallback-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-top: 10px;
    }

    #lb6-fallback-file {
      display: none;
    }

    #lb6-fallback-row {
      display: flex;
      gap: 8px;
      width: 100%;
    }

    #lb6-fallback-root button:focus-visible,
    #lb6-fallback-root input:focus-visible {
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
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

  document.head.appendChild(style);
}


/* =====================================================
   4. FALLBACK-OBERFLÄCHE
   ===================================================== */

function createFallbackUI() {
  let root = $("lb6-fallback-root");

  if (root) {
    return root;
  }

  root = document.createElement("section");
  root.id = "lb6-fallback-root";

  const heading = document.createElement("h2");
  heading.textContent = "LernBot 6.0";

  const description = document.createElement("p");
  description.textContent =
    "Dein persönlicher Lernassistent.";

  const chat = document.createElement("div");
  chat.id = "lb6-fallback-chat";

  const row = document.createElement("div");
  row.id = "lb6-fallback-row";

  const input = document.createElement("input");
  input.id = "lb6-fallback-input";
  input.type = "text";
  input.placeholder = "Schreibe eine Nachricht ...";
  input.autocomplete = "off";

  const send = document.createElement("button");
  send.id = "lb6-fallback-send";
  send.type = "button";
  send.textContent = "Senden";

  row.appendChild(input);
  row.appendChild(send);

  const toolbar = document.createElement("div");
  toolbar.id = "lb6-fallback-toolbar";

  const fileInput = document.createElement("input");
  fileInput.id = "lb6-fallback-file";
  fileInput.type = "file";
  fileInput.accept = ".txt,.md,.json,.csv,.html,.js,.css";

  const fileLabel = document.createElement("label");
  fileLabel.id = "lb6-fallback-file-label";
  fileLabel.htmlFor = "lb6-fallback-file";
  fileLabel.textContent = "Datei importieren";

  toolbar.appendChild(fileInput);
  toolbar.appendChild(fileLabel);

  root.appendChild(heading);
  root.appendChild(description);
  root.appendChild(chat);
  root.appendChild(row);
  root.appendChild(toolbar);

  document.body.appendChild(root);

  return root;
}


/* =====================================================
   5. WISSEN UND ERKLÄRUNGEN
   ===================================================== */

function getLearningResponse(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "Bitte gib zuerst einen Lerninhalt ein.";
  }

  const learned = learnFact(text);

  if (learned) {
    return learned;
  }

  return (
    "Ich konnte daraus noch keine eindeutige Wissensinformation " +
    "erkennen.\n\n" +
    "Versuche es beispielsweise so:\n" +
    "Lerne: Die Hauptstadt von Deutschland ist Berlin."
  );
}

function getResearchResponse(value) {
  const query = String(value || "").trim();

  if (!query) {
    return "Bitte gib ein Recherchethema an.";
  }

  return research(query);
}

function getKnowledgeList() {
  const facts = lb6SafeArray(data.facts);

  if (!facts.length) {
    return "Es sind noch keine Fakten gespeichert.";
  }

  return facts.map((fact, index) => {
    const subject =
      fact.subject ||
      fact.topic ||
      "Unbekanntes Thema";

    const predicate =
      fact.predicate ||
      fact.relation ||
      "";

    const object =
      fact.object ||
      fact.value ||
      "";

    return (
      (index + 1) + ". " +
      subject +
      (predicate ? " – " + predicate : "") +
      (object ? " – " + object : "")
    );
  }).join("\n");
}

function getMemoryList() {
  const memories = lb6SafeArray(data.memory);

  if (!memories.length) {
    return "Es sind noch keine Erinnerungen gespeichert.";
  }

  return memories.map((memory, index) => {
    const content =
      memory.content ||
      memory.text ||
      memory.value ||
      "";

    return (
      (index + 1) + ". " +
      String(content) +
      "\n   ID: " + lb6GetId(memory) +
      "\n   Typ: " + String(memory.type || "Allgemein")
    );
  }).join("\n\n");
}

function getDocumentList() {
  const documents = lb6SafeArray(data.documents);

  if (!documents.length) {
    return "Es sind noch keine Dokumente vorhanden.";
  }

  return documents.map((document, index) => {
    return (
      (index + 1) + ". " +
      lb6GetTitle(document) +
      "\n   ID: " + lb6GetId(document) +
      "\n   Typ: " + String(document.type || "Dokument")
    );
  }).join("\n\n");
}

function getProjectList() {
  const projects = lb6SafeArray(data.projects);

  if (!projects.length) {
    return "Es sind noch keine Projekte vorhanden.";
  }

  return projects.map((project, index) => {
    return (
      (index + 1) + ". " +
      lb6GetTitle(project) +
      "\n   ID: " + lb6GetId(project) +
      "\n   Beschreibung: " +
      String(project.description || "Keine Beschreibung")
    );
  }).join("\n\n");
}

function getTaskList() {
  const tasks = lb6SafeArray(data.tasks);

  if (!tasks.length) {
    return "Es sind noch keine Aufgaben vorhanden.";
  }

  return tasks.map((task, index) => {
    return (
      (index + 1) + ". " +
      lb6GetTitle(task) +
      "\n   ID: " + lb6GetId(task) +
      "\n   Status: " +
      String(task.completed ? "Erledigt" : "Offen")
    );
  }).join("\n\n");
}

function getSnapshotList() {
  const snapshots = lb6SafeArray(data.snapshots);

  if (!snapshots.length) {
    return "Es sind noch keine Sicherungen vorhanden.";
  }

  return snapshots.map((snapshot, index) => {
    return (
      (index + 1) + ". " +
      String(snapshot.label || snapshot.name || "Sicherung") +
      "\n   ID: " + lb6GetId(snapshot) +
      "\n   Datum: " +
      lb6FormatDate(
        snapshot.createdAt ||
        snapshot.timestamp ||
        snapshot.date
      )
    );
  }).join("\n\n");
}


/* =====================================================
   6. DOKUMENTE UND DATEIIMPORT
   ===================================================== */

async function handleFileUpload(file) {
  if (!file) {
    return "Es wurde keine Datei ausgewählt.";
  }

  try {
    const content = await file.text();

    if (!content.trim()) {
      return "Die ausgewählte Datei ist leer.";
    }

    const filename = String(file.name || "Import");

    if (filename.toLowerCase().endsWith(".json")) {
      let parsed;

      try {
        parsed = JSON.parse(content);
      } catch {
        return "Die JSON-Datei ist ungültig und konnte nicht gelesen werden.";
      }

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return "Die JSON-Datei enthält kein gültiges LernBot-Datenobjekt.";
      }

      const result = importData(content);

      return (
        "JSON-Datei verarbeitet.\n\n" +
        lb6String(result)
      );
    }

    const result = importDocumentText(content, filename);

    return (
      "Datei erfolgreich verarbeitet.\n\n" +
      lb6String(result)
    );

  } catch (error) {
    return (
      "Fehler beim Importieren der Datei:\n" +
      lb6GetError(error)
    );
  }
}

function searchDocumentResponse(query) {
  const documents = lb6SafeArray(data.documents);

  if (!query) {
    return getDocumentList();
  }

  const results = searchDocuments(query);

  if (!Array.isArray(results) || !results.length) {
    return (
      "Ich habe keine passenden Dokumente gefunden.\n" +
      "Suchbegriff: " + query
    );
  }

  return results.map((document, index) => {
    return (
      (index + 1) + ". " +
      lb6GetTitle(document) +
      "\n   ID: " + lb6GetId(document) +
      "\n   Inhalt: " +
      lb6GetContent(document).slice(0, 350)
    );
  }).join("\n\n");
}

function summarizeDocumentResponse(query) {
  if (!query) {
    return (
      "Bitte gib eine Dokument-ID oder einen Dokumenttitel an.\n\n" +
      getDocumentList()
    );
  }

  const documents = lb6SafeArray(data.documents);

  const normalizedQuery = lb6Normalize(query);

  const document = documents.find(item => {
    return (
      lb6GetId(item) === query ||
      lb6Normalize(lb6GetTitle(item)) === normalizedQuery
    );
  });

  if (!document) {
    return (
      "Dokument nicht gefunden.\n\n" +
      "Verfügbare Dokumente:\n" +
      getDocumentList()
    );
  }

  const id = lb6GetId(document);

  if (!id) {
    return "Das Dokument besitzt keine gültige ID.";
  }

  return summarizeDocument(id);
}


/* =====================================================
   7. PROJEKTE UND AUFGABEN
   ===================================================== */

function createProjectResponse(value) {
  const name = String(value || "").trim();

  if (!name) {
    return "Bitte gib einen Projektnamen an.";
  }

  return createProject(name);
}

function createTaskResponse(value) {
  const title = String(value || "").trim();

  if (!title) {
    return "Bitte gib einen Aufgabentitel an.";
  }

  return createTask(title);
}

function completeTaskResponse(value) {
  const id = String(value || "").trim();

  if (!id) {
    return (
      "Bitte gib die genaue Aufgaben-ID an.\n\n" +
      getTaskList()
    );
  }

  const task = lb6SafeArray(data.tasks).find(item => {
    return lb6GetId(item) === id;
  });

  if (!task) {
    return (
      "Ich konnte keine Aufgabe mit dieser ID finden.\n\n" +
      getTaskList()
    );
  }

  if (task.completed) {
    return "Diese Aufgabe ist bereits erledigt.";
  }

  return completeTask(id);
}


/* =====================================================
   8. ERINNERUNGEN
   ===================================================== */

function rememberResponse(value) {
  const content = String(value || "").trim();

  if (!content) {
    return "Bitte gib den Inhalt der Erinnerung an.";
  }

  const result = remember("notiz", content);

  if (!result) {
    return "Die Erinnerung konnte nicht gespeichert werden.";
  }

  return (
    "Erinnerung gespeichert.\n\n" +
    content
  );
}

function forgetResponse(value) {
  const query = String(value || "").trim();

  if (!query) {
    return (
      "Aus Sicherheitsgründen wird keine leere Löschanfrage ausgeführt.\n" +
      "Bitte gib einen konkreten Suchbegriff an."
    );
  }

  const before = lb6SafeArray(data.memory).length;

  const result = forgetMemory(query);

  const after = lb6SafeArray(data.memory).length;

  return (
    lb6String(result) +
    "\n\nEntfernte Erinnerungen: " +
    Math.max(0, before - after)
  );
}


/* =====================================================
   9. SICHERUNGEN UND DATENEXPORT
   ===================================================== */

function createSnapshotResponse() {
  const result = createSnapshot("Manuelle Sicherung");

  const snapshots = lb6SafeArray(data.snapshots);

  const newest = snapshots.length
    ? snapshots[snapshots.length - 1]
    : null;

  return (
    lb6String(result) +
    (newest
      ? "\n\nSicherungs-ID: " + lb6GetId(newest)
      : "")
  );
}

function restoreSnapshotResponse(value) {
  const id = String(value || "").trim();

  if (!id) {
    return (
      "Bitte gib die genaue Sicherungs-ID an.\n\n" +
      getSnapshotList()
    );
  }

  const exists = lb6SafeArray(data.snapshots).some(snapshot => {
    return lb6GetId(snapshot) === id;
  });

  if (!exists) {
    return (
      "Diese Sicherung wurde nicht gefunden.\n\n" +
      getSnapshotList()
    );
  }

  return restoreSnapshot(id);
}

function downloadExport() {
  try {
    const json = exportData();

    if (typeof json !== "string") {
      throw new Error("Der Datenexport lieferte keinen JSON-Text.");
    }

    const blob = new Blob(
      [json],
      { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download =
      "lernBot-6-sicherung-" +
      new Date().toISOString().slice(0, 10) +
      ".json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    return "Der Datenexport wurde vorbereitet.";

  } catch (error) {
    return (
      "Der Datenexport ist fehlgeschlagen:\n" +
      lb6GetError(error)
    );
  }
}


/* =====================================================
   10. BEFEHLSVERARBEITUNG
   ===================================================== */

async function handle(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "Bitte schreibe zuerst eine Nachricht.";
  }

  const normalized = lb6Normalize(text);

  try {

    /* -----------------------------------------------
       HILFE
       ----------------------------------------------- */

    if (
      normalized === "hilfe" ||
      normalized === "befehle" ||
      normalized === "help"
    ) {
      return `
LERNBOT 6.0 – BEFEHLE

WISSEN
• Lerne: [Wissensinhalt]
• Wissen: [Thema]
• Erkläre: [Thema]
• Wissensübersicht
• Wissensgraph: [Thema]
• Wissensanalyse

RECHERCHE
• Recherchiere: [Thema]

GEDÄCHTNIS
• Merke: [Inhalt]
• Erinnerungen
• Vergiss: [Suchbegriff]

DOKUMENTE
• Dokumente
• Dokument suchen: [Suchbegriff]
• Dokument zusammenfassen: [ID oder Titel]

PROJEKTE
• Projekt erstellen: [Name]
• Projekte

AUFGABEN
• Aufgabe erstellen: [Titel]
• Aufgaben
• Aufgabe erledigt: [ID]

AGENTEN
• Agenten

SICHERUNGEN
• Sicherung erstellen
• Sicherungen
• Sicherung wiederherstellen: [ID]
• Export

CODE
• Code prüfen: [Quellcode]

Du kannst außerdem normale Fragen stellen.
      `.trim();
    }


    /* -----------------------------------------------
       LERNEN
       ----------------------------------------------- */

    let result = lb6Command(text, "Lerne:");

    if (result !== null) {
      return getLearningResponse(result);
    }


    /* -----------------------------------------------
       WISSEN
       ----------------------------------------------- */

    result = lb6Command(text, "Wissen:");

    if (result !== null) {
      if (!result) {
        return "Bitte gib ein Thema an.";
      }

      return explainTopic(result);
    }

    result = lb6Command(text, "Erkläre:");

    if (result !== null) {
      if (!result) {
        return "Bitte gib ein Thema an.";
      }

      return explainTopic(result);
    }

    if (normalized === "wissensübersicht") {
      return knowledgeOverview();
    }

    if (normalized === "wissensanalyse") {
      return analyzeKnowledge();
    }

    result = lb6Command(text, "Wissensgraph:");

    if (result !== null) {
      if (!result) {
        return "Bitte gib ein Thema für den Wissensgraphen an.";
      }

      return graphReport(result);
    }


    /* -----------------------------------------------
       RECHERCHE
       ----------------------------------------------- */

    result = lb6Command(text, "Recherchiere:");

    if (result !== null) {
      if (!result) {
        return "Bitte gib ein Recherchethema an.";
      }

      return await getResearchResponse(result);
    }


    /* -----------------------------------------------
       GEDÄCHTNIS
       ----------------------------------------------- */

    result = lb6Command(text, "Merke:");

    if (result !== null) {
      return rememberResponse(result);
    }

    result = lb6Command(text, "Erinnere:");

    if (result !== null) {
      return rememberResponse(result);
    }

    if (normalized === "erinnerungen") {
      return getMemoryList();
    }

    result = lb6Command(text, "Vergiss:");

    if (result !== null) {
      return forgetResponse(result);
    }


    /* -----------------------------------------------
       DOKUMENTE
       ----------------------------------------------- */

    if (normalized === "dokumente") {
      return getDocumentList();
    }

    result = lb6Command(text, "Dokument suchen:");

    if (result !== null) {
      return searchDocumentResponse(result);
    }

    result = lb6Command(text, "Dokument zusammenfassen:");

    if (result !== null) {
      return summarizeDocumentResponse(result);
    }


    /* -----------------------------------------------
       PROJEKTE
       ----------------------------------------------- */

    if (normalized === "projekte") {
      return getProjectList();
    }

    result = lb6Command(text, "Projekt erstellen:");

    if (result !== null) {
      return createProjectResponse(result);
    }


    /* -----------------------------------------------
       AUFGABEN
       ----------------------------------------------- */

    if (normalized === "aufgaben") {
      return getTaskList();
    }

    result = lb6Command(text, "Aufgabe erstellen:");

    if (result !== null) {
      return createTaskResponse(result);
    }

    result = lb6Command(text, "Aufgabe erledigt:");

    if (result !== null) {
      return completeTaskResponse(result);
    }


    /* -----------------------------------------------
       AGENTEN
       ----------------------------------------------- */

    if (normalized === "agenten") {
      return agentOverview();
    }


    /* -----------------------------------------------
       SICHERUNGEN
       ----------------------------------------------- */

    if (
      normalized === "sicherung erstellen" ||
      normalized === "sicherung speichern"
    ) {
      return createSnapshotResponse();
    }

    if (normalized === "sicherungen") {
      return getSnapshotList();
    }

    result = lb6Command(text, "Sicherung wiederherstellen:");

    if (result !== null) {
      return restoreSnapshotResponse(result);
    }

    if (
      normalized === "export" ||
      normalized === "daten exportieren"
    ) {
      return downloadExport();
    }


    /* -----------------------------------------------
       CODEPRÜFUNG
       ----------------------------------------------- */

    result = lb6Command(text, "Code prüfen:");

    if (result !== null) {
      if (!result) {
        return "Bitte füge den zu prüfenden Quellcode ein.";
      }

      return inspectCodeReport(result);
    }


    /* -----------------------------------------------
       ANALYSE
       ----------------------------------------------- */

    result = lb6Command(text, "Analysiere:");

    if (result !== null) {
      if (!result) {
        return "Bitte gib ein Thema oder einen Inhalt an.";
      }

      return agentRunAsync("analyse", async () => {
        const explanation = explainTopic(result);

        const related = findRelatedFacts(result, 10);

        let output =
          "ANALYSE\n\n" +
          lb6String(explanation);

        if (Array.isArray(related) && related.length) {
          output +=
            "\n\nVERWANDTE WISSENSINHALTE\n" +
            related.map((item, index) => {
              return (
                (index + 1) + ". " +
                lb6String(item.subject || item.content || item)
              );
            }).join("\n");
        }

        return output;
      });
    }


    /* -----------------------------------------------
       ALLGEMEINE FRAGE
       ----------------------------------------------- */

    const directAnswer = answerFact(text);

    if (
      directAnswer &&
      typeof directAnswer === "string" &&
      directAnswer.trim()
    ) {
      return directAnswer;
    }

    const explanation = explainTopic(text);

    if (
      explanation &&
      typeof explanation === "string" &&
      explanation.trim()
    ) {
      return explanation;
    }

    return (
      "Ich habe darauf noch keine ausreichend gesicherte Antwort " +
      "in meiner Wissensbasis.\n\n" +
      "Du kannst mir den passenden Lerninhalt mit folgendem Befehl " +
      "beibringen:\n\n" +
      "Lerne: [Dein Wissensinhalt]\n\n" +
      "Oder du kannst eine Recherche starten:\n" +
      "Recherchiere: [Dein Thema]"
    );

  } catch (error) {
    console.error("LernBot 6.0 Fehler:", error);

    return (
      "Bei der Verarbeitung ist ein Fehler aufgetreten:\n\n" +
      lb6GetError(error) +
      "\n\nBitte versuche es erneut."
    );
  }
}


/* =====================================================
   11. NACHRICHTEN SENDEN
   ===================================================== */

async function sendMessage() {
  if (lb6Busy) {
    return;
  }

  const input = UI.input();

  if (!input) {
    console.error("LernBot: Eingabefeld nicht gefunden.");
    return;
  }

  const text = String(input.value || "").trim();

  if (!text) {
    return;
  }

  lb6Busy = true;

  const send = UI.send();

  if (send) {
    send.disabled = true;
  }

  input.value = "";

  addMessage("user", text);

  const typing = addTyping();

  try {
    const response = await handle(text);

    removeTyping(typing);

    addMessage(
      "assistant",
      response === undefined || response === null
        ? "Die Verarbeitung wurde beendet, aber es wurde keine Antwort erzeugt."
        : response
    );

    if (typeof save === "function") {
      save();
    }

  } catch (error) {
    removeTyping(typing);

    console.error("LernBot Sendefehler:", error);

    addMessage(
      "assistant",
      "Es ist ein unerwarteter Fehler aufgetreten:\n" +
      lb6GetError(error)
    );

  } finally {
    lb6Busy = false;

    if (send) {
      send.disabled = false;
    }

    if (input) {
      input.focus();
    }
  }
}


/* =====================================================
   12. CHAT-EVENTS
   ===================================================== */

function setupChat() {
  const input = UI.input();
  const send = UI.send();

  if (!input) {
    console.warn("LernBot: Kein Eingabefeld gefunden.");
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

    send.addEventListener("click", () => {
      sendMessage();
    });
  }
}


/* =====================================================
   13. DATEI-EVENTS
   ===================================================== */

function setupFileUpload() {
  const fileInput = UI.file();

  if (!fileInput) {
    return;
  }

  if (fileInput.dataset.lb6Bound === "true") {
    return;
  }

  fileInput.dataset.lb6Bound = "true";

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];

    if (!file) {
      return;
    }

    addMessage(
      "system",
      "Datei wird verarbeitet: " + file.name
    );

    const typing = addTyping();

    try {
      const result = await handleFileUpload(file);

      removeTyping(typing);

      addMessage("assistant", result);

      if (typeof save === "function") {
        save();
      }

    } catch (error) {
      removeTyping(typing);

      addMessage(
        "assistant",
        "Dateiimport fehlgeschlagen:\n" +
        lb6GetError(error)
      );

    } finally {
      fileInput.value = "";
    }
  });
}


/* =====================================================
   14. EXPORT-BUTTONS
   ===================================================== */

function setupExportButtons() {
  const possibleIds = [
    "lb6-export",
    "export-button",
    "export-btn"
  ];

  for (const id of possibleIds) {
    const button = $(id);

    if (!button) {
      continue;
    }

    if (button.dataset.lb6Bound === "true") {
      continue;
    }

    button.dataset.lb6Bound = "true";

    button.addEventListener("click", () => {
      const result = downloadExport();

      addMessage("system", result);
    });
  }
}


/* =====================================================
   15. SYSTEMSTART
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

    if (typeof save === "function") {
      save();
    }

    addMessage(
      "assistant",
      "Hallo! Ich bin LernBot 6.0.\n\n" +
      "Ich bin bereit. Du kannst mir Fragen stellen, " +
      "Wissen beibringen, Dokumente importieren, " +
      "Projekte verwalten und vieles mehr.\n\n" +
      "Schreibe „Hilfe“, um alle Befehle zu sehen."
    );

    console.log("LernBot 6.0 erfolgreich gestartet.");

  } catch (error) {
    console.error("LernBot Startfehler:", error);

    document.documentElement.dataset.lb6Started = "false";

    addMessage(
      "assistant",
      "Der LernBot konnte nicht vollständig gestartet werden:\n" +
      lb6GetError(error)
    );
  }
}


/* =====================================================
   16. START AUSFÜHREN
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

/* Ende von LernBot 6.0 */
})();
