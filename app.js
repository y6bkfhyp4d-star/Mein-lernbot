/* =====================================================
   LERNBOT 6.0 – NEUFASSUNG (PAKET 1)
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

/*
   NEU (Paket 1): fold() ist der Vergleichsschlüssel für Texte.

   Er behandelt ä/ae, ö/oe, ü/ue und ß/ss gleich.
   Beispiele:  "Körpergröße" → "korpergrosse"
               "Koerpergroesse" → "korpergrosse"
               "gehört" → "gehort"  /  "gehoert" → "gehort"

   Wichtig: normalize() bleibt unverändert. fold() wird NUR zum
   Vergleichen benutzt. Gespeicherte Texte werden dadurch nicht verändert.
*/

function fold(text) {
  return normalize(text)
    .replace(/ß/g, "ss")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u");
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

let data = {};

/* Hinweise, die beim Start im Chat angezeigt werden */

const startupNotices = [];

/* =====================================================
   2a. AUTOMATISCHE SICHERUNGSKOPIEN (NEU)

   Diese Kopien liegen in SEPARATEN localStorage-Einträgen
   mit dem Namensanfang "meinLernBot.v1.sicherung.".
   Der Haupt-Schlüssel "meinLernBot.v1" wird dadurch
   nie berührt.
   ===================================================== */

const BACKUP_PREFIX = KEY + ".sicherung.";

function backupTime(name) {
  const match = String(name).match(/\.(\d{10,})$/);
  return match ? Number(match[1]) : 0;
}

function listAutoBackups(kind = "") {
  const names = [];

  try {
    const prefix = BACKUP_PREFIX + (kind ? kind + "." : "");

    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i);

      if (name && name.startsWith(prefix)) names.push(name);
    }
  } catch (error) {
    console.warn("LernBot: Sicherungen nicht lesbar.", error);
  }

  return names.sort((a, b) =>
    backupTime(a) - backupTime(b) || (a < b ? -1 : 1)
  );
}

/*
   options.keep: maximale Anzahl dieser Sicherungsart.
   0 bedeutet: nie automatisch löschen.
   Gibt den Namen der Sicherung zurück oder null bei Fehlschlag.
   Ist der Inhalt bereits identisch gesichert, wird die vorhandene
   Sicherung wiederverwendet.
*/

function writeAutoBackup(kind, raw, options = {}) {
  const keep = Number.isInteger(options.keep) ? options.keep : 0;

  kind = String(kind ?? "").replace(/[^A-Za-z0-9\-_]/g, "") || "allgemein";

  if (typeof raw !== "string" || !raw) return null;

  try {
    for (const name of listAutoBackups(kind)) {
      if (localStorage.getItem(name) === raw) return name;
    }

    let stamp = now();
    let name = BACKUP_PREFIX + kind + "." + stamp;

    while (localStorage.getItem(name) !== null) {
      stamp++;
      name = BACKUP_PREFIX + kind + "." + stamp;
    }

    localStorage.setItem(name, raw);

    if (keep > 0) {
      const all = listAutoBackups(kind);

      while (all.length > keep) {
        localStorage.removeItem(all.shift());
      }
    }

    return name;

  } catch (error) {
    console.warn("LernBot: Sicherungskopie fehlgeschlagen.", error);
    return null;
  }
}

/* Sicherung des aktuellen Arbeitsstands (ohne Snapshots, damit sie klein bleibt) */

function backupJson() {
  return JSON.stringify({ ...data, snapshots: [] });
}

/* =====================================================
   2b. SPERRE BEI NICHT LESBAREM SPEICHER (NEU)
   ===================================================== */

let storageLocked = false;
let storageLockReason = "";
let lockRescueKey = null;

/*
   Gibt null zurück, wenn der Speicher entsperrt ist oder entsperrt
   werden durfte. Sonst eine Fehlermeldung.
   Entsperrt wird nur, wenn eine Rettungskopie des beschädigten
   Originals vorhanden ist.
*/

function tryUnlockStorage() {
  if (!storageLocked) return null;

  if (storageLockReason !== "corrupt" || !lockRescueKey) {
    return "Der Browser-Speicher ist gesperrt, weil der vorhandene Datenbestand nicht gelesen werden konnte und keine Rettungskopie angelegt werden konnte. Aus Sicherheitsgründen wird nichts überschrieben. Bitte lade die Seite neu.";
  }

  storageLocked = false;
  storageLockReason = "";

  return null;
}

/* =====================================================
   2c. STRUKTUR SICHERSTELLEN
   ===================================================== */

/*
   Aussortierte (ungültige) Einträge werden NICHT einfach verworfen,
   sondern vorher in einer Sicherungskopie abgelegt.
*/

function keepValid(list, test, label) {
  const kept = [];
  const dropped = [];

  for (const item of arr(list)) {
    (test(item) ? kept : dropped).push(item);
  }

  if (dropped.length) {
    const backupName = writeAutoBackup(
      "verworfen-" + label,
      JSON.stringify(dropped),
      { keep: 0 }
    );

    startupNotices.push(
      `${dropped.length} ungültige(r) Eintrag/Einträge im Bereich "${label}" wurden aussortiert.` +
      (backupName
        ? ` Kopie gesichert unter: ${backupName}`
        : " ACHTUNG: Die Kopie konnte nicht gesichert werden.")
    );
  }

  return kept;
}

function ensureStructure() {
  if (!obj(data)) data = {};

  /* Ältere Speicherstruktur übernehmen */

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

  /* Daten validieren (Aussortiertes wird vorher gesichert) */

  data.facts = keepValid(data.facts, item =>
    obj(item) &&
    typeof item.subject === "string" &&
    typeof item.property === "string" &&
    typeof item.value === "string",
    "facts"
  );

  data.qa = keepValid(data.qa, item =>
    obj(item) &&
    typeof item.k === "string" &&
    typeof item.a === "string",
    "qa"
  );

  data.relationships = keepValid(data.relationships, item =>
    obj(item) &&
    typeof item.from === "string" &&
    typeof item.to === "string" &&
    typeof item.relation === "string",
    "relationships"
  );

  data.memory = keepValid(data.memory, item =>
    obj(item) &&
    typeof item.content === "string" &&
    typeof item.type === "string",
    "memory"
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
    data[key] = keepValid(data[key], obj, key);
  }
}

/* =====================================================
   2d. DATENBANK LADEN (GEÄNDERT)

   Ist der gespeicherte Datenbestand nicht lesbar (z. B. kaputtes JSON),
   wird NIE ein leerer Bestand gespeichert:
   1. Das Original wird unverändert als Rettungskopie gesichert.
   2. Der Speicher wird gesperrt. Der Hauptschlüssel bleibt unberührt.
   ===================================================== */

{
  let rawStored = null;
  let parsedStored = null;

  try {
    rawStored = localStorage.getItem(KEY);
  } catch (error) {
    console.error("LernBot: Browser-Speicher nicht lesbar.", error);

    storageLocked = true;
    storageLockReason = "unreadable";

    startupNotices.push(
      "ACHTUNG: Der Browser-Speicher konnte nicht gelesen werden. Änderungen werden nicht gespeichert."
    );
  }

  if (!storageLocked && rawStored) {
    try {
      const parsed = JSON.parse(rawStored);

      if (!obj(parsed)) {
        throw new Error("Der gespeicherte Datenbestand ist kein Datenobjekt.");
      }

      parsedStored = parsed;

    } catch (error) {
      console.error("LernBot: Datenbank beschädigt.", error);

      storageLocked = true;
      storageLockReason = "corrupt";

      lockRescueKey = writeAutoBackup(
        "beschaedigt",
        rawStored,
        { keep: 0 }
      );

      startupNotices.push(
        "ACHTUNG: Dein gespeicherter Datenbestand ist beschädigt und konnte nicht gelesen werden.\n" +
        "Es wurde NICHTS gelöscht und NICHTS überschrieben. Neue Änderungen werden in dieser Sitzung NICHT gespeichert.\n" +
        (lockRescueKey
          ? "Rettungskopie: " + lockRescueKey + "\nMit „Auto-Sicherungen“ siehst du alle Kopien, mit „Auto-Sicherung exportieren: NUMMER“ kannst du die Kopie als Datei sichern."
          : "WARNUNG: Die Rettungskopie konnte nicht angelegt werden. Das Original im Browser-Speicher bleibt aber unverändert. Bitte lade die Seite nicht mehrfach neu und wende dich mit dem Problem an deinen Entwickler-Assistenten.")
      );
    }
  }

  if (parsedStored) {
    const oldVersion = Number(parsedStored.version) || 0;

    /* Automatische Sicherung VOR einer Migration */

    if (
      oldVersion !== VERSION ||
      Array.isArray(parsedStored.memories)
    ) {
      const backupName = writeAutoBackup(
        "vorMigration",
        rawStored,
        { keep: 0 }
      );

      startupNotices.push(
        backupName
          ? "Datenstruktur wurde aktualisiert. Sicherung vorher: " + backupName
          : "WARNUNG: Vor der Datenmigration konnte keine Sicherung angelegt werden."
      );
    }

    data = parsedStored;
  }
}

ensureStructure();

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
  /* Gesperrter Speicher: den Hauptschlüssel niemals überschreiben */

  if (storageLocked) {
    setStatus("Speicher gesperrt – Änderungen werden NICHT gespeichert.");
    return false;
  }

  data.version = VERSION;

  data.log = arr(data.log).slice(-150);
  data.audit = arr(data.audit).slice(-1000);
  data.snapshots = arr(data.snapshots).slice(-30);

  /*
     Hinweis: Die frühere stille Kürzung der Erinnerungen auf
     1000 Einträge wurde entfernt. Erinnerungen werden nicht mehr
     automatisch gelöscht.
  */

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

/* =====================================================
   5a. SICHERES VERGESSEN (GEÄNDERT)

   Schutz gegen versehentliches Massenlöschen:
   - Suchbegriff mindestens 3 Zeichen.
   - Es wird nur im INHALT gesucht (nicht mehr im Typ,
     sonst würde "fakt" alle Faktenerinnerungen löschen).
   - Gelöscht wird nur, wenn höchstens FORGET_LIMIT Treffer vorliegen.
   - Eine genaue Erinnerungs-ID löscht genau diese eine Erinnerung.
   - Gelöschte Inhalte werden im Audit-Protokoll festgehalten.
   ===================================================== */

const FORGET_LIMIT = 5;
const FORGET_MIN_LENGTH = 3;

function findForgetCandidates(query) {
  const raw = safeText(query, 500);
  const q = normalize(raw);

  if (!q) return { ok: false, reason: "empty", items: [] };

  const byId = data.memory.filter(item =>
    item.id &&
    String(item.id).toLowerCase() === raw.toLowerCase()
  );

  if (byId.length) return { ok: true, reason: "id", items: byId };

  if (q.length < FORGET_MIN_LENGTH) {
    return { ok: false, reason: "short", items: [] };
  }

  const items = data.memory.filter(item =>
    normalize(item.content).includes(q)
  );

  if (!items.length) return { ok: false, reason: "none", items };

  if (items.length > FORGET_LIMIT) {
    return { ok: false, reason: "many", items };
  }

  return { ok: true, reason: "match", items };
}

function deleteMemoryItems(items) {
  const targets = new Set(
    arr(items).filter(item => data.memory.includes(item))
  );

  if (!targets.size) return 0;

  const removedItems = data.memory.filter(item => targets.has(item));

  data.memory = data.memory.filter(item => !targets.has(item));

  logAudit(
    "Gedächtnis-KI",
    "Erinnerungen gelöscht",
    removedItems
      .map(item => `[${item.type}] ${safeText(item.content, 150)}`)
      .join(" | ")
  );

  save();

  return removedItems.length;
}

function forgetMemory(query) {
  const result = findForgetCandidates(query);

  if (!result.ok) return 0;

  return deleteMemoryItems(result.items);
}

/* =====================================================
   6. WISSENSBANK – GRUNDLAGEN
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

/* GEÄNDERT: Vergleich über fold() (ä/ae, ö/oe, ü/ue, ß/ss gleich) */

function sameSubject(a, b) {
  return fold(cleanSubject(a)) === fold(cleanSubject(b));
}

/* Eigenschaftsnamen vereinheitlichen (gespeicherte Form, unverändert) */

function normalizeProperty(property) {
  return normalize(property)
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .slice(0, 80);
}

/*
   NEU: Vergleichsschlüssel für Eigenschaften.
   Alte gespeicherte Eigenschaften ("korpergroße") und neue
   Eingaben ("Körpergröße", "Koerpergroesse") ergeben denselben Schlüssel.
*/

function propKey(property) {
  return fold(property)
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

/* Alle bekannten Kategorien ermitteln (Anzeigeform) */

function getKnownCategories() {
  const seen = new Map();

  for (const item of data.facts) {
    const display = normalizeProperty(item.property);
    const key = propKey(item.property);

    if (display && key && !seen.has(key)) seen.set(key, display);
  }

  return [...seen.values()].sort();
}

/* Verwandte Eigenschaften berücksichtigen (liefert Vergleichsschlüssel) */

function getPropertyCandidates(property) {
  const p = propKey(property);

  const aliases = {
    familie: ["familie", "zugehorigkeit"],
    zugehorigkeit: ["zugehorigkeit", "familie"],
    tierart: ["tierart", "familie", "zugehorigkeit"],

    lebensraum: ["lebensraum", "lebensgebiet", "wohnort"],
    lebensgebiet: ["lebensgebiet", "lebensraum"],
    wohnort: ["wohnort", "lebensraum"],

    nahrung: ["nahrung", "ernahrung"],
    ernahrung: ["ernahrung", "nahrung"],

    aussehen: ["aussehen", "erscheinungsbild"],
    erscheinungsbild: ["erscheinungsbild", "aussehen"]
  };

  return aliases[p] || [p];
}

/* Fakten zu einem Thema abrufen */

function getFacts(subject = "") {
  if (!safeText(subject)) return data.facts;

  return data.facts.filter(item =>
    sameSubject(item.subject, subject)
  );
}

/* =====================================================
   7. FAKTEN SPEICHERN
   ===================================================== */

function addFact(subject, property, value, source = "user") {
  subject = cleanSubject(subject);
  property = normalizeProperty(property);
  value = safeText(value, 5000);
  source = safeText(source, 100);

  if (!subject || !property || !value) return false;

  const wantedKey = propKey(property);

  let existing = data.facts.find(item =>
    sameSubject(item.subject, subject) &&
    propKey(item.property) === wantedKey
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

  logAudit(
    "Wissensbank",
    "Fakt gespeichert",
    `${subject} – ${property}`
  );

  save();
  return true;
}

/* =====================================================
   8. FAKTEN ERKENNEN
   ===================================================== */

function parseFact(text) {
  let s = safeText(text);

  if (!s || s.includes("?")) return null;

  /*
     Einen Lernbefehl entfernen, falls er noch vorhanden ist.
     Beispiel:
     Lerne: Okapi: Fellfarbe – rotbraun
  */

  s = s.replace(/^lerne\s*:\s*/i, "").trim();

  let match;

  /*
     DYNAMISCHE KATEGORIEN

     Okapi: Fellfarbe – rotbraun
     Okapi: Körpergröße = 1,5 Meter
     Okapi: Gewicht - 250 Kilogramm
     */

  match = s.match(
    /^(.+?)\s*:\s*(.+?)\s*(?:=|–|—|-)\s*(.+)$/i
  );

  if (match) {
    const fact = {
      subject: cleanSubject(match[1]),
      property: normalizeProperty(match[2]),
      value: safeText(match[3])
    };

    if (
      fact.subject &&
      fact.property &&
      fact.value
    ) {
      return fact;
    }
  }

  /* Hauptstadt */

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

  /* Lebensraum */

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

  /* Nahrung */

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

  /* Zugehörigkeit */

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

  /* Definition */

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

/* =====================================================
   9. FAKTEN LERNEN
   ===================================================== */

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
    `Bekannte Kategorien: ${getKnownCategories().join(", ")}`,
    `Gespeicherte Fakten: ${data.facts.length}`
  ].join("\n");
}

/* =====================================================
   10. WISSEN ABRUFEN – DYNAMISCHE KATEGORIEN (GEÄNDERT)
   ===================================================== */

/*
   NEU: Sucht gespeicherte Fakten direkt in der Frage.
   Ein Fakt passt, wenn
   - sein Thema UND seine Eigenschaft in der Frage vorkommen
     (Reihenfolge und Satzbau egal, auch mit Genitiv-s), oder
   - ein Wort der Frage ein Kompositum aus Thema + Eigenschaft ist
     (z. B. "Marsdurchmesser" = "Mars" + "Durchmesser").
   Alles ist datengesteuert – es gibt keine Sonderfälle für einzelne Themen.
*/

function phraseInText(text, phrase) {
  if (!phrase) return false;

  const padded = " " + text + " ";

  for (const suffix of ["", "s", "es"]) {
    if (padded.includes(" " + phrase + suffix + " ")) return true;
  }

  return false;
}

function findFactsInQuestion(question) {
  const q = fold(question);

  if (!q) return [];

  const words = q.split(" ");
  const matches = [];

  for (const fact of data.facts) {
    const subjectKey = fold(cleanSubject(fact.subject));

    if (subjectKey.length < 2) continue;

    const subjectJoined = subjectKey.replace(/ /g, "");
    const subjectInQuestion = phraseInText(q, subjectKey);

    const propertyKeys = getPropertyCandidates(fact.property)
      .map(key => key.replace(/_/g, " "))
      .filter(Boolean);

    let hit = false;

    for (const property of propertyKeys) {
      if (subjectInQuestion && phraseInText(q, property)) {
        hit = true;
        break;
      }

      const propertyJoined = property.replace(/ /g, "");

      for (const word of words) {
        for (const joint of ["", "s", "es", "n", "en"]) {
          if (word === subjectJoined + joint + propertyJoined) {
            hit = true;
            break;
          }
        }

        if (hit) break;
      }

      if (hit) break;
    }

    if (hit) matches.push(fact);
  }

  /* Teilthemen entfernen: "York" nicht, wenn "New York" auch passt */

  const withKeys = matches.map(fact => ({
    fact,
    key: fold(cleanSubject(fact.subject))
  }));

  return withKeys
    .filter(a => !withKeys.some(b =>
      b.key.length > a.key.length &&
      (" " + b.key + " ").includes(" " + a.key + " ")
    ))
    .map(item => item.fact);
}

function answerFromQuestionMatch(question) {
  const found = findFactsInQuestion(question);

  if (!found.length) return null;

  if (found.length === 1) return found[0].value;

  return found
    .map(fact => `${fact.subject} – ${fact.property}: ${fact.value}`)
    .join("\n");
}

function answerFact(question) {
  const q = fold(question);

  if (!q) return null;

  const propertyCandidates = [];
  let subject = "";
  let match;

  function addProperty(property) {
    for (const candidate of getPropertyCandidates(property)) {
      if (!propertyCandidates.includes(candidate)) {
        propertyCandidates.push(candidate);
      }
    }
  }

  /*
     Alle Muster arbeiten auf dem gefalteten Text (fold):
     "gehört" ist dort "gehort", "Ernährung" ist "ernahrung".
  */

  /* Familie und Tierart */

  match = q.match(
    /^zu welcher (?:tierart|familie) gehort (?:(?:der|die|das)\s+)?(.+)$/
  );

  if (match) {
    subject = match[1];
    addProperty("familie");
  }

  if (!subject) {
    match = q.match(
      /^welcher(?:e|er)? familie gehort (?:(?:der|die|das)\s+)?(.+)$/
    );

    if (match) {
      subject = match[1];
      addProperty("familie");
    }
  }

  /* Dynamische Frage:
     Welche Fellfarbe hat das Okapi?
     Welchen Durchmesser hat der Mars?
  */

  if (!subject) {
    match = q.match(
      /^welche[rns]?\s+(.+?)\s+(?:hat|besitzt)\s+(?:(?:der|die|das|ein|eine)\s+)?(.+)$/
    );

    if (match) {
      addProperty(match[1]);
      subject = match[2];
    }
  }

  /* Dynamische Frage:
     Was ist die Fellfarbe vom Okapi?
     Was ist der Durchmesser des Mars?
     Wie lautet die Körpergröße vom Okapi?
  */

  if (!subject) {
    match = q.match(
      /^(?:was ist|was betragt|wie lautet|nenne|nenn|zeige|gib mir)\s+(?:(?:die|der|das|den)\s+)?(.+?)\s+(?:von|vom|des|der|dem)\s+(?:(?:der|die|das|dem|den)\s+)?(.+)$/
    );

    if (match) {
      addProperty(match[1]);
      subject = match[2];
    }
  }

  /* Definition */

  if (!subject) {
    match = q.match(
      /^(?:was ist|was bedeutet|wer ist|erklare)\s+(.+)$/
    );

    if (match) {
      subject = match[1];
      addProperty("definition");
    }
  }

  /* Bereits bekannte Kategorien in der Frage finden */

  if (propertyCandidates.length === 0) {
    for (const category of getKnownCategories()) {
      const readable = fold(category.replace(/_/g, " "));

      if (
        readable.length > 2 &&
        q.includes(readable)
      ) {
        addProperty(category);
      }
    }
  }

  /* Hauptstadt */

  if (!subject && /\bhauptstadt\b/.test(q)) {
    addProperty("hauptstadt");

    match = q.match(/(?:von|uber)\s+(.+)$/);

    if (match) subject = match[1];
  }

  /* Lebensraum */

  if (
    !subject &&
    /\b(wo lebt|wo wohnt|lebensraum|lebensgebiet)\b/.test(q)
  ) {
    addProperty("lebensraum");

    match = q.match(
      /^(?:wo lebt|wo wohnt|lebensraum von|lebensgebiet von)\s+(.+)$/
    );

    if (match) subject = match[1];
  }

  /* Nahrung */

  if (
    !subject &&
    /\b(was frisst|was isst|nahrung|ernahrung)\b/.test(q)
  ) {
    addProperty("nahrung");

    match = q.match(
      /^(?:was frisst|was isst|nahrung von|was ist die nahrung von)\s+(.+)$/
    );

    if (match) subject = match[1];
  }

  /* Direkter Treffer über Thema + Eigenschaft */

  if (subject && propertyCandidates.length > 0) {
    const cleaned = cleanSubject(subject);

    if (cleaned) {
      const fact = data.facts.find(item =>
        sameSubject(item.subject, cleaned) &&
        propertyCandidates.includes(propKey(item.property))
      );

      if (fact) return fact.value;
    }
  }

  /*
     NEU: Kein Muster hat getroffen (oder das Muster fand keinen Fakt).
     Jetzt werden gespeicherte Fakten direkt in der Frage gesucht.
  */

  return answerFromQuestionMatch(question);
}

/* =====================================================
   11. WISSENSÜBERSICHT
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

  const lines = [
    "MEIN LANGZEITWISSEN",
    ""
  ];

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
    `Wissensverbindungen: ${data.relationships.length}`,
    `Eigene Kategorien: ${getKnownCategories().length}`
  );

  return lines.join("\n");
}

/* =====================================================
   12. WISSENSGRAPH
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
   LERNBOT 6.0 – TEIL 2/3 (PAKET 1)
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
   7. SICHERUNGEN (SNAPSHOTS)
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

/*
   GEÄNDERT (Paket 1): Vor jeder Wiederherstellung wird der aktuelle
   Stand automatisch separat gesichert ("vorRestore"). Gelingt diese
   Sicherung nicht, wird die Wiederherstellung abgebrochen.
   Schlägt das Speichern fehl, wird der vorherige Stand zurückgesetzt.
*/

function restoreSnapshot(id) {
  id = safeText(id, 200);

  const snapshot = data.snapshots.find(item =>
    item.id === id
  );

  if (!snapshot || !obj(snapshot.data)) {
    return "Sicherung nicht gefunden oder beschädigt.";
  }

  const wasLocked = storageLocked;
  let backupName = null;

  if (wasLocked) {
    const lockError = tryUnlockStorage();
    if (lockError) return lockError;
  } else {
    backupName = writeAutoBackup("vorRestore", backupJson(), { keep: 2 });

    if (!backupName) {
      return "Wiederherstellung abgebrochen: Die automatische Sicherung des aktuellen Stands war nicht möglich (vermutlich ist der Browser-Speicher voll). Bitte erstelle zuerst einen Export.";
    }
  }

  const before = clone(data);
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

  if (!save()) {
    data = before;
    storageLocked = wasLocked;

    return "Wiederherstellung fehlgeschlagen: Die Daten konnten nicht gespeichert werden. Der vorherige Stand bleibt erhalten.";
  }

  return [
    "Die Sicherung wurde wiederhergestellt. Bitte lade die Seite neu, falls die Oberfläche nicht alle Änderungen anzeigt.",
    backupName
      ? "Der vorherige Stand wurde automatisch gesichert unter: " + backupName
      : ""
  ].filter(Boolean).join("\n");
}

/* =====================================================
   7a. AUTOMATISCHE SICHERUNGEN – VERWALTUNG (NEU)
   ===================================================== */

/* Nummer (1, 2, ...) oder vollständiger Name → Name der Sicherung */

function resolveAutoBackup(reference) {
  reference = safeText(reference, 300);

  if (!reference) return null;

  const names = listAutoBackups();

  if (/^\d+$/.test(reference)) {
    return names[Number(reference) - 1] || null;
  }

  return names.includes(reference) ? reference : null;
}

function readAutoBackup(name) {
  try {
    return localStorage.getItem(name);
  } catch (error) {
    console.warn("LernBot: Sicherung nicht lesbar.", error);
    return null;
  }
}

function restoreAutoBackup(reference) {
  const name = resolveAutoBackup(reference);

  if (!name) {
    return "Sicherung nicht gefunden. Mit „Auto-Sicherungen“ siehst du die Liste.";
  }

  const afterPrefix = name.slice(BACKUP_PREFIX.length);

  if (afterPrefix.startsWith("verworfen-")) {
    return "Diese Kopie enthält nur aussortierte Einzeleinträge und keinen kompletten Datenbestand. Sie kann nicht wiederhergestellt, aber mit „Auto-Sicherung exportieren: " + reference + "“ als Datei gesichert werden.";
  }

  const raw = readAutoBackup(name);

  if (!raw) return "Die Sicherung ist leer oder nicht lesbar.";

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Diese Sicherung enthält beschädigtes JSON und kann nicht automatisch wiederhergestellt werden. Du kannst sie mit „Auto-Sicherung exportieren: " + reference + "“ als Datei sichern.";
  }

  if (!obj(parsed)) {
    return "Diese Sicherung enthält kein gültiges Datenobjekt.";
  }

  const wasLocked = storageLocked;
  let backupName = null;

  if (wasLocked) {
    const lockError = tryUnlockStorage();
    if (lockError) return lockError;
  } else {
    backupName = writeAutoBackup("vorRestore", backupJson(), { keep: 2 });

    if (!backupName) {
      return "Wiederherstellung abgebrochen: Die automatische Sicherung des aktuellen Stands war nicht möglich (vermutlich ist der Browser-Speicher voll). Bitte erstelle zuerst einen Export.";
    }
  }

  const before = clone(data);
  const currentSnapshots = arr(data.snapshots);

  startupNotices.length = 0;

  data = clone(parsed);
  ensureStructure();

  /* Auto-Sicherungen enthalten oft keine Snapshots: dann die aktuellen behalten */

  if (!data.snapshots.length) {
    data.snapshots = currentSnapshots;
  }

  logAudit(
    "System",
    "Auto-Sicherung wiederhergestellt",
    name
  );

  if (!save()) {
    data = before;
    storageLocked = wasLocked;

    return "Wiederherstellung fehlgeschlagen: Die Daten konnten nicht gespeichert werden. Der vorherige Stand bleibt erhalten.";
  }

  const notices = startupNotices.splice(0);

  return [
    "Die Auto-Sicherung wurde wiederhergestellt.",
    "",
    `Fakten: ${data.facts.length}`,
    `Erinnerungen: ${data.memory.length}`,
    `Dokumente: ${data.documents.length}`,
    backupName
      ? "Der vorherige Stand wurde automatisch gesichert unter: " + backupName
      : "",
    ...notices,
    "",
    "Bitte lade die Seite neu, falls die Oberfläche nicht alle Änderungen anzeigt."
  ].filter(item => item !== undefined).join("\n");
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
   9. DATENIMPORT (GEÄNDERT)

   Bisher ersetzte der Import vorhandene Bereiche komplett.
   Jetzt gilt:
   - Vor dem Import wird der aktuelle Stand automatisch gesichert
     ("vorImport"). Gelingt das nicht, wird abgebrochen.
   - Der Import ERGÄNZT: Vorhandenes wird nie überschrieben oder gelöscht.
     Doppelte Einträge werden übersprungen.
   - Weicht der Wert eines bereits bekannten Fakts ab, bleibt der
     vorhandene Wert, der importierte wird als Alternative vermerkt und
     der Fakt als Konflikt markiert.
   - Einstellungen und Theme bleiben unverändert.
   ===================================================== */

const IMPORT_AREAS = [
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

const IMPORT_VALID = {
  facts: item =>
    obj(item) &&
    typeof item.subject === "string" &&
    typeof item.property === "string" &&
    typeof item.value === "string",

  qa: item =>
    obj(item) &&
    typeof item.k === "string" &&
    typeof item.a === "string",

  relationships: item =>
    obj(item) &&
    typeof item.from === "string" &&
    typeof item.to === "string" &&
    typeof item.relation === "string",

  memory: item =>
    obj(item) &&
    typeof item.content === "string" &&
    typeof item.type === "string"
};

function importKeys(area, item) {
  const idKey = item.id ? "id:" + item.id : null;

  switch (area) {
    case "qa":
      return [idKey, "q:" + fold(item.k) + "|" + fold(item.a)];

    case "relationships":
      return [
        idKey,
        "r:" + fold(cleanSubject(item.from)) + "|" +
          fold(item.relation) + "|" +
          fold(cleanSubject(item.to))
      ];

    case "memory":
      return [
        "m:" + item.type + "|" + normalize(item.content)
      ];

    case "documents":
      return [
        idKey,
        "d:" + String(item.title) + "\u0000" + String(item.content ?? "")
      ];

    default:
      return [idKey || "j:" + JSON.stringify(item)];
  }
}

function mergeImportedArea(area, incoming) {
  const target = data[area];
  const valid = IMPORT_VALID[area] || obj;

  const known = new Set();

  for (const item of target) {
    for (const key of importKeys(area, item)) {
      if (key) known.add(key);
    }
  }

  const result = { added: 0, skipped: 0, invalid: 0 };

  for (const item of incoming) {
    if (!valid(item)) {
      result.invalid++;
      continue;
    }

    const keys = importKeys(area, item).filter(Boolean);

    if (keys.some(key => known.has(key))) {
      result.skipped++;
      continue;
    }

    target.push(item);

    for (const key of keys) known.add(key);

    result.added++;
  }

  return result;
}

function mergeImportedFacts(incoming) {
  const result = { added: 0, skipped: 0, invalid: 0, conflicts: 0 };

  for (const item of incoming) {
    if (!IMPORT_VALID.facts(item)) {
      result.invalid++;
      continue;
    }

    const wantedKey = propKey(item.property);

    const existing = data.facts.find(fact =>
      sameSubject(fact.subject, item.subject) &&
      propKey(fact.property) === wantedKey
    );

    if (!existing) {
      if (!item.id) item.id = uid();

      data.facts.push(item);
      result.added++;
      continue;
    }

    if (normalize(existing.value) === normalize(item.value)) {
      result.skipped++;
      continue;
    }

    existing.alternatives = arr(existing.alternatives);

    const alreadyKnown = existing.alternatives.some(alt =>
      obj(alt) && normalize(alt.value) === normalize(item.value)
    );

    if (!alreadyKnown) {
      existing.alternatives.push({
        value: item.value,
        source: safeText(item.source, 100) || "import",
        time: now()
      });
    }

    existing.conflict = true;
    result.conflicts++;
  }

  return result;
}

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

  const imported = clone(parsed);

  /*
     Legacy-Kompatibilität:
     "memories" wird zu "memory".
  */

  if (!Array.isArray(imported.memory) && Array.isArray(imported.memories)) {
    imported.memory = imported.memories;
  }

  const hasKnownData =
    IMPORT_AREAS.some(key => Array.isArray(imported[key])) ||
    obj(imported.agentStats);

  if (!hasKnownData) {
    return "Import fehlgeschlagen: Die Datei enthält keine bekannten LernBot-Daten. Es wurde nichts verändert.";
  }

  /* Automatische Sicherung VOR dem Import */

  const wasLocked = storageLocked;
  let backupName = null;

  if (wasLocked) {
    const lockError = tryUnlockStorage();
    if (lockError) return lockError;
  } else {
    backupName = writeAutoBackup("vorImport", backupJson(), { keep: 2 });

    if (!backupName) {
      return "Import abgebrochen: Die automatische Sicherung des aktuellen Stands war nicht möglich (vermutlich ist der Browser-Speicher voll). Es wurde nichts verändert. Bitte erstelle zuerst einen Export.";
    }
  }

  const before = clone(data);
  const report = [];

  try {
    for (const area of IMPORT_AREAS) {
      if (!Array.isArray(imported[area])) continue;

      const result = area === "facts"
        ? mergeImportedFacts(imported[area])
        : mergeImportedArea(area, imported[area]);

      const label = {
        facts: "Fakten",
        qa: "Frage-Antwort-Paare",
        classes: "Klassen",
        log: "Verlauf",
        audit: "Protokoll",
        improvements: "Verbesserungen",
        codeProposals: "Codevorschläge",
        projects: "Projekte",
        tasks: "Aufgaben",
        documents: "Dokumente",
        relationships: "Verknüpfungen",
        memory: "Erinnerungen",
        snapshots: "Sicherungen"
      }[area];

      if (result.added || result.skipped || result.invalid || result.conflicts) {
        report.push(
          `${label}: ${result.added} neu, ${result.skipped} schon vorhanden` +
          (result.conflicts ? `, ${result.conflicts} abweichende Werte (als Konflikt vermerkt)` : "") +
          (result.invalid ? `, ${result.invalid} ungültig übersprungen` : "")
        );
      }
    }

    if (obj(imported.agentStats)) {
      for (const [name, count] of Object.entries(imported.agentStats)) {
        const value = Number(count) || 0;

        if (value > (Number(data.agentStats[name]) || 0)) {
          data.agentStats[name] = value;
        }
      }
    }

    delete data.memories;
    data.version = VERSION;

    logAudit(
      "System",
      "Datenimport abgeschlossen",
      backupName ? "Sicherung: " + backupName : "JSON-Import"
    );

    if (!save()) {
      data = before;
      storageLocked = wasLocked;

      return "Import fehlgeschlagen: Die Daten konnten nicht dauerhaft gespeichert werden. Der vorherige Datenstand bleibt erhalten.";
    }

    return [
      "Datenimport erfolgreich abgeschlossen (ergänzend, nichts wurde überschrieben).",
      "",
      ...(report.length ? report : ["Es gab nichts Neues zu importieren."]),
      "",
      `Fakten gesamt: ${data.facts.length}`,
      `Erinnerungen gesamt: ${data.memory.length}`,
      `Dokumente gesamt: ${data.documents.length}`,
      `Projekte gesamt: ${data.projects.length}`,
      `Aufgaben gesamt: ${data.tasks.length}`,
      `Wissensverbindungen gesamt: ${data.relationships.length}`,
      "",
      backupName
        ? "Der Stand vor dem Import wurde automatisch gesichert unter: " + backupName
        : "Hinweis: Eine Rettungskopie des beschädigten Originals liegt weiterhin im Browser-Speicher."
    ].join("\n");

  } catch (error) {
    data = before;
    storageLocked = wasLocked;

    console.error("Importfehler:", error);

    return "Import fehlgeschlagen. Der vorherige Datenstand wurde wiederhergestellt:\n" + error.message;
  }
}

/* =====================================================
   ENDE TEIL 2/3
   TEIL 3 DIREKT DARUNTER EINFÜGEN
   ===================================================== */
 /* =====================================================
   LERNBOT 6.0 – TEIL 3/3 (PAKET 1)
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

/* Wartende Löschbestätigung für Erinnerungen (nur im Arbeitsspeicher) */

let pendingForget = null;
const FORGET_CONFIRM_MS = 5 * 60 * 1000;

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

function formatForgetList(items) {
  return items.slice(0, FORGET_LIMIT).map((item, index) =>
    `${index + 1}. [${item.type}] ${safeText(item.content, 150)}\nID: ${item.id || "Keine ID"}`
  ).join("\n\n");
}

/*
   GEÄNDERT (Paket 1): Zweistufiges, abgesichertes Vergessen.
   1. "Vergiss: Begriff" zeigt nur, was gelöscht würde.
   2. "Vergiss bestätigen" löscht tatsächlich.
*/

function forgetResponse(value) {
  const query = safeText(value, 500);

  pendingForget = null;

  if (!query) {
    return "Bitte gib einen Suchbegriff zum Löschen an.";
  }

  const result = findForgetCandidates(query);

  if (!result.ok) {
    if (result.reason === "short") {
      return `Der Suchbegriff ist zu kurz. Bitte verwende mindestens ${FORGET_MIN_LENGTH} Zeichen oder die genaue Erinnerungs-ID.`;
    }

    if (result.reason === "many") {
      return [
        `Zu viele Treffer (${result.items.length}). Aus Sicherheitsgründen lösche ich nicht so viele Erinnerungen auf einmal.`,
        "",
        "Bitte nenne einen genaueren Begriff oder die Erinnerungs-ID einer einzelnen Erinnerung (siehe „Erinnerungen“).",
        "",
        `Die ersten ${FORGET_LIMIT} Treffer:`,
        "",
        formatForgetList(result.items)
      ].join("\n");
    }

    return "Ich habe keine passende Erinnerung gefunden.";
  }

  if (data.settings.confirmChanges === false) {
    const removed = deleteMemoryItems(result.items);

    return removed
      ? `${removed} Erinnerung(en) wurden gelöscht.`
      : "Ich habe keine passende Erinnerung gefunden.";
  }

  pendingForget = {
    items: result.items,
    time: now()
  };

  return [
    `Diese ${result.items.length} Erinnerung(en) würden gelöscht:`,
    "",
    formatForgetList(result.items),
    "",
    "Zum Löschen schreibe: Vergiss bestätigen",
    "Zum Abbrechen schreibe: Vergiss abbrechen"
  ].join("\n");
}

function confirmForgetResponse() {
  if (!pendingForget || now() - pendingForget.time > FORGET_CONFIRM_MS) {
    pendingForget = null;
    return "Es gibt keine wartende Löschanfrage. Starte sie mit „Vergiss: Begriff“.";
  }

  const items = pendingForget.items;

  pendingForget = null;

  const removed = deleteMemoryItems(items);

  return removed
    ? `${removed} Erinnerung(en) wurden gelöscht.`
    : "Die Erinnerung(en) waren nicht mehr vorhanden.";
}

function cancelForgetResponse() {
  const had = Boolean(pendingForget);

  pendingForget = null;

  return had
    ? "Löschen abgebrochen. Es wurde nichts gelöscht."
    : "Es gibt keine wartende Löschanfrage.";
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
   8. WISSEN ABRUFEN (GEÄNDERT)
   ===================================================== */

/*
   Fehlerbehebung: Früher wurde geprüft, ob der Antworttext einen
   bestimmten Satz enthält ("noch nicht genug eigenes wissen"). Dieser
   Satz passte nach der Textnormalisierung nie ("genugend"), deshalb
   wurde die Meldung "habe ich noch nicht genügend eigenes Wissen"
   fälschlich als Antwort ausgegeben. Jetzt wird direkt geprüft, ob
   überhaupt Fakten vorhanden sind.
*/

function getKnowledgeResponse(topic) {
  topic = safeText(topic, 1000);

  if (!topic) return "Bitte gib ein Thema an.";

  const directAnswer = answerFact(topic);

  if (directAnswer) {
    return directAnswer;
  }

  const facts = findRelatedFacts(topic, 10);
  const documentKnowledge = getDocumentKnowledge(topic);

  const hasExplanation =
    getFacts(topic).length > 0 ||
    facts.length > 0;

  const explanation = hasExplanation
    ? explainTopic(topic)
    : "";

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

/* Allgemeiner Datei-Download (NEU, von downloadExport ausgelagert) */

function downloadTextFile(filename, text, mime = "application/json;charset=utf-8") {
  let url = null;

  try {
    const blob = new Blob([text], { type: mime });

    url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;

  } finally {
    if (url) {
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }
}

function downloadExport() {
  try {
    const json = exportData();

    downloadTextFile(
      "LernBot-6-Backup-" +
        new Date().toISOString().slice(0, 10) +
        ".json",
      json
    );

    return storageLocked
      ? "ACHTUNG: Der Speicher ist gesperrt. Dieser Export enthält nur den Arbeitsstand der aktuellen Sitzung, NICHT den beschädigten Originaldatenbestand. Nutze „Auto-Sicherungen“, um die Rettungskopie zu sichern."
      : "Der JSON-Datenexport wurde gestartet.";

  } catch (error) {
    console.error("Exportfehler:", error);

    return "Export fehlgeschlagen:\n" + error.message;
  }
}

/* =====================================================
   11a. AUTOMATISCHE SICHERUNGEN (NEU)
   ===================================================== */

function autoBackupLabel(name) {
  const kind = name
    .slice(BACKUP_PREFIX.length)
    .replace(/\.\d+$/, "");

  if (kind === "vorImport") return "Stand vor einem Import";
  if (kind === "vorRestore") return "Stand vor einer Wiederherstellung";
  if (kind === "vorMigration") return "Original vor einer Datenmigration";
  if (kind === "beschaedigt") return "Rettungskopie (beschädigter Datenbestand)";
  if (kind.startsWith("verworfen-")) {
    return "Aussortierte Einträge (" + kind.slice("verworfen-".length) + ")";
  }

  return kind;
}

function getAutoBackupList() {
  const names = listAutoBackups();

  if (!names.length) {
    return "Es sind keine automatischen Sicherungen vorhanden.";
  }

  return [
    "AUTOMATISCHE SICHERUNGEN",
    "",
    ...names.map((name, index) => {
      const raw = readAutoBackup(name);
      const kb = raw ? Math.max(1, Math.round(raw.length / 1024)) : 0;

      return [
        `${index + 1}. ${autoBackupLabel(name)}`,
        `Datum: ${formatDate(backupTime(name))}`,
        `Größe: ${kb} KB`,
        `Name: ${name}`
      ].join("\n");
    }),
    "",
    "Wiederherstellen: Auto-Sicherung wiederherstellen: NUMMER",
    "Als Datei sichern: Auto-Sicherung exportieren: NUMMER",
    "Hinweis: Die Nummern können sich ändern. Lass dir die Liste direkt vor dem Befehl anzeigen."
  ].join("\n\n");
}

function exportAutoBackupResponse(reference) {
  const name = resolveAutoBackup(reference);

  if (!name) {
    return "Sicherung nicht gefunden. Mit „Auto-Sicherungen“ siehst du die Liste.";
  }

  const raw = readAutoBackup(name);

  if (!raw) return "Die Sicherung ist leer oder nicht lesbar.";

  const isRescue = name.startsWith(BACKUP_PREFIX + "beschaedigt.");

  try {
    downloadTextFile(
      "LernBot-Auto-Sicherung-" +
        new Date(backupTime(name) || now()).toISOString().slice(0, 10) +
        (isRescue ? ".txt" : ".json"),
      raw,
      isRescue
        ? "text/plain;charset=utf-8"
        : "application/json;charset=utf-8"
    );

    return "Der Download der Auto-Sicherung wurde gestartet.";

  } catch (error) {
    console.error("Exportfehler:", error);

    return "Export fehlgeschlagen:\n" + error.message;
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
Lerne: Okapi: Fellfarbe – rotbraun
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
Vergiss: Suchbegriff (zeigt zuerst nur, was gelöscht würde)
Vergiss bestätigen
Vergiss abbrechen

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
Auto-Sicherungen
Auto-Sicherung wiederherstellen: NUMMER
Auto-Sicherung exportieren: NUMMER

CODE
Code prüfen: DEIN QUELLCODE

Du kannst auch normale Fragen stellen.
  `.trim();
}

/* =====================================================
   14. BEFEHLSVERARBEITUNG (GEÄNDERT)
   ===================================================== */

/*
   Befehle werden mit fold() verglichen: "Erkläre"/"Erklaere" und
   "Wissensübersicht"/"Wissensuebersicht" sind jeweils gleichwertig.
*/

function getCommandValue(text, prefix) {
  const original = String(text ?? "").trim();
  const colon = original.indexOf(":");

  if (colon < 0) return null;

  const enteredPrefix = original.slice(0, colon + 1);

  if (fold(enteredPrefix) !== fold(prefix)) {
    return null;
  }

  return original.slice(colon + 1).trim();
}

async function handle(text) {
  text = safeText(text, 100000);

  if (!text) {
    return "Bitte schreibe zuerst eine Nachricht.";
  }

  /* Alle Vergleichswerte unten sind in gefalteter Schreibweise */

  const lower = fold(text);

  try {
    /* HILFE */

    if (
      lower === "hilfe" ||
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

    if (lower === "wissensubersicht") {
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

    /* GEDÄCHTNIS LÖSCHEN (zweistufig) */

    if (lower === "vergiss bestatigen") {
      return confirmForgetResponse();
    }

    if (lower === "vergiss abbrechen") {
      return cancelForgetResponse();
    }

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

    /* AUTOMATISCHE SICHERUNGEN */

    if (
      lower === "auto sicherungen" ||
      lower === "autosicherungen"
    ) {
      return getAutoBackupList();
    }

    value = getCommandValue(text, "Auto-Sicherung wiederherstellen:");

    if (value !== null) {
      return value
        ? restoreAutoBackup(value)
        : "Bitte gib die Nummer der Auto-Sicherung an. Siehe „Auto-Sicherungen“.";
    }

    value = getCommandValue(text, "Auto-Sicherung exportieren:");

    if (value !== null) {
      return value
        ? exportAutoBackupResponse(value)
        : "Bitte gib die Nummer der Auto-Sicherung an. Siehe „Auto-Sicherungen“.";
    }

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
   19. SIDEBAR UND NAVIGATION (GEÄNDERT)
   ===================================================== */

function showSection(title, content) {
  addMessage(
    "assistant",
    `${title}\n\n${asReadable(content)}`
  );
}

/*
   Fehlerbehebung: normalize() macht aus "-" ein Leerzeichen
   ("KI-Agenten" → "ki agenten"). Die alten Vergleiche mit Bindestrich
   konnten daher nie zutreffen.
*/

function handleSidebarAction(label) {
  const key = fold(label);

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

  if (key.includes("agenten")) {
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

  if (key.includes("code labor")) {
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
      const command = fold(button.dataset.cmd || "");
      const label = fold(button.textContent || "");

      if (command === "theme" || label.includes("theme")) {
        toggleTheme();
        return;
      }

      if (command === "hilfe" || label === "hilfe") {
        addMessage("assistant", getHelpText());
        return;
      }

      /* "Was weißt du?" → gefaltet "was weisst du" */

      if (command === "was weisst du") {
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

      /* "Verlauf löschen" → gefaltet "verlauf loschen" */

      if (command === "verlauf loschen") {
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
   22. START UND INITIALISIERUNG (GEÄNDERT)
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

    /* Wichtige Hinweise zum Datenbestand anzeigen (z. B. beschädigter Speicher) */

    for (const notice of startupNotices.splice(0)) {
      addMessage("system", notice);
    }

    setStatus(
      storageLocked
        ? "Speicher gesperrt – Änderungen werden NICHT gespeichert."
        : "Bereit"
    );

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
