(() => {
"use strict";

/* ==========================================
   LERNBOT 3.2 – MULTI-BRAIN-SYSTEM
   8 Module, robuste Code-KI, lokale Wissensbasis
   ========================================== */

const $ = id => document.getElementById(id);
const KEY = "meinLernBot.v1";
const VERSION = 4;
const SEED_VERSION = 2;
const NAME = "LernBot 3.2";

// Quellcode der eigenen Datei erfassen (inline oder per src)
const SCRIPT = document.currentScript;
let ownCode = SCRIPT?.textContent || "";
const ownScriptURL = SCRIPT?.src || "";

/* Grundwissen: [Stichwörter, Antwort, immer prüfen?] */
const seed = [
  [["hallo","hi","guten tag","guten morgen","guten abend","moin","servus"],
    `Hallo! Schön, dass du da bist. Ich bin dein ${NAME}! Tippe „Hilfe“ für alle Befehle.`],
  [["notfall"],
    "Bei akuter Gefahr zuerst 112 anrufen. Polizei: 110.", true],
  [["notruf","notrufnummer","polizei","feuerwehr","krankenwagen","rettungsdienst"],
    "112: Rettungsdienst und Feuerwehr. 110: Polizei. 116 117: ärztlicher Bereitschaftsdienst.", true],
  [["herzstillstand","wiederbelebung","reanimation"],
    "Bei Bewusstlosigkeit und keiner normalen Atmung sofort 112 wählen und den Anweisungen der Leitstelle folgen. Bis Hilfe eintrifft: fest und schnell in der Mitte des Brustkorbs drücken.", true],
  [["bewusstlos","bewusstlosigkeit","seitenlage"],
    "Bei Bewusstlosigkeit 112 rufen und Atmung prüfen. Bei normaler Atmung stabile Seitenlage, sofern keine Verletzung dagegenspricht.", true],
  [["blutung","blutet","wunde blutet"],
    "Bei starker Blutung 112 rufen und direkten, festen Druck auf die Wunde ausüben.", true],
  [["verbrennung","verbrannt","verbrühung","verbrüht"],
    "Von der Hitzequelle entfernen. Keine Eiswürfel oder Hausmittel verwenden. Bei größeren Verbrennungen 112 rufen.", true],
  [["schlaganfall"],
    "Mögliche Zeichen: hängender Mundwinkel, Schwäche auf einer Seite, Sprach- oder Sehstörungen. Sofort 112 rufen.", true],
  [["herzinfarkt","brustschmerzen"],
    "Bei Verdacht auf Herzinfarkt sofort 112 rufen.", true],
  [["vergiftung","vergiftet","gift"],
    "Kein Erbrechen auslösen und keine Hausmittel geben. Bei schweren Symptomen 112 rufen.", true],
  [["brand","feuer","brennt"],
    "Menschen warnen, Gebäude verlassen, Türen schließen und keinen Aufzug benutzen. Von draußen 112 rufen.", true],
  [["wer bist du","was kannst du"],
    `Ich bin dein lokaler ${NAME} mit mehreren spezialisierten KI-Modulen. Tippe „Hilfe“ für alle Befehle.`]
];

const help = `${NAME.toUpperCase()} – HILFE

LERNEN:
„Ein Okapi ist ein Säugetier.“
„Ein Okapi lebt im Regenwald.“
„Frage: Wie heißt die Hauptstadt von Peru? Antwort: Lima“
Du kannst ganze Texte einfügen.

FRAGEN:
„Was ist ein Okapi?“
„Wo lebt ein Okapi?“
„Was weißt du über Okapi?“

RECHERCHE:
„Suche: Okapi“
„Recherchiere: Albert Einstein“
„Google: Okapi“

KORREKTUR:
„Nein“ → danach „Richtig ist: …“

SELBSTREFLEXION:
„Selbstreflexion“
„Reflektiere Okapi“
„Prüfe dein Wissen“

KI-TEAM:
„Teamstatus“
„Meta-Analyse“
„Verbesserungsvorschläge“

CODE-KI:
„Code prüfen“
„Codebericht“
„Code-Vorschläge“
„Programmierwissen“

WISSEN VERWALTEN:
„Was weißt du?“
„Vergiss: Okapi“
„Widersprüche bereinigen“
„Dubletten bereinigen“
„Grundwissen laden“
„Verlauf löschen“
„Alles löschen“

Alle Module arbeiten lokal zusammen.
Die Code-KI prüft den Programmcode und schlägt Änderungen vor.
Sie verändert niemals selbstständig deinen Programmcode.
`;

/* ==========================================
   DATEN LADEN UND BEREINIGEN
   ========================================== */

let data;
try {
  data = JSON.parse(localStorage.getItem(KEY) || "null");
} catch {
  data = null;
}
if (!data || typeof data !== "object" || Array.isArray(data)) data = {};

const arr = v => Array.isArray(v) ? v : [];
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

function sanitizeFacts(list) {
  return arr(list)
    .filter(x => isObj(x) &&
      typeof x.subject === "string" &&
      typeof x.property === "string" &&
      typeof x.value === "string")
    .map(x => ({
      ...x,
      confidence: Number.isFinite(x.confidence) ? x.confidence : 0.5,
      source: typeof x.source === "string" ? x.source : "unbekannt"
    }));
}

data.qa = arr(data.qa).filter(x => isObj(x) && typeof x.k === "string" && typeof x.a === "string");
data.facts = sanitizeFacts(data.facts);
data.classes = arr(data.classes).filter(x => isObj(x) && typeof x.t === "string" && typeof x.c === "string");
data.log = arr(data.log).filter(x => isObj(x) && typeof x.text === "string")
  .map(x => ({ role: x.role === "user" ? "user" : "bot", text: x.text }));
data.pending = isObj(data.pending) ? data.pending : null;
data.theme = data.theme === "light" ? "light" : "dark";
data.agentStats = isObj(data.agentStats) ? data.agentStats : {};
data.improvements = arr(data.improvements).filter(x => typeof x === "string");
data.audit = arr(data.audit).filter(isObj);
data.codeProposals = arr(data.codeProposals).filter(x => isObj(x) && "id" in x);
data.pendingCodeProposal = data.pendingCodeProposal ?? null;
data.seedVersion = Number(data.seedVersion) || 0;

/* ==========================================
   SPEICHERN (gebündelt, mit Fehlerhinweis nur einmal)
   ========================================== */

let saveTimer = null;
let quotaWarned = false;

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;

  data.log = data.log.slice(-150);
  data.audit = data.audit.slice(-300);
  data.improvements = data.improvements.slice(-100);
  data.codeProposals = data.codeProposals.slice(-30);

  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    quotaWarned = false;
    return true;
  } catch {
    if (!quotaWarned) {
      quotaWarned = true;
      alert("Speichern fehlgeschlagen. Bitte exportiere dein Wissen.");
    }
    return false;
  }
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(saveNow, 150);
}

window.addEventListener("pagehide", saveNow);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveNow();
});

/* ==========================================
   HILFSFUNKTIONEN
   ========================================== */

function norm(s) {
  return String(s ?? "").toLocaleLowerCase("de")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

function clean(s) {
  return String(s ?? "").trim().replace(/[.!?]+$/, "").trim();
}

function cap(s) {
  s = String(s ?? "");
  return s ? s[0].toLocaleUpperCase("de") + s.slice(1) : s;
}

function subjectClean(s) {
  return clean(s).replace(
    /^(der|die|das|ein|eine|einen|einem|einer|eines)\s+/i, ""
  ).trim();
}

function sameSubject(a, b) {
  return norm(subjectClean(a)) === norm(subjectClean(b));
}

// Editierabstand für Tippfehler-Toleranz (bricht ab, wenn > 2)
function lev(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function logAudit(agent, action, detail = "") {
  data.audit.push({
    agent, action, detail: String(detail).slice(0, 300),
    time: Date.now()
  });
}

function countAgent(name) {
  data.agentStats[name] = (data.agentStats[name] || 0) + 1;
}

function agentReport() {
  return Object.keys(AGENTS).map(name =>
    `${AGENTS[name].icon} ${name}: ${data.agentStats[name] || 0} Einsätze`
  ).join("\n");
}

/* ==========================================
   GEMEINSAMER WISSENSSPEICHER
   ========================================== */

function addFact(subject, property, value, source = "user", confidence = 0.65) {
  subject = subjectClean(subject);
  property = norm(property);
  value = clean(value).slice(0, 300);
  if (!subject || !property || !value) return false;

  const conf = Math.max(0, Math.min(1, Number(confidence) || 0.5));
  const now = Date.now();
  const f = data.facts.find(x =>
    sameSubject(x.subject, subject) && norm(x.property) === property
  );

  if (!f) {
    data.facts.push({ subject, property, value, source, confidence: conf, updated: now });
  } else if (norm(f.value) === norm(value)) {
    f.confidence = Math.max(f.confidence ?? 0, conf);
    if (source === "user") f.source = "user";
    f.updated = now;
  } else if (conf >= (f.confidence ?? 0.5)) {
    // Neuer Wert ist mindestens so vertrauenswürdig → ersetzen
    f.previous = f.value;
    f.conflict = true;
    f.value = value;
    f.source = source;
    f.confidence = conf;
    f.updated = now;
  } else {
    // Weniger vertrauenswürdig → nur als Alternative merken
    f.alternatives = arr(f.alternatives);
    if (!f.alternatives.some(a => norm(a.value) === norm(value))) {
      f.alternatives.push({ value, source });
      f.alternatives = f.alternatives.slice(-3);
    }
    f.conflict = true;
  }

  save();
  return true;
}

// Findet den gespeicherten Themennamen (auch bei kleinem Tippfehler)
function resolveSubject(name) {
  const n = norm(subjectClean(name));
  if (!n) return "";
  const subjects = [...new Set(data.facts.map(f => f.subject))];
  const exact = subjects.find(s => norm(s) === n);
  if (exact) return exact;
  if (n.length >= 5) {
    const near = subjects.find(s => lev(norm(s), n) <= 1);
    if (near) return near;
  }
  return subjectClean(name);
}

function getFacts(subject) {
  const s = resolveSubject(subject);
  return data.facts.filter(f => sameSubject(f.subject, s));
}

function getFact(subject, property) {
  const s = resolveSubject(subject);
  return data.facts.find(f =>
    sameSubject(f.subject, s) && norm(f.property) === norm(property)
  ) || null;
}

/* ==========================================
   TEXTVERARBEITUNG
   ========================================== */

const STOP = new Set(
  "der die das den dem des ein eine einen einem einer eines ist sind war was wer wie wo wann warum weshalb wieso und oder von zu im am an auf für mit ich du es mir dir wir ihr sie bitte mal denn also welcher welche welches gehört frage antwort bedeutet dasselbe gleich".split(" ")
);

function tokens(s) {
  return norm(s).split(" ").filter(w => w.length > 1 && !STOP.has(w));
}

function similarity(a, b) {
  const x = new Set(tokens(a));
  const y = new Set(tokens(b));
  if (!x.size || !y.size) return 0;
  let common = 0;
  x.forEach(w => { if (y.has(w)) common++; });
  return common / Math.max(x.size, y.size);
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/https?:\/\/\S+/gi, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map(x => x.trim())
    .filter(x => x.length >= 8);
}

const PRONOUNS = /^(ich|du|er|sie|es|wir|ihr|man|mir|mich|dir|dich|uns|euch|ihm|das|dies|dieses|diese|dieser|hier|dort|was|wer|wie|wo|nichts|alles|jemand)$/i;
const PRON_START = /^(?:es|sie|er|das tier|das säugetier|die art|diese art|dieses tier)\s+/i;

function parseFact(text) {
  if (String(text).includes("?")) return null;

  const s = clean(text)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ").trim();

  if (!s || s.length > 400) return null;
  if (/^(was|wer|wie|wo|wann|warum|weshalb|wieso|welche[rsmn]?)\b/i.test(s)) return null;

  const patterns = [
    [/^die hauptstadt von (.+?) ist (.+)$/i, "hauptstadt"],
    [/^(.+?) (?:lebt|wohnt|leben|wohnen|befindet sich|befinden sich) ((?:in|im|am|auf|bei|an) .+)$/i, "lebensraum"],
    [/^(.+?) (?:bewohnt|besiedelt|bewohnen) (.+)$/i, "lebensraum"],
    [/^(.+?) (?:kommt|stammt|kommen|stammen) aus (.+)$/i, "herkunft"],
    [/^(.+?) (?:frisst|isst|fressen|essen|ernährt sich von|ernähren sich von) (.+)$/i, "nahrung"],
    [/^(.+?) gehört zu (.+)$/i, "familie"],
    [/^(.+?) (?:ist|sind|war|waren) (.+)$/i, "definition"]
  ];

  for (const [regex, property] of patterns) {
    const m = s.match(regex);
    if (!m) continue;

    let subject = m[1];
    if (subject.includes(",")) subject = subject.split(",")[0];
    subject = subjectClean(subject);

    if (!subject || subject.split(" ").length > 5 || PRONOUNS.test(subject)) continue;

    // „… lebt im Regenwald und frisst Blätter“ → nur der erste Teil
    const value = clean(
      m[2].split(/\s+und\s+(?=(?:frisst|isst|ernährt|ist|hat|kommt|lebt|wohnt)\b)/i)[0]
    );

    if (!value || value.length > 300) continue;
    return { subject, property, value };
  }
  return null;
}

/* ==========================================
   MINI-KI 1: LERN-KI
   ========================================== */

function extractArticleFacts(text, defaultSubject = "") {
  const found = [];
  const fixedSubject = subjectClean(defaultSubject);
  let subject = fixedSubject;

  const related = a => {
    const x = norm(a), y = norm(subject);
    return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
  };

  function put(property, value) {
    value = clean(value);
    if (!subject || !value || value.length < 2) return;
    const old = found.find(f => f.subject === subject && f.property === property);
    if (old) {
      if (!norm(old.value).includes(norm(value))) old.value += "; " + value;
    } else {
      found.push({ subject, property, value });
    }
  }

  for (const raw of splitSentences(text)) {
    let s = clean(raw.replace(/<[^>]*>/g, " ").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " "));
    if (!s) continue;

    // „Es lebt im Regenwald“ → „Okapi lebt im Regenwald“
    const resolved = subject ? s.replace(PRON_START, subject + " ") : s;

    const direct = parseFact(resolved);
    if (direct) {
      if (!subject) subject = direct.subject;
      if (related(direct.subject)) {
        put(direct.property, direct.value);
      } else if (!fixedSubject) {
        // Neues Thema in frei eingefügtem Text
        subject = direct.subject;
        put(direct.property, direct.value);
      }
    }

    if (!subject || !related(norm(resolved).slice(0, 80) ? subject : subject)) continue;
    if (!norm(resolved).includes(norm(subject))) continue;

    let m;

    m = resolved.match(/familie\s+(?:der|des)\s+([\p{L}\s-]+?)(?:[,.;]|\s+und\s|$)/iu);
    if (m) put("familie", "Familie der " + m[1].trim());

    m = resolved.match(/(?:ist|sind)\s+(.+?)\s+gefärbt/iu);
    if (m) put("aussehen", m[1] + " gefärbt");

    m = resolved.match(/\bhat\s+(.+)$/iu);
    if (m && /fell|streifen|flecken|beine|flügel|ohren|schwanz|muster|federn|hörner/i.test(m[1])) {
      put("aussehen", m[1]);
    }

    m = resolved.match(/(?:gilt als|ist|sind)\s+((?:stark\s+)?(?:gefährdet|bedroht)|vom aussterben bedroht)/iu);
    if (m) put("gefährdung", m[1]);

    m = resolved.match(/(?:näher\s+)?verwandt\s+mit\s+(.+?)(?:[,;]|$)/iu);
    if (m) put("verwandtschaft", m[1]);

    m = resolved.match(/(?:im jahr(?:e)?|seit)\s+(\d{4})\s+(?:erstmals\s+)?(?:wissenschaftlich\s+)?(?:beschrieben|entdeckt|erforscht|benannt)/iu) ||
        resolved.match(/(?:wurde|wurden)\s+(?:erstmals\s+)?(?:im jahr\s+)?(\d{4})\s+(?:erstmals\s+)?(?:wissenschaftlich\s+)?(?:beschrieben|entdeckt)/iu);
    if (m) put("beschrieben", m[1]);

    m = resolved.match(/wurde\s+(.+?)\s+geboren/iu);
    if (m) put("geburt", m[1]);
  }

  return found;
}

function learnArticle(text, source = "user", subject = "") {
  const facts = extractArticleFacts(text, subject);
  if (!facts.length) return null;

  let changed = 0;
  facts.forEach(f => {
    const old = getFact(f.subject, f.property);
    if (!old || norm(old.value) !== norm(f.value)) changed++;
    addFact(f.subject, f.property, f.value, source,
      source === "user" ? 0.75 : 0.55);
  });

  countAgent("Lern-KI");
  logAudit("Lern-KI", "Text gelernt", facts.length + " Fakten");
  return { facts, changed };
}

function formatLearned(result) {
  return `Ich habe ${result.facts.length} Fakt${result.facts.length === 1 ? "" : "en"} erkannt:\n\n` +
    result.facts.map(f => `• ${f.subject} | ${f.property} | ${f.value}`).join("\n") +
    `\n\nNeu oder aktualisiert: ${result.changed}\nGesamt gespeichert: ${data.facts.length}`;
}

function learnFact(text) {
  const article = learnArticle(text);
  if (article) {
    data.pending = null;
    save();
    return formatLearned(article);
  }

  const f = parseFact(text);
  if (!f) return null;
  addFact(f.subject, f.property, f.value);
  countAgent("Lern-KI");
  data.pending = null;
  save();
  return `Gelernt!\n\n${f.subject} | ${f.property} | ${f.value}`;
}

/* ==========================================
   MINI-KI 2: FRAGE-ANTWORT-KI
   ========================================== */

const PROP_RULES = [
  [/\bgeboren\b/, "geburt"],
  [/\b(wo lebt|wo leben|wo wohnt|lebensraum)\b/, "lebensraum"],
  [/\b(woher kommt|woher stammt|herkunft)\b/, "herkunft"],
  [/\b(was frisst|was fressen|was isst|wovon ernährt|nahrung)\b/, "nahrung"],
  [/\b(hauptstadt)\b/, "hauptstadt"],
  [/\b(welcher familie|zu welcher familie|familie)\b/, "familie"],
  [/\b(wie gefährdet|gefährdung|bedroht)\b/, "gefährdung"],
  [/\b(wie sieht|aussehen|aussieht|welche farbe)\b/, "aussehen"],
  [/\b(beschrieben|entdeckt|erforscht|welches jahr)\b/, "beschrieben"],
  [/^(was ist|was sind|wer ist|wer war|was bedeutet)\b/, "definition"]
];

function requestedProperty(q) {
  const s = norm(q);
  for (const [regex, prop] of PROP_RULES) if (regex.test(s)) return prop;
  return null;
}

function extractSubject(q) {
  let s = String(q).trim().replace(/[?!.]+$/, "").trim();
  s = s.replace(/^(?:was weißt du (?:über|von)|erzähle mir (?:etwas )?(?:über|von)|erzähl mir (?:etwas )?(?:über|von)|reflektiere|prüfe dein wissen über)\s+/i, "");
  s = s.replace(/^(?:zu welcher familie gehört|welcher familie gehört|wie gefährdet ist|wie sieht|wo lebt|wo leben|wo wohnt|woher kommt|woher stammt|was frisst|was fressen|was isst|was ist|was sind|wer ist|wer war|was bedeutet|wann wurde|welche farbe hat|welche farbe haben|wie ist)\s+/i, "");
  s = s.replace(/^die hauptstadt von\s+/i, "");
  s = s.replace(/\s+(?:aus|an|geboren|beschrieben|entdeckt|erforscht|benannt|gefährdet)$/i, "");
  return subjectClean(s);
}

function looksLikeQuestion(t) {
  return /\?\s*$/.test(t) || /^(was|wer|wo|wie|woher|wann|welche[rsmn]?|warum|wieso|weshalb)\b/i.test(t.trim());
}

const SOURCE_LABEL = { wikipedia: "Wikipedia" };

function describeFact(f) {
  const S = cap(f.subject), v = f.value;
  let t;

  switch (f.property) {
    case "definition": t = `${S} ist ${v}.`; break;
    case "lebensraum":
      t = /^(?:in|im|am|auf|bei|an)\s/i.test(v)
        ? `${S} lebt ${v}.` : `${S} – Lebensraum: ${v}.`;
      break;
    case "herkunft": t = `${S} kommt aus ${v}.`; break;
    case "hauptstadt": t = `Die Hauptstadt von ${f.subject} ist ${v}.`; break;
    default: t = `${S} – ${cap(f.property)}: ${v}.`;
  }

  if (f.source && f.source !== "user" && f.source !== "seed") {
    t += `\n(Quelle: ${SOURCE_LABEL[f.source] || f.source} – nicht unabhängig bestätigt)`;
  }
  if (f.conflict && f.previous) {
    t += `\n⚠ Es gibt abweichende Angaben (früher: ${f.previous}).`;
  }
  return t;
}

function aboutText(subject) {
  const facts = getFacts(subject);
  if (!facts.length) return null;
  return `Das weiß ich über ${facts[0].subject}:\n` +
    facts.map(f => `• ${f.property}: ${f.value}`).join("\n");
}

function answerFromFacts(q) {
  const p = requestedProperty(q);
  const s = extractSubject(q);
  if (!p || !s) return null;
  const f = getFact(s, p);
  return f ? describeFact(f) : null;
}

function findQuestion(q) {
  const n = norm(q);
  return data.qa.findIndex(e =>
    norm(e.k) === n || arr(e.aliases).some(a => norm(a) === n)
  );
}

function learnQA(q, a) {
  const index = findQuestion(q);
  if (index >= 0) {
    data.qa[index].a = a;
    data.qa[index].source = "user";
  } else {
    data.qa.push({ k: q, a, aliases: [], source: "user" });
  }
  save();
  return "Frage und Antwort gespeichert.";
}

// Korrektur: bei Faktenfragen den Fakt überschreiben, sonst Frage-Antwort
function correctAnswer(question, answer) {
  const s = extractSubject(question);
  const p = requestedProperty(question);
  if (s && p && getFacts(s).length) {
    addFact(s, p, answer, "user", 0.95);
    return `Danke, korrigiert: ${s} | ${p} | ${clean(answer)}`;
  }
  return learnQA(question, answer);
}

/* ==========================================
   MINI-KI 3: ANALYSE-KI
   ========================================== */

function analyzeKnowledge(subject = "") {
  const facts = subject ? getFacts(subject) : data.facts;
  const seen = new Set();
  const duplicates = [];

  facts.forEach(f => {
    const k = norm(f.subject) + "|" + norm(f.property);
    if (seen.has(k)) duplicates.push(f);
    else seen.add(k);
  });

  const conflicts = facts.filter(f => f.conflict);
  const incomplete = facts.filter(f =>
    f.value.length < 3 || /^(unbekannt|keine angabe|etc)$/i.test(f.value)
  );

  countAgent("Analyse-KI");
  logAudit("Analyse-KI", "Wissen analysiert", facts.length + " Fakten");
  return { facts, duplicates, conflicts, incomplete };
}

function cleanupConflicts() {
  let n = 0;
  data.facts.forEach(f => {
    if (f.conflict) {
      n++;
      delete f.conflict;
      delete f.previous;
      delete f.alternatives;
    }
  });
  save();
  return `${n} Widerspruchsmarkierung${n === 1 ? "" : "en"} bereinigt. Die aktuellen Werte bleiben gespeichert.`;
}

function cleanupDuplicates() {
  const seen = new Set();
  const before = data.facts.length;
  data.facts = data.facts.filter(f => {
    const k = norm(f.subject) + "|" + norm(f.property);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  save();
  return `${before - data.facts.length} Dubletten entfernt.`;
}

/* ==========================================
   MINI-KI 4: RECHERCHE-KI
   ========================================== */

// fetch mit Zeitlimit, Fehlerprüfung und Abbruch von außen
async function fetchJSON(url, signal, label, ms = 9000) {
  const c = new AbortController();
  const onAbort = () => c.abort();

  if (signal) {
    if (signal.aborted) c.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  const timer = setTimeout(() => c.abort(), ms);

  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error(`${label} nicht erreichbar (HTTP ${r.status}).`);
    return await r.json();
  } catch (e) {
    if (e.name === "AbortError" && !(signal && signal.aborted)) {
      throw new Error(`${label}: Zeitüberschreitung.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

async function wikipediaSearch(query, signal) {
  const j = await fetchJSON(
    "https://de.wikipedia.org/w/api.php?" + new URLSearchParams({
      action: "query", list: "search", srsearch: query,
      srlimit: "5", format: "json", origin: "*"
    }), signal, "Wikipedia");

  const page = j.query?.search?.[0];
  if (!page) return null;

  const title = page.title;
  const pageURL = "https://de.wikipedia.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_"));
  const snippet = page.snippet.replace(/<[^>]*>/g, "");

  try {
    const summary = await fetchJSON(
      "https://de.wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(title), signal, "Wikipedia-Zusammenfassung");

    return {
      title: summary.title || title,
      answer: summary.extract || snippet,
      url: summary.content_urls?.desktop?.page || pageURL,
      disambiguation: summary.type === "disambiguation"
    };
  } catch (e) {
    if (e.name === "AbortError") throw e;
    return { title, answer: snippet, url: pageURL, disambiguation: false };
  }
}

async function wikidataSearch(query, signal) {
  const j = await fetchJSON(
    "https://www.wikidata.org/w/api.php?" + new URLSearchParams({
      action: "wbsearchentities", search: query,
      language: "de", uselang: "de", format: "json", origin: "*"
    }), signal, "Wikidata");
  return arr(j.search).slice(0, 4);
}

async function openLibrarySearch(query, signal) {
  const j = await fetchJSON(
    "https://openlibrary.org/search.json?" +
    new URLSearchParams({ q: query, limit: "4" }), signal, "Open Library");
  return arr(j.docs).slice(0, 4);
}

async function crossrefSearch(query, signal) {
  const j = await fetchJSON(
    "https://api.crossref.org/works?" + new URLSearchParams({
      query, rows: "4", select: "title,author,published,DOI"
    }), signal, "Crossref");
  return arr(j.message?.items).slice(0, 4);
}

async function researchAll(query, signal) {
  countAgent("Recherche-KI");
  logAudit("Recherche-KI", "Recherche gestartet", query);

  const names = ["Wikipedia", "Wikidata", "Open Library", "Crossref"];
  const results = await Promise.allSettled([
    wikipediaSearch(query, signal),
    wikidataSearch(query, signal),
    openLibrarySearch(query, signal),
    crossrefSearch(query, signal)
  ]);

  if (signal.aborted) throw new DOMException("Abgebrochen", "AbortError");

  const val = (i, fallback) => results[i].status === "fulfilled" ? (results[i].value ?? fallback) : fallback;
  const wiki = val(0, null), wd = val(1, []), books = val(2, []), papers = val(3, []);

  const successful = results.filter(r => r.status === "fulfilled").length;
  const failed = names.filter((_, i) => results[i].status === "rejected");

  let out = `RECHERCHE: ${query}\n\n`;

  if (wiki) {
    out += `WIKIPEDIA:\n${wiki.answer}\nQuelle: ${wiki.url}\n\n`;
    if (wiki.disambiguation) {
      out += "Hinweis: Mehrdeutiger Begriff – es wurde nichts gelernt. Bitte präzisiere die Suche.\n\n";
    } else {
      const learned = learnArticle(wiki.answer, "wikipedia", wiki.title);
      if (learned) out += `Lern-KI: ${learned.facts.length} Fakten erkannt.\n\n`;
    }
  }

  if (wd.length) {
    out += "WIKIDATA:\n";
    wd.forEach(x => out += `• ${x.label}: ${x.description || "Keine Beschreibung"}\n${x.concepturi || ""}\n`);
    out += "\n";
  }

  if (books.length) {
    out += "OPEN LIBRARY – BÜCHER:\n";
    books.forEach(x => out +=
      `• ${x.title} | ${arr(x.author_name).join(", ")} | ${x.first_publish_year || "Unbekannt"}\nhttps://openlibrary.org${x.key}\n`
    );
    out += "\n";
  }

  if (papers.length) {
    out += "CROSSREF – PUBLIKATIONEN:\n";
    papers.forEach(x => out +=
      `• ${x.title?.[0] || "Ohne Titel"} | ${x.DOI ? "https://doi.org/" + x.DOI : ""}\n`
    );
    out += "\n";
  }

  if (!wiki && !wd.length && !books.length && !papers.length) {
    out += "Keine Treffer gefunden.\n\n";
  }

  out += `Erfolgreich abgefragte Dienste: ${successful}/4.`;
  if (failed.length) out += ` Nicht erreichbar: ${failed.join(", ")}.`;
  out += "\nEine erfolgreiche Abfrage bedeutet nicht, dass die Quellen den Inhalt gegenseitig bestätigt haben.";

  countAgent("Zentrale KI");
  return out;
}

/* ==========================================
   MINI-KI 5: SELBSTREFLEXIONS-KI
   ========================================== */

const EXPECTED = {
  tierwissen: ["definition", "familie", "lebensraum", "aussehen", "nahrung", "gefährdung", "verwandtschaft"],
  person: ["definition", "geburt", "beruf", "leistung", "herkunft"],
  ort: ["definition", "land", "lage", "einwohner", "geschichte"],
  allgemein: ["definition", "ursache", "wirkung", "beispiele", "bedeutung"]
};

function detectTopicType(facts) {
  const all = norm(facts.map(f => f.property).join(" "));
  if (/lebensraum|nahrung|gefährdung|tierart|verwandtschaft/.test(all)) return "tierwissen";
  if (/geburt|beruf|leistung/.test(all)) return "person";
  if (/einwohner|lage|hauptstadt/.test(all)) return "ort";
  return "allgemein";
}

function selfReflection(subject = "") {
  countAgent("Reflexions-KI");

  const facts = subject ? getFacts(subject) : data.facts;
  const qa = subject
    ? data.qa.filter(e => norm(e.k + " " + e.a).includes(norm(subject)))
    : data.qa;

  const analysis = analyzeKnowledge(subject);
  const sources = {}, properties = {}, topics = {};

  facts.forEach(f => {
    const src = f.source || "unbekannt";
    sources[src] = (sources[src] || 0) + 1;
    properties[f.property] = (properties[f.property] || 0) + 1;
    topics[f.subject] = (topics[f.subject] || 0) + 1;
  });

  const type = detectTopicType(facts);
  const expected = EXPECTED[type];
  const missing = expected.filter(p => !properties[p]);
  const sourceCount = Object.keys(sources).length;

  const confidence = facts.length
    ? Math.round(facts.reduce((s, f) => s + (f.confidence ?? 0.5), 0) / facts.length * 100)
    : 0;
  const completeness = Math.round((expected.length - missing.length) / expected.length * 100);

  const lines = [
    "🪞 SELBSTREFLEXION" + (subject ? ": " + subject : ""),
    "================================",
    "",
    "1. WISSENSSTAND",
    `Gespeicherte Fakten: ${facts.length}`,
    `Frage-Antwort-Einträge: ${qa.length}`,
    `Verschiedene Eigenschaften: ${Object.keys(properties).length}`,
    `Bekannte Themen: ${Object.keys(topics).length}`,
    `Unterschiedliche Quellenarten: ${sourceCount}`,
    `Durchschnittlicher interner Vertrauenswert: ${confidence}%`,
    "",
    "2. QUELLENANALYSE"
  ];

  Object.entries(sources).forEach(([k, v]) => lines.push(`• ${k}: ${v}`));
  if (!sourceCount) lines.push("• Keine Quellen gespeichert.");

  lines.push("", "3. WISSENSBEREICHE");
  Object.entries(properties).forEach(([k, v]) => lines.push(`• ${k}: ${v}`));
  if (!facts.length) lines.push("• Noch keine.");

  lines.push("", "4. VOLLSTÄNDIGKEITSPRÜFUNG");
  lines.push(`Erkannte Themenart: ${type}`);
  lines.push(`Interne Themenabdeckung: ${completeness}%`);
  lines.push(missing.length
    ? "Mögliche Wissenslücken: " + missing.join(", ")
    : "Alle erwarteten Eigenschaftsbereiche sind vertreten.");

  lines.push("", "5. QUALITÄTSPRÜFUNG");
  lines.push(`Mögliche Dubletten: ${analysis.duplicates.length}`);
  lines.push(`Mögliche Widersprüche: ${analysis.conflicts.length}`);
  lines.push(`Unvollständige Einträge: ${analysis.incomplete.length}`);

  analysis.conflicts.slice(0, 10).forEach(f => {
    lines.push(`⚠ Widerspruch bei ${f.subject} / ${f.property}`);
    lines.push(`  • aktuell: ${f.value}`);
    if (f.previous) lines.push(`  • früher: ${f.previous}`);
    arr(f.alternatives).forEach(a => lines.push(`  • andere Quelle (${a.source}): ${a.value}`));
  });

  lines.push("", "6. MEINE EINSCHÄTZUNG");
  if (!facts.length && !qa.length) lines.push("Ich habe noch kein ausreichendes Wissen.");
  else if (facts.length < 3) lines.push("Ich verfüge nur über eine kleine Wissensbasis.");
  else if (missing.length > 3) lines.push("Ich habe Grundlagen, aber deutliche Wissenslücken.");
  else lines.push("Ich habe mehrere Informationen gespeichert.");

  lines.push(
    "• Ein gespeicherter Fakt ist nicht automatisch wahr.",
    "• Ein interner Vertrauenswert ist keine wissenschaftliche Bestätigung.",
    "• Eine Quelle kann veraltet oder fehlerhaft sein.",
    "• Mehrere Treffer sind nicht automatisch unabhängige Bestätigungen.",
    "• Ich darf fehlendes Wissen nicht erfinden."
  );

  lines.push("", "7. MEINE NÄCHSTEN LERNZIELE");
  if (missing.length) {
    missing.slice(0, 5).forEach(p => lines.push(`• Recherche zu: ${p}`));
  } else {
    lines.push("• Weitere Quellen finden.", "• Bestehende Fakten auf Aktualität prüfen.", "• Neue Zusammenhänge lernen.");
  }

  lines.push("", "8. SYSTEMSTATUS");
  lines.push(`Faktenbank: ${data.facts.length} Einträge`);
  lines.push(`Lernverlauf: ${data.audit.length} Aktivitäten`);
  lines.push(`Verbesserungsvorschläge: ${data.improvements.length}`);

  logAudit("Reflexions-KI", "Selbstreflexion erstellt", subject || "Gesamtwissen");
  save();
  return lines.join("\n");
}

/* ==========================================
   MINI-KI 6: OPTIMIERUNGS-KI
   ========================================== */

function optimizeSystem() {
  countAgent("Optimierungs-KI");

  const a = analyzeKnowledge();
  const suggestions = [];

  if (!data.facts.length) suggestions.push("Mehr Grundwissen sammeln.");
  if (a.duplicates.length) suggestions.push("Doppelte Fakten zusammenführen („Dubletten bereinigen“).");
  if (a.conflicts.length) suggestions.push("Widersprüchliche Fakten überprüfen („Widersprüche bereinigen“ danach).");
  if (a.incomplete.length) suggestions.push("Unvollständige Fakten ergänzen.");
  if (!data.facts.some(f => f.source === "wikipedia")) {
    suggestions.push("Eine Recherche durchführen, um externes Wissen aufzubauen.");
  }
  if (data.qa.filter(e => e.source !== "seed").length < 5) {
    suggestions.push("Mehr typische Fragen und Antworten lernen („Frage: … Antwort: …“).");
  }
  if (data.audit.length > 200) suggestions.push("Aktivitätsprotokoll regelmäßig auswerten.");

  if (!suggestions.length) {
    suggestions.push("Keine dringenden strukturellen Verbesserungen erkannt.");
    suggestions.push("Neue Themen und unabhängige Quellen erschließen.");
  }

  suggestions.forEach(s => {
    if (!data.improvements.includes(s)) data.improvements.push(s);
  });

  logAudit("Optimierungs-KI", "System geprüft", suggestions.length + " Vorschläge");
  save();

  return "🛠 OPTIMIERUNGSBERICHT\n\n" +
    suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n") +
    "\n\nDie Optimierungs-KI verändert den Programmcode nicht automatisch.";
}

/* ==========================================
   MINI-KI 7: ANTWORT-KI
   ========================================== */

function answerAgent(q) {
  countAgent("Antwort-KI");

  // 1. Gezielte Faktenantwort
  const direct = answerFromFacts(q);
  if (direct) return direct;

  // 2. Themenübersicht bzw. „Eigenschaft fehlt, Thema bekannt“
  const subject = extractSubject(q);
  const facts = subject ? getFacts(subject) : [];
  const asksAbout = /^(was weißt du (?:über|von)|erzähl(?:e)? mir (?:etwas )?(?:über|von))\b/i.test(q.trim());
  const prop = requestedProperty(q);

  if (facts.length && (asksAbout || prop)) {
    const note = prop && !asksAbout && prop !== "definition"
      ? `Zu „${prop}“ habe ich bei ${facts[0].subject} nichts gespeichert. ` : "";
    return note + aboutText(subject);
  }

  // 3. Exakte Frage / Alias
  const index = findQuestion(q);
  if (index >= 0) return data.qa[index].a;

  // 4. Grundwissen per Stichwort (Notfälle immer, sonst nur bei kurzen Eingaben)
  const nq = " " + norm(q) + " ";
  const wordCount = norm(q).split(" ").length;
  let bestSeed = null, bestLen = 0;

  data.qa.forEach(e => {
    if (e.source !== "seed") return;
    [e.k, ...arr(e.aliases)].forEach(alias => {
      const na = norm(alias);
      if (!na || !nq.includes(" " + na + " ")) return;
      if (!e.always && wordCount > 4) return;
      if (na.length > bestLen) { bestLen = na.length; bestSeed = e; }
    });
  });
  if (bestSeed) return bestSeed.a;

  // 5. Ähnlichkeit
  let best = null, score = 0;
  data.qa.forEach(e => {
    [e.k, ...arr(e.aliases)].forEach(c => {
      const s = similarity(q, c);
      if (s > score) { score = s; best = e; }
    });
  });

  if (best && score >= 0.55) return best.a;
  if (best && score >= 0.4) {
    return "Ich bin mir nicht ganz sicher. Vielleicht meinst du:\n" + best.a;
  }
  return null;
}

/* ==========================================
   MINI-KI 8: CODE-KI
   ========================================== */

// Diese KI untersucht den tatsächlichen Quellcode.
// Sie führt ihn nicht aus und verändert ihn nicht.
// Zwischen den Markierungen liegt der Prüfer selbst; er wird bei der Suche
// ausgeklammert, damit er seine eigenen Suchmuster nicht meldet.

//@@CODEKI-BEGIN

/*
  Blendet Kommentare, Zeichenketten und Regex-Literale aus.
  Template-Literale werden samt Verschachtelung behandelt:
  Der Code innerhalb von ${...} bleibt sichtbar, der Text darum nicht.
*/
function maskNonCode(source) {
  const src = String(source);
  const len = src.length;
  const out = src.split("");
  const stack = [];          // "tpl" oder { d: Klammertiefe } für ${ ... }
  const REGEX_PREFIX = "(,=:[!&|?{};+-*%<>~^";
  let lastSig = "";
  let i = 0;

  const blank = k => {
    if (out[k] !== "\n" && out[k] !== "\r") out[k] = " ";
  };

  while (i < len) {
    const c = src[i];
    const n = src[i + 1];
    const top = stack[stack.length - 1];

    if (top === "tpl") {
      if (c === "\\") { blank(i); if (i + 1 < len) blank(i + 1); i += 2; continue; }
      if (c === "`") { blank(i); stack.pop(); lastSig = '"'; i++; continue; }
      if (c === "$" && n === "{") { blank(i); blank(i + 1); stack.push({ d: 0 }); lastSig = "{"; i += 2; continue; }
      blank(i); i++; continue;
    }

    if (top && typeof top === "object") {
      if (c === "{") {
        top.d++;
      } else if (c === "}") {
        if (top.d === 0) { blank(i); stack.pop(); lastSig = '"'; i++; continue; }
        top.d--;
      }
    }

    if (c === "/" && n === "/") {
      while (i < len && src[i] !== "\n") { blank(i); i++; }
      continue;
    }

    if (c === "/" && n === "*") {
      blank(i); blank(i + 1); i += 2;
      while (i < len && !(src[i] === "*" && src[i + 1] === "/")) { blank(i); i++; }
      if (i < len) { blank(i); blank(i + 1); i += 2; }
      continue;
    }

    if (c === '"' || c === "'") {
      blank(i); i++;
      while (i < len && src[i] !== c && src[i] !== "\n") {
        if (src[i] === "\\") { blank(i); i++; }
        if (i < len) { blank(i); i++; }
      }
      if (i < len && src[i] === c) { blank(i); i++; }
      lastSig = '"';
      continue;
    }

    if (c === "`") {
      blank(i); stack.push("tpl"); i++;
      continue;
    }

    if (c === "/") {
      const before = src.slice(Math.max(0, i - 12), i);
      const isRegex = lastSig === "" || REGEX_PREFIX.includes(lastSig) ||
        /(?:^|[^\w$])(?:return|typeof|case|in|of|delete|void|throw|else|do)\s*$/.test(before);

      if (isRegex) {
        blank(i); i++;
        let inClass = false;
        while (i < len && src[i] !== "\n") {
          const ch = src[i];
          if (ch === "\\") {
            blank(i); i++;
            if (i < len && src[i] !== "\n") { blank(i); i++; }
            continue;
          }
          if (ch === "[") inClass = true;
          else if (ch === "]") inClass = false;
          else if (ch === "/" && !inClass) { blank(i); i++; break; }
          blank(i); i++;
        }
        while (i < len && /[a-z]/i.test(src[i])) { blank(i); i++; }
        lastSig = '"';
        continue;
      }
    }

    if (!/\s/.test(c)) lastSig = c;
    i++;
  }

  return out.join("");
}

// Entfernt den Prüfer selbst (Zeilenzahl bleibt erhalten)
function stripScanner(source) {
  const a = source.indexOf("//@@CODE" + "KI-BEGIN");
  const b = source.indexOf("//@@CODE" + "KI-END", a);
  if (a < 0 || b < a) return source;
  return source.slice(0, a) +
    source.slice(a, b).replace(/[^\n]/g, " ") +
    source.slice(b);
}

let searchCache = { s: null, v: "" };

function getSearchableCode(source) {
  if (searchCache.s === source) return searchCache.v;
  const v = maskNonCode(stripScanner(source));
  searchCache = { s: source, v };
  return v;
}

function findCodeMatches(source, regex, accept) {
  const searchLines = getSearchableCode(source).split(/\r?\n/);
  const originalLines = source.split(/\r?\n/);
  const hits = [];

  searchLines.forEach((line, index) => {
    regex.lastIndex = 0;
    if (!regex.test(line)) return;

    const original = (originalLines[index] || "").trim();
    if (!original) return;
    if (accept && !accept(original)) return;

    hits.push({ number: index + 1, code: original.slice(0, 200) });
  });

  return hits;
}

const isStaticHTMLValue = code => {
  const m = code.match(/\.innerHTML\s*\+?=\s*(.*)/);
  if (!m) return false;
  return /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*;?\s*$/.test(m[1].trim());
};

const LEVEL_RANK = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };

function codeCheckRules(source) {
  const findings = [];
  const add = (level, title, problem, location, recommendation, risk, test) =>
    findings.push({ level, title, problem, location, recommendation, risk, test });
  const where = hits => hits.map(x => `Zeile ${x.number}: ${x.code}`).join("\n");

  if (!source || source.length < 100) {
    add("kritisch", "Quellcode nicht lesbar",
      "Die Code-KI konnte den vollständigen Quellcode nicht erfassen.",
      "Quellcode-Erfassung",
      "Den Code direkt in die HTML-Datei einbetten oder die JavaScript-Datei über „Code-Datei laden“ bereitstellen.",
      "Die Code-KI kann sonst nur eingeschränkt prüfen.",
      "Code prüfen ausführen und kontrollieren, ob die erkannte Quellcodegröße über 100 Zeichen liegt.");
    return findings;
  }

  const code = getSearchableCode(source);
  const raw = stripScanner(source);

  const evalHits = [
    ...findCodeMatches(source, /\beval\s*\(/),
    ...findCodeMatches(source, /\bnew\s+Function\s*\(/)
  ];
  if (evalHits.length) {
    add("hoch", "Dynamische Codeausführung",
      "Es wurde ein tatsächlicher Aufruf von eval() oder new Function() außerhalb von Kommentaren und Zeichenketten gefunden.",
      where(evalHits),
      "Prüfen, ob die dynamische Ausführung notwendig ist. Wenn möglich durch feste Funktionen ersetzen.",
      "Kann bei ungeprüften Eingaben Sicherheitsprobleme verursachen.",
      "Eingabequelle und ausgeführten Inhalt prüfen, danach betroffene Funktionen testen.");
  }

  const htmlHits = findCodeMatches(source, /\.innerHTML\s*\+?=(?!=)/, c => !isStaticHTMLValue(c));
  if (htmlHits.length) {
    add("mittel", "Dynamische HTML-Zuweisung",
      "Eine innerHTML-Zuweisung mit nicht eindeutig festem Wert wurde gefunden.",
      where(htmlHits),
      "Prüfen, ob Benutzereingaben oder externe Inhalte in innerHTML gelangen. Für Text textContent verwenden.",
      "Nicht vertrauenswürdiger Inhalt kann Cross-Site-Scripting ermöglichen.",
      "Herkunft des Inhalts prüfen und Eingaben mit HTML-Zeichen testen.");
  }

  const writeHits = findCodeMatches(source, /\bdocument\.write(?:ln)?\s*\(/);
  if (writeHits.length) {
    add("mittel", "document.write gefunden",
      "Ein tatsächlicher Aufruf von document.write() wurde erkannt.",
      where(writeHits),
      "DOM-Methoden wie createElement() und appendChild() verwenden.",
      "Kann den Seiteninhalt überschreiben oder unerwartetes Verhalten verursachen.",
      "Betroffene Seite nach der Umstellung vollständig testen.");
  }

  const openHits = findCodeMatches(source, /\bwindow\.open\s*\(/, c => !/noopener/.test(c));
  if (openHits.length) {
    add("mittel", "window.open ohne noopener",
      "Ein neues Fenster wird geöffnet, ohne dass „noopener“ in derselben Zeile erkennbar ist.",
      where(openHits),
      "Als dritten Parameter \"noopener\" angeben.",
      "Die geöffnete Seite könnte Zugriff auf das öffnende Fenster erhalten.",
      "Verlinkte Seite öffnen und prüfen, dass window.opener leer ist.");
  }

  if (/api[_-]?key\s*[:=]\s*["'][^"']{8,}/i.test(raw) || /sk-[A-Za-z0-9_-]{15,}/.test(raw)) {
    add("kritisch", "Möglicher API-Schlüssel im Quellcode",
      "Es sieht so aus, als könnte ein geheimer Schlüssel direkt im Programm stehen.",
      "Suche nach API-Key-Variablen oder Schlüsselmustern",
      "Geheimnisse niemals im Browsercode speichern. Ein veröffentlichter Schlüssel muss sofort widerrufen werden.",
      "Jeder Besucher könnte den Schlüssel auslesen.",
      "Quellcode und veröffentlichte Dateien auf geheime Schlüssel prüfen.");
  }

  if (!/\btry\s*\{/.test(code) || !/\bcatch\s*(?:\([^)]*\))?\s*\{/.test(code)) {
    add("niedrig", "Fehlerbehandlung prüfen",
      "Keine vollständige Kombination aus try/catch erkannt.",
      "Fehlerbehandlung",
      "Asynchrone und externe Funktionen mit sinnvoller Fehlerbehandlung absichern.",
      "Fehler können unbemerkt bleiben oder die Anwendung unterbrechen.",
      "Netzwerkverbindung deaktivieren und Fehlerfälle testen.");
  }

  if (/\bfetch\s*\(/.test(code) && !/AbortController/.test(code)) {
    add("mittel", "Abbrechbare Netzwerkanfragen prüfen",
      "Es werden Netzwerkabfragen verwendet, aber kein AbortController erkannt.",
      "Netzwerkfunktionen",
      "Bei längeren Anfragen Abbruchmöglichkeiten und Zeitlimits vorsehen.",
      "Anfragen können unnötig lange laufen.",
      "Eine langsame Anfrage starten und prüfen, ob sie abgebrochen werden kann.");
  }

  if (/\bfetch\s*\(/.test(code) && !/\.ok\b/.test(code)) {
    add("mittel", "HTTP-Fehlerprüfung prüfen",
      "Keine eindeutige Prüfung des HTTP-Status erkannt.",
      "Netzwerkfunktionen",
      "Nach fetch() den HTTP-Status kontrollieren, bevor die Antwort verarbeitet wird.",
      "Fehlerhafte Serverantworten könnten als normale Daten behandelt werden.",
      "Eine ungültige URL testen.");
  }

  if (/localStorage/.test(code) && !/JSON\.parse/.test(code)) {
    add("niedrig", "Speicherformat prüfen",
      "LocalStorage wird genutzt, aber JSON.parse wurde nicht erkannt.",
      "Speicherverwaltung",
      "Gespeicherte Daten beim Laden auf gültige Werte prüfen.",
      "Beschädigte Daten können die Anwendung stören.",
      "Mit ungültigen gespeicherten Daten testen.");
  }

  if (/localStorage/.test(code) && !/QuotaExceededError|Speichern fehlgeschlagen|\bcatch\b/.test(code)) {
    add("niedrig", "Speichergrenze beachten",
      "Der Browser kann das LocalStorage-Limit erreichen.",
      "Speicherverwaltung",
      "Speicherfehler abfangen und regelmäßig Backups ermöglichen.",
      "Neue Daten könnten nicht mehr gespeichert werden.",
      "Mit vielen gespeicherten Daten testen.");
  }

  if (!/textContent/.test(code)) {
    add("niedrig", "Sichere Textausgabe prüfen",
      "textContent wurde nicht gefunden.",
      "Ausgabe und Benutzeroberfläche",
      "Für normale Textausgaben textContent bevorzugen.",
      "Unsichere HTML-Ausgabe kann zu Sicherheitsproblemen führen.",
      "Eingaben mit HTML-Zeichen testen.");
  }

  if (!/serviceWorker/.test(code)) {
    add("niedrig", "Offline-Unterstützung prüfen",
      "Ein Service Worker wurde nicht erkannt.",
      "Offline-Funktionen",
      "Falls Offline-Nutzung gewünscht ist, einen Service Worker ergänzen.",
      "Die Anwendung funktioniert möglicherweise nicht offline.",
      "Nach einer Umsetzung die App ohne Internet testen.");
  }

  return findings.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
}

function createCodeProposal(finding) {
  const existing = data.codeProposals.find(p =>
    p.title === finding.title && p.status === "wartet auf Freigabe"
  );
  if (existing) {
    data.pendingCodeProposal = existing.id;
    save();
    return existing;
  }

  const proposal = {
    id: Date.now(),
    title: finding.title,
    level: finding.level,
    problem: finding.problem,
    location: finding.location,
    recommendation: finding.recommendation,
    risk: finding.risk,
    test: finding.test,
    status: "wartet auf Freigabe",
    created: Date.now()
  };

  data.codeProposals.push(proposal);
  data.pendingCodeProposal = proposal.id;
  save();
  return proposal;
}

function formatCodeProposal(p) {
  return `VORSCHLAG DER CODE-KI

Thema: ${p.title}
Priorität: ${p.level}

PROBLEM:
${p.problem}

FUNDSTELLE:
${p.location}

VORGESCHLAGENE ÄNDERUNG:
${p.recommendation}

RISIKO:
${p.risk}

TEST:
${p.test}

STATUS:
${p.status}

WICHTIG:
Dieser Vorschlag wurde noch nicht umgesetzt.
Die Code-KI darf den Programmcode nicht selbst verändern.`;
}

// Quellcode erfassen: geladene Datei → Inline-Skript → eigene src-Datei
async function getOwnSource() {
  if (ownCode && ownCode.length > 100) return ownCode;

  if (ownScriptURL) {
    try {
      const r = await fetch(ownScriptURL, { cache: "no-store" });
      if (r.ok) {
        const text = await r.text();
        if (text.length > 100) {
          ownCode = text;
          return text;
        }
      }
    } catch {
      /* Quellcode nicht abrufbar – siehe Meldung unten */
    }
  }
  return "";
}

const NO_SOURCE_TEXT = `Ich konnte den Quellcode nicht automatisch auslesen.

Mögliche Gründe:
• Dein JavaScript liegt in einer externen Datei, die der Browser nicht liefert.
• Die Datei wird als Modul geladen.
• Die Seite läuft offline und die Datei ist nicht im Cache.

Du kannst die Datei über „Code-Datei laden“ bereitstellen.
Ich werde ohne echten Quellcode keine konkreten Fehler behaupten.`;

async function inspectCode() {
  countAgent("Code-KI");
  logAudit("Code-KI", "Codeprüfung gestartet", "Quellcode wird analysiert");

  const source = await getOwnSource();
  if (!source) return "🔧 CODE-KI\n\n" + NO_SOURCE_TEXT;

  const findings = codeCheckRules(source);
  const count = lvl => findings.filter(x => x.level === lvl).length;

  let out = `🔧 CODE-KI – SYSTEMPRÜFUNG

Quellcode erfasst: Ja
Erkannte Zeichen: ${source.length}
Erkannte Zeilen: ${source.split(/\r?\n/).length}

ERGEBNIS:
Kritisch: ${count("kritisch")}
Hoch: ${count("hoch")}
Mittel: ${count("mittel")}
Niedrig: ${count("niedrig")}

`;

  if (!findings.length) {
    out += "Bei den eingebauten Prüfregeln wurden keine Auffälligkeiten gefunden.\n";
    out += "Das bedeutet nicht, dass der Code fehlerfrei oder perfekt ist.";
  } else {
    out += "ERKANNTE PUNKTE (nach Priorität):\n\n";
    findings.forEach((f, i) => {
      out += `${i + 1}. [${f.level.toUpperCase()}] ${f.title}\n`;
      out += `${f.problem}\n`;
      out += `Fundstelle: ${f.location}\n`;
      out += `Vorschlag: ${f.recommendation}\n\n`;
    });

    const proposal = createCodeProposal(findings[0]);
    out += "\nMEIN ERSTER VERBESSERUNGSVORSCHLAG:\n";
    out += formatCodeProposal(proposal);
    out += "\n\nDarf ich dir diesen Vorschlag zur Prüfung vorlegen?\n";
    out += "Antworte mit „Code-Vorschlag freigeben“ oder „Code-Vorschlag ablehnen“.";
  }

  logAudit("Code-KI", "Codeprüfung abgeschlossen", findings.length + " Auffälligkeiten");
  save();
  return out;
}

async function inspectCodeReport() {
  countAgent("Code-KI");

  const source = await getOwnSource();
  if (!source) return "🔍 CODE-KI – ERNEUTE PRÜFUNG\n\n" + NO_SOURCE_TEXT;

  const checks = [
    { name: "eval()", regex: /\beval\s*\(/ },
    { name: "new Function()", regex: /\bnew\s+Function\s*\(/ },
    { name: "document.write()", regex: /\bdocument\.write(?:ln)?\s*\(/ },
    { name: "innerHTML-Zuweisung", regex: /\.innerHTML\s*\+?=(?!=)/, accept: c => !isStaticHTMLValue(c) },
    { name: "addEventListener()", regex: /\.addEventListener\s*\(/ }
  ];

  let report = `🔍 CODE-KI – ERNEUTE PRÜFUNG

Quellcode: ${source.length} Zeichen
Zeilen: ${source.split(/\r?\n/).length}

Die internen Prüfregeln der Code-KI werden bei dieser Suche ausgeklammert.
Kommentare, Zeichenketten und Regex-Literale werden ebenfalls ignoriert.

`;

  checks.forEach(check => {
    const hits = findCodeMatches(source, check.regex, check.accept);
    report += `${check.name}\n`;

    if (!hits.length) {
      report += "Keine Fundstelle außerhalb von Kommentaren, Zeichenketten und internen Prüfregeln gefunden.\n\n";
      return;
    }

    hits.slice(0, 15).forEach(hit => {
      report += `Zeile ${hit.number}:\n${hit.code}\n`;
      report += check.name === "addEventListener()"
        ? "Status: Normaler Listener-Aufruf – allein kein Fehler.\n"
        : "Status: Fundstelle erkannt – manuelle Prüfung erforderlich.\n";
    });
    if (hits.length > 15) report += `… und ${hits.length - 15} weitere Fundstellen.\n`;
    report += "\n";
  });

  const pending = data.codeProposals.find(p => p.id === data.pendingCodeProposal);
  const latest = data.codeProposals[data.codeProposals.length - 1];

  report += "VORHANDENER VERBESSERUNGSVORSCHLAG\n\n";
  if (pending) {
    report += formatCodeProposal(pending);
  } else if (latest) {
    report += formatCodeProposal(latest) + "\n\nEs gibt derzeit keinen offenen Vorschlag.";
  } else {
    report += "Es wurde bisher noch kein Verbesserungsvorschlag gespeichert.";
  }

  report += `

ERGEBNIS UND GRENZEN

• Die Fundstellen wurden anhand einfacher Suchregeln erkannt.
• Ein Treffer beweist noch keine Sicherheitslücke.
• Komplexe JavaScript-Ausdrücke können weiterhin falsch bewertet werden.
• Die Code-KI führt den Quellcode nicht aus und versteht die Programmlogik nicht vollständig.
• Es wurde nichts am Programmcode verändert.`;

  logAudit("Code-KI", "Erneute Codeprüfung", "Fundstellenbericht erstellt");
  save();
  return report;
}

//@@CODEKI-END

function showCodeProposal() {
  const p = data.codeProposals[data.codeProposals.length - 1];
  if (!p) return "Es gibt noch keinen Code-Vorschlag. Tippe zuerst „Code prüfen“.";
  const open = p.id === data.pendingCodeProposal;
  return formatCodeProposal(p) + (open
    ? "\n\nAntworte mit „Code-Vorschlag freigeben“ oder „Code-Vorschlag ablehnen“."
    : "\n\nDieser Vorschlag ist nicht mehr offen.");
}

function approveCodeProposal() {
  const p = data.codeProposals.find(x => x.id === data.pendingCodeProposal);
  if (!p) return "Es gibt keinen offenen Code-Vorschlag.";

  p.status = "vom Benutzer zur Prüfung freigegeben";
  data.pendingCodeProposal = null;
  save();

  return `Du hast den Vorschlag zur Prüfung freigegeben.

Hier ist der vollständige Vorschlag:

${formatCodeProposal(p)}

Kopiere diesen Text und lass ihn von einer Person oder KI deines Vertrauens prüfen:
Ist die Änderung sinnvoll, sicher und mit deinem bestehenden Code vereinbar?

Die Freigabe bedeutet NICHT, dass der Code bereits verändert wurde.`;
}

function rejectCodeProposal() {
  const p = data.codeProposals.find(x => x.id === data.pendingCodeProposal);
  if (!p) return "Es gibt keinen offenen Code-Vorschlag.";
  p.status = "abgelehnt";
  data.pendingCodeProposal = null;
  save();
  return "Der Vorschlag wurde abgelehnt. Dein Programmcode bleibt unverändert.";
}

function programmerKnowledge() {
  countAgent("Code-KI");
  logAudit("Code-KI", "Programmierquellen angezeigt", "Kostenlose Dokumentationen");

  return `📚 KOSTENLOSE PROGRAMMIERQUELLEN

JAVASCRIPT:
MDN Web Docs:
https://developer.mozilla.org/de/docs/Web/JavaScript

JavaScript.info:
https://javascript.info/

HTML:
https://developer.mozilla.org/de/docs/Web/HTML

CSS:
https://developer.mozilla.org/de/docs/Web/CSS

PYTHON:
Offizielle Python-Dokumentation:
https://docs.python.org/3/

SICHERHEIT:
OWASP Cheat Sheet Series:
https://cheatsheetseries.owasp.org/

WEB-STANDARDS:
W3C:
https://www.w3.org/

FRAGEN UND FEHLER:
Stack Overflow:
https://stackoverflow.com/

Die Quellen sind kostenlos lesbar.
Einige Dienste begrenzen automatische Abfragen.

Die Code-KI soll bei jedem Vorschlag unterscheiden zwischen:
• Sicher erkanntem Fehler
• Wahrscheinlichem Problem
• Möglicher Verbesserung
• Noch nicht überprüfter Idee`;
}

/* ==========================================
   META-KI – KOORDINIERT DAS TEAM
   ========================================== */

const AGENTS = {
  "Zentrale KI": { icon: "🧠", task: "Verteilt Aufgaben und koordiniert." },
  "Lern-KI": { icon: "📚", task: "Lernt und speichert Fakten." },
  "Recherche-KI": { icon: "🌐", task: "Sucht in öffentlichen Quellen." },
  "Analyse-KI": { icon: "🔍", task: "Prüft Fakten und Widersprüche." },
  "Reflexions-KI": { icon: "🪞", task: "Erkennt Wissenslücken." },
  "Optimierungs-KI": { icon: "🛠", task: "Entwickelt Verbesserungsvorschläge." },
  "Antwort-KI": { icon: "💬", task: "Formuliert Antworten." },
  "Code-KI": { icon: "💻", task: "Untersucht den Programmcode und schlägt sichere Verbesserungen vor." }
};

function teamStatus() {
  return "🤖 MEIN KI-TEAM\n\n" +
    Object.entries(AGENTS).map(([name, a]) =>
      `${a.icon} ${name}\n${a.task}\nEinsätze: ${data.agentStats[name] || 0}`
    ).join("\n\n") +
    "\n\nGemeinsamer Wissensspeicher: " + data.facts.length + " Fakten.";
}

function metaAnalysis() {
  countAgent("Zentrale KI");
  const a = analyzeKnowledge();
  const suggestions = [];

  if (a.conflicts.length) suggestions.push("Widersprüche im Wissensspeicher prüfen.");
  if (a.duplicates.length) suggestions.push("Dubletten bereinigen.");
  if (a.incomplete.length) suggestions.push("Unvollständige Fakten vervollständigen.");
  if (data.facts.length < 10) suggestions.push("Wissensbasis ausbauen.");
  if (!suggestions.length) suggestions.push("Derzeit keine größeren Probleme erkannt.");

  return "🧬 META-KI – SYSTEMANALYSE\n\n" +
    "Die Meta-KI hat die anderen Module ausgewertet.\n\n" +
    "TEAMAKTIVITÄT:\n" + agentReport() +
    "\n\nERKANNTE AUFGABEN:\n" +
    suggestions.map(x => "• " + x).join("\n") +
    "\n\nDie Meta-KI kann Aufgaben verteilen und Regeln verbessern, aber keine eigenen Programmänderungen ohne Freigabe installieren.";
}

/* ==========================================
   GRUNDWISSEN UND WISSENSLISTE
   ========================================== */

function addSeed() {
  let added = 0;
  const known = new Set(data.qa.map(e => norm(e.k)));

  seed.forEach(([keys, answer, always]) => {
    const [k, ...aliases] = keys;
    if (known.has(norm(k))) return;
    data.qa.push({ k, a: answer, aliases, source: "seed", always: !!always });
    added++;
  });

  save();
  return added;
}

function showKnowledge() {
  const bySubject = {};
  data.facts.forEach(f => (bySubject[f.subject] ||= []).push(f));

  const out = ["GESPEICHERTES WISSEN"];
  const subjects = Object.keys(bySubject).sort((a, b) => a.localeCompare(b, "de"));

  if (!subjects.length) out.push("• Noch keine Fakten.");
  subjects.slice(0, 60).forEach(s => {
    out.push(`\n${s}:`);
    bySubject[s].forEach(f => out.push(`  • ${f.property}: ${f.value}`));
  });
  if (subjects.length > 60) out.push(`\n… und ${subjects.length - 60} weitere Themen.`);

  const own = data.qa.filter(e => e.source !== "seed");
  out.push("", "FRAGE-ANTWORT-WISSEN");
  own.forEach(e => out.push(`• ${e.k} → ${e.a}`));
  if (!own.length) out.push("• Noch keine eigenen Einträge.");
  out.push(`(+ ${data.qa.length - own.length} Grundwissen-Einträge)`);

  out.push("", "KATEGORIEN");
  data.classes.forEach(c => out.push(`• ${c.t} → ${c.c}`));
  if (!data.classes.length) out.push("• Noch keine.");

  return out.join("\n");
}

/* ==========================================
   KATEGORIEN
   ========================================== */

function classify(text) {
  if (!data.classes.length) return "Ich brauche erst Beispiele aus Kategorien.";
  const scores = {};
  data.classes.forEach(c => {
    scores[c.c] = (scores[c.c] || 0) + similarity(text, c.t);
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!sorted.length || sorted[0][1] === 0) return "Ich kann das noch nicht sicher einordnen.";
  return `Ich tippe auf: ${sorted[0][0]}.`;
}

/* ==========================================
   HAUPTLOGIK
   ========================================== */

function isSearchRequest(text) {
  return /^(suche|recherchiere|wiki|wikipedia)\s*:/i.test(text);
}

function searchQuery(text) {
  return text.replace(/^(suche|recherchiere|wiki|wikipedia)\s*:/i, "").trim();
}

const CRISIS = /(selbstmord|suizid|umbringen|nicht mehr leben|lebensmüde|sterben (will|möchte)|töten will|ritzen|selbstverletz)/i;

function handle(text, previousQuestion) {
  const low = norm(text);
  let m;

  if (CRISIS.test(text)) {
    return "Das klingt ernst. Bitte bleib damit nicht allein und sprich mit einer vertrauten Person. Die TelefonSeelsorge erreichst du kostenlos unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr ruf 112.";
  }

  if (/^(hilfe|help|\?)$/.test(low) || text.trim() === "?") return help;
  if (/^(teamstatus|zeige deine module|zeige dein team)$/.test(low)) return teamStatus();
  if (/^meta\s*analyse(?:\s+starten)?$/.test(low)) return metaAnalysis();
  if (/^(verbesserungsvorschläge|system optimieren|optimiere dich)$/.test(low)) return optimizeSystem();

  // Längere Code-KI-Aufträge → Fundstellenbericht
  if (
    /^\s*(?:suche\s*:\s*)?code[- ]?ki\s*:/i.test(text) ||
    /^suche\s*:\s*code\s*(?:prüfen|bericht)\b/i.test(text) ||
    /^codebericht\b/i.test(low) ||
    /^code erneut prüfen\b/i.test(low) ||
    /^überprüfe deinen code erneut\b/i.test(low)
  ) {
    return inspectCodeReport();
  }

  if (/^(code prüfen|code prüfen lassen|code ki|code-ki)$/.test(low)) return inspectCode();
  if (/^(code vorschläge|code vorschlag|letzter code vorschlag)$/.test(low)) return showCodeProposal();
  if (/^code vorschlag freigeben$/.test(low)) return approveCodeProposal();
  if (/^code vorschlag ablehnen$/.test(low)) return rejectCodeProposal();
  if (/^(programmierwissen|programmiersprachen|code quellen)$/.test(low)) return programmerKnowledge();

  if (/^(selbstreflexion|reflektiere dich|prüfe dein wissen)$/.test(low)) return selfReflection();
  if (m = text.match(/^(?:reflektiere|prüfe dein wissen über)\s+(.+)$/i)) return selfReflection(subjectClean(m[1]));

  if (m = text.match(/^google\s*:\s*(.+)$/i)) {
    window.open("https://www.google.com/search?q=" + encodeURIComponent(m[1]), "_blank", "noopener");
    return "Ich habe die Google-Suche geöffnet.";
  }

  if (/^(wer bist du|was kannst du)$/.test(low)) {
    return `Ich bin ${NAME}. Mein Team besteht aus einer zentralen KI und spezialisierten Lern-, Recherche-, Analyse-, Reflexions-, Optimierungs-, Antwort- und Code-Modulen.`;
  }

  if (low === "grundwissen laden") return "Grundwissen ergänzt: " + addSeed() + " neue Einträge.";

  if (low === "verlauf löschen") {
    data.log = [];
    save();
    return "Chatverlauf gelöscht. Dein Wissen bleibt erhalten.";
  }

  if (low === "widersprüche bereinigen") return cleanupConflicts();
  if (low === "dubletten bereinigen") return cleanupDuplicates();

  if (/^(was weißt du|was hast du gelernt|zeige wissen|zeig mir dein wissen)$/.test(low)) return showKnowledge();

  if (low === "vergiss alles") return "Tippe „ALLES LÖSCHEN“, um dein gesamtes Wissen zu entfernen.";

  if (low === "alles löschen") {
    if (!confirm("Wirklich alle Fakten, Fragen und Kategorien löschen?")) return "Löschen abgebrochen.";
    data.qa = [];
    data.facts = [];
    data.classes = [];
    data.pending = null;
    save();
    return "Wissen gelöscht. Mit „Grundwissen laden“ stelle ich die Notfallinfos wieder her.";
  }

  if (m = text.match(/^vergiss\b\s*:?\s*(.+)$/i)) {
    const target = norm(subjectClean(m[1]));
    if (!target) return "Was soll ich vergessen?";
    const before = data.facts.length + data.qa.length;
    data.facts = data.facts.filter(f => !sameSubject(f.subject, target));
    data.qa = data.qa.filter(e => !norm(e.k).includes(target));
    save();
    return `${before - data.facts.length - data.qa.length} Einträge entfernt.`;
  }

  if (m = text.match(/^(?:lerne|lern|merk dir|merke dir|speichere)(?=\s|:)\s*:?\s*kategorie\s+([^:]+?)\s*:\s*(.+)$/i)) {
    data.classes.push({ t: m[2].trim(), c: m[1].trim() });
    save();
    return `Gespeichert: ${m[2].trim()} gehört zu ${m[1].trim()}.`;
  }

  if (m = text.match(/^frage\s*:\s*(.+?)\s+antwort\s*:\s*(.+)$/is)) {
    return learnQA(m[1].trim(), m[2].trim());
  }

  if (m = text.match(/^(?:ich bringe dir bei|ich bring dir bei|ich möchte dir beibringen|pass auf|merk dir bitte|merke dir bitte|merk dir|merke dir|speichere|lerne|lern)(?=\s|:)\s*:?\s*(.+)$/i)) {
    const result = learnFact(m[1]);
    if (result) return result;
    data.pending = { kind: "teach", topic: subjectClean(m[1]) };
    save();
    return `Was soll ich über ${m[1]} lernen?`;
  }

  if (m = text.match(/^(?:richtig ist|korrekt ist|stattdessen|die richtige antwort ist)\s*:?\s*(.+)$/i)) {
    if (previousQuestion) return correctAnswer(previousQuestion, m[1]);
    return learnFact(m[1]) || "Welche Aussage soll ich korrigieren?";
  }

  if (m = text.match(/^(?:ordne ein|einordnen|kategorie\?)\s*:?\s*(.+)$/i)) return classify(m[1]);

  // Recherche wird asynchron in send() ausgeführt
  if (isSearchRequest(text)) return null;

  // Offene Rückfragen haben Vorrang vor allgemeinem Lernen
  const pending = data.pending;
  if (pending) {
    if (/^(abbrechen|egal|stop|stopp|lass es)$/i.test(low)) {
      data.pending = null;
      save();
      return "Alles klar. Abgebrochen.";
    }

    if (pending.kind === "teach") {
      const result = learnArticle(text, "user", pending.topic);
      data.pending = null;
      save();
      if (result) return `Gelernt! ${result.facts.length} Fakten zu ${pending.topic} gespeichert.`;
      return learnQA("Was ist " + pending.topic + "?", text);
    }

    if (pending.kind === "correction") {
      data.pending = null;
      save();
      return correctAnswer(pending.question, text);
    }

    data.pending = null;
    save();
  }

  if (/^(nein|falsch|das stimmt nicht|nicht ganz|du liegst falsch)\b/i.test(text) && previousQuestion) {
    data.pending = { kind: "correction", question: previousQuestion };
    save();
    return "Was wäre denn richtig?";
  }

  // Aussagen lernen (Fragen niemals)
  if (!text.includes("?")) {
    const learned = learnFact(text);
    if (learned) return learned;
  }

  return answerAgent(text);
}

/* ==========================================
   CHAT
   ========================================== */

// Text sicher darstellen; http(s)-Adressen werden anklickbar
function renderText(el, text) {
  el.textContent = "";
  String(text).split(/(https?:\/\/[^\s<>"]+)/g).forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 1) {
      const url = part.replace(/[.,;:!?)]+$/, "");
      const tail = part.slice(url.length);
      const a = document.createElement("a");
      a.href = url;
      a.textContent = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      el.appendChild(a);
      if (tail) el.appendChild(document.createTextNode(tail));
    } else {
      el.appendChild(document.createTextNode(part));
    }
  });
}

function bubble(role, text, store = true) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.style.whiteSpace = "pre-wrap";
  renderText(el, text);
  $("log").appendChild(el);
  $("log").scrollTop = $("log").scrollHeight;

  if (store) {
    data.log.push({ role, text });
    save();
  }
  return el;
}

function setBubble(el, text) {
  renderText(el, text);
  $("log").scrollTop = $("log").scrollHeight;
  data.log.push({ role: "bot", text });
  save();
}

let busy = false;
let activeController = null;
let lastQuestion = null;

async function send(raw) {
  const text = String(raw ?? $("input").value).trim();
  if (!text) return;

  if (/^(abbrechen|stop|stopp|egal)$/i.test(text)) {
    $("input").value = "";
    if (busy && activeController) {
      activeController.abort();      // die laufende Anfrage meldet den Abbruch selbst
    } else {
      data.pending = null;
      save();
      bubble("bot", "Alles klar.");
    }
    return;
  }

  if (busy) {
    bubble("bot", "Ich arbeite noch. Tippe „stopp“, um abzubrechen.", false);
    return;
  }

  $("input").value = "";

  const previousQuestion = lastQuestion ||
    [...data.log].reverse().find(x => x.role === "user")?.text;
  bubble("user", text);

  let response;
  try {
    response = handle(text, previousQuestion);
  } catch (error) {
    console.error(error);
    bubble("bot", "Interner Fehler: " + error.message);
    return;
  }

  if (looksLikeQuestion(text)) lastQuestion = text;

  if (response !== null) {
    if (response instanceof Promise) {
      busy = true;
      const loading = bubble("bot", "💻 Code-KI prüft ...", false);
      try {
        setBubble(loading, await response);
      } catch (error) {
        setBubble(loading, "Code-KI-Fehler: " + error.message);
      } finally {
        busy = false;
      }
    } else {
      bubble("bot", response);
    }
    return;
  }

  // Kein lokales Wissen → Recherche
  busy = true;
  const loading = bubble("bot", "🧠 Das KI-Team arbeitet ...", false);
  const controller = new AbortController();
  activeController = controller;

  try {
    let answer;

    if (isSearchRequest(text)) {
      const query = searchQuery(text);
      if (!query) throw new Error("Bitte gib einen Suchbegriff ein.");
      answer = await researchAll(query, controller.signal);
    } else {
      const query = extractSubject(text) || text;

      if (query.length > 80) {
        answer = "Dazu habe ich noch kein Wissen. Versuche „Suche: …“ mit einem kurzen Stichwort.";
      } else {
        countAgent("Recherche-KI");
        const wiki = await wikipediaSearch(query, controller.signal);

        if (!wiki) {
          answer = `Dazu habe ich noch kein Wissen gefunden. Versuche „Suche: ${query}“.`;
        } else {
          answer = wiki.answer + "\n\nQuelle: " + wiki.title + "\n" + wiki.url;

          if (wiki.disambiguation) {
            answer += "\n\nHinweis: Mehrdeutiger Begriff – es wurde nichts gelernt.";
          } else {
            const learned = learnArticle(wiki.answer, "wikipedia", wiki.title);
            if (learned) answer += `\n\nLern-KI: ${learned.facts.length} Fakten gespeichert.`;
          }
        }
      }
    }

    setBubble(loading, answer);
  } catch (error) {
    setBubble(loading, error.name === "AbortError"
      ? "Anfrage abgebrochen."
      : "Recherche fehlgeschlagen: " + error.message);
  } finally {
    if (activeController === controller) activeController = null;
    busy = false;
  }
}

/* ==========================================
   OBERFLÄCHE
   ========================================== */

function setStatus(text) {
  const el = $("status");
  if (el) el.textContent = text;
}

function initUI() {
  const missing = ["bar", "menu", "drawer", "log", "input"].filter(id => !$(id));
  if (missing.length) {
    console.error(`${NAME}: Diese Elemente fehlen im HTML: ${missing.join(", ")}`);
    return;
  }

  /* Code-Datei laden */
  const codePicker = document.createElement("input");
  codePicker.type = "file";
  codePicker.accept = ".js,.txt,text/javascript,text/plain";
  codePicker.hidden = true;
  document.body.appendChild(codePicker);

  codePicker.onchange = () => {
    const file = codePicker.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      ownCode = String(reader.result || "");
      bubble("bot",
        `Code-Datei geladen: ${file.name}\nZeichen: ${ownCode.length}\nDu kannst jetzt „Code prüfen“ eingeben.`);
      codePicker.value = "";
    };
    reader.onerror = () => {
      bubble("bot", "Die Code-Datei konnte nicht gelesen werden.");
      codePicker.value = "";
    };
    reader.readAsText(file);
  };

  /* Import */
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = ".json,application/json";
  picker.hidden = true;
  picker.id = "filepick";
  document.body.appendChild(picker);

  picker.onchange = () => {
    const file = picker.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);

        if (!isObj(imported) || !Array.isArray(imported.qa) || !Array.isArray(imported.classes)) {
          bubble("bot", "Das ist keine gültige LernBot-Sicherung.");
          return;
        }
        if (!confirm("Import ersetzt dein bisheriges Wissen. Fortfahren?")) {
          bubble("bot", "Import abgebrochen.");
          return;
        }

        data.qa = imported.qa.filter(x => isObj(x) && typeof x.k === "string" && typeof x.a === "string");
        data.facts = sanitizeFacts(imported.facts);
        data.classes = imported.classes.filter(x => isObj(x) && typeof x.t === "string" && typeof x.c === "string");
        data.log = arr(imported.log)
          .filter(x => isObj(x) && typeof x.text === "string")
          .map(x => ({ role: x.role === "user" ? "user" : "bot", text: x.text }))
          .slice(-150);
        data.agentStats = isObj(imported.agentStats) ? imported.agentStats : {};
        data.improvements = arr(imported.improvements).filter(x => typeof x === "string");
        data.audit = arr(imported.audit).filter(isObj);
        data.codeProposals = arr(imported.codeProposals).filter(x => isObj(x) && "id" in x);
        data.theme = imported.theme === "light" ? "light" : "dark";
        data.pending = null;
        data.pendingCodeProposal = null;
        document.body.classList.toggle("light", data.theme === "light");
        saveNow();

        $("log").replaceChildren();
        data.log.forEach(x => bubble(x.role, x.text, false));
        bubble("bot", "Wissen und KI-Team-Daten erfolgreich importiert.");
      } catch {
        bubble("bot", "Datei konnte nicht importiert werden.");
      } finally {
        picker.value = "";
      }
    };
    reader.onerror = () => {
      bubble("bot", "Datei konnte nicht gelesen werden.");
      picker.value = "";
    };
    reader.readAsText(file);
  };

  /* Eingabe und Menü */
  $("bar").addEventListener("submit", e => {
    e.preventDefault();
    send();
  });

  $("menu").onclick = () => $("drawer").classList.toggle("open");

  document.querySelectorAll("[data-msg]").forEach(button => {
    button.onclick = () => send(button.dataset.msg);
  });

  document.querySelectorAll("[data-cmd]").forEach(button => {
    button.onclick = () => {
      const command = button.dataset.cmd;
      $("drawer").classList.remove("open");

      if (command === "theme") {
        document.body.classList.toggle("light");
        data.theme = document.body.classList.contains("light") ? "light" : "dark";
        save();
        return;
      }

      if (command === "refresh") {
        setStatus("Suche nach Updates ...");
        (async () => {
          try {
            const registration = await navigator.serviceWorker?.getRegistration();
            if (registration) await registration.update();
            setStatus("App wird aktualisiert ...");
            saveNow();
            setTimeout(() => location.reload(), 1200);
          } catch {
            setStatus("Update fehlgeschlagen.");
          }
        })();
        return;
      }

      if (command === "export") {
        saveNow();
        const backup = {
          version: VERSION,
          qa: data.qa,
          facts: data.facts,
          classes: data.classes,
          log: data.log,
          theme: data.theme,
          agentStats: data.agentStats,
          improvements: data.improvements,
          audit: data.audit,
          codeProposals: data.codeProposals
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mein-lernbot-3-backup.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      if (command === "import") { picker.click(); return; }
      if (command === "codefile") { codePicker.click(); return; }

      send(command);
    };
  });

  /* Chat wiederherstellen */
  if (data.theme === "light") document.body.classList.add("light");

  if (data.log.length) {
    data.log.forEach(x => bubble(x.role, x.text, false));
  } else {
    bubble("bot", `Hallo! Ich bin ${NAME}. Mein KI-Team ist bereit. Tippe „Hilfe“ für alle Befehle oder „Teamstatus“, um deine Module kennenzulernen.`, false);
  }

  /* Service Worker */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

/* ==========================================
   START
   ========================================== */

// Grundwissen einmalig bzw. bei neuer Seed-Version erneuern
if (data.seedVersion < SEED_VERSION) {
  data.qa = data.qa.filter(e => e.source !== "seed");
  addSeed();
  data.seedVersion = SEED_VERSION;
  save();
}

logAudit("Zentrale KI", "System gestartet", NAME + " Multi-Brain");
save();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUI);
} else {
  initUI();
}

})();
