
/* =====================================================
   MEIN LERNBOT 6.0
   PAKET 4.0 – ZENTRALE ANALYSE-KI

   Gemeinsame Systemübersicht
   Fakten, Aufgaben, Feedback, Wissensstruktur

   SICHERHEIT:
   - Nur lesend
   - Keine Änderungen an gespeicherten Daten
   - Keine externen APIs
   ===================================================== */

(() => {
  "use strict";

  const VERSION = "4.0";

  /* =====================================================
     1. HILFSFUNKTIONEN
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

  function safeText(value) {
    return String(value ?? "").trim();
  }

  function unique(values) {
    return [...new Set(values)];
  }

  function sortGerman(a, b) {
    return String(a).localeCompare(
      String(b),
      "de"
    );
  }

  /* =====================================================
     2. DATENQUELLEN
     ===================================================== */

  function getBridge() {
    const bridge = window.LernBotBridge;

    if (!bridge) {
      throw new Error(
        "LernBotBridge ist nicht verfügbar."
      );
    }

    if (typeof bridge.getFacts !== "function") {
      throw new Error(
        "LernBotBridge.getFacts fehlt."
      );
    }

    return bridge;
  }

  function getFacts() {
    const facts = getBridge().getFacts();

    if (!Array.isArray(facts)) {
      throw new Error(
        "Ungültige Faktenliste."
      );
    }

    return facts.filter(
      fact =>
        fact &&
        typeof fact === "object"
    );
  }

  function getTasks() {
    const bridge = getBridge();

    if (typeof bridge.getTasks !== "function") {
      return {
        available: false,
        items: []
      };
    }

    const tasks = bridge.getTasks();

    if (!Array.isArray(tasks)) {
      return {
        available: false,
        items: []
      };
    }

    return {
      available: true,
      items: tasks
    };
  }

  function getFeedback() {
    const api = window.LernBotFeedback;

    if (
      !api ||
      typeof api.getSummary !== "function"
    ) {
      return {
        available: false,
        count: 0,
        positive: 0,
        negative: 0
      };
    }

    try {
      const summary = api.getSummary();

      return {
        available: true,
        count: Number(summary.count) || 0,
        positive: Number(summary.positive) || 0,
        negative: Number(summary.negative) || 0
      };
    } catch (error) {
      return {
        available: false,
        count: 0,
        positive: 0,
        negative: 0
      };
    }
  }

  /* =====================================================
     3. FAKTEN ANALYSIEREN
     ===================================================== */

  function analyzeFacts(facts) {
    const topics = new Map();
    const conflicts = [];
    const incomplete = [];
    const groups = new Map();

    for (const fact of facts) {
      const subject = safeText(fact.subject);
      const property = normalize(fact.property);
      const value = safeText(fact.value);

      if (!subject || !property) {
        incomplete.push(
          "Fakt ohne gültiges Thema oder Eigenschaft"
        );
        continue;
      }

      const topicKey = normalize(subject);

      if (!topics.has(topicKey)) {
        topics.set(topicKey, {
          name: subject,
          count: 0,
          properties: new Set()
        });
      }

      const topic = topics.get(topicKey);

      topic.count++;
      topic.properties.add(property);

      if (fact.conflict) {
        conflicts.push(
          `${subject} – ${property}`
        );
      }

      if (!value) {
        incomplete.push(
          `${subject} – ${property}: leerer Wert`
        );
      }

      const groupKey =
        topicKey + "::" + property;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          subject,
          property,
          values: []
        });
      }

      if (value) {
        groups.get(groupKey).values.push(value);
      }
    }

    const duplicates = [];
    const variations = [];

    for (const group of groups.values()) {
      if (group.values.length < 2) {
        continue;
      }

      const normalizedValues =
        group.values.map(normalize);

      const distinct = unique(normalizedValues);

      if (distinct.length === 1) {
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
      count: facts.length,
      topics,
      conflicts,
      incomplete,
      duplicates,
      variations
    };
  }

  /* =====================================================
     4. WISSENSSTRUKTUR
     ===================================================== */

  function propertyGroup(property) {
    const p = normalize(property);

    const aliases = {
      aussehen: [
        "aussehen",
        "fellfarbe",
        "farbe",
        "farbung",
        "streifen"
      ],
      lebensraum: [
        "lebensraum",
        "habitat"
      ],
      nahrung: [
        "nahrung",
        "ernahrung",
        "futter"
      ],
      durchmesser: [
        "durchmesser",
        "diameter"
      ],
      umlaufzeit: [
        "umlaufzeit",
        "umlaufdauer"
      ],
      definition: [
        "definition",
        "beschreibung",
        "bedeutung"
      ]
    };

    for (
      const [group, values]
      of Object.entries(aliases)
    ) {
      if (values.includes(p)) {
        return group;
      }
    }

    return p;
  }

  function analyzeNetwork(topics) {
    const list = [...topics.values()];

    const connections = [];
    const relatedProperties = [];

    const prepared = list.map(topic => {
      const groups = new Map();

      for (const property of topic.properties) {
        const group = propertyGroup(property);

        if (!groups.has(group)) {
          groups.set(group, []);
        }

        groups.get(group).push(property);
      }

      for (const [group, properties] of groups) {
        if (properties.length > 1) {
          relatedProperties.push({
            subject: topic.name,
            group,
            properties
          });
        }
      }

      return {
        name: topic.name,
        groups: new Set(groups.keys())
      };
    });

    for (let i = 0; i < prepared.length; i++) {
      for (
        let j = i + 1;
        j < prepared.length;
        j++
      ) {
        const a = prepared[i];
        const b = prepared[j];

        const shared = [...a.groups].filter(
          group => b.groups.has(group)
        );

        if (shared.length >= 2) {
          connections.push({
            a: a.name,
            b: b.name,
            shared
          });
        }
      }
    }

    connections.sort((a, b) =>
      b.shared.length - a.shared.length ||
      sortGerman(a.a, b.a) ||
      sortGerman(a.b, b.b)
    );

    return {
      connections,
      relatedProperties
    };
  }

  /* =====================================================
     5. AUFGABEN ANALYSIEREN
     ===================================================== */

  function analyzeTasks(source) {
    if (!source.available) {
      return {
        available: false,
        total: 0,
        open: 0,
        done: 0,
        unknown: 0
      };
    }

    let open = 0;
    let done = 0;
    let unknown = 0;

    for (const task of source.items) {
      const status = normalize(task?.status);

      if (
        task?.done === true ||
        task?.completed === true ||
        [
          "done",
          "completed",
          "erledigt",
          "geschlossen"
        ].includes(status)
      ) {
        done++;
      } else if (
        task?.done === false ||
        task?.completed === false ||
        [
          "open",
          "offen",
          "pending",
          "todo",
          "in progress",
          "aktiv"
        ].includes(status)
      ) {
        open++;
      } else {
        unknown++;
      }
    }

    return {
      available: true,
      total: source.items.length,
      open,
      done,
      unknown
    };
  }

  /* =====================================================
     6. SYSTEMBEWERTUNG
     ===================================================== */

  function evaluate(facts, network, tasks, feedback) {
    const recommendations = [];

    if (facts.conflicts.length) {
      recommendations.push(
        "Markierte Faktenkonflikte überprüfen."
      );
    }

    if (facts.variations.length) {
      recommendations.push(
        "Unterschiedliche Angaben zur gleichen Eigenschaft prüfen."
      );
    }

    if (facts.incomplete.length) {
      recommendations.push(
        "Unvollständige Fakten kontrollieren."
      );
    }

    if (facts.duplicates.length) {
      recommendations.push(
        "Mögliche doppelte Fakten überprüfen."
      );
    }

    if (
      tasks.available &&
      tasks.open > 0
    ) {
      recommendations.push(
        `${tasks.open} offene Lernaufgabe(n) bearbeiten.`
      );
    }

    if (
      tasks.available &&
      tasks.unknown > 0
    ) {
      recommendations.push(
        "Aufgaben mit unbekanntem Status prüfen."
      );
    }

    if (
      feedback.available &&
      feedback.count === 0
    ) {
      recommendations.push(
        "Recherchevorschläge bewerten, damit Prioritäten angepasst werden können."
      );
    }

    if (!network.connections.length) {
      recommendations.push(
        "Weitere vergleichbare Themen erfassen, um Eigenschaftsmuster zu erkennen."
      );
    }

    if (!recommendations.length) {
      recommendations.push(
        "Keine dringenden Auffälligkeiten nach den aktuellen Prüfregeln."
      );
    }

    return recommendations;
  }

  /* =====================================================
     7. GESAMTANALYSE
     ===================================================== */

  function analyze() {
    const facts = analyzeFacts(getFacts());
    const network = analyzeNetwork(facts.topics);
    const tasks = analyzeTasks(getTasks());
    const feedback = getFeedback();

    const recommendations = evaluate(
      facts,
      network,
      tasks,
      feedback
    );

    const lines = [
      "ZENTRALE KI 4.0 – SYSTEMANALYSE",
      "",
      "GESAMTÜBERSICHT",
      `Gespeicherte Fakten: ${facts.count}`,
      `Erkannte Themen: ${facts.topics.size}`,
      `Markierte Konflikte: ${facts.conflicts.length}`,
      `Mögliche Dubletten-Gruppen: ${facts.duplicates.length}`,
      `Wertabweichungen: ${facts.variations.length}`,
      `Unvollständige Fakten: ${facts.incomplete.length}`,
      "",
      "WISSENSNETZ",
      `Gemeinsame Eigenschaftsmuster: ${network.connections.length}`,
      `Zusammengehörende Eigenschaftsgruppen: ${network.relatedProperties.length}`,
      "",
      "AUFGABEN-SYSTEM"
    ];

    if (!tasks.available) {
      lines.push(
        "Aufgaben-Schnittstelle nicht verfügbar."
      );
    } else {
      lines.push(
        `Gesamte Aufgaben: ${tasks.total}`,
        `Offen: ${tasks.open}`,
        `Erledigt: ${tasks.done}`,
        `Unbekannter Status: ${tasks.unknown}`
      );
    }

    lines.push(
      "",
      "FEEDBACK-SYSTEM"
    );

    if (!feedback.available) {
      lines.push(
        "Feedback-Schnittstelle nicht verfügbar."
      );
    } else {
      lines.push(
        `Bewertungen: ${feedback.count}`,
        `Sinnvoll: ${feedback.positive}`,
        `Unwichtig: ${feedback.negative}`
      );
    }

    lines.push(
      "",
      "THEMENÜBERSICHT"
    );

    const sortedTopics = [
      ...facts.topics.values()
    ].sort((a, b) =>
      b.count - a.count ||
      sortGerman(a.name, b.name)
    );

    for (const topic of sortedTopics.slice(0, 15)) {
      lines.push(
        `• ${topic.name}: ${topic.count} Fakten, ` +
        `${topic.properties.size} Eigenschaften`
      );
    }

    lines.push(
      "",
      "ERKANNTE WISSENSVERBINDUNGEN"
    );

    if (!network.connections.length) {
      lines.push(
        "Keine ausreichenden gemeinsamen Eigenschaftsmuster."
      );
    }

    for (
      const connection of network.connections.slice(0, 8)
    ) {
      lines.push(
        `• ${connection.a} ↔ ${connection.b}: ` +
        connection.shared.join(", ")
      );
    }

    lines.push(
      "",
      "EMPFOHLENE NÄCHSTE SCHRITTE"
    );

    for (const item of recommendations) {
      lines.push("• " + item);
    }

    lines.push(
      "",
      "SYSTEMSTATUS",
      `Zentrale KI: ${VERSION}`,
      "Fakten-Schnittstelle: aktiv",
      `Aufgaben-Schnittstelle: ${
        tasks.available ? "aktiv" : "nicht verfügbar"
      }`,
      `Feedback-Schnittstelle: ${
        feedback.available ? "aktiv" : "nicht verfügbar"
      }`,
      "Wissensnetz: integrierte Strukturanalyse",
      "",
      "SICHERHEIT",
      "Nur lesender Analysemodus.",
      "Keine Fakten wurden geändert.",
      "Keine Aufgaben wurden geändert.",
      "Keine Bewertungen wurden geändert.",
      "",
      "HINWEIS",
      "Die Zentrale wertet gemeinsame Daten aus.",
      "Sie ruft keine internen Analysefunktionen anderer Module auf.",
      "Ihre Prüfregeln ersetzen keine sachliche Quellenprüfung."
    );

    return lines.join("\n");
  }

  /* =====================================================
     8. CHAT-AUSGABE
     ===================================================== */

  function show(message, role) {
    const chat = document.getElementById("log");

    if (!chat) {
      alert(message);
      return;
    }

    const item = document.createElement("div");

    item.className =
      role === "user"
        ? "msg user"
        : "msg bot";

    const content = document.createElement("div");

    content.className = "lb6-message-content";
    content.style.whiteSpace = "pre-wrap";
    content.textContent = String(message);

    item.appendChild(content);
    chat.appendChild(item);

    chat.scrollTop = chat.scrollHeight;
  }

  /* =====================================================
     9. CHAT-BEFEHL
     ===================================================== */

  function intercept(event) {
    const input = document.getElementById("input");

    if (
      !input ||
      normalize(input.value) !== "zentrale analyse"
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

    const command = input.value.trim();
    input.value = "";

    show(command, "user");

    try {
      show(analyze(), "bot");
    } catch (error) {
      show(
        "Zentrale KI: " + error.message,
        "bot"
      );
    }
  }

  /* =====================================================
     10. INITIALISIERUNG
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
