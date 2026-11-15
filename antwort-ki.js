
/* =====================================================
   MEIN LERNBOT 6.0
   ANTWORT-KI 1.0
   Regelbasierte Antwortverarbeitung
   ===================================================== */

(() => {
  "use strict";

  const VERSION = "1.0";

  function normalize(value) {
    return String(value ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/ae/g, "a")
      .replace(/oe/g, "o")
      .replace(/ue/g, "u")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const STOP = new Set(
    "der die das den dem des ein eine einer einem eines " +
    "und oder ist sind war waren hat haben mit von vom " +
    "fur auf in im am an zu zum zur wie was wer wo " +
    "wann warum welcher welche welches welchen " +
    "ich du er sie es wir ihr mir mich bitte".split(" ")
  );

  function tokens(value) {
    return normalize(value)
      .split(" ")
      .filter(word => word.length > 2 && !STOP.has(word));
  }

  function similarity(a, b) {
    const first = new Set(tokens(a));
    const second = new Set(tokens(b));

    if (!first.size || !second.size) return 0;

    let common = 0;

    for (const word of first) {
      if (second.has(word)) common++;
    }

    return common / Math.max(first.size, second.size);
  }

  const PROPERTY_ALIASES = {
    durchmesser: ["durchmesser", "diameter"],
    definition: ["definition", "bedeutung", "beschreibung"],
    lebensraum: ["lebensraum", "wo lebt", "wo wohnt"],
    nahrung: ["nahrung", "was frisst", "was isst"],
    familie: ["familie", "tierfamilie", "gehort zu"],
    aussehen: ["aussehen", "wie sieht", "erscheinungsbild"],
    fellfarbe: ["fellfarbe", "fellfarbung", "fell"],
    gewicht: ["gewicht", "wie viel wiegt"],
    groesse: ["grosse", "wie gross", "hohe"],
    hauptstadt: ["hauptstadt", "regierungssitz"]
  };

  function propertyMatches(question, property) {
    const q = normalize(question);
    const p = normalize(property).replace(/\s+/g, "");

    const aliases = PROPERTY_ALIASES[p] || [p];

    return aliases.some(alias => {
      const normalizedAlias = normalize(alias);

      return (
        q.includes(normalizedAlias) ||
        q.replace(/\s+/g, "").includes(
          normalizedAlias.replace(/\s+/g, "")
        )
      );
    });
  }

  function subjectMatches(question, subject) {
    const q = normalize(question);
    const s = normalize(subject);

    if (!s) return false;

    return (" " + q + " ").includes(" " + s + " ");
  }

  function personalAnswer(memories) {
    const personal = memories.filter(item =>
      item &&
      item.type === "notiz" &&
      typeof item.content === "string"
    );

    if (!personal.length) {
      return "Ich habe noch keine persönlichen Notizen gespeichert.";
    }

    return (
      "DAS WEISS ICH AUS DEINEN NOTIZEN:\n\n" +
      personal
        .map(item => "• " + item.content)
        .join("\n") +
      "\n\nHinweis: Notizen sind nicht automatisch " +
      "überprüfte persönliche Tatsachen."
    );
  }

  function isPersonalQuestion(question) {
    const q = normalize(question);

    return [
      "was weisst du uber mich",
      "was weisst du von mir",
      "was hast du dir uber mich gemerkt",
      "was erinnerst du uber mich"
    ].some(pattern => q.includes(pattern));
  }

  function relevantFacts(question, facts, context) {
    const results = [];

    for (const fact of facts) {
      if (
        !fact ||
        typeof fact.subject !== "string" ||
        typeof fact.property !== "string" ||
        typeof fact.value !== "string"
      ) {
        continue;
      }

      const direct = subjectMatches(
        question,
        fact.subject
      );

      const followUp =
        context.subject &&
        normalize(context.subject) ===
          normalize(fact.subject) &&
        /\b(er|sie|es|davon|dessen|deren|dort)\b/i.test(
          question
        );

      if (!direct && !followUp) continue;

      let score = direct ? 4 : 2;

      if (propertyMatches(question, fact.property)) {
        score += 5;
      }

      if (
        fact.property === "definition" &&
        /^(was|wer)\s+ist\b/i.test(question)
      ) {
        score += 3;
      }

      results.push({ fact, score });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  function formatFact(fact) {
    return (
      fact.subject +
      " – " +
      fact.property +
      ": " +
      fact.value
    );
  }

  function answer(question, database = {}) {
    question = String(question ?? "").trim();

    if (!question) return null;

    const facts = Array.isArray(database.facts)
      ? database.facts
      : [];

    const memories = Array.isArray(database.memories)
      ? database.memories
      : [];

    const context = database.context || {};

    if (isPersonalQuestion(question)) {
      return {
        text: personalAnswer(memories)
      };
    }

    const matches = relevantFacts(
      question,
      facts,
      context
    );

    if (matches.length) {
      const best = matches[0];

      if (best.score >= 7) {
        const fact = best.fact;

        return {
          text: fact.conflict
            ? formatFact(fact) +
              "\n\nAchtung: Dazu existieren " +
              "widersprüchliche Angaben."
            : fact.value,
          subject: fact.subject,
          property: fact.property
        };
      }

      const selected = matches
        .filter(item => item.score === best.score)
        .slice(0, 6);

      return {
        text:
          "DAZU WEISS ICH:\n\n" +
          selected
            .map(item => {
              let line = "• " + formatFact(item.fact);

              if (item.fact.conflict) {
                line += " [Widerspruch vorhanden]";
              }

              return line;
            })
            .join("\n"),
        subject: best.fact.subject
      };
    }

    const ranked = facts
      .map(fact => ({
        fact,
        score: Math.max(
          similarity(question, fact.subject),
          similarity(question, fact.property),
          similarity(question, fact.value)
        )
      }))
      .filter(item => item.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (ranked.length) {
      return {
        text:
          "ICH HABE VERWANDTES WISSEN GEFUNDEN:\n\n" +
          ranked
            .map(item => "• " + formatFact(item.fact))
            .join("\n") +
          "\n\nDiese Informationen beantworten " +
          "deine Frage möglicherweise nicht vollständig."
      };
    }

    return null;
  }

  window.LernBotAntwortKI = Object.freeze({
    version: VERSION,
    answer
  });

  console.log(
    "LernBot Antwort-KI " + VERSION + " geladen"
  );
})();
