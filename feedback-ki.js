
/* =====================================================
   MEIN LERNBOT 6.0
   PAKET 3.7 – LERNENDE FEEDBACK-KI
   Speicher, Bewertung und Prioritätsschnittstelle
   ===================================================== */

(() => {
  "use strict";

  const KEY = "meinLernBot.feedback.v1";
  const VERSION = 1;

  function normalize(value) {
    return String(value ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function identifier(subject, property) {
    return normalize(subject) + "::" + normalize(property);
  }

  function emptyState() {
    return {
      version: VERSION,
      ratings: {}
    };
  }

  function read() {
    const raw = localStorage.getItem(KEY);

    if (!raw) return emptyState();

    const state = JSON.parse(raw);

    if (
      !state ||
      state.version !== VERSION ||
      !state.ratings ||
      typeof state.ratings !== "object" ||
      Array.isArray(state.ratings)
    ) {
      throw new Error(
        "Unbekanntes Feedback-Speicherformat. " +
        "Vorhandene Daten wurden nicht verändert."
      );
    }

    return state;
  }

  function write(state) {
    localStorage.setItem(
      KEY,
      JSON.stringify(state)
    );
  }

  function validRating(r) {
    return (
      r &&
      typeof r === "object" &&
      typeof r.property === "string" &&
      typeof r.subject === "string" &&
      (
        r.rating === "sinnvoll" ||
        r.rating === "unwichtig"
      )
    );
  }

  function ratingsList() {
    return Object.values(read().ratings)
      .filter(validRating);
  }

  /* =====================================================
     1. GELERNTE GEWICHTUNG
     ===================================================== */

  function calculateAdjustment(subject, property) {
    const targetSubject = normalize(subject);
    const targetProperty = normalize(property);

    if (!targetSubject || !targetProperty) {
      return {
        general: 0,
        individual: 0,
        total: 0,
        evaluations: 0
      };
    }

    const relevant = ratingsList().filter(
      r => normalize(r.property) === targetProperty
    );

    let positive = 0;
    let negative = 0;
    let individual = 0;

    for (const r of relevant) {
      if (r.rating === "sinnvoll") {
        positive++;
      } else {
        negative++;
      }

      if (normalize(r.subject) === targetSubject) {
        individual =
          r.rating === "sinnvoll" ? 5 : -5;
      }
    }

    // Die allgemeine Anpassung entspricht dem
    // bisherigen Feedback-KI-3.6-Verhalten.
    const general = Math.max(
      -20,
      Math.min(
        20,
        (positive - negative) * 5
      )
    );

    return {
      general,
      individual,
      total: general + individual,
      evaluations: relevant.length
    };
  }

  function adjustPriority(subject, property, baseScore) {
    const base = Number(baseScore);

    if (!Number.isFinite(base)) {
      throw new Error("Ungültige Grundpriorität.");
    }

    const feedback = calculateAdjustment(
      subject,
      property
    );

    // Ein persönliches Feedback wirkt zusätzlich
    // auf das konkret bewertete Thema.
    const adjusted = Math.max(
      0,
      Math.min(100, base + feedback.total)
    );

    return {
      base,
      adjusted,
      general: feedback.general,
      individual: feedback.individual,
      evaluations: feedback.evaluations
    };
  }

  /* =====================================================
     2. BEWERTUNGEN SPEICHERN
     ===================================================== */

  function saveRating(subject, property, rating) {
    subject = String(subject ?? "").trim();
    property = String(property ?? "").trim();
    rating = normalize(rating);

    if (
      !subject ||
      !property ||
      subject.length > 120 ||
      property.length > 80
    ) {
      throw new Error(
        "Ungültiges Thema oder Eigenschaft."
      );
    }

    if (
      rating !== "sinnvoll" &&
      rating !== "unwichtig"
    ) {
      throw new Error(
        "Erlaubt sind sinnvoll und unwichtig."
      );
    }

    const state = read();
    const id = identifier(subject, property);
    const previous = state.ratings[id];

    if (previous?.rating === rating) {
      return (
        "Diese Bewertung ist bereits gespeichert. " +
        "Keine Änderung."
      );
    }

    state.ratings[id] = {
      subject,
      property,
      rating,
      updatedAt: Date.now()
    };

    write(state);

    const result = calculateAdjustment(
      subject,
      property
    );

    return [
      "BEWERTUNG GESPEICHERT",
      "",
      `Thema: ${subject}`,
      `Eigenschaft: ${property}`,
      `Bewertung: ${rating}`,
      previous
        ? "Vorherige Bewertung ersetzt."
        : "Neue Bewertung angelegt.",
      "",
      `Allgemeine Anpassung: ${result.general >= 0 ? "+" : ""}${result.general}`,
      `Individuelle Anpassung: ${result.individual >= 0 ? "+" : ""}${result.individual}`,
      "",
      "Die Wissens-KI kann diese Werte " +
      "über die Feedback-Schnittstelle abrufen."
    ].join("\n");
  }

  /* =====================================================
     3. FEEDBACK-ANALYSE
     ===================================================== */

  function report() {
    const ratings = ratingsList();

    const positive = ratings.filter(
      r => r.rating === "sinnvoll"
    ).length;

    const negative = ratings.filter(
      r => r.rating === "unwichtig"
    ).length;

    const properties = [
      ...new Set(
        ratings.map(r => normalize(r.property))
      )
    ].sort();

    const lines = [
      "FEEDBACK-KI 3.7 – LERNANALYSE",
      "",
      `Gespeicherte Bewertungen: ${ratings.length}`,
      `Sinnvoll: ${positive}`,
      `Unwichtig: ${negative}`,
      "",
      "GELERNTE EIGENSCHAFTSGEWICHTE"
    ];

    if (!properties.length) {
      lines.push(
        "Noch keine Bewertungen vorhanden."
      );
    }

    for (const property of properties) {
      const matches = ratings.filter(
        r => normalize(r.property) === property
      );

      const plus = matches.filter(
        r => r.rating === "sinnvoll"
      ).length;

      const minus = matches.filter(
        r => r.rating === "unwichtig"
      ).length;

      const adjustment = Math.max(
        -20,
        Math.min(20, (plus - minus) * 5)
      );

      lines.push(
        `• ${property}: ` +
        `${adjustment >= 0 ? "+" : ""}${adjustment} ` +
        `(${plus} sinnvoll, ${minus} unwichtig)`
      );
    }

    lines.push(
      "",
      "INDIVIDUELLE BEWERTUNGEN"
    );

    if (!ratings.length) {
      lines.push("Keine vorhanden.");
    }

    for (const r of ratings.slice(0, 20)) {
      lines.push(
        `• ${r.subject} – ${r.property}: ${r.rating}`
      );
    }

    lines.push(
      "",
      "PRIORITÄTS-SCHNITTSTELLE",
      "Bereit: LernBotFeedback.adjustPriority",
      "",
      "Hinweis: Die Wissens-KI muss noch " +
      "mit dieser Schnittstelle verbunden werden.",
      "Es wurden keine Fakten oder Aufgaben verändert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     4. SICHERE ÖFFENTLICHE SCHNITTSTELLE
     ===================================================== */

  window.LernBotFeedback = Object.freeze({
    version: "3.7",

    getAdjustment(subject, property) {
      return calculateAdjustment(
        subject,
        property
      );
    },

    adjustPriority(subject, property, baseScore) {
      return adjustPriority(
        subject,
        property,
        baseScore
      );
    },

    getSummary() {
      const ratings = ratingsList();

      return {
        count: ratings.length,
        positive: ratings.filter(
          r => r.rating === "sinnvoll"
        ).length,
        negative: ratings.filter(
          r => r.rating === "unwichtig"
        ).length
      };
    }
  });

  /* =====================================================
     5. CHAT-BEFEHLE
     ===================================================== */

  function parseCommand(input) {
    const text = String(input ?? "").trim();

    if (normalize(text) === "feedback analyse") {
      return { type: "report" };
    }

    const match = text.match(
      /^feedback\s*:\s*(sinnvoll|unwichtig)\s*:\s*(.+?)\s+[-–—]\s+(.+)$/i
    );

    if (!match) return null;

    return {
      type: "rating",
      rating: match[1],
      subject: match[2].trim(),
      property: match[3].trim()
    };
  }

  function show(message, role) {
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
    content.textContent = message;

    item.appendChild(content);
    chat.appendChild(item);

    chat.scrollTop = chat.scrollHeight;
  }

  function intercept(event) {
    const input = document.getElementById("input");

    if (!input) return;

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

    const command = parseCommand(input.value);

    if (!command) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const original = input.value.trim();
    input.value = "";

    show(original, "user");

    try {
      const response =
        command.type === "report"
          ? report()
          : saveRating(
              command.subject,
              command.property,
              command.rating
            );

      show(response, "bot");
    } catch (error) {
      show(
        "Feedback-KI: " + error.message,
        "bot"
      );
    }
  }

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
