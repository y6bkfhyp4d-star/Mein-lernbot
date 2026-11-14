
/* =====================================================
   MEIN LERNBOT 6.0
   PAKET 3.8 – LERNENDE WISSENS-KI
   Wissensanalyse + Feedback + Priorisierung

   Bestehende Fakten werden nur gelesen.
   ===================================================== */

(() => {
  "use strict";

  const VERSION = "3.8";

  /* =====================================================
     1. GRUNDFUNKTIONEN
     ===================================================== */

  function normalize(value) {
    return String(value ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function compare(a, b) {
    return String(a).localeCompare(String(b), "de");
  }

  /* =====================================================
     2. WISSENSSCHEMATA
     ===================================================== */

  const schemas = {
    tier: [
      "definition",
      "familie",
      "lebensraum",
      "nahrung",
      "aussehen",
      "verbreitung",
      "gefahrdung"
    ],

    planet: [
      "definition",
      "durchmesser",
      "masse",
      "umlaufzeit",
      "atmosphare",
      "monde"
    ],

    begriff: [
      "definition",
      "anwendung",
      "beispiel"
    ]
  };

  const animalProperties = new Set([
    "familie",
    "lebensraum",
    "nahrung",
    "fellfarbe",
    "aussehen",
    "verbreitung"
  ]);

  const planetProperties = new Set([
    "durchmesser",
    "umlaufzeit",
    "atmosphare",
    "monde",
    "masse"
  ]);

  const planetNames = new Set([
    "merkur",
    "venus",
    "erde",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptun"
  ]);

  const animalNames = new Set([
    "okapi"
  ]);

  const weights = {
    definition: 100,
    nahrung: 85,
    lebensraum: 85,
    durchmesser: 80,
    familie: 75,
    umlaufzeit: 75,
    masse: 70,
    verbreitung: 65,
    atmosphare: 65,
    monde: 55,
    aussehen: 55,
    gefahrdung: 50,
    anwendung: 65,
    beispiel: 45
  };

  /* =====================================================
     3. THEMEN EINORDNEN
     ===================================================== */

  function classify(topic) {
    const name = normalize(topic.name);

    if (planetNames.has(name)) {
      return {
        type: "planet",
        confidence: "hoch",
        reason: "Bekannter Planetenname"
      };
    }

    if (animalNames.has(name)) {
      return {
        type: "tier",
        confidence: "hoch",
        reason: "Bekannter Tiername"
      };
    }

    let animalScore = 0;
    let planetScore = 0;

    for (const property of topic.props) {
      if (animalProperties.has(property)) {
        animalScore++;
      }

      if (planetProperties.has(property)) {
        planetScore++;
      }
    }

    if (
      animalScore >= 2 &&
      animalScore > planetScore
    ) {
      return {
        type: "tier",
        confidence: "mittel",
        reason: "Biologische Merkmale"
      };
    }

    if (
      planetScore >= 2 &&
      planetScore > animalScore
    ) {
      return {
        type: "planet",
        confidence: "mittel",
        reason: "Astronomische Merkmale"
      };
    }

    return {
      type: "begriff",
      confidence: "niedrig",
      reason: "Standardkategorie"
    };
  }

  /* =====================================================
     4. FEEDBACK EINBEZIEHEN
     ===================================================== */

  function getFeedback(subject, property, baseScore) {
    const fallback = {
      base: baseScore,
      adjusted: baseScore,
      general: 0,
      individual: 0,
      evaluations: 0,
      available: false
    };

    const api = window.LernBotFeedback;

    if (
      !api ||
      typeof api.adjustPriority !== "function"
    ) {
      return fallback;
    }

    try {
      const result = api.adjustPriority(
        subject,
        property,
        baseScore
      );

      if (
        !result ||
        !Number.isFinite(result.adjusted)
      ) {
        return fallback;
      }

      return {
        base: baseScore,
        adjusted: clamp(result.adjusted),
        general: Number.isFinite(result.general)
          ? result.general
          : 0,
        individual: Number.isFinite(result.individual)
          ? result.individual
          : 0,
        evaluations: Number.isFinite(result.evaluations)
          ? result.evaluations
          : 0,
        available: true
      };

    } catch (error) {
      console.warn(
        "Wissens-KI: Feedback konnte nicht gelesen werden.",
        error
      );

      return fallback;
    }
  }

  /* =====================================================
     5. FAKTEN EINLESEN
     ===================================================== */

  function collectFacts() {
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
        "Faktenliste ist ungültig."
      );
    }

    const topics = new Map();
    const groups = new Map();
    const flagged = [];

    for (const fact of facts) {
      if (
        !fact ||
        typeof fact !== "object"
      ) {
        continue;
      }

      const subject = String(
        fact.subject ?? ""
      ).trim();

      const property = normalize(
        fact.property
      );

      const value = String(
        fact.value ?? ""
      ).trim();

      if (!subject || !property) {
        continue;
      }

      const subjectKey = normalize(subject);

      if (!topics.has(subjectKey)) {
        topics.set(subjectKey, {
          name: subject,
          props: new Set(),
          count: 0,
          conflicts: 0
        });
      }

      const topic = topics.get(subjectKey);

      topic.count++;
      topic.props.add(property);

      if (fact.conflict) {
        topic.conflicts++;

        flagged.push(
          `${subject} – ${property}`
        );
      }

      if (value) {
        const groupKey =
          subjectKey + "::" + property;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            subject,
            property,
            values: []
          });
        }

        groups.get(groupKey).values.push(
          value
        );
      }
    }

    return {
      facts,
      topics,
      groups,
      flagged
    };
  }

  /* =====================================================
     6. DUBLETTEN UND ABWEICHUNGEN
     ===================================================== */

  function inspectGroups(groups) {
    const duplicates = [];
    const variations = [];

    for (const group of groups.values()) {
      if (group.values.length < 2) {
        continue;
      }

      const unique = new Set(
        group.values.map(normalize)
      );

      if (unique.size === 1) {
        duplicates.push(
          `${group.subject} – ${group.property}`
        );
      } else {
        variations.push(
          `${group.subject} – ${group.property}`
        );
      }
    }

    return {
      duplicates,
      variations
    };
  }

  /* =====================================================
     7. LERNVORSCHLÄGE ERSTELLEN
     ===================================================== */

  function createSuggestions(topics) {
    const suggestions = [];

    for (const topic of topics.values()) {
      const classification = classify(topic);

      topic.category = classification;

      const properties =
        schemas[classification.type] || [];

      for (const property of properties) {
        if (topic.props.has(property)) {
          continue;
        }

        const base = weights[property] ?? 40;

        const baseScore = clamp(
          base + Math.min(
            8,
            topic.count * 2
          )
        );

        const feedback = getFeedback(
          topic.name,
          property,
          baseScore
        );

        suggestions.push({
          name: topic.name,
          property,
          type: classification.type,
          baseScore,
          score: feedback.adjusted,
          feedback
        });
      }
    }

    suggestions.sort((a, b) =>
      b.score - a.score ||
      compare(a.name, b.name) ||
      compare(a.property, b.property)
    );

    return suggestions;
  }

  /* =====================================================
     8. VOLLSTÄNDIGE ANALYSE
     ===================================================== */

  function analyze() {
    const collected = collectFacts();

    const {
      facts,
      topics,
      groups,
      flagged
    } = collected;

    const {
      duplicates,
      variations
    } = inspectGroups(groups);

    const suggestions =
      createSuggestions(topics);

    const feedbackAPI =
      window.LernBotFeedback;

    let feedbackCount = 0;

    if (
      feedbackAPI &&
      typeof feedbackAPI.getSummary === "function"
    ) {
      try {
        const summary =
          feedbackAPI.getSummary();

        feedbackCount =
          Number(summary?.count) || 0;
      } catch (error) {
        console.warn(
          "Feedback-Übersicht nicht verfügbar.",
          error
        );
      }
    }

    const lines = [
      "WISSENS-KI 3.8 – LERNENDE ANALYSE",
      "",
      "WISSENSDATENBANK",
      `Fakten: ${facts.length}`,
      `Themen: ${topics.size}`,
      `Markierte Konflikte: ${flagged.length}`,
      `Mögliche Dubletten-Gruppen: ${duplicates.length}`,
      `Wertabweichungen: ${variations.length}`,
      "",
      "FEEDBACK-SYSTEM",
      `Verbindung: ${
        feedbackAPI &&
        typeof feedbackAPI.adjustPriority === "function"
          ? "Aktiv"
          : "Nicht verfügbar"
      }`,
      `Gespeicherte Bewertungen: ${feedbackCount}`,
      "",
      "THEMENÜBERSICHT"
    ];

    const sortedTopics = [
      ...topics.values()
    ].sort((a, b) =>
      b.count - a.count ||
      compare(a.name, b.name)
    );

    for (
      const topic of sortedTopics.slice(0, 15)
    ) {
      const category =
        topic.category || classify(topic);

      lines.push(
        `• ${topic.name}: ` +
        `${topic.count} Fakten | ` +
        `${category.type} | ` +
        `Sicherheit: ${category.confidence}`
      );
    }

    lines.push(
      "",
      "INTELLIGENT PRIORISIERTE RECHERCHEFRAGEN"
    );

    if (!suggestions.length) {
      lines.push(
        "Keine weiteren Vorschläge nach den aktuellen Regeln."
      );
    }

    for (
      const suggestion of suggestions.slice(0, 12)
    ) {
      const change =
        suggestion.score -
        suggestion.baseScore;

      let feedbackText = "";

      if (change !== 0) {
        feedbackText =
          ` | Feedback: ${
            change > 0 ? "+" : ""
          }${change}`;
      }

      lines.push(
        `• ${suggestion.score}/100: ` +
        `${suggestion.name} – ` +
        `${suggestion.property} ` +
        `(${suggestion.type})` +
        feedbackText
      );
    }

    if (
      flagged.length ||
      duplicates.length ||
      variations.length
    ) {
      lines.push(
        "",
        "MANUELL ZU PRÜFEN"
      );

      for (
        const item of flagged.slice(0, 5)
      ) {
        lines.push(
          `• Markierter Konflikt: ${item}`
        );
      }

      for (
        const item of duplicates.slice(0, 5)
      ) {
        lines.push(
          `• Mögliche Dublette: ${item}`
        );
      }

      for (
        const item of variations.slice(0, 5)
      ) {
        lines.push(
          `• Unterschiedliche Angaben: ${item}`
        );
      }
    }

    lines.push(
      "",
      "SYSTEMSTATUS",
      `Wissens-KI Version: ${VERSION}`,
      "Feedback wird bei jeder Analyse neu berechnet.",
      "Neue Bewertungen können die Reihenfolge verändern.",
      "",
      "HINWEISE",
      "Die Einordnung basiert auf Regeln und bekannten Merkmalen.",
      "Prioritätswerte sind keine Wahrscheinlichkeiten.",
      "Vorschläge sind keine gesicherten Wissenslücken.",
      "Unterschiedliche Angaben sind nicht automatisch Widersprüche.",
      "Es wurden keine Fakten oder Aufgaben verändert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     9. CHAT-AUSGABE
     ===================================================== */

  function show(message, role) {
    const chat =
      document.getElementById("log");

    if (!chat) {
      alert(message);
      return;
    }

    const item =
      document.createElement("div");

    item.className =
      role === "user"
        ? "msg user"
        : "msg bot";

    const content =
      document.createElement("div");

    content.className =
      "lb6-message-content";

    content.style.whiteSpace =
      "pre-wrap";

    content.textContent =
      String(message);

    item.appendChild(content);
    chat.appendChild(item);

    chat.scrollTop =
      chat.scrollHeight;
  }

  /* =====================================================
     10. BEFEHL ERKENNEN
     ===================================================== */

  function intercept(event) {
    const input =
      document.getElementById("input");

    if (!input) {
      return;
    }

    if (
      normalize(input.value) !==
      "wissens analyse"
    ) {
      return;
    }

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

    const command =
      input.value.trim();

    input.value = "";

    show(command, "user");

    try {
      show(analyze(), "bot");
    } catch (error) {
      show(
        "Wissens-KI: " +
        error.message,
        "bot"
      );
    }
  }

  /* =====================================================
     11. EREIGNISSE VERBINDEN
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

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
