
(() => {
"use strict";

const $ = id => document.getElementById(id);
const KEY = "meinLernBot.v1";
const API = "https://mein-lernbot.vercel.app/api/chat";

const seed = [
["Hallo Hi Guten Tag", "Hallo! Schön, dass du da bist. Tippe „hilfe“, um zu sehen, was ich kann."],
["Notfall", "Bei akuter Gefahr zuerst 112 anrufen. Polizei: 110."],
["Notruf Nummer Polizei Feuerwehr Krankenwagen", "112: Rettungsdienst und Feuerwehr. 110: Polizei. 116 117: ärztlicher Bereitschaftsdienst."],
["Herzstillstand Wiederbelebung Reanimation", "Bei Bewusstlosigkeit und keiner normalen Atmung sofort 112 wählen und den Anweisungen der Leitstelle folgen."],
["Bewusstlos Seitenlage", "Bei Bewusstlosigkeit 112 rufen und Atmung prüfen. Bei normaler Atmung stabile Seitenlage, sofern keine Verletzung dagegenspricht."],
["Blutung Wunde blutet", "Bei starker Blutung 112 rufen und direkten, festen Druck auf die Wunde ausüben."],
["Verbrennung verbrannt Verbrühung", "Von der Hitzequelle entfernen. Keine Eiswürfel oder Hausmittel verwenden. Bei größeren Verbrennungen 112 rufen."],
["Schlaganfall", "Mögliche Zeichen: hängender Mundwinkel, Schwäche auf einer Seite, Sprach- oder Sehstörungen. Sofort 112 rufen."],
["Herzinfarkt Brustschmerzen", "Bei Verdacht auf Herzinfarkt sofort 112 rufen."],
["Vergiftung Gift", "Kein Erbrechen auslösen und keine Hausmittel geben. Bei schweren Symptomen 112 rufen."],
["Brand Feuer brennt", "Menschen warnen, Gebäude verlassen, Türen schließen und keinen Aufzug benutzen. Von draußen 112 rufen."],
["Wer bist du Was kannst du", "Ich bin dein lokaler LernBot. Ich speichere Wissen auf diesem Gerät, lerne aus Eingaben und kann Informationen über Wikipedia recherchieren."]
];

const help = `SO KANNST DU MIT MIR ARBEITEN

LERNEN:
„Ein Okapi ist ein Säugetier.“
„Ein Okapi lebt im Regenwald.“
„Ein Okapi frisst Blätter.“

FRAGEN:
„Was ist ein Okapi?“
„Wo lebt ein Okapi?“
„Was frisst ein Okapi?“
„Was weißt du über ein Okapi?“

KORRIGIEREN:
„Nein, das stimmt nicht.“
„Richtig ist: ...“

RECHERCHE:
„Suche: Okapi“
„Wer war Albert Einstein?“
„Was ist künstliche Intelligenz?“

BEFEHLE:
„Hilfe“
„Was weißt du?“
„Vergiss: Okapi“
„Verlauf löschen“
„Grundwissen laden“
„Abbrechen“

Ich speichere Wissen lokal auf diesem Gerät.
Für Internetrecherche verwende ich Wikipedia.
`;

let data;

try {
  data = JSON.parse(localStorage.getItem(KEY) || "null");
} catch {
  data = null;
}

if (!data || typeof data !== "object" || Array.isArray(data)) data = {};

data.qa = Array.isArray(data.qa) ? data.qa : [];
data.facts = Array.isArray(data.facts) ? data.facts : [];
data.classes = Array.isArray(data.classes) ? data.classes : [];
data.log = Array.isArray(data.log) ? data.log : [];
data.pending = data.pending ?? null;
data.theme = data.theme || "dark";

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
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    alert("Speichern fehlgeschlagen. Bitte exportiere dein Wissen.");
    return false;
  }
}

function norm(text) {
  return String(text ?? "")
    .toLocaleLowerCase("de")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(text) {
  return String(text ?? "").trim().replace(/[.!?]+$/, "").trim();
}

function subjectClean(text) {
  return clean(text).replace(
    /^(der|die|das|ein|eine|einen|einem|einer|eines)\s+/i, ""
  ).trim();
}

function sameSubject(a, b) {
  return norm(subjectClean(a)) === norm(subjectClean(b));
}

const stop = new Set(
  "der die das den dem des ein eine einen einem einer eines ist sind war was wer wie wo wann warum weshalb wieso und oder von zu im am an auf für mit ich du es mir dir wir ihr sie bitte mal denn also welcher welche welches gehört frage antwort bedeutet dasselbe gleich".split(" ")
);

function toks(text) {
  return norm(text).split(" ")
    .filter(w => w.length > 1 && !stop.has(w))
    .map(w => {
      if (w.length > 6) {
        for (const end of ["ern", "en", "er", "es", "e", "n", "s"]) {
          if (w.endsWith(end) && w.length - end.length >= 4) {
            return w.slice(0, -end.length);
          }
        }
      }
      return w;
    });
}

function counts(words) {
  const out = {};
  words.forEach(w => out[w] = (out[w] || 0) + 1);
  return out;
}

function cosine(a, b) {
  const keys = Object.keys(a);
  const dot = keys.reduce((s, k) => s + a[k] * (b[k] || 0), 0);
  const na = Math.sqrt(keys.reduce((s, k) => s + a[k] ** 2, 0));
  const nb = Math.sqrt(Object.values(b).reduce((s, v) => s + v ** 2, 0));
  return na && nb ? dot / (na * nb) : 0;
}

function grams(text) {
  const s = " " + norm(text) + " ";
  const out = [];
  for (let i = 0; i < s.length - 2; i++) out.push(s.slice(i, i + 3));
  return out;
}

function similarity(a, b) {
  const ta = [...new Set(toks(a))];
  const tb = [...new Set(toks(b))];
  if (!ta.length || !tb.length) return 0;

  const token = cosine(counts(ta), counts(tb));
  const overlap = ta.filter(w => tb.includes(w)).length / Math.min(ta.length, tb.length);
  const gram = cosine(counts(grams(a)), counts(grams(b)));

  return 0.45 * token + 0.40 * overlap + 0.15 * gram;
}

// --------------------------------------------------
// FRAGEERKENNUNG
// --------------------------------------------------

function questionType(q) {
  const s = norm(q);
  if (/\b(wo|wohin|woher)\b/.test(s)) return "ort";
  if (/\b(wann|welches jahr|wie lange)\b/.test(s)) return "zeit";
  if (/\b(wie viele|wie viel|anzahl)\b/.test(s)) return "menge";
  if (/\b(wie groß|wie schwer|wie alt)\b/.test(s)) return "eigenschaft";
  return "allgemein";
}

function requestedProperty(q) {
  const s = norm(q);

  if (/\b(in welchem land|welches land|in welchem staat)\b/.test(s)) return "land";
  if (/\b(wo lebt|wo wohnt|lebensraum|wo kommt.*vor)\b/.test(s)) return "lebensraum";
  if (/\b(woher kommt|herkunft)\b/.test(s)) return "herkunft";
  if (/\b(was frisst|was isst|ernährung|nahrung)\b/.test(s)) return "nahrung";
  if (/\b(hauptstadt)\b/.test(s)) return "hauptstadt";
  if (/\b(wie viele|wie viel|anzahl)\b/.test(s)) return "menge";
  if (/\b(zu welcher tierart|welcher familie|gehört zu)\b/.test(s)) return "tierart";
  if (/^(was ist|wer ist|was bedeutet|was versteht man unter)\b/.test(s)) return "definition";

  return null;
}

function extractSubject(q) {
  let s = clean(q);

  const patterns = [
    /^(?:in welchem land|welches land|in welchem staat)\s+(?:lebt|wohnt)\s+/i,
    /^(?:zu welcher tierart|zu welcher familie)\s+gehört\s+/i,
    /^(?:was frisst|was isst|was bedeutet|was ist|wer ist|wo lebt|wo wohnt|woher kommt|wann war|wie viele|wie viel)\s+/i,
    /^(?:was weißt du über|erzähle mir etwas über|erzähl mir etwas über)\s+/i
  ];

  patterns.forEach(p => s = s.replace(p, ""));
  return subjectClean(s);
}

// --------------------------------------------------
// FAKTEN
// --------------------------------------------------

function addFact(subject, property, value, source = "user") {
  subject = subjectClean(subject);
  property = norm(property);
  value = clean(value);

  if (!subject || !property || !value) return false;

  const index = data.facts.findIndex(f =>
    sameSubject(f.subject, subject) && norm(f.property) === property
  );

  const fact = { subject, property, value, source, updated: Date.now() };

  if (index >= 0) data.facts[index] = { ...data.facts[index], ...fact };
  else data.facts.push(fact);

  save();
  return true;
}

function getFact(subject, property) {
  return data.facts.find(f =>
    sameSubject(f.subject, subject) &&
    norm(f.property) === norm(property)
  ) || null;
}

function parseFact(text) {
  const s = String(text || "").trim();
  if (!s || s.includes("?")) return null;

  if (/^(was|wer|wie|wo|woher|wohin|wann|warum|weshalb|wieso|welcher|welche|welches)\b/i.test(s)) {
    return null;
  }

  let m;

  m = s.match(/^die\s+hauptstadt\s+von\s+(.+?)\s+ist\s+(.+)[.!?]*$/i);
  if (m) return { subject: subjectClean(m[1]), property: "hauptstadt", value: clean(m[2]) };

  m = s.match(/^(.+?)\s+(lebt|wohnt)\s+(?:in|im|am|auf|unter|bei|zwischen)\s+(.+)[.!?]*$/i);
  if (m) return { subject: subjectClean(m[1]), property: "lebensraum", value: clean(m[3]) };

  m = s.match(/^(.+?)\s+kommt\s+aus\s+(.+)[.!?]*$/i);
  if (m) return { subject: subjectClean(m[1]), property: "herkunft", value: clean(m[2]) };

  m = s.match(/^(.+?)\s+(?:frisst|isst|ernährt\s+sich\s+von)\s+(.+)[.!?]*$/i);
  if (m) return { subject: subjectClean(m[1]), property: "nahrung", value: clean(m[2]) };

  m = s.match(/^(.+?)\s+gehört\s+zu\s+(.+)[.!?]*$/i);
  if (m) return { subject: subjectClean(m[1]), property: "tierart", value: clean(m[2]) };

  m = s.match(/^(.+?)\s+(?:ist|sind|war|heißt|bedeutet)\s+(.+)[.!?]*$/i);
  if (m) return { subject: subjectClean(m[1]), property: "definition", value: clean(m[2]) };

  return null;
}

function learnFact(text) {
  const fact = parseFact(text);
  if (!fact) return null;

  addFact(fact.subject, fact.property, fact.value);

  data.pending = null;
  save();

  return `Danke! Das habe ich gelernt.

Gegenstand: ${fact.subject}
Eigenschaft: ${fact.property}
Wissen: ${fact.value}

Ich habe jetzt ${data.facts.length} Fakten und ${data.qa.length} Frage-Antwort-Einträge.`;
}

function answerFromFacts(q) {
  const property = requestedProperty(q);
  const subject = extractSubject(q);

  if (!property || !subject) return null;

  let fact = getFact(subject, property);

  if (!fact && property === "tierart") fact = getFact(subject, "definition");
  if (!fact && property === "definition") fact = getFact(subject, "tierart");

  return fact?.value || null;
}

// --------------------------------------------------
// FRAGE-ANTWORT-WISSEN
// --------------------------------------------------

function entryTexts(e) {
  return [e.k, ...(Array.isArray(e.aliases) ? e.aliases : [])]
    .filter(x => typeof x === "string" && x.trim());
}

function findQuestion(q) {
  return data.qa.findIndex(e =>
    entryTexts(e).some(k => norm(k) === norm(q))
  );
}

function best(q) {
  let index = -1;
  let score = 0;
  const type = questionType(q);

  data.qa.forEach((entry, i) => {
    entryTexts(entry).forEach(candidate => {
      if (questionType(candidate) !== type) return;
      const current = similarity(q, candidate);
      if (current > score) {
        score = current;
        index = i;
      }
    });
  });

  return { i: index, s: score };
}

function learn(q, a, aliases = []) {
  q = String(q || "").trim();
  a = String(a || "").trim();

  if (!q || !a) return "Frage und Antwort dürfen nicht leer sein.";

  let index = findQuestion(q);
  let entry;

  if (index >= 0) {
    entry = data.qa[index];
    entry.a = a;
    entry.source = "user";
  } else {
    entry = { k: q, a, aliases: [], source: "user" };
    data.qa.push(entry);
  }

  entry.aliases = Array.isArray(entry.aliases) ? entry.aliases : [];

  aliases.forEach(alias => {
    alias = String(alias || "").trim();
    if (alias && !entry.aliases.some(x => norm(x) === norm(alias))) {
      entry.aliases.push(alias);
    }
  });

  save();
  return `Danke! Das habe ich gelernt.

Frage: ${q}
Antwort: ${a}

Ich habe jetzt ${data.qa.length} Frage-Antwort-Einträge.`;
}

function addAlias(original, alternative) {
  const index = findQuestion(original);
  if (index < 0) return "Diese ursprüngliche Frage kenne ich noch nicht.";

  const entry = data.qa[index];
  alternative = String(alternative || "").trim();

  if (!alternative) return "Die alternative Frage ist leer.";
  if (questionType(entry.k) !== questionType(alternative)) {
    return "Diese Frage klingt nach einer anderen Frageart. Ich speichere sie nicht.";
  }
  if (norm(alternative) === norm(entry.k)) return "Diese Frage ist bereits die Hauptfrage.";

  entry.aliases = Array.isArray(entry.aliases) ? entry.aliases : [];

  if (entry.aliases.some(x => norm(x) === norm(alternative))) {
    return "Diese alternative Frage kenne ich bereits.";
  }

  entry.aliases.push(alternative);
  save();

  return `Alternative Frage gespeichert.

Hauptfrage: ${entry.k}
Alternative: ${alternative}
Antwort: ${entry.a}`;
}

// --------------------------------------------------
// KATEGORIEN
// --------------------------------------------------

function classify(text) {
  const groups = {};

  data.classes.forEach(item => (groups[item.c] ??= []).push(item.t));

  const names = Object.keys(groups);
  if (names.length < 2) return "Ich brauche Beispiele aus mindestens zwei Kategorien.";

  const words = toks(text);
  const vocabulary = new Set();

  Object.values(groups).flat().forEach(item =>
    toks(item).forEach(w => vocabulary.add(w))
  );

  const total = data.classes.length;

  const scores = names.map(name => {
    const wc = {};
    let count = 0;

    groups[name].forEach(item => toks(item).forEach(w => {
      wc[w] = (wc[w] || 0) + 1;
      count++;
    }));

    let score = Math.log(groups[name].length / total);

    words.forEach(w => {
      score += Math.log(
        ((wc[w] || 0) + 0.5) /
        (count + 0.5 * (vocabulary.size + 1))
      );
    });

    return [name, score / Math.sqrt(Math.max(1, words.length))];
  }).sort((a, b) => b[1] - a[1]);

  const exp = scores.map(x => Math.exp(Math.max(-30, (x[1] - scores[0][1]) * 2.5)));
  const confidence = Math.round(exp[0] / exp.reduce((a, b) => a + b, 0) * 100);

  return `Ich tippe auf: ${scores[0][0]} (${confidence} %).`;
}

// --------------------------------------------------
// GRUNDWISSEN
// --------------------------------------------------

function addSeed() {
  const known = new Set(data.qa.map(x => norm(x.k)));
  let added = 0;

  seed.forEach(([k, a]) => {
    if (!known.has(norm(k))) {
      data.qa.push({ k, a, aliases: [], source: "seed" });
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

// --------------------------------------------------
// WISSEN ANZEIGEN
// --------------------------------------------------

function showKnowledge() {
  const lines = [];

  if (data.facts.length) {
    lines.push("FAKTEN:");
    data.facts.forEach(f =>
      lines.push(`• ${f.subject} | ${f.property} | ${f.value}`)
    );
  }

  if (data.qa.length) {
    lines.push("\nFRAGE-ANTWORT-EINTRÄGE:");
    data.qa.forEach(e => {
      lines.push(`• ${e.k} → ${e.a || "(nur gemerkt)"}`);
      if (e.aliases?.length) lines.push("  Alternative: " + e.aliases.join("; "));
    });
  }

  if (data.classes.length) {
    lines.push("\nKATEGORIEN:");
    data.classes.forEach(c => lines.push(`• ${c.t} → ${c.c}`));
  }

  return lines.length ? lines.join("\n") : "Ich habe noch nichts gelernt.";
}

// --------------------------------------------------
// NEU: KOSTENLOSE INTERNETRECHERCHE
// --------------------------------------------------

async function wikipediaSearch(query, signal) {
  const searchURL =
    "https://de.wikipedia.org/w/api.php?action=query&list=search" +
    "&srsearch=" + encodeURIComponent(query) +
    "&srlimit=5&format=json&origin=*";

  const response = await fetch(searchURL, {
    signal,
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error("Wikipedia-Suche nicht erreichbar.");

  const result = await response.json();
  const pages = result.query?.search || [];

  if (!pages.length) return null;

  // Den besten Suchtreffer verwenden.
  const page = pages[0];
  const title = page.title;

  const summaryURL =
    "https://de.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(title);

  const summaryResponse = await fetch(summaryURL, {
    signal,
    headers: { Accept: "application/json" }
  });

  if (!summaryResponse.ok) {
    return {
      answer: page.snippet.replace(/<[^>]*>/g, ""),
      title,
      url: "https://de.wikipedia.org/wiki/" + encodeURIComponent(title)
    };
  }

  const summary = await summaryResponse.json();

  return {
    answer: summary.extract || page.snippet.replace(/<[^>]*>/g, ""),
    title: summary.title || title,
    url: summary.content_urls?.desktop?.page ||
      "https://de.wikipedia.org/wiki/" + encodeURIComponent(title)
  };
}

function isSearchRequest(text) {
  return /^(suche|recherchiere|google|wiki|wikipedia)\s*:/i.test(text);
}

function searchQuery(text) {
  return text.replace(
    /^(suche|recherchiere|google|wiki|wikipedia)\s*:/i,
    ""
  ).trim();
}

// --------------------------------------------------
// HAUPTLOGIK
// --------------------------------------------------

function getPending() {
  if (typeof data.pending === "string") {
    return { kind: "answer", question: data.pending };
  }
  return data.pending && typeof data.pending === "object" ? data.pending : null;
}

function setPending(kind, payload) {
  data.pending = { kind, ...payload };
  save();
}

function lastUserQuestion() {
  for (let i = data.log.length - 1; i >= 0; i--) {
    if (data.log[i]?.role === "user") return data.log[i].text;
  }
  return null;
}

function handle(text, previousQuestion) {
  const low = norm(text);
  let match;

  if (/(selbstmord|suizid|umbringen|nicht mehr leben|sterben (will|möchte)|töten will|ritzen|selbstverletz)/i.test(text)) {
    return "Das klingt ernst. Bitte bleib damit nicht allein und sprich mit einer vertrauten Person. Die TelefonSeelsorge erreichst du kostenlos unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr ruf 112.";
  }

  if (/^(hilfe|help|\?)$/.test(low)) return help;

  if (/^(wer bist du|was kannst du)\??$/i.test(text)) {
    return "Ich bin dein lokaler LernBot. Ich kann Fakten speichern, Fragen beantworten, alternative Fragen lernen, Kategorien erkennen und über Wikipedia recherchieren.";
  }

  if (low === "grundwissen laden") {
    return "Grundwissen ergänzt: " + addSeed() + " neue Einträge.";
  }

  if (low === "verlauf löschen") {
    data.log = [];
    save();
    return "Chatverlauf gelöscht. Dein gelerntes Wissen bleibt erhalten.";
  }

  if (/^(was weißt du|was hast du gelernt|zeig.*gelernt)/i.test(text)) {
    return showKnowledge();
  }

  if (low === "vergiss alles") {
    return "Zum Schutz vor versehentlichem Löschen: Tippe „ALLES LÖSCHEN“ zum Bestätigen.";
  }

  if (low === "alles löschen") {
    if (!confirm("Wirklich alle Fakten, Frage-Antwort-Einträge und Kategorien löschen?")) {
      return "Löschen abgebrochen.";
    }

    data.qa = [];
    data.facts = [];
    data.classes = [];
    data.pending = null;
    save();

    return "Dein gelerntes Wissen und die Kategorien wurden gelöscht.";
  }

  if (match = text.match(/^vergiss\s*:?\s+(.+)$/i)) {
    const target = subjectClean(match[1]);
    const oldQA = data.qa.length;
    const oldFacts = data.facts.length;

    data.qa = data.qa.filter(e =>
      !entryTexts(e).some(q => norm(q).includes(norm(target)))
    );

    data.facts = data.facts.filter(f => !sameSubject(f.subject, target));

    const deleted = oldQA - data.qa.length + oldFacts - data.facts.length;
    save();

    return deleted
      ? `${deleted} passende Einträge zu „${target}“ vergessen.`
      : "Dazu habe ich keinen passenden Eintrag gefunden.";
  }

  if (match = text.match(
    /^(?:alternative frage|gleichbedeutende frage)\s*:\s*(.+?)\s*(?:=|->|bedeutet dasselbe wie|ist dasselbe wie)\s*(.+)$/i
  )) {
    return addAlias(match[1], match[2]);
  }

  if (match = text.match(
    /^(.+?)\s+(?:bedeutet dasselbe wie|ist dasselbe wie|meint dasselbe wie)\s+(.+)[.!?]*$/i
  )) {
    return addAlias(match[2].replace(/[.!?]+$/, ""), match[1].trim());
  }

  if (match = text.match(
    /^(?:lern|lerne|merk dir|merke dir|speichere)\s*:?\s*kategorie\s+([^:]+?)\s*:\s*(.+)$/i
  )) {
    data.classes.push({ t: match[2].trim(), c: match[1].trim() });
    save();
    return `Gespeichert: „${match[2]}“ gehört zu „${match[1]}“.`;
  }

  if (match = text.match(
    /^(?:ich bringe dir bei|ich bring dir bei|ich möchte dir beibringen|ich will dir beibringen|pass auf|merk dir bitte|merke dir|lern|lerne)\s*:?\s*(.+)$/i
  )) {
    const fact = learnFact(match[1].trim());
    if (fact) return fact;

    setPending("teach_fact", { topic: match[1].trim() });
    return `Sehr gerne! Was soll ich über „${match[1].trim()}“ lernen?`;
  }

  if (match = text.match(
    /^(?:das bedeutet|das heißt|richtig ist|die richtige antwort ist)\s*:?\s*(.+)$/i
  )) {
    const fact = learnFact(match[1].trim());
    if (fact) return fact;

    if (previousQuestion) return learn(previousQuestion, match[1]);

    setPending("teach_fact", { topic: match[1].trim() });
    return "Zu welchem Begriff oder welcher Frage gehört diese Erklärung?";
  }

  const directFact = parseFact(text);
  if (directFact) return learnFact(text);

  if (match = text.match(/^(?:ordne ein|einordnen|kategorie\?)\s*:?\s*(.+)$/i)) {
    return classify(match[1]);
  }

  const pending = getPending();

  if (pending) {
    if (/^(abbrechen|egal|stop|stopp|lass es)$/i.test(low)) {
      data.pending = null;
      save();
      return "Alles klar. Wir lassen das.";
    }

    if (pending.kind === "answer" || pending.kind === "correction") {
      data.pending = null;
      save();
      return learn(pending.question, text);
    }

    if (pending.kind === "teach_fact") {
      const fact = learnFact(text);
      if (fact) return fact;

      data.pending = null;
      save();
      return learn("Was ist " + pending.topic + "?", text);
    }
  }

  if (match = text.match(
    /^(?:nein[, ]+)?(?:richtig ist|korrekt ist|stattdessen|die richtige antwort ist)\s*:?\s*(.+)$/i
  )) {
    if (previousQuestion) return learn(previousQuestion, match[1]);
    return "Welche meiner Antworten möchtest du korrigieren?";
  }

  if (/^(nein|falsch|das stimmt nicht|nicht ganz|du liegst falsch|das ist falsch|stimmt nicht)\b/i.test(text)) {
    if (previousQuestion) {
      setPending("correction", { question: previousQuestion });
      return "Danke für die Korrektur! Was wäre denn richtig?";
    }
    return "Was genau soll ich korrigieren?";
  }

  const factAnswer = answerFromFacts(text);
  if (factAnswer) return factAnswer;

  const result = best(text);

  if (result.i >= 0 && result.s >= 0.50) {
    return data.qa[result.i].a || "Das habe ich gelernt.";
  }

  if (result.i >= 0 && result.s >= 0.38) {
    return "Ich bin mir nicht ganz sicher, aber vielleicht meinst du:\n" +
      data.qa[result.i].a;
  }

  return null;
}

// --------------------------------------------------
// CHATANZEIGE
// --------------------------------------------------

function bubble(role, text, store = true) {
  const element = document.createElement("div");
  element.className = "msg " + role;
  element.textContent = text;

  $("log").appendChild(element);
  $("log").scrollTop = $("log").scrollHeight;

  if (store) {
    data.log.push({ role, text });
    save();
  }

  return element;
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
      bubble("bot", "Anfrage abgebrochen.");
    } else {
      data.pending = null;
      save();
      bubble("bot", "Alles klar. Wir lassen das.");
    }

    $("input").value = "";
    return;
  }

  if (busy) return;

  $("input").value = "";

  const previousLog = data.log.slice();
  const previousQuestion = lastUserQuestion();

  bubble("user", text);

  const response = handle(text, previousQuestion);

  if (response !== null) {
    bubble("bot", response);
    return;
  }

  busy = true;

  const loading = bubble("bot", "Ich denke nach ...", false);
  const controller = new AbortController();
  activeController = controller;

  try {
    let answerText = null;

    // 1. Explizite Recherche
    if (isSearchRequest(text)) {
      const query = searchQuery(text);
      if (!query) throw new Error("Bitte gib einen Suchbegriff ein.");

      const result = await wikipediaSearch(query, controller.signal);

      if (!result) {
        throw new Error("Ich habe dazu keinen Wikipedia-Artikel gefunden.");
      }

      answerText = result.answer + "\n\nQuelle: Wikipedia – " + result.title +
        "\n" + result.url;
    } else {
      // 2. Bisherige KI verwenden
      try {
        const context = data.facts.slice(-40)
          .map(f => `${f.subject} | ${f.property}: ${f.value}`)
          .join("\n");

        const history = previousLog.slice(-12).map(item => ({
          role: item.role === "bot" || item.role === "assistant"
            ? "assistant"
            : "user",
          content: item.text
        }));

        const result = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message:
              "Du bist ein hilfreicher deutscher Lernassistent. " +
              "Berücksichtige das gespeicherte Wissen. " +
              "Erfinde keine Fakten und sage ehrlich, wenn du etwas nicht weißt.\n\n" +
              "Gespeichertes Wissen:\n" + context +
              "\n\nNutzerfrage: " + text,
            history
          })
        });

        const answer = await result.json();

        if (!result.ok) throw new Error(answer.error || "KI-Anfrage fehlgeschlagen.");
        if (!answer.answer) throw new Error("Keine Antwort erhalten.");

        answerText = answer.answer;

      } catch (apiError) {
        if (apiError.name === "AbortError") throw apiError;

        // 3. Kostenlose Wikipedia-Ausweichlösung
        const wiki = await wikipediaSearch(text, controller.signal);

        if (wiki) {
          answerText = wiki.answer +
            "\n\nHinweis: Meine Haupt-KI war nicht erreichbar. " +
            "Diese Antwort stammt aus der Wikipedia-Recherche.\n\n" +
            "Quelle: " + wiki.title + "\n" + wiki.url;
        } else {
          throw new Error(
            "Haupt-KI nicht erreichbar und keine passende Wikipedia-Seite gefunden. " +
            "Details: " + apiError.message
          );
        }
      }
    }

    if (controller.signal.aborted) return;

    loading.textContent = answerText;

    data.log.push({ role: "bot", text: answerText });
    save();

  } catch (error) {
    if (error.name === "AbortError") {
      loading.textContent = "Anfrage abgebrochen.";
    } else {
      loading.textContent = "Ich kann die Anfrage gerade nicht beantworten: " + error.message;
    }

    data.log.push({ role: "bot", text: loading.textContent });
    save();

  } finally {
    if (activeController === controller) {
      activeController = null;
      busy = false;
    }
  }
}

// --------------------------------------------------
// EINGABEN UND MENÜ
// --------------------------------------------------

$("bar").addEventListener("submit", event => {
  event.preventDefault();
  send();
});

$("menu").onclick = () => {
  $("drawer").classList.toggle("open");
};

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
          setTimeout(() => location.reload(), 1200);
        } catch {
          $("status").textContent = "Update fehlgeschlagen. Bitte Internet prüfen.";
        }
      })();

      return;
    }

    if (command === "export") {
      const backup = {
        version: 5,
        qa: data.qa,
        facts: data.facts,
        classes: data.classes,
        log: data.log,
        theme: data.theme
      };

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mein-lernbot-wissen.json";
      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    if (command === "import") {
      $("filepick").click();
      return;
    }

    send(command);
  };
});

// --------------------------------------------------
// IMPORT
// --------------------------------------------------

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

      if (
        !Array.isArray(imported.qa) ||
        !Array.isArray(imported.classes) ||
        !confirm("Der Import ersetzt dein bisheriges Wissen. Hast du vorher ein Backup erstellt?")
      ) {
        bubble("bot", "Import abgebrochen. Dein bisheriges Wissen bleibt erhalten.");
        picker.value = "";
        return;
      }

      data.qa = imported.qa.filter(x =>
        x && typeof x === "object" && typeof x.k === "string"
      );

      data.facts = Array.isArray(imported.facts)
        ? imported.facts.filter(x =>
            x && typeof x.subject === "string" &&
            typeof x.property === "string" &&
            typeof x.value === "string"
          )
        : [];

      data.classes = imported.classes.filter(x =>
        x && typeof x === "object" &&
        typeof x.t === "string" && typeof x.c === "string"
      );

      if (Array.isArray(imported.log)) {
        data.log = imported.log.filter(x =>
          x && typeof x.text === "string"
        ).slice(-150);
      }

      if (["dark", "light"].includes(imported.theme)) {
        data.theme = imported.theme;
      }

      data.pending = null;
      save();

      $("log").innerHTML = "";

      data.log.forEach(item => {
        bubble(item.role === "user" ? "user" : "bot", item.text, false);
      });

      bubble("bot", "Wissen erfolgreich importiert.");

    } catch {
      bubble("bot", "Die Datei konnte nicht importiert werden.");
    }

    picker.value = "";
  };

  reader.readAsText(file);
};

// --------------------------------------------------
// CHAT WIEDERHERSTELLEN
// --------------------------------------------------

if (data.theme === "light") {
  document.body.classList.add("light");
}

if (data.log.length) {
  data.log.forEach(item => {
    bubble(item.role === "user" ? "user" : "bot", item.text, false);
  });
} else {
  bubble(
    "bot",
    "Hallo! Ich bin dein LernBot. Du kannst mir Fragen stellen oder Wissen beibringen.",
    false
  );
}

// --------------------------------------------------
// SERVICE WORKER
// --------------------------------------------------

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

})();
