
/* Mein LernBot 6.0 – Paket 3.2: Aufgaben-KI */
(() => {
  "use strict";

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

  const taskKey = (s, p) =>
    norm(s) + "::" + norm(p);

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

    for (const f of facts) {
      const subject = String(f?.subject ?? "").trim();
      const property = norm(f?.property);

      if (!subject || !property) continue;

      const key = norm(subject);

      if (!topics.has(key)) {
        topics.set(key, {
          subject,
          props: new Set()
        });
      }

      topics.get(key).props.add(property);
    }

    const missing = [];

    for (const t of topics.values()) {
      const type = [...t.props].some(p => animal.has(p))
        ? "animal"
        : [...t.props].some(p => planet.has(p))
          ? "planet"
          : "general";

      for (const property of rules[type]) {
        if (!t.props.has(property)) {
          missing.push({
            subject: t.subject,
            property,
            priority: priority(property)
          });
        }
      }
    }

    return missing;
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
      missing.map(t => taskKey(t.subject, t.property))
    );

    const knownKeys = new Set();
    const updated = existing.map(t => ({ ...t }));

    let created = 0;
    let completed = 0;
    let reopened = 0;
    let changed = false;

    const now = Date.now();

    for (const task of updated) {
      if (
        task?.source !== "aufgaben-ki-3.2" ||
        !task.subject ||
        !task.property
      ) continue;

      const key = taskKey(
        task.subject,
        task.property
      );

      knownKeys.add(key);

      const shouldOpen = missingKeys.has(key);

      if (
        shouldOpen &&
        task.status === "done"
      ) {
        task.status = "open";
        task.completedAt = null;
        task.updatedAt = now;
        reopened++;
        changed = true;
      } else if (
        !shouldOpen &&
        task.status !== "done"
      ) {
        task.status = "done";
        task.completedAt = now;
        task.updatedAt = now;
        completed++;
        changed = true;
      }
    }

    for (const m of missing) {
      const key = taskKey(
        m.subject,
        m.property
      );

      if (knownKeys.has(key)) continue;

      const id =
        "LB-TASK-" +
        now.toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10);

      updated.push({
        id,
        source: "aufgaben-ki-3.2",
        title: `${m.subject} – ${m.property}`,
        subject: m.subject,
        property: m.property,
        priority: m.priority,
        status: "open",
        createdAt: now,
        updatedAt: now,
        completedAt: null
      });

      knownKeys.add(key);
      created++;
      changed = true;
    }

    if (changed) {
      const result = api.saveTasks(updated);

      if (!result?.ok) {
        throw new Error(
          result?.message || "Speichern fehlgeschlagen."
        );
      }
    }

    const ours = updated.filter(
      t => t?.source === "aufgaben-ki-3.2"
    );

    const open = ours
      .filter(t => t.status === "open")
      .sort((a, b) =>
        b.priority - a.priority ||
        a.title.localeCompare(b.title, "de")
      );

    const done = ours.filter(
      t => t.status === "done"
    );

    const lines = [
      "AUFGABEN-KI 3.2",
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

    lines.push("", "ERLEDIGTE LERNAUFGABEN");

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
      "Hinweis: Nur Aufgaben dieser Aufgaben-KI " +
      "werden automatisch geändert."
    );

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

    if (
      !input ||
      norm(input.value) !== "aufgaben analyse"
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

    try {
      show(reconcile(), "bot");
    } catch (error) {
      show(
        "Aufgaben-KI: " + error.message,
        "bot"
      );
    }
  }

  function init() {
    const form = document.getElementById("bar");
    const button = document.getElementById("send");

    if (form) {
      form.addEventListener(
        "submit", intercept, true
      );
    }

    if (button) {
      button.addEventListener(
        "click", intercept, true
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
