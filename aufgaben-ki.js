
/* Mein LernBot 6.0 – Paket 3.3: Automatische Aufgabenverwaltung */
(() => {
  "use strict";

  // Die alte Kennung bleibt, damit Aufgaben aus 3.2 erhalten bleiben.
  const SOURCE = "aufgaben-ki-3.2";

  const norm = value => String(value ?? "")
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  const rules = {
    animal: [
      "definition", "aussehen", "lebensraum",
      "nahrung", "familie"
    ],
    planet: ["definition", "durchmesser"],
    general: ["definition"]
  };

  const animal = new Set([
    "lebensraum", "nahrung", "familie", "fellfarbe"
  ]);

  const planet = new Set([
    "durchmesser", "umlaufzeit", "masse"
  ]);

  const priority = p =>
    p === "definition" ? 90 :
    p === "nahrung" ? 75 :
    p === "lebensraum" ? 70 :
    p === "familie" ? 60 : 50;

  const keyOf = (s, p) =>
    norm(s) + "::" + norm(p);

  let lastSignature = null;
  let busy = false;

  function bridge() {
    const api = window.LernBotBridge;

    if (
      !api ||
      typeof api.getFacts !== "function" ||
      typeof api.getTasks !== "function" ||
      typeof api.saveTasks !== "function"
    ) {
      throw new Error(
        "LernBotBridge ist nicht vollständig eingebunden."
      );
    }

    return api;
  }

  function collect(facts) {
    const topics = new Map();

    for (const fact of facts) {
      const subject = String(
        fact?.subject ?? ""
      ).trim();

      const property = norm(fact?.property);

      if (!subject || !property) continue;

      const subjectKey = norm(subject);

      if (!topics.has(subjectKey)) {
        topics.set(subjectKey, {
          subject,
          properties: new Set()
        });
      }

      topics.get(subjectKey)
        .properties.add(property);
    }

    const missing = [];

    for (const topic of topics.values()) {
      const type =
        [...topic.properties].some(
          p => animal.has(p)
        ) ? "animal" :
        [...topic.properties].some(
          p => planet.has(p)
        ) ? "planet" :
        "general";

      for (const property of rules[type]) {
        if (!topic.properties.has(property)) {
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

  function signature(facts) {
    return JSON.stringify(
      facts.map(f => [
        norm(f?.subject),
        norm(f?.property)
      ]).sort((a, b) =>
        JSON.stringify(a).localeCompare(
          JSON.stringify(b)
        )
      )
    );
  }

  function reconcile() {
    const api = bridge();

    const facts = api.getFacts();
    const existing = api.getTasks();

    if (
      !Array.isArray(facts) ||
      !Array.isArray(existing)
    ) {
      throw new Error(
        "Fakten oder Aufgaben sind ungültig."
      );
    }

    const missing = collect(facts);

    const missingKeys = new Set(
      missing.map(t =>
        keyOf(t.subject, t.property)
      )
    );

    const updated = existing.map(t =>
      t &&
      typeof t === "object" &&
      !Array.isArray(t)
        ? { ...t }
        : t
    );

    const known = new Set();

    const timestamp = Date.now();

    let created = 0;
    let completed = 0;
    let reopened = 0;
    let changed = false;

    for (const task of updated) {
      if (
        !task ||
        task.source !== SOURCE ||
        !task.subject ||
        !task.property
      ) continue;

      const key = keyOf(
        task.subject,
        task.property
      );

      known.add(key);

      if (
        missingKeys.has(key) &&
        task.status === "done"
      ) {
        task.status = "open";
        task.completedAt = null;
        task.updatedAt = timestamp;

        reopened++;
        changed = true;

      } else if (
        !missingKeys.has(key) &&
        task.status !== "done"
      ) {
        task.status = "done";
        task.completedAt = timestamp;
        task.updatedAt = timestamp;

        completed++;
        changed = true;
      }
    }

    for (const item of missing) {
      const key = keyOf(
        item.subject,
        item.property
      );

      if (known.has(key)) continue;

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
          `${item.subject} – ${item.property}`,

        subject: item.subject,
        property: item.property,
        priority: item.priority,

        status: "open",

        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null
      });

      known.add(key);

      created++;
      changed = true;
    }

    if (changed) {
      const result = api.saveTasks(updated);

      if (!result?.ok) {
        throw new Error(
          result?.message ||
          "Speichern fehlgeschlagen."
        );
      }
    }

    const ours = updated.filter(
      t => t && t.source === SOURCE
    );

    const open = ours
      .filter(t => t.status === "open")
      .sort((a, b) =>
        (b.priority || 0) -
        (a.priority || 0) ||
        String(a.title).localeCompare(
          String(b.title), "de"
        )
      );

    const done = ours.filter(
      t => t.status === "done"
    );

    const lines = [
      "AUFGABEN-KI 3.3",
      `Gespeicherte Fakten: ${facts.length}`,
      `Eigene Aufgaben: ${ours.length}`,
      `Offen: ${open.length}`,
      `Erledigt: ${done.length}`,
      `Neu erstellt: ${created}`,
      `Jetzt erledigt: ${completed}`,
      `Wieder geöffnet: ${reopened}`,
      "",
      "OFFENE LERNAUFGABEN"
    ];

    if (!open.length) {
      lines.push(
        "Keine offenen Aufgaben nach den aktuellen Regeln."
      );
    } else {
      open.slice(0, 15).forEach(t =>
        lines.push(
          `• Priorität ${t.priority}: ${t.title}`
        )
      );
    }

    lines.push(
      "",
      "ERLEDIGTE LERNAUFGABEN"
    );

    if (!done.length) {
      lines.push(
        "Noch keine erledigten Aufgaben gespeichert."
      );
    } else {
      done.slice(-10).forEach(t =>
        lines.push(`• ${t.title}`)
      );
    }

    lines.push(
      "",
      changed
        ? "Änderungen gespeichert."
        : "Keine Änderungen notwendig."
    );

    lines.push(
      "Automatische Prüfung aktiv, solange LernBot geöffnet ist."
    );

    lines.push(
      "Hinweis: Nur Aufgaben dieser Aufgaben-KI werden automatisch geändert."
    );

    lastSignature = signature(facts);

    return lines.join("\n");
  }

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

    const content =
      document.createElement("div");

    content.className =
      "lb6-message-content";

    content.style.whiteSpace = "pre-wrap";
    content.textContent = message;

    item.appendChild(content);
    chat.appendChild(item);

    chat.scrollTop = chat.scrollHeight;
  }

  function checkAutomatically() {
    if (
      busy ||
      document.visibilityState === "hidden"
    ) return;

    try {
      const api = bridge();
      const facts = api.getFacts();

      if (!Array.isArray(facts)) return;

      if (
        signature(facts) === lastSignature
      ) return;

      busy = true;
      reconcile();

    } catch (error) {
      console.warn(
        "Aufgaben-KI 3.3:",
        error
      );

    } finally {
      busy = false;
    }
  }

  function intercept(event) {
    const input =
      document.getElementById("input");

    if (
      !input ||
      norm(input.value) !==
        "aufgaben analyse"
    ) return;

    if (
      event.type === "keydown" &&
      (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.isComposing
      )
    ) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const command = input.value.trim();
    input.value = "";

    show(command, "user");

    if (busy) {
      show(
        "Aufgaben-KI: Prüfung läuft bereits.",
        "bot"
      );
      return;
    }

    busy = true;

    try {
      show(reconcile(), "bot");
    } catch (error) {
      show(
        "Aufgaben-KI: " + error.message,
        "bot"
      );
    } finally {
      busy = false;
    }
  }

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

    // Alle 2,5 Sekunden auf neue Fakten prüfen.
    setInterval(
      checkAutomatically,
      2500
    );

    // Auch nach Rückkehr zur App prüfen.
    document.addEventListener(
      "visibilitychange",
      checkAutomatically
    );

    checkAutomatically();
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
