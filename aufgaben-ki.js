
/* =====================================================
   MEIN LERNBOT 6.0
   PAKET 3.4 – SICHERE AUFGABENVERWALTUNG

   - Keine automatischen Schreibvorgänge
   - Bestehende Aufgaben bleiben erhalten
   - Einheitliches done-Schema
   - Alte status-Felder bleiben kompatibel
   - Eigenschafts-Aliase
   - Vorschau vor Änderungen
   - Bestätigung erforderlich
   - Prüfung auf zwischenzeitliche Änderungen
   ===================================================== */

(() => {
  "use strict";

  const VERSION = "3.4";
  const SOURCE = "aufgaben-ki-3.2";

  let pending = null;
  let busy = false;

  const norm = value =>
    String(value ?? "")
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  const clone = value =>
    JSON.parse(JSON.stringify(value));

  const rules = {
    animal: [
      "definition",
      "aussehen",
      "lebensraum",
      "nahrung",
      "familie"
    ],
    planet: [
      "definition",
      "durchmesser"
    ],
    general: [
      "definition"
    ]
  };

  const animal = new Set([
    "lebensraum",
    "nahrung",
    "familie",
    "fellfarbe",
    "aussehen"
  ]);

  const planet = new Set([
    "durchmesser",
    "umlaufzeit",
    "masse"
  ]);

  const aliases = {
    aussehen: [
      "aussehen",
      "fellfarbe",
      "erscheinungsbild",
      "optik"
    ],
    lebensraum: [
      "lebensraum",
      "habitat"
    ],
    nahrung: [
      "nahrung",
      "ernaehrung",
      "ernahrung"
    ],
    familie: [
      "familie"
    ],
    definition: [
      "definition",
      "beschreibung"
    ],
    durchmesser: [
      "durchmesser"
    ]
  };

  function canonical(value) {
    const property = norm(value);

    for (const [key, values] of
      Object.entries(aliases)) {
      if (values.some(v => norm(v) === property)) {
        return key;
      }
    }

    return property;
  }

  const keyOf = (subject, property) =>
    norm(subject) + "::" + canonical(property);

  const priority = property =>
    property === "definition" ? 90 :
    property === "nahrung" ? 75 :
    property === "lebensraum" ? 70 :
    property === "familie" ? 60 : 50;

  function bridge() {
    const api = window.LernBotBridge;

    if (
      !api ||
      typeof api.getFacts !== "function" ||
      typeof api.getTasks !== "function" ||
      typeof api.saveTasks !== "function"
    ) {
      throw Error(
        "LernBotBridge ist nicht vollständig."
      );
    }

    return api;
  }

  function read() {
    const api = bridge();

    const facts = api.getFacts();
    const tasks = api.getTasks();

    if (
      !Array.isArray(facts) ||
      !Array.isArray(tasks)
    ) {
      throw Error("Ungültige Datenstruktur.");
    }

    if (tasks.some(t =>
      !t ||
      typeof t !== "object" ||
      Array.isArray(t)
    )) {
      throw Error(
        "Aufgaben enthalten ungültige Einträge."
      );
    }

    return {
      facts: clone(facts),
      tasks: clone(tasks)
    };
  }

  function isDone(task) {
    return task.done === true ||
      task.status === "done";
  }

  /* ==========================================
     1. WISSENSLÜCKEN ERMITTELN
     ========================================== */

  function collect(facts) {
    const topics = new Map();

    for (const fact of facts) {
      const subject =
        String(fact?.subject ?? "").trim();

      const property =
        canonical(fact?.property);

      if (
        !subject ||
        !property ||
        !String(fact?.value ?? "").trim()
      ) {
        continue;
      }

      const key = norm(subject);

      if (!topics.has(key)) {
        topics.set(key, {
          subject,
          properties: new Set()
        });
      }

      topics.get(key).properties.add(property);
    }

    const missing = [];

    for (const topic of topics.values()) {
      const properties = topic.properties;

      const type =
        [...properties].some(p => animal.has(p))
          ? "animal"
          : [...properties].some(p => planet.has(p))
            ? "planet"
            : "general";

      for (const property of rules[type]) {
        if (!properties.has(property)) {
          missing.push({
            subject: topic.subject,
            property,
            priority: priority(property)
          });
        }
      }
    }

    return missing;
  }

  /* ==========================================
     2. ÄNDERUNGEN VORBEREITEN
     ========================================== */

  function prepare(data) {
    const updated = clone(data.tasks);
    const missing = collect(data.facts);

    const missingMap = new Map(
      missing.map(item => [
        keyOf(item.subject, item.property),
        item
      ])
    );

    const known = new Set();

    const stats = {
      created: 0,
      completed: 0,
      reopened: 0,
      normalized: 0
    };

    const timestamp = Date.now();

    for (const task of updated) {
      if (
        task.source !== SOURCE ||
        !task.subject ||
        !task.property
      ) {
        continue;
      }

      const key = keyOf(
        task.subject,
        task.property
      );

      known.add(key);

      const shouldBeDone = !missingMap.has(key);
      const wasDone = isDone(task);

      if (shouldBeDone && !wasDone) {
        stats.completed++;
      }

      if (!shouldBeDone && wasDone) {
        stats.reopened++;
      }

      if (
        task.done !== shouldBeDone ||
        task.status !==
          (shouldBeDone ? "done" : "open")
      ) {
        stats.normalized++;

        task.done = shouldBeDone;
        task.status =
          shouldBeDone ? "done" : "open";

        task.updatedAt = timestamp;

        if (shouldBeDone) {
          task.completedAt =
            task.completedAt || timestamp;
        } else {
          task.completedAt = null;
        }
      }
    }

    for (const item of missing) {
      const key = keyOf(
        item.subject,
        item.property
      );

      if (known.has(key)) {
        continue;
      }

      updated.push({
        id:
          "LB-TASK-" +
          timestamp.toString(36) +
          "-" +
          Math.random()
            .toString(36)
            .slice(2, 10),

        source: SOURCE,

        title:
          item.subject + " – " + item.property,

        subject: item.subject,
        property: item.property,
        priority: item.priority,

        done: false,
        status: "open",

        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null
      });

      known.add(key);
      stats.created++;
    }

    return {
      updated,
      stats,
      changed:
        JSON.stringify(updated) !==
        JSON.stringify(data.tasks)
    };
  }

  /* ==========================================
     3. BERICHT ERSTELLEN
     ========================================== */

  function report(data, plan) {
    const ours = plan.updated.filter(
      task => task.source === SOURCE
    );

    const open = ours
      .filter(task => !isDone(task))
      .sort((a, b) =>
        (b.priority || 0) -
        (a.priority || 0)
      );

    const done = ours.filter(isDone);

    const lines = [
      "AUFGABEN-KI " + VERSION,
      "",
      "DATENBESTAND",
      "Fakten: " + data.facts.length,
      "Gesamte Aufgaben: " + data.tasks.length,
      "Eigene Aufgaben nach Vorschau: " +
        ours.length,
      "",
      "GEPLANTE ÄNDERUNGEN",
      "Neue Aufgaben: " +
        plan.stats.created,
      "Jetzt erledigt: " +
        plan.stats.completed,
      "Wieder geöffnet: " +
        plan.stats.reopened,
      "Angepasste Aufgaben: " +
        plan.stats.normalized,
      "",
      "OFFENE LERNAUFGABEN"
    ];

    if (!open.length) {
      lines.push("Keine offenen Aufgaben.");
    }

    for (const task of open.slice(0, 15)) {
      lines.push(
        "• Priorität " +
        task.priority +
        ": " +
        task.title
      );
    }

    lines.push(
      "",
      "ERLEDIGTE LERNAUFGABEN"
    );

    if (!done.length) {
      lines.push("Keine erledigten Aufgaben.");
    }

    for (const task of done.slice(-10)) {
      lines.push("• " + task.title);
    }

    lines.push(
      "",
      plan.changed
        ? "Änderungen sind nur vorbereitet."
        : "Keine Änderungen erforderlich.",
      "Es wurde nichts gespeichert."
    );

    return lines.join("\n");
  }

  /* ==========================================
     4. ANALYSE UND VORSCHAU
     ========================================== */

  function analyze() {
    pending = null;

    const data = read();
    const plan = prepare(data);

    if (plan.changed) {
      pending = {
        baseline: JSON.stringify(data),
        updated: plan.updated
      };
    }

    let result = report(data, plan);

    if (pending) {
      result +=
        "\n\nZum Speichern:\n" +
        "Aufgaben Bestätigen\n\n" +
        "Zum Verwerfen:\n" +
        "Aufgaben Abbrechen";
    }

    return result;
  }

  /* ==========================================
     5. BESTÄTIGUNG
     ========================================== */

  function confirm() {
    if (!pending) {
      return "Keine Änderung wartet auf Bestätigung.";
    }

    const current = read();

    if (
      JSON.stringify(current) !==
      pending.baseline
    ) {
      pending = null;

      return (
        "Daten wurden zwischenzeitlich verändert.\n" +
        "Keine Änderung gespeichert.\n" +
        "Bitte Aufgaben Analyse erneut ausführen."
      );
    }

    const api = bridge();

    const result = api.saveTasks(
      clone(pending.updated)
    );

    if (!result?.ok) {
      return (
        "Speichern fehlgeschlagen:\n" +
        (result?.message || "Unbekannter Fehler")
      );
    }

    pending = null;

    return [
      "AUFGABEN ERFOLGREICH AKTUALISIERT",
      "",
      "Änderungen wurden bestätigt.",
      "Gespeicherte Aufgaben: " +
        current.tasks.length +
        " bisher; neuer Bestand wird geprüft.",
      "",
      "Ergebnis: " +
        (result.message || "Speicherung erfolgreich."),
      "",
      "Bitte Aufgaben Analyse erneut ausführen."
    ].join("\n");
  }

  /* ==========================================
     6. CHAT
     ========================================== */

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

  function commandType(value) {
    const command = norm(value);

    if (command === "aufgaben analyse") {
      return "analyze";
    }

    if (command === "aufgaben bestatigen") {
      return "confirm";
    }

    if (command === "aufgaben abbrechen") {
      return "cancel";
    }

    return null;
  }

  function intercept(event) {
    const input = document.getElementById("input");

    if (!input) return;

    const type = commandType(input.value);

    if (!type) return;

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

    if (busy) {
      show("Aufgaben-KI ist beschäftigt.", "bot");
      return;
    }

    busy = true;

    try {
      let result;

      if (type === "analyze") {
        result = analyze();
      } else if (type === "confirm") {
        result = confirm();
      } else {
        pending = null;
        result = "Aufgabenänderung abgebrochen.";
      }

      show(result, "bot");

    } catch (error) {
      show(
        "Aufgaben-KI: " + error.message,
        "bot"
      );
    } finally {
      busy = false;
    }
  }

  /* ==========================================
     7. INITIALISIERUNG
     ========================================== */

  function init() {
    if (window.__lernBotTasks34) return;

    window.__lernBotTasks34 = true;

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
