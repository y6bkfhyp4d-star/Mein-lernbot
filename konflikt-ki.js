
/* Mein LernBot 6.0 – Konflikt-KI 2.2.1 */
(() => {
  'use strict';

  const norm = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de')
    .replace(/ß/g, 'ss')
    .trim();

  let pending = null;

  function bridge() {
    const api = window.LernBotBridge;

    if (
      !api ||
      typeof api.listConflicts !== 'function' ||
      typeof api.getFact !== 'function' ||
      typeof api.resolveConflict !== 'function'
    ) {
      throw new Error(
        'LernBotBridge fehlt. Bitte app.js prüfen.'
      );
    }

    return api;
  }

  function describe(f) {
    const alternatives = Array.isArray(f.alternatives)
      ? f.alternatives
      : [];

    const rows = [
      `${f.subject} – ${f.property}: ${f.value}`,
      `ID: ${f.id}`,
      `Status: ${
        f.conflict
          ? 'offener Konflikt'
          : 'kein offener Konflikt'
      }`
    ];

    if (alternatives.length) {
      rows.push('Gespeicherte Alternativen:');

      for (const a of alternatives) {
        rows.push(
          `• ${String(a?.value ?? '')} ` +
          `(${String(a?.source ?? 'unbekannt')})`
        );
      }
    } else {
      rows.push(
        'Keine Alternativen gespeichert. ' +
        'Der ursprüngliche Widerspruch ' +
        'ist nicht rekonstruierbar.'
      );
    }

    return rows.join('\n');
  }

  function process(value) {
    const s = String(value ?? '').trim();
    const n = norm(s);

    if (n === 'konflikt abbrechen') {
      pending = null;
      return 'Konfliktprüfung abgebrochen.';
    }

    if (n === 'konflikt hilfe') {
      return [
        'Konfliktliste 2.2',
        'Konflikt prüfen: FAKT-ID',
        'Konflikt bestätigen',
        'Konflikt abbrechen'
      ].join('\n');
    }

    if (n === 'konfliktliste 2.2') {
      const facts = bridge().listConflicts();

      return facts.length
        ? 'OFFENE KONFLIKTE (2.2.1)\n\n' +
          facts.map(describe).join('\n\n')
        : 'Keine offenen Konflikte.';
    }

    const match = s.match(
      /^konflikt pr[uü]fen\s*:\s*(LB-[\w-]+)\s*$/i
    );

    if (match) {
      const f = bridge().getFact(match[1]);

      pending = null;

      if (!f) {
        return 'Fakt mit dieser ID nicht gefunden.';
      }

      if (!f.conflict) {
        return (
          'Dieser Fakt hat keinen offenen Konflikt.\n' +
          describe(f)
        );
      }

      pending = {
        id: f.id,
        fingerprint: JSON.stringify({
          value: f.value,
          alternatives: f.alternatives,
          conflict: f.conflict
        })
      };

      return (
        'KONFLIKT PRÜFEN\n' +
        describe(f) +
        '\n\n„Konflikt bestätigen“ markiert ' +
        'die aktuelle Aussage als manuell geprüft. ' +
        'Das ist keine unabhängige Faktenprüfung. ' +
        'Alternativen bleiben erhalten.\n' +
        'Mit „Konflikt abbrechen“ wird nichts geändert.'
      );
    }

    if (n === 'konflikt bestatigen') {
      if (!pending) {
        return (
          'Keine Konfliktprüfung wartet ' +
          'auf Bestätigung.'
        );
      }

      const p = pending;
      pending = null;

      const api = bridge();
      const current = api.getFact(p.id);

      if (!current || !current.conflict) {
        return 'Der Konflikt ist nicht mehr offen.';
      }

      const fingerprint = JSON.stringify({
        value: current.value,
        alternatives: current.alternatives,
        conflict: current.conflict
      });

      if (fingerprint !== p.fingerprint) {
        return (
          'Der Fakt hat sich geändert. ' +
          'Bitte erneut prüfen.'
        );
      }

      const result = api.resolveConflict(p.id);

      return result?.ok
        ? (
            'Konflikt als manuell geprüft markiert:\n' +
            describe(result.fact) +
            '\nBitte danach „Konfliktliste 2.2“ prüfen.'
          )
        : (
            'Keine Änderung gespeichert: ' +
            (result?.message || 'Unbekannter Fehler')
          );
    }

    return null;
  }

  function isCommand(s) {
    return /^(?:konfliktliste 2\.2|konflikt hilfe|konflikt pr[uü]fen\s*:|konflikt best[aä]tigen|konflikt abbrechen)\s*(?:$|\s)/i.test(s);
  }

  function inputElement() {
    return document.getElementById('input') ||
      document.getElementById('lb6-input') ||
      document.getElementById('chat-input') ||
      document.getElementById('user-input') ||
      document.getElementById('lb6-fallback-input');
  }

  function output(message, role = 'assistant') {
    const chat =
      document.getElementById('log') ||
      document.getElementById('lb6-chat') ||
      document.getElementById('chat-messages') ||
      document.getElementById('messages') ||
      document.getElementById('lb6-fallback-chat');

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
    const input = inputElement();

    if (
      !input ||
      !isCommand(input.value.trim())
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

    const value = input.value.trim();
    input.value = '';

    output(value, 'user');

    try {
      output(
        process(value) ||
        'Befehl nicht erkannt.'
      );
    } catch (error) {
      output(
        'Konflikt-KI: ' + error.message
      );
    }
  }

  function init() {
    const form = document.getElementById('bar');

    if (form) {
      form.addEventListener(
        'submit',
        intercept,
        true
      );
    }

    document.addEventListener(
      'keydown',
      event => {
        if (event.target === inputElement()) {
          intercept(event);
        }
      },
      true
    );

    const button =
      document.getElementById('send') ||
      document.getElementById('lb6-send') ||
      document.getElementById('send-button') ||
      document.getElementById('send-btn') ||
      document.getElementById('lb6-fallback-send');

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

