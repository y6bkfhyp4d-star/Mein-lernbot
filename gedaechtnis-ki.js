
/* =====================================================
   MEIN LERNBOT 6.0
   PAKET 4.3 – INTELLIGENTE GEDÄCHTNISORGANISATION

   - Persönliche Erinnerungen getrennt anzeigen
   - Fachwissen und Dokumente erkennen
   - Ähnliche Erinnerungen vergleichen
   - Unterschiedliche Faktenwerte zur Prüfung melden
   - Erinnerungen gezielt durchsuchen

   SICHERHEIT:
   Nur lesend. Keine Daten werden verändert.
   ===================================================== */

(() => {
  "use strict";

  const VERSION = "4.3";
  const KEY = "meinLernBot.v1";

  function clean(value) {
    return String(value ?? "").trim();
  }

  function normalize(value) {
    return clean(value)
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function readMemory() {
    const raw = localStorage.getItem(KEY);

    if (raw === null) {
      throw new Error("Hauptspeicher nicht gefunden.");
    }

    const data = JSON.parse(raw);

    if (
      !data ||
      typeof data !== "object" ||
      !Array.isArray(data.memory)
    ) {
      throw new Error("Ungültige Gedächtnisstruktur.");
    }

    return data.memory.map((item, index) => {
      const entry =
        item && typeof item === "object"
          ? item
          : { content: item };

      return {
        index: index + 1,
        id: clean(entry.id),
        type: normalize(entry.type || "notiz"),
        content: clean(
          entry.content ??
          entry.text ??
          entry.value ??
          ""
        )
      };
    });
  }

  function readFacts() {
    const bridge = window.LernBotBridge;

    if (
      !bridge ||
      typeof bridge.getFacts !== "function"
    ) {
      throw new Error("LernBotBridge.getFacts fehlt.");
    }

    const facts = bridge.getFacts();

    if (!Array.isArray(facts)) {
      throw new Error("Ungültige Faktenliste.");
    }

    return facts.filter(
      fact => fact && typeof fact === "object"
    );
  }

  /* =====================================================
     1. ERINNERUNGEN EINORDNEN
     ===================================================== */

  function classify(memory) {
    const type = memory.type;
    const content = normalize(memory.content);

    if (
      type === "dokument" ||
      content.startsWith("dokument importiert")
    ) {
      return "dokument";
    }

    if (
      type === "fakt" ||
      type === "lerninhalt" ||
      content.startsWith("lerninhalt gespeichert") ||
      content.startsWith("lerninhalt ")
    ) {
      return "fachwissen";
    }

    if (
      type === "notiz" ||
      type === "personlich" ||
      type === "persoenlich"
    ) {
      return "persoenlich";
    }

    return "sonstige";
  }

  function organize(memories) {
    const groups = {
      persoenlich: [],
      fachwissen: [],
      dokument: [],
      sonstige: []
    };

    for (const memory of memories) {
      groups[classify(memory)].push(memory);
    }

    return groups;
  }

  /* =====================================================
     2. FAKTEN AUS ERINNERUNGEN ERKENNEN
     ===================================================== */

  function parseFact(memory) {
    if (classify(memory) !== "fachwissen") {
      return null;
    }

    let content = memory.content;

    content = content.replace(
      /^lerninhalt gespeichert\s*:\s*/i,
      ""
    );

    content = content.replace(
      /^lerninhalt\s*:\s*/i,
      ""
    );

    const match = content.match(
      /^([^:\n]+)\s*:\s*([^=–—:\n]+?)\s*(?:=|–|—|:)\s*(.+)$/s
    );

    if (!match) return null;

    return {
      subject: clean(match[1]),
      property: normalize(match[2]),
      value: clean(match[3]),
      source: `Erinnerung ${memory.index}`
    };
  }

  function comparableNumber(value) {
    const match = clean(value).match(
      /^\s*(\d[\d.,\s]*)\s*(.*)$/
    );

    if (!match) return null;

    const numberText = match[1]
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");

    const number = Number(numberText);

    if (!Number.isFinite(number)) return null;

    return {
      number,
      unit: normalize(match[2])
    };
  }

  /* =====================================================
     3. WERTABWEICHUNGEN ERKENNEN
     ===================================================== */

  function findValueDifferences(facts) {
    const groups = new Map();

    for (const fact of facts) {
      const subject = clean(fact.subject);
      const property = normalize(fact.property);
      const value = clean(fact.value);

      if (!subject || !property || !value) continue;

      const key =
        normalize(subject) + "\u0000" + property;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push({
        subject,
        property,
        value,
        source: clean(fact.source)
      });
    }

    const differences = [];

    for (const entries of groups.values()) {
      const uniqueValues = new Map();

      for (const entry of entries) {
        const key = normalize(entry.value);

        if (!uniqueValues.has(key)) {
          uniqueValues.set(key, entry);
        }
      }

      const values = [...uniqueValues.values()];

      if (values.length < 2) continue;

      const numeric = values.map(
        item => comparableNumber(item.value)
      );

      let note =
        "Unterschiedliche Angaben – manuell prüfen.";

      if (
        numeric.every(Boolean) &&
        numeric.every(
          item => item.unit === numeric[0].unit
        )
      ) {
        const numbers = numeric.map(
          item => item.number
        );

        const min = Math.min(...numbers);
        const max = Math.max(...numbers);

        const difference = max - min;
        const percent = max
          ? (difference / max) * 100
          : 0;

        note =
          `Numerische Abweichung: ${difference.toLocaleString("de-DE")} ` +
          `(${percent.toFixed(1).replace(".", ",")} %). ` +
          "Rundung und Messdefinition prüfen.";
      }

      differences.push({
        subject: values[0].subject,
        property: values[0].property,
        values,
        note
      });
    }

    return differences;
  }

  /* =====================================================
     4. ÄHNLICHE ERINNERUNGEN
     ===================================================== */

  const stopwords = new Set([
    "ich", "du", "der", "die", "das", "ein",
    "eine", "und", "oder", "ist", "sind",
    "mit", "von", "fur", "den", "dem",
    "im", "in", "am", "auf", "als",
    "gespeichert", "lerninhalt", "dokument",
    "importiert"
  ]);

  function wordSet(value) {
    return new Set(
      normalize(value)
        .split(" ")
        .filter(
          word =>
            word.length > 2 &&
            !stopwords.has(word)
        )
    );
  }

  function similarity(a, b) {
    const x = wordSet(a);
    const y = wordSet(b);

    if (!x.size || !y.size) return 0;

    const overlap = [...x].filter(
      word => y.has(word)
    ).length;

    return overlap /
      Math.max(x.size, y.size);
  }

  function findSimilar(memories) {
    const duplicates = [];
    const similar = [];

    for (let i = 0; i < memories.length; i++) {
      const a = memories[i];

      if (!a.content) continue;

      for (let j = i + 1; j < memories.length; j++) {
        const b = memories[j];

        if (!b.content) continue;

        if (classify(a) !== classify(b)) {
          continue;
        }

        const exact =
          normalize(a.content) ===
          normalize(b.content);

        const parsedA = parseFact(a);
        const parsedB = parseFact(b);

        if (parsedA && parsedB) {
          if (
            normalize(parsedA.subject) !==
              normalize(parsedB.subject) ||
            parsedA.property !== parsedB.property
          ) {
            continue;
          }
        }

        const detail =
          `Eintrag ${a.index} ↔ ${b.index}\n` +
          `• ${a.content.slice(0, 150)}\n` +
          `• ${b.content.slice(0, 150)}`;

        if (exact) {
          duplicates.push(detail);
        } else if (
          similarity(a.content, b.content) >= 0.8
        ) {
          similar.push(detail);
        }
      }
    }

    return { duplicates, similar };
  }

  /* =====================================================
     5. PERSÖNLICHE ÜBERSICHT
     ===================================================== */

  function personalOverview() {
    const memories = readMemory();
    const groups = organize(memories);

    const lines = [
      `GEDÄCHTNIS-KI ${VERSION}`,
      "WAS WEISS ICH ÜBER DICH?",
      "",
      `Persönliche Erinnerungen: ${groups.persoenlich.length}`,
      "",
      "GESPEICHERTE PERSÖNLICHE INFORMATIONEN"
    ];

    if (!groups.persoenlich.length) {
      lines.push(
        "Noch keine persönlichen Erinnerungen erkannt."
      );
    }

    for (const memory of groups.persoenlich) {
      lines.push("• " + memory.content);
    }

    lines.push(
      "",
      "WEITERES GESPEICHERTES WISSEN",
      `Fachwissen: ${groups.fachwissen.length}`,
      `Importierte Dokumente: ${groups.dokument.length}`,
      `Sonstige Erinnerungen: ${groups.sonstige.length}`,
      "",
      "Die Einordnung basiert auf Erinnerungstypen.",
      "Nicht jede Notiz muss eine persönliche Tatsache sein.",
      "Es wurden keine Daten verändert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     6. ERINNERUNGSSUCHE
     ===================================================== */

  function search(query) {
    const memories = readMemory();
    const q = normalize(query);
    const queryWords = wordSet(query);

    const matches = memories
      .map(memory => {
        const content = normalize(memory.content);
        const contentWords = wordSet(memory.content);

        let score = 0;

        if (content === q) score += 100;
        if (q && content.includes(q)) score += 50;

        for (const word of queryWords) {
          if (contentWords.has(word)) {
            score += 10;
          }
        }

        return { memory, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) =>
        b.score - a.score ||
        a.memory.index - b.memory.index
      );

    const lines = [
      `GEDÄCHTNIS-KI ${VERSION} – SUCHE`,
      `Suchbegriff: ${query}`,
      `Treffer: ${matches.length}`,
      ""
    ];

    if (!matches.length) {
      lines.push("Keine passende Erinnerung gefunden.");
    }

    for (const item of matches.slice(0, 15)) {
      lines.push(
        `• [${classify(item.memory)}] ` +
        item.memory.content
      );
    }

    lines.push(
      "",
      "Die Suche verwendet Textübereinstimmungen.",
      "Es wurden keine Daten verändert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     7. GESAMTANALYSE
     ===================================================== */

  function analyze() {
    const memories = readMemory();
    const facts = readFacts();
    const groups = organize(memories);
    const similar = findSimilar(memories);

    const memoryFacts = memories
      .map(parseFact)
      .filter(Boolean);

    const allFacts = [
      ...facts.map(fact => ({
        subject: fact.subject,
        property: fact.property,
        value: fact.value,
        source: "Wissensdatenbank"
      })),
      ...memoryFacts
    ];

    const differences =
      findValueDifferences(allFacts);

    const empty = memories.filter(
      memory => !memory.content
    );

    const lines = [
      `GEDÄCHTNIS-KI ${VERSION} – ANALYSE`,
      "",
      "DATENBESTAND",
      `Fakten: ${facts.length}`,
      `Erinnerungen: ${memories.length}`,
      "",
      "GEDÄCHTNISORGANISATION",
      `Persönlich: ${groups.persoenlich.length}`,
      `Fachwissen: ${groups.fachwissen.length}`,
      `Dokumente: ${groups.dokument.length}`,
      `Sonstige: ${groups.sonstige.length}`,
      "",
      "QUALITÄTSPRÜFUNG",
      `Exakte doppelte Erinnerungen: ${similar.duplicates.length}`,
      `Ähnliche Erinnerungen: ${similar.similar.length}`,
      `Leere Erinnerungen: ${empty.length}`,
      `Unterschiedliche Faktenwerte: ${differences.length}`,
      "",
      "MÖGLICHE DUBLETTEN"
    ];

    if (!similar.duplicates.length) {
      lines.push("Keine exakten Dubletten erkannt.");
    }

    for (const item of similar.duplicates.slice(0, 5)) {
      lines.push("• " + item);
    }

    lines.push(
      "",
      "ÄHNLICHE ERINNERUNGEN"
    );

    if (!similar.similar.length) {
      lines.push("Keine auffälligen Ähnlichkeiten erkannt.");
    }

    for (const item of similar.similar.slice(0, 5)) {
      lines.push("• " + item);
    }

    lines.push(
      "",
      "UNTERSCHIEDLICHE FAKTENWERTE"
    );

    if (!differences.length) {
      lines.push("Keine Wertabweichungen erkannt.");
    }

    for (const item of differences.slice(0, 10)) {
      lines.push(
        `• ${item.subject} – ${item.property}`
      );

      for (const value of item.values.slice(0, 5)) {
        lines.push(
          `  - ${value.value} (${value.source})`
        );
      }

      lines.push("  " + item.note);
    }

    lines.push(
      "",
      "SYSTEMSTATUS",
      "Persönliches Gedächtnis: getrennt",
      "Fachwissen: getrennt",
      "Dokumente: getrennt",
      "Faktenvergleich: aktiv",
      "Automatische Änderungen: deaktiviert",
      "",
      "HINWEIS",
      "Die Trennung erfolgt nur bei der Anzeige.",
      "Unterschiedliche Werte sind nicht zwingend Widersprüche.",
      "Die Diagnose kann Unterschiede übersehen.",
      "Keine Daten wurden verändert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     8. CHAT
     ===================================================== */

  function output(message, role) {
    const chat = document.getElementById("log");

    if (!chat) {
      alert(message);
      return;
    }

    const item = document.createElement("div");
    item.className =
      role === "user" ? "msg user" : "msg bot";

    const content = document.createElement("div");
    content.className = "lb6-message-content";
    content.style.whiteSpace = "pre-wrap";
    content.textContent = String(message);

    item.appendChild(content);
    chat.appendChild(item);
    chat.scrollTop = chat.scrollHeight;
  }

  function commandType(value) {
    const command = normalize(value);

    if (
      command === "gedachtnis analyse" ||
      command === "gedaechtnis analyse"
    ) {
      return { type: "analyse" };
    }

    if (
      command === "gedachtnis ubersicht" ||
      command === "gedaechtnis uebersicht" ||
      command === "was weisst du uber mich" ||
      command === "was weisst du uber mich?"
    ) {
      return { type: "overview" };
    }

    const match = clean(value).match(
      /^(?:gedächtnis|gedaechtnis|gedachtnis)\s+suche\s*:?\s*(.+)$/i
    );

    if (match) {
      return {
        type: "search",
        query: clean(match[1])
      };
    }

    return null;
  }

  function intercept(event) {
    const input = document.getElementById("input");

    if (!input) return;

    const command = commandType(input.value);

    if (!command) return;

    if (
      event.type === "keydown" &&
      (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.isComposing
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const original = input.value.trim();
    input.value = "";

    output(original, "user");

    try {
      let result;

      if (command.type === "analyse") {
        result = analyze();
      } else if (command.type === "overview") {
        result = personalOverview();
      } else {
        result = search(command.query);
      }

      output(result, "bot");
    } catch (error) {
      output(
        "Gedächtnis-KI: " + error.message,
        "bot"
      );
    }
  }

  /* =====================================================
     9. INITIALISIERUNG
     ===================================================== */

  function init() {
    const form = document.getElementById("bar");
    const button = document.getElementById("send");

    if (form) {
      form.addEventListener(
        "submit",
        intercept,
        true
      );
    }

    if (button) {
      button.addEventListener(
        "click",
        intercept,
        true
      );
    }

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.target ===
          document.getElementById("input")
        ) {
          intercept(event);
        }
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
