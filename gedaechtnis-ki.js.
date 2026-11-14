
/* Mein LernBot 6.0 – Paket 2.3: Gedächtnis-Diagnose */
(() => {
  'use strict';

  const normalize = value => String(value ?? '')
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = value => new Set(
    normalize(value)
      .split(' ')
      .filter(x => x.length > 2)
  );

  function similarity(a, b) {
    const x = words(a);
    const y = words(b);

    if (!x.size && !y.size) return 1;

    const overlap = [...x]
      .filter(w => y.has(w))
      .length;

    return overlap / Math.max(x.size, y.size, 1);
  }

  function analyze() {
    const api = window.LernBotBridge;

    if (!api || typeof api.getFacts !== 'function') {
      return 'Gedächtnis-KI: getFacts() fehlt in app.js.';
    }

    const facts = api.getFacts();
    const groups = new Map();

    for (const f of facts) {
      const key =
        normalize(f.subject) + '\u0000' +
        normalize(f.property);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(f);
    }

    const duplicates = [];
    const conflicts = [];
    const similar = [];

    for (const group of groups.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];

          const label = `${a.subject} – ${a.property}`;

          const detail =
            `${label}\n` +
            `• ${a.value} [${a.id}]\n` +
            `• ${b.value} [${b.id}]`;

          if (normalize(a.value) === normalize(b.value)) {
            duplicates.push(detail);
          } else if (
            similarity(a.value, b.value) >= 0.65
          ) {
            similar.push(detail);
          } else {
            conflicts.push(detail);
          }
        }
      }
    }

    const section = (title, items) =>
      title + ': ' + items.length +
      (
        items.length
          ? '\n\n' +
            items.slice(0, 15).join('\n\n') +
            (
              items.length > 15
                ? '\n\n… weitere Einträge vorhanden'
                : ''
            )
          : ''
      );

    return [
      'GEDÄCHTNIS-ANALYSE 2.3 (nur Diagnose)',
      'Gespeicherte Fakten: ' + facts.length,
      section('Exakte Dubletten', duplicates),
      section(
        'Ähnliche Aussagen – manuell prüfen',
        similar
      ),
      section(
        'Unterschiedliche Aussagen – mögliche Konflikte',
        conflicts
      ),
      'Hinweis: Unterschiedliche Formulierungen ' +
      'sind nicht automatisch Widersprüche. ' +
      'Es wurden keine Daten verändert.'
    ].join('\n\n');
  }

  function isCommand(s) {
    return normalize(s) === 'gedachtnis analyse';
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

    if (!el || !isCommand(el.value)) return;

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

    const value = el.value.trim();
    el.value = '';

    output(value, 'user');

    try {
      output(analyze(), 'assistant');
    } catch (error) {
      output(
        'Gedächtnis-KI: ' + error.message,
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
      button.addEventListener('click', intercept, true);
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
