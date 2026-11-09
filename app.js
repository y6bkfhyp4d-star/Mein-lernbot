
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const KEY = "meinLernBot.v1";

  const seed = [
    ["Hallo Hi Guten Tag", "Hallo! Schön, dass du da bist. Tippe „hilfe“, um zu sehen, was ich kann."],
    ["Notfall", "Bei akuter Gefahr zuerst 112 anrufen. Polizei: 110. Nenne den genauen Ort und beschreibe kurz, was passiert ist. Befolge die Anweisungen der Leitstelle."],
    ["Notruf Nummer Polizei Feuerwehr Krankenwagen", "112: Rettungsdienst und Feuerwehr. 110: Polizei. 116 117: ärztlicher Bereitschaftsdienst. Bei Lebensgefahr immer 112."],
    ["Herzstillstand Wiederbelebung Reanimation", "Bei Bewusstlosigkeit und keiner normalen Atmung sofort 112 wählen, Lautsprecher einschalten und den Anweisungen der Leitstelle folgen."],
    ["Bewusstlos Seitenlage", "Bei Bewusstlosigkeit 112 rufen und Atmung prüfen. Bei normaler Atmung stabile Seitenlage, sofern keine Verletzung dagegenspricht. Atmung weiter kontrollieren."],
    ["Blutung Wunde blutet", "Bei starker Blutung 112 rufen und mit einem sauberen Tuch oder Verband direkten, festen Druck auf die Wunde ausüben."],
    ["Verbrennung verbrannt Verbrühung", "Von der Hitzequelle entfernen. Keine Eiswürfel oder Hausmittel verwenden. Bei größeren Verbrennungen oder Atemproblemen 112 rufen."],
    ["Schlaganfall", "Mögliche Zeichen: hängender Mundwinkel, Schwäche auf einer Seite, Sprach- oder Sehstörungen. Sofort 112 rufen und den Beginn der Symptome merken."],
    ["Herzinfarkt Brustschmerzen", "Bei Verdacht auf Herzinfarkt, etwa Brustschmerzen, Atemnot oder kaltem Schweiß, sofort 112 rufen."],
    ["Vergiftung vergiftet Gift", "Kein Erbrechen auslösen und keine Hausmittel geben. Bei Bewusstlosigkeit, Krämpfen oder Atemnot 112 rufen."],
    ["Brand Feuer brennt", "Menschen warnen, Gebäude verlassen, Türen schließen und keinen Aufzug benutzen. Von draußen 112 rufen. Brennendes Fett niemals mit Wasser löschen."],
    ["Wer bist du Was kannst du", "Ich bin dein lokaler LernBot. Ich speichere Wissen auf diesem Gerät und kann aus deinen Eingaben lernen. Ich habe kein eigenes Internet."]
  ];

  const help = `SO KANNST DU MIT MIR ARBEITEN

LERNEN:
„Ein Okapi ist ein Säugetier.“
„Ein Okapi lebt im Regenwald.“
„Ein Okapi frisst Blätter.“
„Die Hauptstadt von Frankreich ist Paris.“

FRAGEN:
„Was ist ein Okapi?“
„Wo lebt ein Okapi?“
„Was frisst ein Okapi?“
„In welchem Land lebt ein Okapi?“
„Was weißt du über ein Okapi?“

ALTERNATIVE FRAGEN:
„Alternative Frage: Was ist ein Okapi? = Zu welcher Tierart gehört ein Okapi?“

KORRIGIEREN:
„Nein, das stimmt nicht.“
„Richtig ist: ...“

WEITERE BEFEHLE:
„Hilfe“ – zeigt diese Übersicht.
„Was weißt du?“ – zeigt gespeichertes Wissen.
„Vergiss: Okapi“ – löscht passende Einträge.
„Verlauf löschen“ – löscht den Chatverlauf.
„Grundwissen laden“ – ergänzt das Grundwissen.

Ich speichere mein Wissen auf diesem Gerät.`;

  // --------------------------------------------------
  // 1. DATEN LADEN UND BESTEHENDES WISSEN SCHÜTZEN
  // --------------------------------------------------

  let data;

  try {
    data = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch (error) {
    data = null;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    data = {};
  }

  data.qa = Array.isArray(data.qa) ? data.qa : [];
  data.facts = Array.isArray(data.facts) ? data.facts : [];
  data.classes = Array.isArray(data.classes) ? data.classes : [];
  data.log = Array.isArray(data.log) ? data.log : [];
  data.pending = data.pending ?? null;
  data.theme = data.theme || "dark";

  data.qa = data.qa.filter(x =>
    x && typeof x === "object" && typeof x.k === "string"
  );

  data.facts = data.facts.filter(x =>
    x &&
    typeof x === "object" &&
    typeof x.subject === "string" &&
    typeof x.property === "string" &&
    typeof x.value === "string"
  );

  data.classes = data.classes.filter(x =>
    x &&
    typeof x === "object" &&
    typeof x.t === "string" &&
    typeof x.c === "string"
  );

  data.log = data.log.filter(x =>
    x &&
    typeof x === "object" &&
    typeof x.text === "string"
  );

  function save() {
    data.log = data.log.slice(-150);

    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      alert("Speichern fehlgeschlagen. Bitte exportiere dein Wissen.");
      return false;
    }
  }

  // --------------------------------------------------
  // 2. TEXTVERARBEITUNG
  // --------------------------------------------------

  function norm(text) {
    return String(text ?? "")
      .toLocaleLowerCase("de")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanText(text) {
    return String(text ?? "")
      .trim()
      .replace(/[.!?]+$/, "")
      .trim();
  }

  function cleanSubject(text) {
    let subject = cleanText(text);

    subject = subject.replace(
      /^(der|die|das|ein|eine|einen|einem|einer|eines)\s+/i,
      ""
    );

    return subject.trim();
  }

  function sameSubject(a, b) {
    return norm(cleanSubject(a)) === norm(cleanSubject(b));
  }

  const stop = new Set(
    "der die das den dem des ein eine einen einem einer eines ist sind war was wer wie wo wann warum weshalb wieso und oder von zu im am an auf für mit ich du es mir dir wir ihr sie bitte mal denn also welcher welche welches gehört frage antwort bedeutet dasselbe gleich".split(" ")
  );

  function toks(text) {
    return norm(text)
      .split(" ")
      .filter(word => word.length > 1 && !stop.has(word))
      .map(word => {
        if (word.length > 6) {
          for (const end of ["ern", "en", "er", "es", "e", "n", "s"]) {
            if (
              word.endsWith(end) &&
              word.length - end.length >= 4
            ) {
              return word.slice(0, -end.length);
            }
          }
        }

        return word;
      });
  }

  function counts(words) {
    const result = {};

    words.forEach(word => {
      result[word] = (result[word] || 0) + 1;
    });

    return result;
  }

  function cosine(a, b) {
    const keys = Object.keys(a);

    const dot = keys.reduce(
      (sum, key) => sum + a[key] * (b[key] || 0),
      0
    );

    const na = Math.sqrt(
      keys.reduce((sum, key) => sum + a[key] ** 2, 0)
    );

    const nb = Math.sqrt(
      Object.values(b).reduce((sum, value) => sum + value ** 2, 0)
    );

    return na && nb ? dot / (na * nb) : 0;
  }

  function grams(text) {
    const value = " " + norm(text) + " ";
    const result = [];

    for (let i = 0; i < value.length - 2; i++) {
      result.push(value.slice(i, i + 3));
    }

    return result;
  }

  function similarity(a, b) {
    const ta = [...new Set(toks(a))];
    const tb = [...new Set(toks(b))];

    if (!ta.length || !tb.length) return 0;

    const tokenScore = cosine(counts(ta), counts(tb));
    const common = ta.filter(word => tb.includes(word)).length;
    const overlap = common / Math.min(ta.length, tb.length);
    const gramScore = cosine(counts(grams(a)), counts(grams(b)));

    return (
      0.45 * tokenScore +
      0.40 * overlap +
      0.15 * gramScore
    );
  }

  // --------------------------------------------------
  // 3. FRAGEARTEN ERKENNEN
  // --------------------------------------------------

  function questionType(question) {
    const s = norm(question);

    if (/\b(wo|wohin|woher)\b/.test(s)) return "ort";
    if (/\b(wann|welches jahr|wie lange)\b/.test(s)) return "zeit";
    if (/\b(wie viele|wie viel|anzahl)\b/.test(s)) return "menge";
    if (/\b(wie groß|wie schwer|wie alt)\b/.test(s)) return "eigenschaft";

    return "allgemein";
  }

  function requestedProperty(question) {
    const s = norm(question);

    if (/\b(in welchem land|welches land|in welchem staat)\b/.test(s)) {
      return "land";
    }

    if (/\b(wo lebt|wo wohnt|lebensraum|wo kommt.*vor)\b/.test(s)) {
      return "lebensraum";
    }

    if (/\b(woher kommt|herkunft)\b/.test(s)) {
      return "herkunft";
    }

    if (/\b(was frisst|was isst|ernährung|nahrung)\b/.test(s)) {
      return "nahrung";
    }

    if (/\b(hauptstadt)\b/.test(s)) {
      return "hauptstadt";
    }

    if (/\b(wie viele|wie viel|anzahl)\b/.test(s)) {
      return "menge";
    }

    if (/\b(zu welcher tierart|welcher familie|gehört zu)\b/.test(s)) {
      return "tierart";
    }

    if (/^(was ist|wer ist|was bedeutet|was versteht man unter)\b/.test(s)) {
      return "definition";
    }

    return null;
  }

  function extractQuestionSubject(question) {
    let s = cleanText(question);

    const patterns = [
      /^(?:in welchem land|welches land|in welchem staat)\s+(?:lebt|wohnt)\s+/i,
      /^(?:zu welcher tierart|zu welcher familie)\s+gehört\s+/i,
      /^(?:was frisst|was isst|was bedeutet|was ist|wer ist|wo lebt|wo wohnt|woher kommt|wann war|wie viele|wie viel)\s+/i,
      /^(?:was weißt du über|erzähle mir etwas über|erzähl mir etwas über)\s+/i
    ];

    for (const pattern of patterns) {
      s = s.replace(pattern, "");
    }

    s = s.replace(/\?+$/, "").trim();

    return cleanSubject(s);
  }

  // --------------------------------------------------
  // 4. FAKTEN SPEICHERN
  // --------------------------------------------------

  function addFact(subject, property, value, source = "user") {
    subject = cleanSubject(subject);
    property = norm(property);
    value = cleanText(value);

    if (!subject || !property || !value) {
      return false;
    }

    const existing = data.facts.findIndex(f =>
      sameSubject(f.subject, subject) &&
      norm(f.property) === property
    );

    const fact = {
      subject,
      property,
      value,
      source,
      updated: Date.now()
    };

    if (existing >= 0) {
      data.facts[existing] = {
        ...data.facts[existing],
        ...fact
      };
    } else {
      data.facts.push(fact);
    }

    save();
    return true;
  }

  function getFact(subject, property) {
    const wanted = norm(cleanSubject(subject));

    return data.facts.find(f =>
      norm(cleanSubject(f.subject)) === wanted &&
      norm(f.property) === norm(property)
    ) || null;
  }

  // --------------------------------------------------
  // 5. FAKTE AUS AUSSAGEN ERKENNEN
  // --------------------------------------------------

  function parseFact(text) {
    const clean = String(text || "").trim();

    if (!clean || clean.includes("?")) return null;

    // Fragen und Frageanfänge niemals als Fakten lernen.
    if (/^(was|wer|wie|wo|woher|wohin|wann|warum|weshalb|wieso|welcher|welche|welches)\b/i.test(clean)) {
      return null;
    }

    let match;

    // Hauptstadt: "Die Hauptstadt von Frankreich ist Paris."
    match = clean.match(
      /^die\s+hauptstadt\s+von\s+(.+?)\s+ist\s+(.+)[.!?]*$/i
    );

    if (match) {
      return {
        subject: cleanSubject(match[1]),
        property: "hauptstadt",
        value: cleanText(match[2]),
        original: clean
      };
    }

    // Lebensraum: "Ein Okapi lebt im Regenwald."
    match = clean.match(
      /^(.+?)\s+(lebt|wohnt)\s+(?:in|im|am|auf|unter|bei|zwischen)\s+(.+)[.!?]*$/i
    );

    if (match) {
      return {
        subject: cleanSubject(match[1]),
        property: "lebensraum",
        value: cleanText(match[3]),
        original: clean
      };
    }

    // Herkunft: "Ein Okapi kommt aus dem Kongo."
    match = clean.match(
      /^(.+?)\s+kommt\s+aus\s+(.+)[.!?]*$/i
    );

    if (match) {
      return {
        subject: cleanSubject(match[1]),
        property: "herkunft",
        value: cleanText(match[2]),
        original: clean
      };
    }

    // Ernährung: "Ein Okapi frisst Blätter."
    match = clean.match(
      /^(.+?)\s+(?:frisst|isst|ernährt\s+sich\s+von)\s+(.+)[.!?]*$/i
    );

    if (match) {
      return {
        subject: cleanSubject(match[1]),
        property: "nahrung",
        value: cleanText(match[2]),
        original: clean
      };
    }

    // Zugehörigkeit: "Ein Okapi gehört zu den Giraffenartigen."
    match = clean.match(
      /^(.+?)\s+gehört\s+zu\s+(.+)[.!?]*$/i
    );

    if (match) {
      return {
        subject: cleanSubject(match[1]),
        property: "tierart",
        value: cleanText(match[2]),
        original: clean
      };
    }

    // Definition: "Ein Okapi ist ein Säugetier."
    match = clean.match(
      /^(.+?)\s+(?:ist|sind|war|heißt|bedeutet)\s+(.+)[.!?]*$/i
    );

    if (match) {
      const subject = cleanSubject(match[1]);
      const value = cleanText(match[2]);

      if (!subject || !value) return null;

      return {
        subject,
        property: "definition",
        value,
        original: clean
      };
    }

    return null;
  }

  function learnFact(text) {
    const fact = parseFact(text);
    if (!fact) return null;

    const pending = getPending();

    if (!addFact(
      fact.subject,
      fact.property,
      fact.value,
      "user"
    )) {
      return "Diesen Fakt konnte ich leider nicht speichern.";
    }

    data.pending = null;
    save();

    return "Danke! Das habe ich gelernt.\n\n" +
      "Gegenstand: " + fact.subject +
      "\nEigenschaft: " + fact.property +
      "\nWissen: " + fact.value +
      "\n\nIch habe jetzt " + data.facts.length +
      " Fakten und " + data.qa.length +
      " Frage-Antwort-Einträge.";
  }

  // --------------------------------------------------
  // 6. FAKTEN ABFRAGEN
  // --------------------------------------------------

  function answerFromFacts(question) {
    const property = requestedProperty(question);
    const subject = extractQuestionSubject(question);

    if (!property || !subject) return null;

    let fact = getFact(subject, property);

    // Eine Definition kann auch eine Tierart beantworten.
    if (!fact && property === "tierart") {
      fact = getFact(subject, "definition");
    }

    if (!fact && property === "definition") {
      fact = getFact(subject, "tierart");
    }

    if (!fact) return null;

    return fact.value;
  }

  // --------------------------------------------------
  // 7. FRAGE-ANTWORT-SYSTEM
  // --------------------------------------------------

  function entryTexts(entry) {
    return [
      entry.k,
      ...(Array.isArray(entry.aliases) ? entry.aliases : [])
    ].filter(x =>
      typeof x === "string" && x.trim()
    );
  }

  function findQuestion(question) {
    const nq = norm(question);

    return data.qa.findIndex(entry =>
      entryTexts(entry).some(k => norm(k) === nq)
    );
  }

  function best(question) {
    let bestIndex = -1;
    let bestScore = 0;
    const type = questionType(question);

    data.qa.forEach((entry, index) => {
      const texts = entryTexts(entry);

      for (const candidate of texts) {
        if (questionType(candidate) !== type) continue;

        const score = similarity(question, candidate);

        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
    });

    return {
      i: bestIndex,
      s: bestScore
    };
  }

  function learn(question, answer, aliases = []) {
    question = String(question || "").trim();
    answer = String(answer || "").trim();

    if (!question || !answer) {
      return "Frage und Antwort dürfen nicht leer sein.";
    }

    const existing = findQuestion(question);
    let entry;

    if (existing >= 0) {
      entry = data.qa[existing];
      entry.a = answer;
      entry.source = "user";
    } else {
      entry = {
        k: question,
        a: answer,
        aliases: [],
        source: "user"
      };

      data.qa.push(entry);
    }

    entry.aliases = Array.isArray(entry.aliases)
      ? entry.aliases
      : [];

    aliases.forEach(alias => {
      alias = String(alias || "").trim();

      if (
        alias &&
        norm(alias) !== norm(entry.k) &&
        !entry.aliases.some(x => norm(x) === norm(alias))
      ) {
        entry.aliases.push(alias);
      }
    });

    save();

    return "Danke! Das habe ich gelernt.\n\n" +
      "Frage: " + question +
      "\nAntwort: " + answer +
      "\n\nIch habe jetzt " + data.qa.length +
      " Frage-Antwort-Einträge.";
  }

  function addAlias(original, alternative) {
    const index = findQuestion(original);

    if (index < 0) {
      return "Diese ursprüngliche Frage kenne ich noch nicht.";
    }

    const entry = data.qa[index];
    alternative = String(alternative || "").trim();

    if (!alternative) return "Die alternative Frage ist leer.";

    if (questionType(entry.k) !== questionType(alternative)) {
      return "Diese Frage klingt nach einer anderen Frageart. Ich speichere sie lieber nicht als Alternative.";
    }

    if (norm(alternative) === norm(entry.k)) {
      return "Diese Frage ist bereits die Hauptfrage.";
    }

    entry.aliases = Array.isArray(entry.aliases)
      ? entry.aliases
      : [];

    if (entry.aliases.some(x => norm(x) === norm(alternative))) {
      return "Diese alternative Frage kenne ich bereits.";
    }

    entry.aliases.push(alternative);
    save();

    return "Sehr gut! Alternative Frage gespeichert.\n\n" +
      "Hauptfrage: " + entry.k +
      "\nAlternative: " + alternative +
      "\nAntwort: " + entry.a;
  }

  // --------------------------------------------------
  // 8. OFFENE LERNVORGÄNGE
  // --------------------------------------------------

  function setPending(kind, payload) {
    data.pending = { kind, ...payload };
    save();
  }

  function getPending() {
    if (typeof data.pending === "string") {
      return {
        kind: "answer",
        question: data.pending
      };
    }

    return data.pending && typeof data.pending === "object"
      ? data.pending
      : null;
  }

  function lastUserQuestion() {
    for (let i = data.log.length - 1; i >= 0; i--) {
      if (data.log[i]?.role === "user") {
        return data.log[i].text;
      }
    }

    return null;
  }

  // --------------------------------------------------
  // 9. KATEGORIEN LERNEN
  // --------------------------------------------------

  function classify(text) {
    const groups = {};

    data.classes.forEach(item => {
      (groups[item.c] ??= []).push(item.t);
    });

    const names = Object.keys(groups);

    if (names.length < 2) {
      return "Ich brauche Beispiele aus mindestens zwei Kategorien.";
    }

    const words = toks(text);
    const vocabulary = new Set();

    Object.values(groups).flat().forEach(item => {
      toks(item).forEach(word => vocabulary.add(word));
    });

    const total = data.classes.length;

    const scores = names.map(name => {
      const wordCounts = {};
      let count = 0;

      groups[name].forEach(item => {
        toks(item).forEach(word => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
          count++;
        });
      });

      let score = Math.log(groups[name].length / total);

      words.forEach(word => {
        score += Math.log(
          ((wordCounts[word] || 0) + 0.5) /
          (count + 0.5 * (vocabulary.size + 1))
        );
      });

      return [
        name,
        score / Math.sqrt(Math.max(1, words.length))
      ];
    }).sort((a, b) => b[1] - a[1]);

    const exp = scores.map(item =>
      Math.exp(Math.max(-30, (item[1] - scores[0][1]) * 2.5))
    );

    const totalExp = exp.reduce((a, b) => a + b, 0);
    const confidence = Math.round(exp[0] / totalExp * 100);

    return "Ich tippe auf: " + scores[0][0] +
      " (" + confidence + " %).";
  }

  // --------------------------------------------------
  // 10. GRUNDWISSEN
  // --------------------------------------------------

  function addSeed() {
    const known = new Set(data.qa.map(x => norm(x.k)));
    let added = 0;

    seed.forEach(([question, answer]) => {
      if (!known.has(norm(question))) {
        data.qa.push({
          k: question,
          a: answer,
          aliases: [],
          source: "seed"
        });

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
  // 11. WISSEN ANZEIGEN
  // --------------------------------------------------

  function showKnowledge() {
    const lines = [];

    if (data.facts.length) {
      lines.push("FAKTEN:");

      data.facts.forEach(fact => {
        lines.push(
          "• " + fact.subject +
          " | " + fact.property +
          " | " + fact.value
        );
      });
    }

    if (data.qa.length) {
      lines.push("\nFRAGE-ANTWORT-EINTRÄGE:");

      data.qa.forEach(entry => {
        lines.push(
          "• " + entry.k + " → " + (entry.a || "(nur gemerkt)")
        );

        if (entry.aliases?.length) {
          lines.push(
            "  Alternative Fragen: " + entry.aliases.join("; ")
          );
        }
      });
    }

    return lines.length
      ? lines.join("\n")
      : "Ich habe noch nichts gelernt.";
  }

  // --------------------------------------------------
  // 12. HAUPTLOGIK
  // --------------------------------------------------

  function handle(text, previousQuestion) {
    const low = norm(text);
    let match;

    // Sicherheitsantwort.
    if (/(selbstmord|suizid|umbringen|nicht mehr leben|sterben (will|möchte)|töten will|ritzen|selbstverletz)/i.test(text)) {
      return "Das klingt ernst. Bitte bleib damit nicht allein und sprich mit einer vertrauten Person. Die TelefonSeelsorge erreichst du kostenlos unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr ruf 112.";
    }

    if (/^(hilfe|help|\?)$/.test(low)) {
      return help;
    }

    if (/^(wer bist du|was kannst du)\??$/i.test(text)) {
      return "Ich bin dein lokaler LernBot. Ich kann Fakten speichern, Fragen beantworten, alternative Fragen lernen und Kategorien erkennen. Ich habe kein eigenes Internet und bin kein vollwertiges Sprachmodell.";
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
      if (!confirm("Wirklich alle Fakten, Frage-Antwort-Einträge und Kategorien löschen? Exportiere dein Wissen vorher, wenn du es behalten möchtest.")) {
        return "Löschen abgebrochen. Dein Wissen bleibt erhalten.";
      }

      data.qa = [];
      data.facts = [];
      data.classes = [];
      data.pending = null;
      save();

      return "Dein gelerntes Wissen und die Kategorien wurden gelöscht.";
    }

    // Eintrag vergessen.
    if (match = text.match(/^vergiss\s*:?\s+(.+)$/i)) {
      const target = cleanSubject(match[1]);
      const oldQA = data.qa.length;
      const oldFacts = data.facts.length;

      data.qa = data.qa.filter(entry =>
        !entryTexts(entry).some(question =>
          norm(question).includes(norm(target))
        )
      );

      data.facts = data.facts.filter(fact =>
        !sameSubject(fact.subject, target)
      );

      const deleted = oldQA - data.qa.length +
        oldFacts - data.facts.length;

      save();

      return deleted
        ? "Ich habe " + deleted + " passende Einträge zu „" + target + "“ vergessen."
        : "Dazu habe ich keinen passenden Eintrag gefunden.";
    }

    // Alternative Fragen.
    if (match = text.match(
      /^(?:alternative frage|gleichbedeutende frage)\s*:\s*(.+?)\s*(?:=|->|bedeutet dasselbe wie|ist dasselbe wie)\s*(.+)$/i
    )) {
      return addAlias(match[1], match[2]);
    }

    if (match = text.match(
      /^(.+?)\s+(?:bedeutet dasselbe wie|ist dasselbe wie|meint dasselbe wie)\s+(.+)[.!?]*$/i
    )) {
      return addAlias(
        match[2].replace(/[.!?]+$/, ""),
        match[1].trim()
      );
    }

    // Kategorie lernen.
    if (match = text.match(
      /^(?:lern|lerne|merk dir|merke dir|speichere)\s*:?\s*kategorie\s+([^:]+?)\s*:\s*(.+)$/i
    )) {
      data.classes.push({
        t: match[2].trim(),
        c: match[1].trim()
      });

      save();

      return "Gespeichert: „" + match[2] +
        "“ gehört zu „" + match[1] + "“.";
    }

    // Explizit etwas beibringen.
    if (match = text.match(
      /^(?:ich bringe dir bei|ich bring dir bei|ich möchte dir beibringen|ich will dir beibringen|pass auf|merk dir bitte|merke dir|lern|lerne)\s*:?\s*(.+)$/i
    )) {
      const fact = learnFact(match[1].trim());

      if (fact) return fact;

      setPending("teach_fact", {
        topic: match[1].trim()
      });

      return "Sehr gerne! Was soll ich über „" +
        match[1].trim() +
        "“ lernen? Erkläre es mir in einem Satz.";
    }

    // Korrekte Antwort ausdrücklich beibringen.
    if (match = text.match(
      /^(?:das bedeutet|das heißt|richtig ist|die richtige antwort ist)\s*:?\s*(.+)$/i
    )) {
      const fact = learnFact(match[1].trim());

      if (fact) return fact;

      if (previousQuestion) {
        data.pending = null;
        return learn(previousQuestion, match[1]);
      }

      setPending("teach_fact", {
        topic: match[1].trim()
      });

      return "Zu welchem Begriff oder welcher Frage gehört diese Erklärung?";
    }

    // Direkte Faktenaussagen erkennen.
    const directFact = parseFact(text);

    if (directFact) {
      return learnFact(text);
    }

    // Kategorien abfragen.
    if (match = text.match(
      /^(?:ordne ein|einordnen|kategorie\?)\s*:?\s*(.+)$/i
    )) {
      return classify(match[1]);
    }

    const pending = getPending();

    if (pending) {
      if (/^(abbrechen|egal|stop|lass es)$/i.test(low)) {
        data.pending = null;
        save();
        return "Alles klar. Wir lassen das.";
      }

      if (pending.kind === "answer") {
        data.pending = null;
        save();

        return learn(pending.question, text);
      }

      if (pending.kind === "teach_fact") {
        data.pending = null;
        save();

        return learn(
          "Was ist " + pending.topic + "?",
          text
        );
      }

      if (pending.kind === "correction") {
        data.pending = null;
        save();

        return learn(pending.question, text);
      }
    }

    // Korrektur.
    if (match = text.match(
      /^(?:nein[, ]+)?(?:richtig ist|korrekt ist|stattdessen|die richtige antwort ist)\s*:?\s*(.+)$/i
    )) {
      if (previousQuestion) {
        return learn(previousQuestion, match[1]);
      }

      return "Welche meiner Antworten möchtest du korrigieren?";
    }

    if (/^(nein|falsch|das stimmt nicht|nicht ganz|du liegst falsch|das ist falsch|stimmt nicht)\b/i.test(text)) {
      if (previousQuestion) {
        setPending("correction", {
          question: previousQuestion
        });

        return "Danke für die Korrektur! Was wäre denn richtig?";
      }

      return "Was genau soll ich korrigieren? Erkläre mir bitte die richtige Information.";
    }

    // Zuerst gezielt in der Fakten-Datenbank suchen.
    const factAnswer = answerFromFacts(text);

    if (factAnswer) {
      return factAnswer;
    }

    // Danach die Frage-Antwort-Datenbank verwenden.
    const result = best(text);

    if (result.i >= 0 && result.s >= 0.50) {
      return data.qa[result.i].a || "Das habe ich gelernt.";
    }

    if (result.i >= 0 && result.s >= 0.38) {
      return "Ich bin mir nicht ganz sicher, aber vielleicht meinst du:\n" +
        data.qa[result.i].a;
    }

    // Unbekannte Frage.
    setPending("answer", {
      question: text
    });

    return "Das weiß ich noch nicht sicher.\n\n" +
      "Du kannst es mir beibringen. Was ist die richtige Antwort?";
  }

  // --------------------------------------------------
  // 13. CHATANZEIGE
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
  }

  function send(text) {
    text = String(text ?? $("input").value).trim();

    if (!text) return;

    $("input").value = "";

    const previousQuestion = lastUserQuestion();

    bubble("user", text);

    const response = handle(text, previousQuestion);

    bubble("bot", response);
  }

  // --------------------------------------------------
  // 14. EINGABEN UND MENÜ
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

        data.theme = document.body.classList.contains("light")
          ? "light"
          : "dark";

        save();
        return;
      }

      if (command === "refresh") {
        $("status").textContent = "Suche nach Updates ...";

        (async () => {
          try {
            const registration =
              await navigator.serviceWorker.getRegistration();

            if (registration) {
              await registration.update();
            }

            $("status").textContent = "App wird aktualisiert ...";

            setTimeout(() => location.reload(), 1200);
          } catch (error) {
            $("status").textContent =
              "Update fehlgeschlagen. Bitte Internet prüfen.";
          }
        })();

        return;
      }

      if (command === "export") {
        const backup = {
          version: 4,
          qa: data.qa,
          facts: data.facts,
          classes: data.classes
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
  // 15. WISSEN IMPORTIEREN
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
          bubble(
            "bot",
            "Import abgebrochen. Dein bisheriges Wissen bleibt erhalten."
          );

          picker.value = "";
          return;
        }

        data.qa = imported.qa.filter(x =>
          x &&
          typeof x === "object" &&
          typeof x.k === "string"
        );

        data.facts = Array.isArray(imported.facts)
          ? imported.facts.filter(x =>
              x &&
              typeof x.subject === "string" &&
              typeof x.property === "string" &&
              typeof x.value === "string"
            )
          : [];

        data.classes = imported.classes.filter(x =>
          x &&
          typeof x === "object" &&
          typeof x.t === "string" &&
          typeof x.c === "string"
        );

        data.pending = null;

        save();

        bubble("bot", "Wissen erfolgreich importiert.");
      } catch (error) {
        bubble("bot", "Die Datei konnte nicht importiert werden.");
      }

      picker.value = "";
    };

    reader.readAsText(file);
  };

  // --------------------------------------------------
  // 16. VORHANDENEN CHAT WIEDERHERSTELLEN
  // --------------------------------------------------

  if (data.theme === "light") {
    document.body.classList.add("light");
  }

  if (data.log.length) {
    data.log.forEach(item => {
      bubble(
        item.role === "user" ? "user" : "bot",
        item.text,
        false
      );
    });
  } else {
    bubble(
      "bot",
      "Hallo! Ich bin dein LernBot. Du kannst mir Fragen stellen oder Wissen beibringen.",
      false
    );
  }

  // --------------------------------------------------
  // 17. SERVICE WORKER
  // --------------------------------------------------

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .catch(() => {});
    });
  }

})();
