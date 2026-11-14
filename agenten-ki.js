
/* Mein LernBot 6.0 – Paket 3.0: Agentensystem */
(() => {
  'use strict';

  const COMMAND = 'agenten analyse';

  const normalize = value => String(value ?? '')
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();

  const expected = [
    'definition', 'aussehen', 'lebensraum',
    'herkunft', 'nahrung', 'familie'
  ];

  function runAgents() {
    const api = window.LernBotBridge;

    if (!api || typeof api.getFacts !== 'function') {
      return 'Agenten-KI: getFacts() fehlt in app.js.';
    }

    const facts = api.getFacts();

    if (!Array.isArray(facts)) {
      return 'Agenten-KI: Ungültige Faktendaten.';
    }

    // Analyse-Agent
    const topics = new Map();

    for (const fact of facts) {
      const subject = String(
        fact?.subject ?? ''
      ).trim();

      const property = normalize(fact?.property);

      if (!subject || !property) continue;

      const key = normalize(subject);

      if (!topics.has(key)) {
        topics.set(key, {
          subject,
          properties: new Set(),
          count: 0
        });
      }

      const entry = topics.get(key);

      entry.properties.add(property);
      entry.count++;
    }

    // Planungs-Agent
    const tasks = [];

    for (const topic of topics.values()) {
      const animalHints = [
        'lebensraum',
        'nahrung',
        'familie',
        'fellfarbe'
      ];

      const isAnimalLike = animalHints.some(
        p => topic.properties.has(p)
      );

      const candidates = isAnimalLike
        ? expected
        : ['definition'];

      for (const property of candidates) {
        if (!topic.properties.has(property)) {
          tasks.push({
            subject: topic.subject,
            property,
            question:
              `Was weißt du über ${topic.subject} – ${property}?`
          });
        }
      }
    }

    // Koordinations-Agent
    const lines = [
      'AGENTEN-ANALYSE 3.0',
      `Fakten: ${facts.length}`,
      `Erkannte Themen: ${topics.size}`,
      `Mögliche Wissenslücken: ${tasks.length}`,
      '',
      'THEMENÜBERSICHT'
    ];

    if (!topics.size) {
      lines.push(
        'Noch keine auswertbaren Fakten vorhanden.'
      );
    } else {
      for (
        const topic of [...topics.values()].slice(0, 15)
      ) {
        lines.push(
          `• ${topic.subject}: ${topic.count} Fakten; ` +
          `Eigenschaften: ${
            [...topic.properties].join(', ')
          }`
        );
      }

      if (topics.size > 15) {
        lines.push('… weitere Themen vorhanden');
      }
    }

    lines.push('', 'LERNVORSCHLÄGE');

    if (!tasks.length) {
      lines.push(
        'Keine Lücken nach den einfachen Regeln gefunden.'
      );
    } else {
      for (const task of tasks.slice(0, 10)) {
        lines.push(`• ${task.question}`);
      }

      if (tasks.length > 10) {
        lines.push('… weitere Vorschläge vorhanden');
      }

      lines.push(
        '',
        `Nächster Schritt: ${tasks[0].question}`
      );
    }

    lines.push(
      '',
      'Hinweis: Die Vorschläge sind regelbasiert, ' +
      'keine geprüften Fakten. ' +
      'Es wurden keine Daten geändert.'
    );

    return lines.join('\n');
  }

  function input() {
    return document.getElementById('input');
  }

  function output(message, role) {
    const chat = document.getElementById('log');

    if (!chat) {
      alert(message);
      return;
    }

    const item = document.createElement('div');

    item.className = role === 'user'
      ? 'msg user'
      : 'msg bot';

    const content = document.createElement('div');

    content.className = 'lb6-message-content';
    content.style.whiteSpace = 'pre-wrap';
    content.textContent = message;

    item.appendChild(content);
    chat.appendChild(item);
    chat.scrollTop = chat.scrollHeight;
  }

  function intercept(event) {
    const el = input();

    if (
      !el ||
      normalize(el.value) !== COMMAND
    ) {
      return;
    }

    if (
      event.type === 'keydown' &&
      (
        event.key !== 'Enter' ||
        event.shiftKey ||
        event.isComposing
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const command = el.value.trim();
    el.value = '';

    output(command, 'user');

    try {
      output(runAgents(), 'assistant');
    } catch (error) {
      output(
        'Agenten-KI: ' + error.message,
        'assistant'
      );
    }
  }

  function init() {
    const form = document.getElementById('bar');

    if (form) {
      form.addEventListener('submit', intercept, true);
    }

    document.addEventListener(
      'keydown',
      event => {
        if (event.target === input()) {
          intercept(event);
        }
      },
      true
    );

    const button = document.getElementById('send');

    if (button) {
      button.addEventListener(
        'click',
        intercept,
        true
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
