
/* =====================================================
   MEIN LERNBOT 6.0
   PAKET 3.9 – WISSENSNETZ-KI

   Beziehungen, Qualitätsprüfung, Wissensvernetzung
   Nur lesend – keine Veränderung bestehender Daten
   ===================================================== */

(() => {
  "use strict";

  const VERSION = "3.9";

  function normalize(value) {
    return String(value ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  /* =====================================================
     1. SEMANTISCHE EIGENSCHAFTSGRUPPEN
     ===================================================== */

  const aliases = {
    aussehen: [
      "aussehen", "fellfarbe", "farbe",
      "farbung", "streifen", "muster",
      "korperbau", "gestalt"
    ],
    lebensraum: [
      "lebensraum", "habitat", "wohngebiet"
    ],
    verbreitung: [
      "verbreitung", "vorkommen", "gebiet"
    ],
    nahrung: [
      "nahrung", "ernahrung", "futter"
    ],
    familie: [
      "familie", "tierfamilie"
    ],
    durchmesser: [
      "durchmesser", "diameter"
    ],
    umlaufzeit: [
      "umlaufzeit", "umlaufdauer",
      "orbitalperiode"
    ],
    definition: [
      "definition", "beschreibung",
      "bedeutung", "erklarung"
    ],
    anwendung: [
      "anwendung", "verwendung", "einsatz"
    ]
  };

  function category(property) {
    const p = normalize(property);

    for (const [name, values] of Object.entries(aliases)) {
      if (values.includes(p)) {
        return name;
      }
    }

    return p;
  }

  /* =====================================================
     2. FAKTEN SICHER EINLESEN
     ===================================================== */

  function getFacts() {
    const bridge = window.LernBotBridge;

    if (
      !bridge ||
      typeof bridge.getFacts !== "function"
    ) {
      throw new Error(
        "LernBotBridge.getFacts ist nicht verfügbar."
      );
    }

    const facts = bridge.getFacts();

    if (!Array.isArray(facts)) {
      throw new Error("Ungültige Faktenliste.");
    }

    return facts
      .filter(f => f && typeof f === "object")
      .map(f => ({
        subject: text(f.subject),
        property: text(f.property),
        value: text(f.value),
        conflict: Boolean(f.conflict)
      }))
      .filter(f => f.subject && f.property);
  }

  /* =====================================================
     3. THEMEN UND WISSENSKNOTEN
     ===================================================== */

  function buildNetwork(facts) {
    const topics = new Map();

    for (const fact of facts) {
      const id = normalize(fact.subject);

      if (!topics.has(id)) {
        topics.set(id, {
          name: fact.subject,
          facts: [],
          categories: new Map()
        });
      }

      const topic = topics.get(id);
      const group = category(fact.property);

      topic.facts.push(fact);

      if (!topic.categories.has(group)) {
        topic.categories.set(group, []);
      }

      topic.categories.get(group).push(fact);
    }

    return topics;
  }

  /* =====================================================
     4. ZUSAMMENHÄNGE ERKENNEN
     ===================================================== */

  function findConnections(topics) {
    const connections = [];
    const list = [...topics.values()];

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];

        const shared = [
          ...a.categories.keys()
        ].filter(c => b.categories.has(c));

        if (shared.length < 2) continue;

        connections.push({
          a: a.name,
          b: b.name,
          shared,
          strength: shared.length
        });
      }
    }

    connections.sort((a, b) =>
      b.strength - a.strength ||
      a.a.localeCompare(b.a, "de")
    );

    return connections;
  }

  /* =====================================================
     5. EIGENSCHAFTEN ZUSAMMENFASSEN
     ===================================================== */

  function findPropertyGroups(topics) {
    const results = [];

    for (const topic of topics.values()) {
      for (
        const [group, facts] of topic.categories
      ) {
        const properties = [
          ...new Set(
            facts.map(f => normalize(f.property))
          )
        ];

        if (properties.length < 2) continue;

        results.push({
          subject: topic.name,
          group,
          properties
        });
      }
    }

    return results;
  }

  /* =====================================================
     6. QUALITÄTSPRÜFUNG
     ===================================================== */

  function checkQuality(facts, topics) {
    const warnings = [];
    const exact = new Set();

    for (const fact of facts) {
      const subject = normalize(fact.subject);
      const property = normalize(fact.property);
      const value = normalize(fact.value);

      if (!value) {
        warnings.push(
          `${fact.subject} – ${fact.property}: leerer Wert`
        );
        continue;
      }

      const id =
        subject + "::" +
        property + "::" +
        value;

      if (exact.has(id)) {
        warnings.push(
          `${fact.subject} – ${fact.property}: mögliche Dublette`
        );
      } else {
        exact.add(id);
      }

      if (fact.conflict) {
        warnings.push(
          `${fact.subject} – ${fact.property}: markierter Konflikt`
        );
      }

      if (value === subject) {
        warnings.push(
          `${fact.subject} – ${fact.property}: Wert entspricht nur dem Thema`
        );
      }

      if (value.length < 3) {
        warnings.push(
          `${fact.subject} – ${fact.property}: sehr kurzer Wert`
        );
      }
    }

    for (const topic of topics.values()) {
      for (
        const [group, entries] of topic.categories
      ) {
        const values = [
          ...new Set(
            entries.map(f => normalize(f.value))
              .filter(Boolean)
          )
        ];

        const properties = new Set(
          entries.map(f => normalize(f.property))
        );

        if (
          values.length > 1 &&
          properties.size === 1
        ) {
          warnings.push(
            `${topic.name} – ${group}: mehrere unterschiedliche Angaben, bitte prüfen`
          );
        }
      }
    }

    return [...new Set(warnings)];
  }

  /* =====================================================
     7. WISSENSVERKNÜPFUNGEN VORSCHLAGEN
     ===================================================== */

  function findOpportunities(topics, connections) {
    const opportunities = [];

    for (const connection of connections) {
      const a = topics.get(normalize(connection.a));
      const b = topics.get(normalize(connection.b));

      if (!a || !b) continue;

      const onlyA = [
        ...a.categories.keys()
      ].filter(c => !b.categories.has(c));

      const onlyB = [
        ...b.categories.keys()
      ].filter(c => !a.categories.has(c));

      for (const property of onlyA.slice(0, 3)) {
        opportunities.push(
          `${b.name}: ${property} prüfen – bei ${a.name} bereits vorhanden`
        );
      }

      for (const property of onlyB.slice(0, 3)) {
        opportunities.push(
          `${a.name}: ${property} prüfen – bei ${b.name} bereits vorhanden`
        );
      }
    }

    return [...new Set(opportunities)];
  }

  /* =====================================================
     8. ANALYSEBERICHT
     ===================================================== */

  function analyze() {
    const facts = getFacts();
    const topics = buildNetwork(facts);

    const connections =
      findConnections(topics);

    const propertyGroups =
      findPropertyGroups(topics);

    const warnings =
      checkQuality(facts, topics);

    const opportunities =
      findOpportunities(topics, connections);

    const lines = [
      `WISSENSNETZ-KI ${VERSION} – ANALYSE`,
      "",
      "WISSENSDATENBANK",
      `Fakten: ${facts.length}`,
      `Themen: ${topics.size}`,
      `Gemeinsame Eigenschaftsmuster: ${connections.length}`,
      `Zusammengefasste Eigenschaftsgruppen: ${propertyGroups.length}`,
      `Prüfhinweise: ${warnings.length}`,
      "",
      "ERKANNTE THEMEN"
    ];

    for (const topic of [...topics.values()]
      .sort((a, b) =>
        b.facts.length - a.facts.length ||
        a.name.localeCompare(b.name, "de")
      )
      .slice(0, 15)) {
      lines.push(
        `• ${topic.name}: ${topic.facts.length} Fakten, ` +
        `${topic.categories.size} Eigenschaftsgruppen`
      );
    }

    lines.push(
      "",
      "GEMEINSAME EIGENSCHAFTSMUSTER"
    );

    if (!connections.length) {
      lines.push(
        "Noch keine ausreichend ähnlichen Themen."
      );
    }

    for (const c of connections.slice(0, 10)) {
      lines.push(
        `• ${c.a} ↔ ${c.b}: ` +
        c.shared.join(", ")
      );
    }

    lines.push(
      "",
      "ZUSAMMENGEHÖRENDE EIGENSCHAFTEN"
    );

    if (!propertyGroups.length) {
      lines.push(
        "Keine zusätzlichen Gruppen erkannt."
      );
    }

    for (const group of propertyGroups.slice(0, 10)) {
      lines.push(
        `• ${group.subject}: ${group.group} ` +
        `(${group.properties.join(", ")})`
      );
    }

    lines.push(
      "",
      "WISSENSQUALITÄT"
    );

    if (!warnings.length) {
      lines.push(
        "Keine Auffälligkeiten nach den aktuellen Regeln."
      );
    }

    for (const warning of warnings.slice(0, 12)) {
      lines.push("• " + warning);
    }

    lines.push(
      "",
      "MÖGLICHE RECHERCHEANSÄTZE"
    );

    if (!opportunities.length) {
      lines.push(
        "Keine zusätzlichen Ansätze aus gemeinsamen Eigenschaftsmustern."
      );
    }

    for (const item of opportunities.slice(0, 10)) {
      lines.push("• " + item);
    }

    lines.push(
      "",
      "SYSTEMSTATUS",
      "Analysemodus: nur lesend",
      "Bestehende Fakten: unverändert",
      "Bestehende Aufgaben: unverändert",
      "Feedback: unverändert",
      "",
      "HINWEIS",
      "Gemeinsame Eigenschaften beweisen keine sachliche Beziehung.",
      "Prüfhinweise beweisen keine Fehler.",
      "Es werden keine neuen Fakten automatisch gespeichert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     9. CHAT-AUSGABE
     ===================================================== */

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
    content.textContent = String(message);

    item.appendChild(content);
    chat.appendChild(item);

    chat.scrollTop = chat.scrollHeight;
  }

  /* =====================================================
     10. BEFEHL
     ===================================================== */

  function intercept(event) {
    const input = document.getElementById("input");

    if (
      !input ||
      normalize(input.value) !== "wissensnetz analyse"
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
        "Wissensnetz-KI: " + error.message,
        "bot"
      );
    }
  }

  /* =====================================================
     11. INITIALISIERUNG
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
