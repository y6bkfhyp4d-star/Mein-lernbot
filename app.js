
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const KEY = "meinLernBot.v1";

  // --------------------------------------------------
  // 1. GRUNDWISSEN
  // --------------------------------------------------

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

  // Fakten werden getrennt von Frage-Antwort-Einträgen gespeichert.
  // Jedes Wissen besteht aus: Gegenstand, Eigenschaft und Wert.

  const seedFacts = [
    ["Okapi", "tierart", "Säugetier"],
    ["Okapi", "lebensraum", "Tropischer Regenwald"],
    ["Okapi", "land", "Demokratische Republik Kongo"],
    ["Okapi", "familie", "Giraffenartige"],
    ["Okapi", "nahrung", "Blätter, Knospen, Früchte und andere Pflanzenteile"],
    ["Erde", "art", "Planet"],
    ["Erde", "sternsystem", "Sonnensystem"],
    ["Erde", "position", "Dritter Planet von der Sonne"],
    ["Sonne", "art", "Stern"],
    ["Sonne", "sternsystem", "Sonnensystem"],
    ["Mond", "art", "Natürlicher Satellit der Erde"],
    ["Mond", "umlaufbahn", "Er umkreist die Erde"],
    ["Deutschland", "hauptstadt", "Berlin"],
    ["Deutschland", "kontinent", "Europa"],
    ["Frankreich", "hauptstadt", "Paris"],
    ["Frankreich", "kontinent", "Europa"],
    ["Italien", "hauptstadt", "Rom"],
    ["Spanien", "hauptstadt", "Madrid"],
    ["Österreich", "hauptstadt", "Wien"],
    ["Schweiz", "hauptstadt", "Bern"],
    ["Japan", "hauptstadt", "Tokio"],
    ["Türkei", "hauptstadt", "Ankara"],
    ["Wasser", "chemische_formel", "H₂O"],
    ["Wasser", "zustände", "Fest, flüssig und gasförmig"],
    ["Mensch", "art", "Säugetier"],
    ["Mensch", "atmung", "Der Mensch atmet Sauerstoff ein und Kohlendioxid aus"],
    ["Biene", "nahrung", "Nektar und Pollen"],
    ["Biene", "aufgabe", "Bestäubung von Pflanzen"],
    ["Pinguin", "art", "Vogel"],
    ["Pinguin", "lebensraum", "Vor allem auf der Südhalbkugel"],
    ["Delfin", "art", "Säugetier"],
    ["Delfin", "lebensraum", "Meer"],
    ["Giraffe", "art", "Säugetier"],
    ["Giraffe", "lebensraum", "Afrika"],
    ["Elefant", "art", "Säugetier"],
    ["Elefant", "lebensraum", "Afrika und Asien"],
    ["Hund", "art", "Säugetier"],
    ["Katze", "art", "Säugetier"],
    ["Fledermaus", "art", "Säugetier"],
    ["Fledermaus", "besonderheit", "Sie kann aktiv fliegen"]
  ];

  const help = `SO KANNST DU MIT MIR ARBEITEN

WISSEN BEIBRINGEN:
„Ein Okapi ist ein Säugetier.“
„Ein Okapi lebt im Regenwald.“
„Ein Okapi frisst Blätter.“
„Die Hauptstadt von Frankreich ist Paris.“

FAKTEN BEIBRINGEN:
„Merke dir: Ein Elefant hat einen Rüssel.“
„Ich bringe dir bei: Bienen bestäuben Pflanzen.“

KORRIGIEREN:
„Nein, das stimmt nicht.“
„Richtig ist: ...“

ALTERNATIVE FRAGEN:
„Alternative Frage: Was ist ein Okapi? = Zu welcher Tierart gehört ein Okapi?“

FRAGEN:
„Was ist ein Okapi?“
„Wo lebt ein Okapi?“
„In welchem Land lebt ein Okapi?“
„Was frisst ein Okapi?“
„Was weißt du über Okapis?“

BEFEHLE:
„Hilfe“
„Was weißt du?“
„Vergiss: Okapi“
„Verlauf löschen“
„Grundwissen laden“

Ich speichere Wissen auf deinem Gerät.
Ich habe kein eigenes Internet und bin kein vollständiges Sprachmodell.`;

  // --------------------------------------------------
  // 2. DATEN LADEN UND SCHÜTZEN
  // --------------------------------------------------

  let data;

  try {
    data = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    data = null;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    data = {
      qa: [],
      facts: [],
      classes: [],
      log: [],
      pending: null,
      theme: "dark"
    };
  }

  data.qa = Array.isArray(data.qa) ? data.qa : [];
  data.facts = Array.isArray(data.facts) ? data.facts : [];
  data.classes = Array.isArray(data.classes) ? data.classes : [];
  data.log = Array.isArray(data.log) ? data.log : [];

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

  function norm(s) {
    return String(s ?? "")
      .toLocaleLowerCase("de")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // --------------------------------------------------
  // 3. SPRACH- UND FRAGEERKENNUNG
  // --------------------------------------------------

  const stop = new Set(
    "der die das den dem des ein eine einen einem einer ist sind war was wer wie wo wann und oder von zu im am an auf für mit ich du es mir dir wir ihr sie bitte mal denn also welcher welche welches gehört frage antwort bedeutet dasselbe gleich einem einer den dem über aus nach bei als hat haben wird werden kann können lebt wohnt frisst isst".split(" ")
  );

  function toks(s) {
    return norm(s)
      .split(" ")
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

  function questionType(q) {
    const s = norm(q);

    if (
      /\b(wo|wohin|woher|in welchem land|in welcher stadt|wo befindet)\b/.test(s)
    ) return "ort";

    if (/\b(wann|welches jahr|wie lange)\b/.test(s)) return "zeit";
    if (/\b(wie viele|wie viel|anzahl)\b/.test(s)) return "menge";
    if (/\b(wie groß|wie schwer|wie alt)\b/.test(s)) return "eigenschaft";

    return "allgemein";
  }

  function requestedProperty(q) {
    const s = norm(q);

    if (/in welchem land|welches land|in welchem staat/.test(s)) return "land";
    if (/wo lebt|wo wohnt|lebensraum|wo befindet|wo kommt/.test(s)) return "lebensraum";
    if (/woher|kommt aus|ursprung|herkunft/.test(s)) return "herkunft";
    if (/was frisst|was isst|ernährt sich|nahrung/.test(s)) return "nahrung";
    if (/welche tierart|zu welcher tierart|was für ein tier|was ist|wer ist/.test(s)) return "tierart";
    if (/hauptstadt|hauptstadt von/.test(s)) return "hauptstadt";
    if (/wie heißt|welcher name|name von/.test(s)) return "name";
    if (/wie groß|größe/.test(s)) return "größe";
    if (/wie schwer|gewicht/.test(s)) return "gewicht";
    if (/wie alt|alter|lebensdauer/.test(s)) return "alter";
    if (/wie viele|wie viel|anzahl/.test(s)) return "menge";
    if (/was hat|welche besonderheit|besonderheit/.test(s)) return "besonderheit";
    if (/was kann|fähigkeit/.test(s)) return "fähigkeit";
    if (/was macht|aufgabe|funktion/.test(s)) return "aufgabe";
    if (/was ist|wer ist/.test(s)) return "art";

    return null;
  }

  function counts(a) {
    const result = {};
    a.forEach(x => result[x] = (result[x] || 0) + 1);
    return result;
  }

  function cosine(a, b) {
    const keys = Object.keys(a);
    const dot = keys.reduce((v, k) => v + a[k] * (b[k] || 0), 0);
    const na = Math.sqrt(keys.reduce((v, k) => v + a[k] ** 2, 0));
    const nb = Math.sqrt(Object.values(b).reduce((v, x) => v + x * x, 0));
    return na && nb ? dot / (na * nb) : 0;
  }

  function grams(s) {
    s = " " + norm(s) + " ";
    const result = [];

    for (let i = 0; i < s.length - 2; i++) {
      result.push(s.slice(i, i + 3));
    }

    return result;
  }

  function sim(a, b) {
    const ta = [...new Set(toks(a))];
    const tb = [...new Set(toks(b))];

    if (!ta.length || !tb.length) return 0;

    const tokenScore = cosine(counts(ta), counts(tb));
    const common = ta.filter(w => tb.includes(w)).length;
    const overlap = common / Math.max(ta.length, tb.length);
    const gramScore = cosine(counts(grams(a)), counts(grams(b)));

    return 0.55 * tokenScore + 0.30 * overlap + 0.15 * gramScore;
  }

  // --------------------------------------------------
  // 4. FAKTENBANK
  // --------------------------------------------------

  function addFact(subject, property, value) {
    subject = String(subject || "").trim();
    property = norm(property);
    value = String(value || "").trim();

    if (!subject || !property || !value) return false;

    const existing = data.facts.find(f =>
      norm(f.subject) === norm(subject) &&
      norm(f.property) === property
    );

    if (existing) {
      existing.value = value;
    } else {
      data.facts.push({
        subject,
        property,
        value,
        source: "user"
      });
    }

    return true;
  }

  function seedKnowledge() {
    let added = 0;

    seed.forEach(([k, a]) => {
      if (!data.qa.some(x => norm(x.k) === norm(k))) {
        data.qa.push({ k, a, aliases: [], source: "seed" });
        added++;
      }
    });

    seedFacts.forEach(([subject, property, value]) => {
      const exists = data.facts.some(f =>
        norm(f.subject) === norm(subject) &&
        norm(f.property) === norm(property)
      );

      if (!exists) {
        data.facts.push({
          subject,
          property,
          value,
          source: "seed"
        });
        added++;
      }
    });

    save();
    return added;
  }

  if (!data.seeded) {
    seedKnowledge();
    data.seeded = true;
    save();
  }

  // Alte Frage-Antwort-Einträge vorsichtig in Fakten übertragen.
  function migrateOldKnowledge() {
    data.qa.forEach(entry => {
      const q = norm(entry.k);
      const a = String(entry.a || "").trim();

      if (!a) return;

      const match = q.match(/^(?:was ist|wer ist|welche tierart ist|zu welcher tierart gehört)\s+(.+)$/);

      if (match && !data.facts.some(f =>
        norm(f.subject) === norm(match[1]) &&
        f.property === "tierart"
      )) {
        addFact(match[1], "tierart", a);
      }

      const place = q.match(/^wo lebt\s+(.+)$/);

      if (place && !data.facts.some(f =>
        norm(f.subject) === norm(place[1]) &&
        f.property === "lebensraum"
      )) {
        addFact(place[1], "lebensraum", a);
      }
    });

    save();
  }

  migrateOldKnowledge();

  // Erkennt das Objekt, über das gefragt wird.
  function findSubject(question) {
    const q = norm(question);

    const subjects = [...new Set(data.facts.map(f => f.subject))]
      .sort((a, b) => norm(b).length - norm(a).length);

    for (const subject of subjects) {
      const name = norm(subject);

      if (name && q.includes(name)) return subject;

      const words = toks(subject);

      if (words.length && words.every(w => toks(q).includes(w))) {
        return subject;
      }
    }

    return null;
  }

  function getFactAnswer(question) {
    const subject = findSubject(question);
    if (!subject) return null;

    const property = requestedProperty(question);
    const facts = data.facts.filter(f =>
      norm(f.subject) === norm(subject)
    );

    if (!facts.length) return null;

    let found = null;

    if (property) {
      found = facts.find(f => f.property === property);

      // Ein Lebensraum kann auch eine Ortsfrage beantworten.
      if (!found && property === "land") {
        found = facts.find(f => f.property === "lebensraum");
      }

      if (!found && property === "tierart") {
        found = facts.find(f =>
          ["art", "tierart", "familie"].includes(f.property)
        );
      }
    }

    if (!found && /was weißt du über|erzähle mir über|was kennst du über/.test(norm(question))) {
      return facts.map(f => f.property + ": " + f.value).join("\n");
    }

    return found ? found.value : null;
  }

  // --------------------------------------------------
  // 5. FAKTEN AUS SÄTZEN LERNEN
  // --------------------------------------------------

  function parseFact(text) {
    const s = String(text || "").trim();
    let m;

    const patterns = [
      {
        regex: /^(.+?)\s+(?:lebt|wohnt)\s+(?:in|im|am|auf|unter|bei|zwischen)\s+(.+?)[.!?]*$/i,
        property: "lebensraum"
      },
      {
        regex: /^(.+?)\s+kommt\s+aus\s+(.+?)[.!?]*$/i,
        property: "herkunft"
      },
      {
        regex: /^(.+?)\s+(?:frisst|isst|ernährt sich von)\s+(.+?)[.!?]*$/i,
        property: "nahrung"
      },
      {
        regex: /^(.+?)\s+hat\s+(.+?)[.!?]*$/i,
        property: "besonderheit"
      },
      {
        regex: /^(.+?)\s+gehört zu\s+(.+?)[.!?]*$/i,
        property: "tierart"
      },
      {
        regex: /^(.+?)\s+(?:ist|sind|war|heißt|bedeutet)\s+(.+?)[.!?]*$/i,
        property: "tierart"
      },
      {
        regex: /^die hauptstadt von\s+(.+?)\s+ist\s+(.+?)[.!?]*$/i,
        property: "hauptstadt",
        reverse: true
      }
    ];

    for (const p of patterns) {
      m = s.match(p.regex);

      if (m) {
        let subject = m[1].trim();
        let value = m[2].trim();

        if (p.reverse) {
          [subject, value] = [m[1].trim(), m[2].trim()];
        }

        subject = subject.replace(/^(der|die|das|ein|eine|einer|eines)\s+/i, "");

        return {
          subject,
          property: p.property,
          value: value.replace(/[.!?]+$/, "")
        };
      }
    }

    return null;
  }

  function learnFact(text, pendingQuestion = null) {
    const fact = parseFact(text);
    if (!fact) return null;

    addFact(fact.subject, fact.property, fact.value);

    // Die ursprüngliche Frage bleibt zusätzlich als Antwort gespeichert.
    if (pendingQuestion) {
      learn(pendingQuestion, fact.value);
    }

    save();

    return "Danke! Ich habe einen neuen Fakt gelernt.\n\n" +
      "Gegenstand: " + fact.subject +
      "\nEigenschaft: " + fact.property +
      "\nWissen: " + fact.value +
      "\n\nIch habe jetzt " + data.facts.length +
      " Fakten und " + data.qa.length + " Frage-Antwort-Einträge.";
  }

  // --------------------------------------------------
  // 6. FRAGE-ANTWORT-WISSEN
  // --------------------------------------------------

  function entryTexts(entry) {
    return [
      entry.k,
      ...(Array.isArray(entry.aliases) ? entry.aliases : [])
    ].filter(x => typeof x === "string" && x.trim());
  }

  function findQuestion(q) {
    const nq = norm(q);

    return data.qa.findIndex(entry =>
      entryTexts(entry).some(k => norm(k) === nq)
    );
  }

  function best(q) {
    let bestIndex = -1;
    let bestScore = 0;
    const requestedType = questionType(q);

    data.qa.forEach((entry, i) => {
      let score = 0;

      entryTexts(entry).forEach(k => {
        if (questionType(k) !== requestedType) return;
        score = Math.max(score, sim(q, k));
      });

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    });

    return { i: bestIndex, s: bestScore };
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

    entry.aliases = Array.isArray(entry.aliases) ? entry.aliases : [];

    aliases.forEach(alias => {
      if (
        alias &&
        norm(alias) !== norm(entry.k) &&
        !entry.aliases.some(x => norm(x) === norm(alias))
      ) {
        entry.aliases.push(alias);
      }
    });

    save();

    return "Danke! Das habe ich gelernt.\n\nFrage: " +
      question +
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

    if (questionType(entry.k) !== questionType(alternative)) {
      return "Das scheint eine andere Frageart zu sein. Ich speichere sie nicht als Alternative.";
    }

    entry.aliases = Array.isArray(entry.aliases) ? entry.aliases : [];

    if (entry.aliases.some(x => norm(x) === norm(alternative))) {
      return "Diese alternative Frage kenne ich bereits.";
    }

    entry.aliases.push(alternative.trim());
    save();

    return "Alternative Frage gespeichert!";
  }

  // --------------------------------------------------
  // 7. KATEGORIEN LERNEN
  // --------------------------------------------------

  function classify(text) {
    const groups = {};

    data.classes.forEach(x => {
      (groups[x.c] ??= []).push(x.t);
    });

    const names = Object.keys(groups);

    if (names.length < 2) {
      return "Ich brauche Beispiele aus mindestens zwei Kategorien.";
    }

    const words = toks(text);
    const vocabulary = new Set();

    Object.values(groups).flat().forEach(x => {
      toks(x).forEach(w => vocabulary.add(w));
    });

    const total = data.classes.length;

    const scores = names.map(name => {
      const wordCounts = {};
      let count = 0;

      groups[name].forEach(x => {
        toks(x).forEach(w => {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
          count++;
        });
      });

      let score = Math.log(groups[name].length / total);

      words.forEach(w => {
        score += Math.log(
          ((wordCounts[w] || 0) + 0.5) /
          (count + 0.5 * (vocabulary.size + 1))
        );
      });

      return [name, score / Math.sqrt(Math.max(1, words.length))];
    }).sort((a, b) => b[1] - a[1]);

    return "Ich tippe auf: " + scores[0][0] + ".";
  }

  // --------------------------------------------------
  // 8. HILFSFUNKTIONEN
  // --------------------------------------------------

  function lastUserQuestion() {
    for (let i = data.log.length - 1; i >= 0; i--) {
      if (data.log[i]?.role === "user") return data.log[i].text;
    }

    return null;
  }

  function setPending(kind, payload) {
    data.pending = { kind, ...payload };
    save();
  }

  function getPending() {
    if (typeof data.pending === "string") {
      return { kind: "answer", question: data.pending };
    }

    return data.pending && typeof data.pending === "object"
      ? data.pending
      : null;
  }

  // --------------------------------------------------
  // 9. DAS GEHIRN
  // --------------------------------------------------

  function handle(text, previousQuestion) {
    const low = text.toLocaleLowerCase("de");
    let match;

    if (/(selbstmord|suizid|umbringen|nicht mehr leben|sterben (will|möchte)|töten will|ritzen|selbstverletz)/i.test(text)) {
      return "Das klingt ernst. Bitte bleib damit nicht allein und sprich mit einer vertrauten Person. Die TelefonSeelsorge erreichst du kostenlos unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr ruf 112.";
    }

    if (/^(hilfe|help|\?)$/.test(low)) return help;

    if (/^(wer bist du|was kannst du)\??$/i.test(text)) {
      return "Ich bin dein LernBot. Ich kann Fakten, Fragen, Antworten und Kategorien speichern. Ich kann verschiedene Frageformulierungen vergleichen. Ich habe aber kein eigenes Internet und bin kein vollständiges Sprachmodell.";
    }

    if (low === "grundwissen laden") {
      const added = seedKnowledge();
      return "Grundwissen ergänzt. Neue Einträge: " + added +
        ". Insgesamt habe ich " + data.facts.length + " Fakten.";
    }

    if (low === "verlauf löschen") {
      data.log = [];
      save();
      return "Chatverlauf gelöscht. Dein gelerntes Wissen bleibt erhalten.";
    }

    if (/^(was weißt du|was hast du gelernt|zeig.*gelernt)/i.test(text)) {
      const facts = data.facts.map(f =>
        "• " + f.subject + " – " + f.property + ": " + f.value
      );

      const qa = data.qa.map(x =>
        "• " + x.k + " → " + (x.a || "(nur gemerkt)")
      );

      return "DAS WEISS ICH:\n\nFAKTEN:\n" +
        (facts.join("\n") || "Noch keine Fakten.") +
        "\n\nFRAGEN UND ANTWORTEN:\n" +
        (qa.join("\n") || "Noch keine Fragen und Antworten.");
    }

    if (/^(was weißt du über|erzähle mir über|was kennst du über)\s+(.+)/i.test(text)) {
      const subject = text.match(/(?:was weißt du über|erzähle mir über|was kennst du über)\s+(.+)/i)[1];
      const facts = data.facts.filter(f =>
        norm(f.subject) === norm(subject.replace(/[?!.]+$/, ""))
      );

      if (facts.length) {
        return facts.map(f => f.property + ": " + f.value).join("\n");
      }
    }

    if (low === "vergiss alles") {
      return "Zum Schutz vor versehentlichem Löschen: Tippe „ALLES LÖSCHEN“ zum Bestätigen.";
    }

    if (low === "alles löschen") {
      if (!confirm("Wirklich alle gelernten Einträge und Kategorien löschen? Exportiere dein Wissen vorher.")) {
        return "Löschen abgebrochen. Dein Wissen bleibt erhalten.";
      }

      data.qa = [];
      data.facts = [];
      data.classes = [];
      data.pending = null;
      save();

      return "Dein Wissen wurde gelöscht.";
    }

    if (match = text.match(/^vergiss\s*:?\s+(.+)$/i)) {
      const term = norm(match[1]);
      const before = data.facts.length + data.qa.length;

      data.facts = data.facts.filter(f =>
        !norm(f.subject).includes(term) &&
        !norm(f.value).includes(term)
      );

      data.qa = data.qa.filter(x =>
        !norm(x.k).includes(term) &&
        !norm(x.a).includes(term)
      );

      save();

      return before === data.facts.length + data.qa.length
        ? "Dazu habe ich keinen passenden Eintrag gefunden."
        : "Die passenden Wissenseinträge wurden entfernt.";
    }

    if (match = text.match(
      /^alternative frage\s*:\s*(.+?)\s*=\s*(.+)$/i
    )) {
      return addAlias(match[1], match[2]);
    }

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

    // Explizite Lehrversuche.
    if (match = text.match(
      /^(?:ich bringe dir bei|ich bring dir bei|ich möchte dir beibringen|ich will dir beibringen|pass auf|merk dir bitte|merke dir|lern|lerne)\s*:?\s*(.+)$/i
    )) {
      const fact = learnFact(match[1].trim());

      if (fact) return fact;

      setPending("teach_fact", {
        topic: match[1].trim()
      });

      return "Sehr gerne! Erkläre mir das bitte in einem vollständigen Satz. Zum Beispiel: „Ein Okapi lebt im Regenwald.“";
    }

    // Fakten zuerst prüfen.
    const directFact = parseFact(text);

    if (directFact) {
      return learnFact(text);
    }

    if (match = text.match(
      /^(?:das bedeutet|das heißt|richtig ist|die richtige antwort ist)\s*:?\s*(.+)$/i
    )) {
      const fact = learnFact(match[1]);

      if (fact) return fact;

      if (previousQuestion) return learn(previousQuestion, match[1]);

      return "Zu welchem Begriff oder welcher Frage gehört diese Erklärung?";
    }

    if (match = text.match(/^(?:ordne ein|einordnen|kategorie\?)\s*:?\s*(.+)$/i)) {
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
        const fact = learnFact(text, pending.question);

        if (fact) {
          data.pending = null;
          save();
          return fact;
        }

        data.pending = null;
        save();
        return learn(pending.question, text);
      }

      if (pending.kind === "teach_fact") {
        const fact = learnFact(text);

        if (fact) {
          data.pending = null;
          save();
          return fact;
        }

        data.pending = null;
        save();

        return learn("Was ist " + pending.topic + "?", text);
      }

      if (pending.kind === "correction") {
        data.pending = null;
        save();
        return learn(pending.question, text);
      }
    }

    if (/^(nein|falsch|das stimmt nicht|nicht ganz|du liegst falsch|das ist falsch|stimmt nicht)\b/i.test(text)) {
      if (previousQuestion) {
        setPending("correction", { question: previousQuestion });
        return "Danke für die Korrektur! Was wäre denn richtig?";
      }

      return "Was genau soll ich korrigieren?";
    }

    // Faktenbank zuerst durchsuchen.
    const factAnswer = getFactAnswer(text);

    if (factAnswer) return factAnswer;

    // Danach normale Frage-Antwort-Einträge durchsuchen.
    const result = best(text);

    if (result.i >= 0 && result.s >= 0.40) {
      const entry = data.qa[result.i];

      if (result.s < 0.52) {
        return "Ich bin mir nicht ganz sicher, aber vielleicht meinst du:\n" + entry.a;
      }

      return entry.a;
    }

    setPending("answer", { question: text });

    return "Das weiß ich noch nicht sicher.\n\nDu kannst es mir beibringen. Was ist die richtige Antwort?";
  }

  // --------------------------------------------------
  // 10. CHAT-OBERFLÄCHE
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
    text = (text ?? $("input").value).trim();
    if (!text) return;

    $("input").value = "";

    const previousQuestion = lastUserQuestion();

    bubble("user", text);

    const response = handle(text, previousQuestion);

    bubble("bot", response);
  }

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
        return;
      }

      if (command === "refresh") {
        $("status").textContent = "Suche nach Updates ...";

        (async () => {
          try {
            const registration =
              await navigator.serviceWorker.getRegistration();

            if (registration) await registration.update();

            $("status").textContent = "App wird aktualisiert ...";

            setTimeout(() => location.reload(), 1500);
          } catch {
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

        data.qa = imported.qa.filter(
          x => x && typeof x === "object" && typeof x.k === "string"
        );

        data.facts = Array.isArray(imported.facts)
          ? imported.facts.filter(f =>
              f &&
              typeof f.subject === "string" &&
              typeof f.property === "string" &&
              typeof f.value === "string"
            )
          : [];

        data.classes = imported.classes;
        data.pending = null;

        save();

        bubble("bot", "Wissen erfolgreich importiert.");
      } catch {
        bubble("bot", "Die Datei konnte nicht importiert werden.");
      }

      picker.value = "";
    };

    reader.readAsText(file);
  };

  // Vorhandenen Chatverlauf wiederherstellen.
  if (data.log.length) {
    data.log.forEach(item => {
      if (item && typeof item.text === "string") {
        bubble(item.role === "user" ? "user" : "bot", item.text, false);
      }
    });
  } else {
    bubble(
      "bot",
      "Hallo! Ich bin dein LernBot. Du kannst mir Fragen stellen oder Wissen beibringen.",
      false
    );
  }

  // Service Worker registrieren.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
