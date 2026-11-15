
/* =====================================================
   MEIN LERNBOT 6.0
   PAKET 4.2 – INTELLIGENTES GEDÄCHTNIS

   Faktenanalyse, Erinnerungssuche,
   Ähnlichkeitserkennung und persönliche Übersicht

   Nur lesend. Bestehende Daten bleiben erhalten.
   ===================================================== */

(() => {
  "use strict";

  const VERSION = "4.2";
  const KEY = "meinLernBot.v1";

  const normalize = value =>
    String(value ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  const clean = value =>
    String(value ?? "").trim();

  const stopwords = new Set([
    "ich", "du", "er", "sie", "es", "wir",
    "ihr", "der", "die", "das", "den",
    "dem", "des", "ein", "eine", "einer",
    "einen", "und", "oder", "aber",
    "mit", "von", "fur", "auf", "aus",
    "ist", "sind", "bin", "habe",
    "hat", "im", "in", "am", "an",
    "zu", "als", "auch", "mich",
    "mir", "mein", "meine", "meinen",
    "dass", "was", "wie", "uber"
  ]);

  function words(value) {
    return new Set(
      normalize(value)
        .split(" ")
        .filter(word =>
          word.length > 2 &&
          !stopwords.has(word)
        )
    );
  }

  function similarity(a, b) {
    const x = words(a);
    const y = words(b);

    if (!x.size || !y.size) {
      return normalize(a) === normalize(b) ? 1 : 0;
    }

    const overlap = [...x].filter(
      word => y.has(word)
    ).length;

    return overlap / Math.max(x.size, y.size);
  }

  /* =====================================================
     1. DATEN LESEN
     ===================================================== */

  function readData() {
    const raw = localStorage.getItem(KEY);

    if (raw === null) {
      throw new Error(
        "Kein Hauptspeicher gefunden. " +
        "Es wurden keine Daten verändert."
      );
    }

    const data = JSON.parse(raw);

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      throw new Error(
        "Ungültige Speicherstruktur."
      );
    }

    return data;
  }

  function getMemories() {
    const data = readData();

    if (!Array.isArray(data.memory)) {
      throw new Error(
        "Das Feld memory ist kein Array."
      );
    }

    return data.memory.map((item, index) => {
      const entry =
        item && typeof item === "object"
          ? item
          : { content: item };

      return {
        index,
        id: clean(entry.id),
        type: clean(entry.type || "notiz"),
        content: clean(
          entry.content ??
          entry.text ??
          entry.value ??
          ""
        ),
        created: entry.createdAt ??
          entry.created ??
          entry.timestamp ??
          null
      };
    });
  }

  function getFacts() {
    const api = window.LernBotBridge;

    if (
      !api ||
      typeof api.getFacts !== "function"
    ) {
      throw new Error(
        "LernBotBridge.getFacts fehlt."
      );
    }

    const facts = api.getFacts();

    if (!Array.isArray(facts)) {
      throw new Error(
        "getFacts liefert kein Array."
      );
    }

    return facts.filter(
      fact =>
        fact &&
        typeof fact === "object"
    );
  }

  /* =====================================================
     2. FAKTENANALYSE
     ===================================================== */

  function analyzeFacts(facts) {
    const groups = new Map();

    for (const fact of facts) {
      const key =
        normalize(fact.subject) + "\u0000" +
        normalize(fact.property);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(fact);
    }

    const duplicates = [];
    const similar = [];
    const different = [];

    for (const group of groups.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];

          const detail =
            `${clean(a.subject)} – ${clean(a.property)}\n` +
            `• ${clean(a.value)}\n` +
            `• ${clean(b.value)}`;

          if (
            normalize(a.value) ===
            normalize(b.value)
          ) {
            duplicates.push(detail);
          } else if (
            similarity(a.value, b.value) >= 0.65
          ) {
            similar.push(detail);
          } else {
            different.push(detail);
          }
        }
      }
    }

    return {
      duplicates,
      similar,
      different
    };
  }

  /* =====================================================
     3. ERINNERUNGEN ANALYSIEREN
     ===================================================== */

  function analyzeMemories(memories) {
    const duplicates = [];
    const similar = [];
    const empty = [];
    const types = new Map();

    for (const memory of memories) {
      types.set(
        memory.type,
        (types.get(memory.type) || 0) + 1
      );

      if (!memory.content) {
        empty.push(memory.index + 1);
      }
    }

    for (let i = 0; i < memories.length; i++) {
      const a = memories[i];

      if (!a.content) continue;

      for (let j = i + 1; j < memories.length; j++) {
        const b = memories[j];

        if (!b.content) continue;

        const detail =
          `Eintrag ${a.index + 1} ↔ ${b.index + 1}\n` +
          `• ${a.content.slice(0, 180)}\n` +
          `• ${b.content.slice(0, 180)}`;

        if (
          normalize(a.content) ===
          normalize(b.content)
        ) {
          duplicates.push(detail);
        } else if (
          similarity(a.content, b.content) >= 0.7
        ) {
          similar.push(detail);
        }
      }
    }

    return {
      duplicates,
      similar,
      empty,
      types
    };
  }

  /* =====================================================
     4. RELEVANZ DER ERINNERUNGEN
     ===================================================== */

  function scoreMemory(memory, query) {
    const content = normalize(memory.content);
    const search = normalize(query);

    if (!content || !search) return 0;

    let score = 0;

    if (content === search) {
      score += 100;
    }

    if (content.includes(search)) {
      score += 60;
    }

    const queryWords = words(query);
    const memoryWords = words(memory.content);

    for (const word of queryWords) {
      if (memoryWords.has(word)) {
        score += 12;
      }
    }

    if (
      queryWords.size &&
      [...queryWords].every(
        word => memoryWords.has(word)
      )
    ) {
      score += 25;
    }

    return score;
  }

  function searchMemories(query, memories) {
    const results = memories
      .map(memory => ({
        ...memory,
        score: scoreMemory(memory, query)
      }))
      .filter(memory => memory.score > 0)
      .sort((a, b) =>
        b.score - a.score ||
        a.index - b.index
      );

    const lines = [
      "GEDÄCHTNIS-KI 4.2 – ERINNERUNGSSUCHE",
      "",
      `Suchbegriff: ${query}`,
      `Treffer: ${results.length}`,
      ""
    ];

    if (!results.length) {
      lines.push(
        "Keine passende Erinnerung gefunden.",
        "Das bedeutet nicht, dass die Information falsch ist."
      );
    }

    for (const memory of results.slice(0, 12)) {
      lines.push(
        `• [${memory.type}] ${memory.content}`
      );
    }

    if (results.length > 12) {
      lines.push(
        `… ${results.length - 12} weitere Treffer`
      );
    }

    lines.push(
      "",
      "Die Treffer beruhen auf Textähnlichkeit.",
      "Es wurden keine Daten verändert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     5. PERSÖNLICHE WISSENSÜBERSICHT
     ===================================================== */

  function personalOverview(memories) {
    const entries = memories.filter(
      memory => memory.content
    );

    const lines = [
      "MEIN LERNBOT – WAS WEISS ICH ÜBER DICH?",
      "",
      `Gespeicherte Erinnerungen: ${memories.length}`,
      `Erinnerungen mit Inhalt: ${entries.length}`,
      "",
      "DEINE GESPEICHERTEN INFORMATIONEN"
    ];

    if (!entries.length) {
      lines.push(
        "Noch keine Erinnerungen mit lesbarem Inhalt."
      );
    }

    for (const memory of entries.slice(0, 25)) {
      lines.push(
        `• ${memory.content.slice(0, 350)}`
      );
    }

    if (entries.length > 25) {
      lines.push(
        `… ${entries.length - 25} weitere Erinnerungen`
      );
    }

    lines.push(
      "",
      "HINWEIS",
      "Diese Informationen stammen aus deinem gespeicherten Gedächtnis.",
      "Ihre sachliche Richtigkeit wurde nicht unabhängig geprüft.",
      "Es wurden keine Erinnerungen verändert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     6. VOLLSTÄNDIGE GEDÄCHTNISANALYSE
     ===================================================== */

  function section(title, items) {
    return (
      `${title}: ${items.length}` +
      (
        items.length
          ? "\n" + items.slice(0, 10)
              .map(item => "• " + item)
              .join("\n")
          : ""
      ) +
      (
        items.length > 10
          ? "\n… weitere Einträge vorhanden"
          : ""
      )
    );
  }

  function analyze() {
    const facts = getFacts();
    const memories = getMemories();

    const factAnalysis = analyzeFacts(facts);
    const memoryAnalysis =
      analyzeMemories(memories);

    const lines = [
      `GEDÄCHTNIS-KI ${VERSION} – ANALYSE`,
      "",
      "DATENBESTAND",
      `Gespeicherte Fakten: ${facts.length}`,
      `Gespeicherte Erinnerungen: ${memories.length}`,
      "",
      "ERINNERUNGEN",
      section(
        "Exakte doppelte Erinnerungen",
        memoryAnalysis.duplicates
      ),
      "",
      section(
        "Ähnliche Erinnerungen – prüfen",
        memoryAnalysis.similar
      ),
      "",
      section(
        "Leere Erinnerungen",
        memoryAnalysis.empty
      ),
      "",
      "ERINNERUNGSTYPEN"
    ];

    for (const [type, count] of
      memoryAnalysis.types) {
      lines.push(`• ${type}: ${count}`);
    }

    lines.push(
      "",
      "FAKTEN",
      section(
        "Exakte doppelte Fakten",
        factAnalysis.duplicates
      ),
      "",
      section(
        "Ähnliche Fakten",
        factAnalysis.similar
      ),
      "",
      section(
        "Unterschiedliche Angaben – prüfen",
        factAnalysis.different
      ),
      "",
      "BEWERTUNG"
    );

    if (
      !memoryAnalysis.duplicates.length &&
      !memoryAnalysis.similar.length &&
      !memoryAnalysis.empty.length
    ) {
      lines.push(
        "Keine auffälligen Erinnerungen nach den aktuellen Regeln."
      );
    } else {
      lines.push(
        "Es gibt Erinnerungen, die manuell geprüft werden sollten."
      );
    }

    lines.push(
      "",
      "WICHTIG",
      "Ähnliche Erinnerungen müssen keine Dubletten sein.",
      "Unterschiedliche Aussagen sind nicht automatisch Widersprüche.",
      "Es wurden keine Daten verändert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     7. CHAT-AUSGABE
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

  /* =====================================================
     8. BEFEHLE ERKENNEN
     ===================================================== */

  function commandType(value) {
    const command = normalize(value);

    if (
      command === "gedachtnis analyse" ||
      command === "gedaechtnis analyse"
    ) {
      return {
        type: "analyse"
      };
    }

    if (
      command === "gedachtnis ubersicht" ||
      command === "gedaechtnis uebersicht" ||
      command === "was weisst du uber mich" ||
      command === "was weisst du uber mich?"
    ) {
      return {
        type: "overview"
      };
    }

    const match = clean(value).match(
      /^(?:gedächtnis|gedaechtnis|gedachtnis)\s+suche\s*:?\s*(.+)$/i
    );

    if (match && clean(match[1])) {
      return {
        type: "search",
        query: clean(match[1])
      };
    }

    return null;
  }

  function intercept(event) {
    const input =
      document.getElementById("input");

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
        result = personalOverview(
          getMemories()
        );
      } else {
        result = searchMemories(
          command.query,
          getMemories()
        );
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
    const form =
      document.getElementById("bar");

    const button =
      document.getElementById("send");

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
