
/* Mein LernBot 6.0 – Paket 3.4: Wissensanalyse (nur lesend) */
(() => {
  'use strict';

  const normalize = value => String(value ?? '')
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  const templates = {
    durchmesser: ['masse', 'umlaufzeit'],
    lebensraum: ['nahrung', 'verbreitung'],
    nahrung: ['lebensraum'],
    definition: ['beispiel', 'besonderheit']
  };

  function analyze() {
    const api = window.LernBotBridge;

    if (!api || typeof api.getFacts !== 'function') {
      throw new Error('LernBotBridge.getFacts fehlt.');
    }

    const facts = api.getFacts();

    if (!Array.isArray(facts)) {
      throw new Error('Faktenliste ist ungültig.');
    }

    const topics = new Map();

    for (const f of facts) {
      const subject = String(f?.subject ?? '').trim();
      const property = normalize(f?.property);

      if (!subject || !property) continue;

      const key = normalize(subject);

      if (!topics.has(key)) {
        topics.set(key, {
          subject,
          props: new Set(),
          count: 0,
          flagged: 0
        });
      }

      const topic = topics.get(key);
      topic.props.add(property);
      topic.count++;

      if (f.conflict) topic.flagged++;
    }

    const proposals = [];

    for (const topic of topics.values()) {
      const suggested = new Set();

      for (const prop of topic.props) {
        for (const next of templates[prop] || []) {
          if (!topic.props.has(next)) {
            suggested.add(next);
          }
        }
      }

      for (const property of suggested) {
        proposals.push({
          subject: topic.subject,
          property,
          score: topic.count +
            (property === 'masse' ? 2 : 0)
        });
      }
    }

    proposals.sort((a, b) =>
      b.score - a.score ||
      a.subject.localeCompare(b.subject, 'de') ||
      a.property.localeCompare(b.property, 'de')
    );

    const lines = [
      'WISSENS-KI 3.4 – DIAGNOSE',
      `Fakten: ${facts.length}`,
      `Themen: ${topics.size}`,
      `Als Konflikt markierte Fakten: ${
        [...topics.values()].reduce(
          (n, t) => n + t.flagged, 0
        )
      }`,
      '',
      'THEMENÜBERSICHT'
    ];

    for (const topic of [...topics.values()]
      .sort((a, b) =>
        b.count - a.count ||
        a.subject.localeCompare(b.subject, 'de')
      )
      .slice(0, 12)) {

      lines.push(
        `• ${topic.subject}: ${topic.count} Fakt(en), ` +
        `${topic.props.size} Eigenschaft(en)`
      );
    }

    lines.push('', 'MÖGLICHE FOLGEFRAGEN');

    if (!proposals.length) {
      lines.push(
        'Keine weiteren Vorschläge aus den aktuellen Regeln.'
      );
    } else {
      for (const p of proposals.slice(0, 10)) {
        lines.push(
          `• Was weißt du über ${p.subject} – ${p.property}?`
        );
      }
    }

    lines.push(
      '',
      'Vorschläge sind keine gesicherten Wissenslücken. ' +
      'Es wurde nichts gespeichert oder verändert.'
    );

    return lines.join('\n');
  }

  function show(message, role) {
    const chat = document.getElementById('log');

    if (!chat) {
      alert(message);
      return;
    }

    const item = document.createElement('div');

    item.className =
      role === 'user' ? 'msg user' : 'msg bot';

    const content = document.createElement('div');
    content.className = 'lb6-message-content';
    content.style.whiteSpace = 'pre-wrap';
    content.textContent = message;

    item.appendChild(content);
    chat.appendChild(item);

    chat.scrollTop = chat.scrollHeight;
  }

  function intercept(event) {
    const input = document.getElementById('input');

    if (
      !input ||
      normalize(input.value) !== 'wissens analyse'
    ) return;

    if (
      event.type === 'keydown' &&
      (
        event.key !== 'Enter' ||
        event.shiftKey ||
        event.isComposing
      )
    ) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const command = input.value.trim();
    input.value = '';

    show(command, 'user');

    try {
      show(analyze(), 'bot');
    } catch (error) {
      show('Wissens-KI: ' + error.message, 'bot');
    }
  }

  function init() {
    const form = document.getElementById('bar');
    const button = document.getElementById('send');

    if (form) {
      form.addEventListener('submit', intercept, true);
    }

    if (button) {
      button.addEventListener('click', intercept, true);
    }

    document.addEventListener('keydown', event => {
      if (
        event.target ===
        document.getElementById('input')
      ) {
        intercept(event);
      }
    }, true);
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
