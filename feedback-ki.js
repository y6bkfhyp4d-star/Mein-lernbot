
/* Mein LernBot 6.0 – Feedback-KI 3.6 */
(() => {
  'use strict';

  const KEY = 'meinLernBot.feedback.v1';

  const normalize = value => String(value ?? '')
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  function read() {
    const raw = localStorage.getItem(KEY);

    if (!raw) {
      return { version: 1, ratings: {} };
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      parsed.version !== 1 ||
      !parsed.ratings ||
      typeof parsed.ratings !== 'object' ||
      Array.isArray(parsed.ratings)
    ) {
      throw Error(
        'Feedback-Speicher hat ein unbekanntes Format.'
      );
    }

    return parsed;
  }

  function write(state) {
    localStorage.setItem(
      KEY,
      JSON.stringify(state)
    );
  }

  function parse(input) {
    const text = String(input ?? '').trim();

    if (normalize(text) === 'feedback analyse') {
      return { type: 'report' };
    }

    const match = text.match(
      /^feedback\s*:\s*(sinnvoll|unwichtig)\s*:\s*(.+?)\s*[-–—]\s*(.+)$/i
    );

    if (!match) return null;

    const subject = match[2].trim();
    const property = match[3].trim();

    if (
      !subject ||
      !property ||
      subject.length > 120 ||
      property.length > 80
    ) {
      return { type: 'invalid' };
    }

    return {
      type: 'rate',
      rating: match[1].toLocaleLowerCase('de'),
      subject,
      property
    };
  }

  function score(ratings, property) {
    const relevant = Object.values(ratings)
      .filter(
        r => normalize(r.property) === normalize(property)
      );

    const positive = relevant.filter(
      r => r.rating === 'sinnvoll'
    ).length;

    const negative = relevant.filter(
      r => r.rating === 'unwichtig'
    ).length;

    return {
      positive,
      negative,
      adjustment: Math.max(
        -20,
        Math.min(20, (positive - negative) * 5)
      )
    };
  }

  function report() {
    const state = read();
    const ratings = Object.values(state.ratings);

    const properties = [
      ...new Set(
        ratings.map(r => normalize(r.property))
      )
    ].sort();

    const lines = [
      'FEEDBACK-KI 3.6',
      `Gespeicherte Bewertungen: ${ratings.length}`,
      `Sinnvoll: ${
        ratings.filter(r => r.rating === 'sinnvoll').length
      }`,
      `Unwichtig: ${
        ratings.filter(r => r.rating === 'unwichtig').length
      }`,
      '',
      'GELERNTE PRIORITÄTSANPASSUNGEN'
    ];

    if (!properties.length) {
      lines.push(
        'Noch keine Bewertungen vorhanden.'
      );
    }

    for (const property of properties) {
      const result = score(
        state.ratings,
        property
      );

      lines.push(
        `• ${property}: ${
          result.adjustment >= 0 ? '+' : ''
        }${result.adjustment} Punkte ` +
        `(${result.positive} sinnvoll, ` +
        `${result.negative} unwichtig)`
      );
    }

    lines.push(
      '',
      'Die Bewertungen sind gespeichert. ' +
      'Die Wissens-KI 3.5 verwendet diese ' +
      'Anpassungen noch nicht; die Verbindung ' +
      'folgt im nächsten Schritt.'
    );

    return lines.join('\n');
  }

  function run(command) {
    if (command.type === 'report') {
      return report();
    }

    if (command.type === 'invalid') {
      return 'Feedback-KI: Ungültiger Themenname oder Eigenschaft.';
    }

    const state = read();

    const id =
      normalize(command.subject) +
      '::' +
      normalize(command.property);

    if (!id || id === '::') {
      return 'Feedback-KI: Ungültige Bewertung.';
    }

    const previous = state.ratings[id];

    if (previous?.rating === command.rating) {
      return 'Diese Bewertung ist bereits gespeichert. Keine Änderung.';
    }

    state.ratings[id] = {
      subject: command.subject,
      property: command.property,
      rating: command.rating,
      updatedAt: Date.now()
    };

    write(state);

    return (
      `Bewertung gespeichert: ` +
      `${command.subject} – ${command.property}` +
      ` → ${command.rating}\n` +
      (
        previous
          ? 'Vorherige Bewertung ersetzt.'
          : 'Neue Bewertung angelegt.'
      ) +
      '\nBefehl für Übersicht: Feedback Analyse'
    );
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

    if (!input) return;

    if (
      event.type === 'keydown' &&
      (
        event.key !== 'Enter' ||
        event.shiftKey ||
        event.isComposing
      )
    ) return;

    const command = parse(input.value);

    if (!command) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const original = input.value.trim();
    input.value = '';

    show(original, 'user');

    try {
      show(run(command), 'bot');
    } catch (error) {
      show(
        'Feedback-KI: ' + error.message,
        'bot'
      );
    }
  }

  function init() {
    const form = document.getElementById('bar');
    const button = document.getElementById('send');

    if (form) {
      form.addEventListener(
        'submit', intercept, true
      );
    }

    if (button) {
      button.addEventListener(
        'click', intercept, true
      );
    }

    document.addEventListener(
      'keydown',
      event => {
        if (
          event.target ===
          document.getElementById('input')
        ) {
          intercept(event);
        }
      },
      true
    );
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
