(() => {
"use strict";

/* ==========================================
   LERNBOT 2.0 – MULTI-BRAIN-SYSTEM
   7 spezialisierte Module + Meta-KI
   ========================================== */

const $ = id => document.getElementById(id);
const KEY = "meinLernBot.v1";
const VERSION = 2;

const seed = [
["Hallo Hi Guten Tag","Hallo! Schön, dass du da bist. Ich bin dein LernBot 2.0!"],
["Notfall","Bei akuter Gefahr zuerst 112 anrufen. Polizei: 110."],
["Notruf Nummer Polizei Feuerwehr Krankenwagen","112: Rettungsdienst und Feuerwehr. 110: Polizei. 116 117: ärztlicher Bereitschaftsdienst."],
["Herzstillstand Wiederbelebung Reanimation","Bei Bewusstlosigkeit und keiner normalen Atmung sofort 112 wählen und den Anweisungen der Leitstelle folgen."],
["Bewusstlos Seitenlage","Bei Bewusstlosigkeit 112 rufen und Atmung prüfen. Bei normaler Atmung stabile Seitenlage, sofern keine Verletzung dagegenspricht."],
["Blutung Wunde blutet","Bei starker Blutung 112 rufen und direkten, festen Druck auf die Wunde ausüben."],
["Verbrennung verbrannt Verbrühung","Von der Hitzequelle entfernen. Keine Eiswürfel oder Hausmittel verwenden. Bei größeren Verbrennungen 112 rufen."],
["Schlaganfall","Mögliche Zeichen: hängender Mundwinkel, Schwäche auf einer Seite, Sprach- oder Sehstörungen. Sofort 112 rufen."],
["Herzinfarkt Brustschmerzen","Bei Verdacht auf Herzinfarkt sofort 112 rufen."],
["Vergiftung Gift","Kein Erbrechen auslösen und keine Hausmittel geben. Bei schweren Symptomen 112 rufen."],
["Brand Feuer brennt","Menschen warnen, Gebäude verlassen, Türen schließen und keinen Aufzug benutzen. Von draußen 112 rufen."],
["Wer bist du Was kannst du","Ich bin dein lokaler LernBot mit mehreren spezialisierten KI-Modulen."]
];

const help = `LERNBOT 2.0 – HILFE

LERNEN:
„Ein Okapi ist ein Säugetier.“
„Ein Okapi lebt im Regenwald.“
Du kannst ganze Texte einfügen.

FRAGEN:
„Was ist ein Okapi?“
„Wo lebt ein Okapi?“
„Was weißt du über Okapi?“

RECHERCHE:
„Suche: Okapi“
„Recherchiere: Albert Einstein“
„Google: Okapi“

SELBSTREFLEXION:
„Selbstreflexion“
„Reflektiere Okapi“
„Prüfe dein Wissen“

KI-TEAM:
„Teamstatus“
„Zeige deine Module“
„Meta-Analyse“
„Verbesserungsvorschläge“

WISSEN:
„Was weißt du?“
„Vergiss: Okapi“
„Grundwissen laden“
„Verlauf löschen“
„Alles löschen“

Die Module arbeiten lokal zusammen.
Recherche nutzt kostenlose öffentliche Quellen.
`;

let data;
try {
  data = JSON.parse(localStorage.getItem(KEY) || "null");
} catch { data = null; }

if (!data || typeof data !== "object" || Array.isArray(data)) data = {};

data.qa = Array.isArray(data.qa) ? data.qa : [];
data.facts = Array.isArray(data.facts) ? data.facts : [];
data.classes = Array.isArray(data.classes) ? data.classes : [];
data.log = Array.isArray(data.log) ? data.log : [];
data.pending = data.pending ?? null;
data.theme = data.theme || "dark";
data.agentStats = data.agentStats || {};
data.improvements = Array.isArray(data.improvements) ? data.improvements : [];
data.audit = Array.isArray(data.audit) ? data.audit : [];

data.qa = data.qa.filter(x => x && typeof x.k === "string");
data.facts = data.facts.filter(x =>
  x && typeof x.subject === "string" &&
  typeof x.property === "string" &&
  typeof x.value === "string"
);
data.classes = data.classes.filter(x =>
  x && typeof x.t === "string" && typeof x.c === "string"
);
data.log = data.log.filter(x => x && typeof x.text === "string");

function save() {
  data.log = data.log.slice(-150);
  data.audit = data.audit.slice(-300);
  data.improvements = data.improvements.slice(-100);
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    alert("Speichern fehlgeschlagen. Bitte exportiere dein Wissen.");
    return false;
  }
}

function norm(s) {
  return String(s ?? "").toLocaleLowerCase("de")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

function clean(s) {
  return String(s ?? "").trim().replace(/[.!?]+$/, "").trim();
}

function subjectClean(s) {
  return clean(s).replace(
    /^(der|die|das|ein|eine|einen|einem|einer|eines)\s+/i, ""
  ).trim();
}

function sameSubject(a,b) {
  return norm(subjectClean(a)) === norm(subjectClean(b));
}

function logAudit(agent, action, detail = "") {
  data.audit.push({
    agent, action, detail: String(detail).slice(0,300),
    time: Date.now()
  });
}

function countAgent(name) {
  data.agentStats[name] = (data.agentStats[name] || 0) + 1;
}

function agentReport() {
  const names = Object.keys(AGENTS);
  return names.map(name =>
    `${AGENTS[name].icon} ${name}: ${data.agentStats[name] || 0} Einsätze`
  ).join("\n");
}

/* ==========================================
   GEMEINSAMER WISSENSSPEICHER
   ========================================== */

function addFact(subject, property, value, source = "user", confidence = 0.65) {
  subject = subjectClean(subject);
  property = norm(property);
  value = clean(value);

  if (!subject || !property || !value) return false;

  const index = data.facts.findIndex(f =>
    sameSubject(f.subject,subject) &&
    norm(f.property) === property
  );

  const fact = {
    subject, property, value, source,
    confidence: Math.max(0,Math.min(1,Number(confidence) || 0.5)),
    updated: Date.now()
  };

  if (index >= 0) {
    const old = data.facts[index];

    if (norm(old.value) !== norm(value)) {
      old.previous = old.value;
      old.conflict = true;
      old.value = value;
      old.source = source;
      old.confidence = fact.confidence;
      old.updated = Date.now();
    } else {
      old.confidence = Math.max(old.confidence || 0, fact.confidence);
      old.updated = Date.now();
    }
  } else {
    data.facts.push(fact);
  }

  save();
  return true;
}

function getFacts(subject) {
  return data.facts.filter(f => sameSubject(f.subject,subject));
}

function getFact(subject, property) {
  return data.facts.find(f =>
    sameSubject(f.subject,subject) &&
    norm(f.property) === norm(property)
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

function similarity(a,b) {
  const x = new Set(tokens(a));
  const y = new Set(tokens(b));
  if (!x.size || !y.size) return 0;
  let common = 0;
  x.forEach(w => { if (y.has(w)) common++; });
  return common / Math.max(x.size,y.size);
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\r/g,"\n")
    .replace(/https?:\/\/\S+/gi," ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map(x => x.trim())
    .filter(x => x.length > 12);
}

function parseFact(text) {
  const s = clean(text);
  if (!s || s.includes("?")) return null;
  if (/^(was|wer|wie|wo|wann|warum|weshalb|wieso)\b/i.test(s)) return null;

  let m;

  const patterns = [
    [/^die hauptstadt von (.+?) ist (.+)$/i,"hauptstadt",1,2],
    [/^(.+?) (?:lebt|wohnt|befindet sich) (?:in|im|am|auf|bei) (.+)$/i,"lebensraum",1,2],
    [/^(.+?) (?:bewohnt|besiedelt) (.+)$/i,"lebensraum",1,2],
    [/^(.+?) kommt aus (.+)$/i,"herkunft",1,2],
    [/^(.+?) (?:frisst|isst|ernährt sich von) (.+)$/i,"nahrung",1,2],
    [/^(.+?) gehört zu (.+)$/i,"familie",1,2],
    [/^(.+?) ist (.+)$/i,"definition",1,2]
  ];

  for (const [regex,property,a,b] of patterns) {
    m = s.match(regex);
    if (m) return {
      subject: subjectClean(m[a]),
      property,
      value: clean(m[b])
    };
  }
  return null;
}

/* ==========================================
   MINI-KI 1: LERN-KI
   ========================================== */

function extractArticleFacts(text, defaultSubject = "") {
  const found = [];
  let subject = defaultSubject;

  function put(property,value) {
    value = clean(value);
    if (!subject || !value || value.length < 2) return;
    const old = found.find(f => f.property === property);
    if (old) {
      if (!norm(old.value).includes(norm(value))) old.value += "; " + value;
    } else {
      found.push({subject,property,value});
    }
  }

  for (const sentence of splitSentences(text)) {
    const s = sentence.replace(/<[^>]*>/g," ").trim();
    let m;

    m = s.match(/^(?:das|der|die|ein|eine)\s+([\p{L}-]{3,})/iu);
    if (m && !/^(es|sie|er)$/i.test(m[1])) subject = m[1];

    if (!subject) continue;

    m = s.match(/^(?:das|der|die)\s+[\p{L}-]+(?:,\s*[^,]+,)?\s+(?:ist|sind)\s+(.+?)(?:[.!?]|$)/iu);
    if (m) put("definition",m[1]);

    m = s.match(/familie\s+der\s+([\p{L}\s-]+?)(?:[,.]|$)/iu);
    if (m) put("familie",m[1]);

    m = s.match(/(?:lebt|wohnt|bewohnt)\s+(?:im|in|am|auf|bei)\s+(.+?)(?:[.!?]|$)/iu);
    if (m) put("lebensraum",m[1]);

    m = s.match(/(?:kommt|stammt)\s+aus\s+(.+?)(?:[.!?]|$)/iu);
    if (m) put("herkunft",m[1]);

    m = s.match(/(?:frisst|isst|ernährt sich von)\s+(.+?)(?:[.!?]|$)/iu);
    if (m) put("nahrung",m[1]);

    m = s.match(/(?:ist|sind)\s+(.+?)\s+gefärbt/iu);
    if (m) put("aussehen",m[1] + " gefärbt");

    m = s.match(/hat\s+(.+?)(?:[.!?]|$)/iu);
    if (m && /fell|streifen|flecken|beine|flügel|ohren|schwanz|muster|federn|hörner/i.test(m[1])) {
      put("aussehen",m[1]);
    }

    m = s.match(/(?:gilt als|ist|sind)\s+(stark\s+)?(gefährdet|bedroht|vom aussterben bedroht)/iu);
    if (m) put("gefährdung",(m[1] || "") + m[2]);

    m = s.match(/(?:näher\s+)?verwandt\s+mit\s+(.+?)(?:[,.]|$)/iu);
    if (m) put("verwandtschaft",m[1]);

    m = s.match(/(?:im jahr(?:e)?|seit)\s+(\d{4})\s+(?:beschrieben|entdeckt|erforscht|benannt)/iu);
    if (m) put("beschrieben",m[1]);

    const direct = parseFact(s);
    if (direct && sameSubject(direct.subject,subject)) {
      put(direct.property,direct.value);
    }
  }

  return found;
}

function learnArticle(text, source = "user", subject = "") {
  const facts = extractArticleFacts(text,subject);
  if (!facts.length) return null;

  let changed = 0;
  facts.forEach(f => {
    const old = getFact(f.subject,f.property);
    if (!old || norm(old.value) !== norm(f.value)) changed++;
    addFact(f.subject,f.property,f.value,source,
      source === "user" ? 0.75 : 0.55);
  });

  countAgent("Lern-KI");
  logAudit("Lern-KI","Text gelernt",facts.length + " Fakten");
  return {facts,changed};
}

function learnFact(text) {
  const article = learnArticle(text);
  if (article) {
    data.pending = null;
    save();
    return `Ich habe ${article.facts.length} Fakten erkannt:

${article.facts.map(f =>
  `• ${f.subject} | ${f.property} | ${f.value}`
).join("\n")}

Neu oder aktualisiert: ${article.changed}
Gesamt gespeichert: ${data.facts.length}`;
  }

  const f = parseFact(text);
  if (!f) return null;
  addFact(f.subject,f.property,f.value);
  data.pending = null;
  return `Gelernt!

${f.subject} | ${f.property} | ${f.value}`;
}

/* ==========================================
   MINI-KI 2: FRAGE-ANTWORT-KI
   ========================================== */

function questionType(q) {
  const s = norm(q);
  if (/\b(wo|wohin|woher)\b/.test(s)) return "ort";
  if (/\b(wann|welches jahr|wie lange)\b/.test(s)) return "zeit";
  if (/\b(wie viele|wie viel|anzahl)\b/.test(s)) return "menge";
  return "allgemein";
}

function requestedProperty(q) {
  const s = norm(q);
  if (/\b(wo lebt|wo wohnt|lebensraum)\b/.test(s)) return "lebensraum";
  if (/\b(woher kommt|herkunft)\b/.test(s)) return "herkunft";
  if (/\b(was frisst|was isst|nahrung)\b/.test(s)) return "nahrung";
  if (/\b(welcher familie|familie|gehört zu)\b/.test(s)) return "familie";
  if (/\b(wie gefährdet|gefährdung|bedroht)\b/.test(s)) return "gefährdung";
  if (/\b(wie sieht|aussehen|farbe)\b/.test(s)) return "aussehen";
  if (/\b(wann|welches jahr|beschrieben)\b/.test(s)) return "beschrieben";
  if (/^(was ist|wer ist|was bedeutet)\b/.test(s)) return "definition";
  return null;
}

function extractSubject(q) {
  return subjectClean(String(q)
    .replace(/^(was weißt du über|erzähle mir etwas über|erzähl mir etwas über|reflektiere|prüfe dein wissen über)\s+/i,"")
    .replace(/^(was ist|wer ist|wo lebt|wo wohnt|woher kommt|was frisst|was isst|wann wurde|wie sieht)\s+/i,"")
    .replace(/[?!.]+$/,""));
}

function answerFromFacts(q) {
  const p = requestedProperty(q);
  const s = extractSubject(q);
  if (!p || !s) return null;
  const f = getFact(s,p);
  return f ? f.value : null;
}

function answerAboutSubject(q) {
  const s = extractSubject(q);
  const facts = getFacts(s);
  if (!facts.length) return null;
  return `Das weiß ich über ${s}:\n` +
    facts.map(f => `• ${f.property}: ${f.value}`).join("\n");
}

function findQuestion(q) {
  return data.qa.findIndex(e =>
    norm(e.k) === norm(q) ||
    (e.aliases || []).some(a => norm(a) === norm(q))
  );
}

function learnQA(q,a) {
  const index = findQuestion(q);
  if (index >= 0) data.qa[index].a = a;
  else data.qa.push({k:q,a,aliases:[],source:"user"});
  save();
  return "Frage und Antwort gespeichert.";
}

/* ==========================================
   MINI-KI 3: ANALYSE-KI
   ========================================== */

function analyzeKnowledge(subject = "") {
  const facts = subject ? getFacts(subject) : data.facts;
  const groups = {};
  facts.forEach(f => {
    (groups[norm(f.subject) + "|" + norm(f.property)] ||= []).push(f);
  });

  const duplicates = [];
  const conflicts = [];

  Object.values(groups).forEach(group => {
    if (group.length > 1) {
      const values = new Set(group.map(f => norm(f.value)));
      if (values.size === 1) duplicates.push(group[0]);
      else conflicts.push(group);
    }
  });

  const incomplete = facts.filter(f =>
    f.value.length < 4 || /^(unbekannt|keine angabe|etc)$/i.test(f.value)
  );

  countAgent("Analyse-KI");
  logAudit("Analyse-KI","Wissen analysiert",facts.length + " Fakten");

  return {facts,duplicates,conflicts,incomplete};
}

/* ==========================================
   MINI-KI 4: RECHERCHE-KI
   ========================================== */

async function wikipediaSearch(query,signal) {
  const url = "https://de.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action:"query",list:"search",srsearch:query,
      srlimit:"5",format:"json",origin:"*"
    });

  const r = await fetch(url,{signal});
  if (!r.ok) throw new Error("Wikipedia nicht erreichbar.");
  const j = await r.json();
  const page = j.query?.search?.[0];
  if (!page) return null;

  const title = page.title;
  const summaryURL =
    "https://de.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(title);

  const sr = await fetch(summaryURL,{signal});
  if (!sr.ok) {
    return {
      title,
      answer:page.snippet.replace(/<[^>]*>/g,""),
      url:"https://de.wikipedia.org/wiki/" + encodeURIComponent(title)
    };
  }

  const summary = await sr.json();
  return {
    title:summary.title || title,
    answer:summary.extract || page.snippet,
    url:summary.content_urls?.desktop?.page ||
      "https://de.wikipedia.org/wiki/" + encodeURIComponent(title)
  };
}

async function wikidataSearch(query,signal) {
  const url = "https://www.wikidata.org/w/api.php?" +
    new URLSearchParams({
      action:"wbsearchentities",search:query,
      language:"de",uselang:"de",format:"json",origin:"*"
    });
  const r = await fetch(url,{signal});
  if (!r.ok) throw new Error("Wikidata nicht erreichbar.");
  const j = await r.json();
  return (j.search || []).slice(0,4);
}

async function openLibrarySearch(query,signal) {
  const url = "https://openlibrary.org/search.json?" +
    new URLSearchParams({q:query,limit:"4"});
  const r = await fetch(url,{signal});
  if (!r.ok) throw new Error("Open Library nicht erreichbar.");
  const j = await r.json();
  return (j.docs || []).slice(0,4);
}

async function crossrefSearch(query,signal) {
  const url = "https://api.crossref.org/works?" +
    new URLSearchParams({
      query,rows:"4",select:"title,author,published,DOI"
    });
  const r = await fetch(url,{signal});
  if (!r.ok) throw new Error("Crossref nicht erreichbar.");
  const j = await r.json();
  return (j.message?.items || []).slice(0,4);
}

async function researchAll(query,signal) {
  countAgent("Recherche-KI");
  logAudit("Recherche-KI","Recherche gestartet",query);

  const results = await Promise.allSettled([
    wikipediaSearch(query,signal),
    wikidataSearch(query,signal),
    openLibrarySearch(query,signal),
    crossrefSearch(query,signal)
  ]);

  if (signal.aborted) throw new DOMException("Abgebrochen","AbortError");

  const wiki = results[0].status === "fulfilled" ? results[0].value : null;
  const wd = results[1].status === "fulfilled" ? results[1].value : [];
  const books = results[2].status === "fulfilled" ? results[2].value : [];
  const papers = results[3].status === "fulfilled" ? results[3].value : [];

  let successful = results.filter(r => r.status === "fulfilled").length;
  let out = `RECHERCHE: ${query}\n\n`;

  if (wiki) {
    out += `WIKIPEDIA:\n${wiki.answer}\nQuelle: ${wiki.url}\n\n`;
    const learned = learnArticle(wiki.answer,"wikipedia",wiki.title);
    if (learned) out += `Lern-KI: ${learned.facts.length} Fakten erkannt.\n\n`;
  }

  if (wd.length) {
    out += "WIKIDATA:\n";
    wd.forEach(x => out += `• ${x.label}: ${x.description || "Keine Beschreibung"}\n${x.concepturi || ""}\n`);
    out += "\n";
  }

  if (books.length) {
    out += "OPEN LIBRARY – BÜCHER:\n";
    books.forEach(x => out +=
      `• ${x.title} | ${(x.author_name || []).join(", ")} | ${x.first_publish_year || "Unbekannt"}\nhttps://openlibrary.org${x.key}\n`
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

  out += `Erfolgreich abgefragte Dienste: ${successful}/4.\n`;
  out += "Eine erfolgreiche Abfrage bedeutet nicht, dass die Quellen den Inhalt gegenseitig bestätigt haben.";

  countAgent("Zentrale KI");
  return out;
}

/* ==========================================
   MINI-KI 5: SELBSTREFLEXIONS-KI
   ========================================== */

const EXPECTED = {
  tierwissen:["definition","familie","lebensraum","aussehen","nahrung","gefährdung","verwandtschaft"],
  person:["definition","geburt","beruf","leistung","herkunft"],
  ort:["definition","land","lage","einwohner","geschichte"],
  allgemein:["definition","ursache","wirkung","beispiele","bedeutung"]
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
  const sources = {};
  const properties = {};
  const topics = {};

  facts.forEach(f => {
    sources[f.source || "unbekannt"] = (sources[f.source || "unbekannt"] || 0) + 1;
    properties[f.property] = (properties[f.property] || 0) + 1;
    topics[f.subject] = (topics[f.subject] || 0) + 1;
  });

  const type = detectTopicType(facts);
  const expected = EXPECTED[type] || EXPECTED.allgemein;
  const missing = expected.filter(p => !properties[p]);

  const sourceCount = Object.keys(sources).length;
  const confidence = facts.length
    ? Math.round(facts.reduce((s,f) => s + (f.confidence ?? 0.5),0) / facts.length * 100)
    : 0;

  const completeness = expected.length
    ? Math.round((expected.length - missing.length) / expected.length * 100)
    : 0;

  const lines = [
    "🪞 MAXIMALE SELBSTREFLEXION",
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

  Object.entries(sources).forEach(([k,v]) => lines.push(`• ${k}: ${v}`));
  if (!sourceCount) lines.push("• Keine Quellen gespeichert.");

  lines.push("", "3. WISSENSBEREICHE");
  Object.entries(properties).forEach(([k,v]) => lines.push(`• ${k}: ${v}`));

  lines.push("", "4. VOLLSTÄNDIGKEITSPRÜFUNG");
  lines.push(`Erkannte Themenart: ${type}`);
  lines.push(`Interne Themenabdeckung: ${completeness}%`);
  if (missing.length) lines.push("Mögliche Wissenslücken: " + missing.join(", "));
  else lines.push("Alle erwarteten Eigenschaftsbereiche sind vertreten.");

  lines.push("", "5. QUALITÄTSPRÜFUNG");
  lines.push(`Mögliche Dubletten: ${analysis.duplicates.length}`);
  lines.push(`Mögliche Widersprüche: ${analysis.conflicts.length}`);
  lines.push(`Unvollständige Einträge: ${analysis.incomplete.length}`);

  analysis.conflicts.forEach(group => {
    lines.push("⚠ Widerspruch bei " + group[0].subject + " / " + group[0].property);
    group.forEach(f => lines.push("  • " + f.value));
  });

  lines.push("", "6. MEINE EINSCHÄTZUNG");

  if (!facts.length && !qa.length) {
    lines.push("Ich habe noch kein ausreichendes Wissen.");
  } else if (facts.length < 3) {
    lines.push("Ich verfüge nur über eine kleine Wissensbasis.");
  } else if (missing.length > 3) {
    lines.push("Ich habe Grundlagen, aber deutliche Wissenslücken.");
  } else {
    lines.push("Ich habe mehrere Informationen gespeichert.");
  }

  lines.push(
    "• Ein gespeicherter Fakt ist nicht automatisch wahr.",
    "• Ein interner Vertrauenswert ist keine wissenschaftliche Bestätigung.",
    "• Eine Quelle kann veraltet oder fehlerhaft sein.",
    "• Mehrere Treffer sind nicht automatisch unabhängige Bestätigungen.",
    "• Ich darf fehlendes Wissen nicht erfinden."
  );

  lines.push("", "7. MEINE NÄCHSTEN LERNZIELE");
  if (missing.length) {
    missing.slice(0,5).forEach(p => lines.push(`• Recherche zu: ${p}`));
  } else {
    lines.push("• Weitere Quellen finden.");
    lines.push("• Bestehende Fakten auf Aktualität prüfen.");
    lines.push("• Neue Zusammenhänge lernen.");
  }

  lines.push("", "8. SYSTEMSTATUS");
  lines.push(`Faktenbank: ${data.facts.length} Einträge`);
  lines.push(`Lernverlauf: ${data.audit.length} Aktivitäten`);
  lines.push(`Verbesserungsvorschläge: ${data.improvements.length}`);

  logAudit("Reflexions-KI","Selbstreflexion erstellt",subject || "Gesamtwissen");
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
  if (a.duplicates.length) suggestions.push("Doppelte Fakten zusammenführen.");
  if (a.conflicts.length) suggestions.push("Widersprüchliche Fakten überprüfen.");
  if (a.incomplete.length) suggestions.push("Unvollständige Fakten ergänzen.");
  if (!data.facts.some(f => f.source === "wikipedia")) {
    suggestions.push("Eine Recherche durchführen, um externes Wissen aufzubauen.");
  }
  if (data.qa.length < 5) suggestions.push("Mehr typische Fragen und Antworten lernen.");
  if (data.audit.length > 200) suggestions.push("Aktivitätsprotokoll regelmäßig auswerten.");

  if (!suggestions.length) {
    suggestions.push("Keine dringenden strukturellen Verbesserungen erkannt.");
    suggestions.push("Neue Themen und unabhängige Quellen erschließen.");
  }

  suggestions.forEach(s => {
    if (!data.improvements.includes(s)) data.improvements.push(s);
  });

  logAudit("Optimierungs-KI","System geprüft",suggestions.length + " Vorschläge");
  save();

  return "🛠️ OPTIMIERUNGSBERICHT\n\n" +
    suggestions.map((s,i) => `${i+1}. ${s}`).join("\n") +
    "\n\nDie Optimierungs-KI verändert den Programmcode nicht automatisch. Sie erstellt sichere Verbesserungsvorschläge.";
}

/* ==========================================
   MINI-KI 7: ANTWORT-KI
   ========================================== */

function answerAgent(q) {
  countAgent("Antwort-KI");

  const direct = answerFromFacts(q);
  if (direct) return direct;

  const about = answerAboutSubject(q);
  if (about && /was weißt du|erzähle|erzähl/i.test(q)) return about;

  const index = findQuestion(q);
  if (index >= 0) return data.qa[index].a;

  let best = null;
  let score = 0;

  data.qa.forEach(e => {
    const s = similarity(q,e.k);
    if (s > score) {
      score = s;
      best = e;
    }
    (e.aliases || []).forEach(alias => {
      const x = similarity(q,alias);
      if (x > score) {
        score = x;
        best = e;
      }
    });
  });

  if (best && score >= 0.55) return best.a;
  if (best && score >= 0.4) {
    return "Ich bin mir nicht ganz sicher. Vielleicht meinst du:\n" + best.a;
  }

  return null;
}

/* ==========================================
   META-KI – KOORDINIERT DAS TEAM
   ========================================== */

const AGENTS = {
  "Zentrale KI":{icon:"🧠",task:"Verteilt Aufgaben und koordiniert."},
  "Lern-KI":{icon:"📚",task:"Lernt und speichert Fakten."},
  "Recherche-KI":{icon:"🌐",task:"Sucht in öffentlichen Quellen."},
  "Analyse-KI":{icon:"🔍",task:"Prüft Fakten und Widersprüche."},
  "Reflexions-KI":{icon:"🪞",task:"Erkennt Wissenslücken."},
  "Optimierungs-KI":{icon:"🛠️",task:"Entwickelt Verbesserungsvorschläge."},
  "Antwort-KI":{icon:"💬",task:"Formuliert Antworten."}
};

function teamStatus() {
  return "🤖 MEIN KI-TEAM\n\n" +
    Object.entries(AGENTS).map(([name,a]) =>
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
  seed.forEach(([k,a]) => {
    if (!known.has(norm(k))) {
      data.qa.push({k,a,aliases:[],source:"seed"});
      added++;
    }
  });
  save();
  return added;
}

if (!data.seeded) {
  addSeed();
  data.seeded = true;
  save();
}

function showKnowledge() {
  const out = ["GESPEICHERTES WISSEN"];
  data.facts.forEach(f =>
    out.push(`• ${f.subject} | ${f.property} | ${f.value}`)
  );
  out.push("", "FRAGE-ANTWORT-WISSEN");
  data.qa.forEach(e => out.push(`• ${e.k} → ${e.a}`));
  out.push("", "KATEGORIEN");
  data.classes.forEach(c => out.push(`• ${c.t} → ${c.c}`));
  return out.join("\n");
}

/* ==========================================
   KATEGORIEN
   ========================================== */

function classify(text) {
  if (!data.classes.length) return "Ich brauche erst Beispiele aus Kategorien.";
  const scores = {};
  data.classes.forEach(c => {
    scores[c.c] = (scores[c.c] || 0) +
      similarity(text,c.t);
  });
  const sorted = Object.entries(scores).sort((a,b) => b[1]-a[1]);
  if (!sorted.length || sorted[0][1] === 0) return "Ich kann das noch nicht sicher einordnen.";
  return `Ich tippe auf: ${sorted[0][0]}.`;
}

/* ==========================================
   HAUPTLOGIK
   ========================================== */

function getPending() {
  return data.pending && typeof data.pending === "object"
    ? data.pending : null;
}

function handle(text,previousQuestion) {
  const low = norm(text);
  let m;

  if (/(selbstmord|suizid|umbringen|nicht mehr leben|sterben (will|möchte)|töten will|ritzen|selbstverletz)/i.test(text)) {
    return "Das klingt ernst. Bitte bleib damit nicht allein und sprich mit einer vertrauten Person. Die TelefonSeelsorge erreichst du kostenlos unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr ruf 112.";
  }

  if (/^(hilfe|help|\?)$/.test(low)) return help;

  if (/^(teamstatus|zeige deine module|zeige dein team)$/i.test(text)) return teamStatus();
  if (/^(meta analyse|meta analyse starten)$/i.test(text)) return metaAnalysis();
  if (/^(verbesserungsvorschläge|system optimieren|optimiere dich)$/i.test(text)) return optimizeSystem();

  if (/^(selbstreflexion|reflektiere dich|prüfe dein wissen)$/i.test(text)) {
    return selfReflection();
  }

  if (m = text.match(/^(?:reflektiere|prüfe dein wissen über)\s+(.+)$/i)) {
    return selfReflection(m[1]);
  }

  if (m = text.match(/^google\s*:\s*(.+)$/i)) {
    window.open("https://www.google.com/search?q=" + encodeURIComponent(m[1]),"_blank","noopener");
    return "Ich habe die Google-Suche geöffnet.";
  }

  if (/^(wer bist du|was kannst du)\??$/i.test(text)) {
    return "Ich bin LernBot 2.0. Mein Team besteht aus einer zentralen KI und spezialisierten Lern-, Recherche-, Analyse-, Reflexions-, Optimierungs- und Antwort-Modulen.";
  }

  if (low === "grundwissen laden") return "Grundwissen ergänzt: " + addSeed() + " neue Einträge.";

  if (low === "verlauf löschen") {
    data.log = [];
    save();
    return "Chatverlauf gelöscht. Dein Wissen bleibt erhalten.";
  }

  if (/^(was weißt du|was hast du gelernt|zeig.*gelernt)/i.test(text)) return showKnowledge();

  if (low === "vergiss alles") return "Tippe „ALLES LÖSCHEN“, um dein gesamtes Wissen zu entfernen.";

  if (low === "alles löschen") {
    if (!confirm("Wirklich alle Fakten, Fragen und Kategorien löschen?")) return "Löschen abgebrochen.";
    data.qa = [];
    data.facts = [];
    data.classes = [];
    data.pending = null;
    save();
    return "Wissen gelöscht.";
  }

  if (m = text.match(/^vergiss\s*:?\s+(.+)$/i)) {
    const target = norm(m[1]);
    const old = data.facts.length + data.qa.length;
    data.facts = data.facts.filter(f => !sameSubject(f.subject,target));
    data.qa = data.qa.filter(e => !norm(e.k).includes(target));
    save();
    return `${old - data.facts.length - data.qa.length} Einträge entfernt.`;
  }

  if (m = text.match(/^(?:lern|lerne|merk dir|merke dir|speichere)\s*:?\s*kategorie\s+([^:]+?)\s*:\s*(.+)$/i)) {
    data.classes.push({t:m[2].trim(),c:m[1].trim()});
    save();
    return `Gespeichert: ${m[2]} gehört zu ${m[1]}.`;
  }

  if (m = text.match(/^(?:ich bringe dir bei|ich bring dir bei|ich möchte dir beibringen|pass auf|merk dir bitte|merke dir|lern|lerne)\s*:?\s*(.+)$/i)) {
    const result = learnFact(m[1]);
    if (result) return result;
    data.pending = {kind:"teach",topic:m[1]};
    save();
    return `Was soll ich über ${m[1]} lernen?`;
  }

  if (m = text.match(/^(?:richtig ist|korrekt ist|stattdessen|die richtige antwort ist)\s*:?\s*(.+)$/i)) {
    if (previousQuestion) return learnQA(previousQuestion,m[1]);
    return learnFact(m[1]) || "Welche Aussage soll ich korrigieren?";
  }

  if (text.length > 180 && splitSentences(text).length >= 2) {
    const result = learnArticle(text,"user");
    if (result) {
      return `Lern-KI hat ${result.facts.length} Fakten erkannt:\n` +
        result.facts.map(f => `• ${f.subject} | ${f.property} | ${f.value}`).join("\n") +
        `\n\nNeu oder aktualisiert: ${result.changed}`;
    }
  }

  const direct = parseFact(text);
  if (direct) return learnFact(text);

  if (m = text.match(/^(?:ordne ein|einordnen|kategorie\?)\s*:?\s*(.+)$/i)) return classify(m[1]);

  const pending = getPending();
  if (pending) {
    if (/^(abbrechen|egal|stop|stopp|lass es)$/i.test(low)) {
      data.pending = null;
      save();
      return "Alles klar. Abgebrochen.";
    }

    if (pending.kind === "teach") {
      const result = learnArticle(text,"user",pending.topic);
      data.pending = null;
      save();
      if (result) return `Gelernt! ${result.facts.length} Fakten zu ${pending.topic} gespeichert.`;
      return learnQA("Was ist " + pending.topic + "?",text);
    }
  }

  if (/^(nein|falsch|das stimmt nicht|nicht ganz|du liegst falsch)\b/i.test(text)) {
    if (previousQuestion) {
      data.pending = {kind:"correction",question:previousQuestion};
      save();
      return "Was wäre denn richtig?";
    }
  }

  const answer = answerAgent(text);
  if (answer) return answer;

  if (/^(was weißt du über|erzähle mir etwas über|erzähl mir etwas über)\b/i.test(text)) {
    return "Dazu habe ich noch keine ausreichenden Fakten. Du kannst „Suche: " + extractSubject(text) + "“ eingeben.";
  }

  return null;
}

/* ==========================================
   RECHERCHEBEFEHLE
   ========================================== */

function isSearchRequest(text) {
  return /^(suche|recherchiere|wiki|wikipedia)\s*:/i.test(text);
}

function searchQuery(text) {
  return text.replace(/^(suche|recherchiere|wiki|wikipedia)\s*:/i,"").trim();
}

/* ==========================================
   CHAT
   ========================================== */

function bubble(role,text,store = true) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.textContent = text;
  $("log").appendChild(el);
  $("log").scrollTop = $("log").scrollHeight;

  if (store) {
    data.log.push({role,text});
    save();
  }
  return el;
}

let busy = false;
let activeController = null;

async function send(text) {
  text = String(text ?? $("input").value).trim();
  if (!text) return;

  if (/^(abbrechen|stop|stopp|egal)$/i.test(text)) {
    if (busy && activeController) {
      activeController.abort();
      activeController = null;
      busy = false;
      bubble("bot","Anfrage abgebrochen.");
    } else {
      data.pending = null;
      save();
      bubble("bot","Alles klar.");
    }
    $("input").value = "";
    return;
  }

  if (busy) return;
  $("input").value = "";

  const previous = data.log.slice();
  const previousQuestion = [...previous].reverse().find(x => x.role === "user")?.text;

  bubble("user",text);

  const response = handle(text,previousQuestion);
  if (response !== null) {
    bubble("bot",response);
    return;
  }

  busy = true;
  const loading = bubble("bot","🧠 Das KI-Team arbeitet ...",false);
  const controller = new AbortController();
  activeController = controller;

  try {
    let answer;

    if (isSearchRequest(text)) {
      const query = searchQuery(text);
      if (!query) throw new Error("Bitte gib einen Suchbegriff ein.");
      answer = await researchAll(query,controller.signal);
    } else {
      // Meta-KI: erst vorhandenes Wissen prüfen.
      answer = answerAgent(text);

      // Wenn nichts bekannt ist, kostenlose Recherche versuchen.
      if (!answer) {
        const wiki = await wikipediaSearch(text,controller.signal);

        if (wiki) {
          const learned = learnArticle(wiki.answer,"wikipedia",wiki.title);
          answer = wiki.answer +
            "\n\nQuelle: " + wiki.title + "\n" + wiki.url;

          if (learned) {
            answer += `\n\nLern-KI: ${learned.facts.length} Fakten gespeichert.`;
          }
        } else {
          answer = "Dazu habe ich noch kein Wissen gefunden. Versuche „Suche: " + text + "“.";
        }
      }
    }

    if (controller.signal.aborted) return;

    loading.textContent = answer;
    data.log.push({role:"bot",text:answer});
    save();

  } catch (error) {
    if (error.name === "AbortError") {
      loading.textContent = "Anfrage abgebrochen.";
    } else {
      loading.textContent = "Recherche fehlgeschlagen: " + error.message;
    }
    data.log.push({role:"bot",text:loading.textContent});
    save();
  } finally {
    if (activeController === controller) {
      activeController = null;
      busy = false;
    }
  }
}

/* ==========================================
   MENÜ UND EINGABEN
   ========================================== */

$("bar").addEventListener("submit",e => {
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
      $("status").textContent = "Suche nach Updates ...";
      (async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) await registration.update();
          $("status").textContent = "App wird aktualisiert ...";
          setTimeout(() => location.reload(),1200);
        } catch {
          $("status").textContent = "Update fehlgeschlagen.";
        }
      })();
      return;
    }

    if (command === "export") {
      const backup = {
        version:VERSION,
        qa:data.qa,
        facts:data.facts,
        classes:data.classes,
        log:data.log,
        theme:data.theme,
        agentStats:data.agentStats,
        improvements:data.improvements,
        audit:data.audit
      };
      const blob = new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mein-lernbot-2-backup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url),1000);
      return;
    }

    if (command === "import") {
      $("filepick").click();
      return;
    }

    send(command);
  };
});

/* ==========================================
   IMPORT / EXPORT
   ========================================== */

const picker = document.createElement("input");
picker.type = "file";
picker.accept = ".json,application/json";
picker.hidden = true;
picker.id = "filepick";
document.body.appendChild(picker);

picker.onchange = () => {
  const file = picker.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.qa) ||
          !Array.isArray(imported.classes) ||
          !confirm("Import ersetzt dein bisheriges Wissen. Fortfahren?")) {
        bubble("bot","Import abgebrochen.");
        picker.value = "";
        return;
      }

      data.qa = imported.qa.filter(x => x && typeof x.k === "string");
      data.facts = Array.isArray(imported.facts) ? imported.facts.filter(x =>
        x && typeof x.subject === "string" &&
        typeof x.property === "string" &&
        typeof x.value === "string"
      ) : [];
      data.classes = imported.classes.filter(x =>
        x && typeof x.t === "string" && typeof x.c === "string"
      );
      data.log = Array.isArray(imported.log) ? imported.log.slice(-150) : [];
      data.agentStats = imported.agentStats || {};
      data.improvements = Array.isArray(imported.improvements) ? imported.improvements : [];
      data.audit = Array.isArray(imported.audit) ? imported.audit : [];
      data.theme = imported.theme || "dark";
      data.pending = null;
      save();

      $("log").innerHTML = "";
      data.log.forEach(x => bubble(x.role === "user" ? "user" : "bot",x.text,false));
      bubble("bot","Wissen und KI-Team-Daten erfolgreich importiert.");
    } catch {
      bubble("bot","Datei konnte nicht importiert werden.");
    }
    picker.value = "";
  };
  reader.readAsText(file);
};

/* ==========================================
   CHAT WIEDERHERSTELLEN
   ========================================== */

if (data.theme === "light") document.body.classList.add("light");

if (data.log.length) {
  data.log.forEach(x => bubble(x.role === "user" ? "user" : "bot",x.text,false));
} else {
  bubble("bot","Hallo! Ich bin LernBot 2.0. Mein KI-Team ist bereit. Tippe „Teamstatus“, um deine Module kennenzulernen.",false);
}

/* ==========================================
   SERVICE WORKER
   ========================================== */

if ("serviceWorker" in navigator) {
  window.addEventListener("load",() => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

logAudit("Zentrale KI","System gestartet","LernBot 2.0 Multi-Brain");
save();

})();
