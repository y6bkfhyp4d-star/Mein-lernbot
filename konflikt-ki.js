
/* LernBot 6.0 – Paket 2.2: Konflikt-KI */
(() => {
  'use strict';

  const KEY = 'meinLernBot.v1';
  const BACKUP_PREFIX =
    KEY + '.sicherung.konflikt22.';

  const uid = () =>
    'LB-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 9);

  const norm = s =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('de')
      .replace(/ß/g, 'ss')
      .trim();

  let pending = null;
  let busy = false;

  function load() {
    const raw = localStorage.getItem(KEY);

    if (!raw) {
      throw Error('Keine LernBot-Datenbank gefunden.');
    }

    const db = JSON.parse(raw);

    if (
      !db ||
      typeof db !== 'object' ||
      !Array.isArray(db.facts)
    ) {
      throw Error('Ungültige Datenbank.');
    }

    return { raw, db };
  }

  function locate(db, id) {
    return db.facts.find(f =>
      f && f.id === id
    );
  }

  function describe(f) {
    const alternatives =
      Array.isArray(f.alternatives)
        ? f.alternatives
        : [];

    let result =
      `${f.subject} – ${f.property}: ${f.value}\n` +
      `ID: ${f.id}\n` +
      `Status: ${
        f.conflict
          ? 'offener Konflikt'
          : 'kein offener Konflikt'
      }\n`;

    if (alternatives.length) {
      result +=
        'Gespeicherte Alternativen:\n' +
        alternatives.map(a =>
          '• ' +
          String(a?.value ?? '') +
          ' (' +
          String(a?.source ?? 'unbekannt') +
          ')'
        ).join('\n');
    } else {
      result +=
        'Keine Alternativen gespeichert. ' +
        'Der ursprüngliche Widerspruch ' +
        'ist nicht rekonstruierbar.';
    }

    return result;
  }

  function write(db, originalRaw, action) {
    if (localStorage.getItem(KEY) !== originalRaw) {
      throw Error(
        'Daten wurden inzwischen verändert. ' +
        'Bitte erneut prüfen.'
      );
    }

    const backupKey =
      BACKUP_PREFIX +
      Date.now() +
      '-' +
      Math.random().toString(36).slice(2, 7);

    localStorage.setItem(backupKey, originalRaw);

    db.audit = Array.isArray(db.audit)
      ? db.audit
      : [];

    db.audit.push({
      id: uid(),
      agent: 'Konflikt-KI 2.2',
      action,
      detail: 'Manuell bestätigt',
      time: Date.now()
    });

    db.audit = db.audit.slice(-1000);

    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(db)
      );
    } catch (err) {
      try {
        localStorage.setItem(
          KEY,
          originalRaw
        );
      } catch {}

      throw err;
    }

    return backupKey;
  }

  function output(msg) {
    const log =
      document.getElementById('log') ||
      document.getElementById('lb6-chat') ||
      document.getElementById('lb6-fallback-chat');

    if (!log) {
      alert(msg);
      return;
    }

    const el = document.createElement('div');
    el.className = 'msg bot';

    const inner = document.createElement('div');
    inner.className = 'lb6-message-content';
    inner.style.whiteSpace = 'pre-wrap';
    inner.textContent = msg;

    el.appendChild(inner);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function prepare(id) {
    const { db } = load();
    const f = locate(db, id);

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
      id,
      token: JSON.stringify({
        value: f.value,
        alternatives: f.alternatives,
        conflict: f.conflict
      })
    };

    return (
      'KONFLIKT PRÜFEN\n' +
      describe(f) +
      '\n\nMit „Konflikt bestätigen“ wird die ' +
      'aktuelle Aussage als manuell geprüft markiert.' +
      '\nDies ist keine unabhängige Faktenprüfung.' +
      '\nAlternativen bleiben gespeichert.' +
      '\nMit „Konflikt abbrechen“ wird nichts geändert.'
    );
  }

  function confirmPending() {
    if (!pending) {
      return 'Keine Konfliktprüfung wartet auf Bestätigung.';
    }

    const p = pending;
    pending = null;

    const { raw, db } = load();
    const f = locate(db, p.id);

    if (!f || !f.conflict) {
      return 'Konflikt nicht mehr vorhanden.';
    }

    const currentToken = JSON.stringify({
      value: f.value,
      alternatives: f.alternatives,
      conflict: f.conflict
    });

    if (currentToken !== p.token) {
      return (
        'Der Fakt hat sich geändert. ' +
        'Bitte erneut prüfen.'
      );
    }

    f.conflict = false;
    f.resolvedAt = Date.now();

    f.resolution = {
      type: 'manual-review',
      selectedValue: f.value,
      source: 'user',
      time: f.resolvedAt,
      note: 'Manuell bestätigt; keine unabhängige Prüfung'
    };

    f.updated = f.resolvedAt;

    const key = write(
      db,
      raw,
      'Konflikt manuell bestätigt: ' + f.id
    );

    return (
      'Konflikt als manuell geprüft markiert:\n' +
      describe(f) +
      '\nSicherung: ' + key
    );
  }

  function process(input) {
    const s = String(input ?? '').trim();
    const n = norm(s);

    if (n === 'konflikt abbrechen') {
      pending = null;
      return 'Konfliktprüfung abgebrochen.';
    }

    if (n === 'konflikt bestatigen') {
      return confirmPending();
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
      const { db } = load();

      const fs = db.facts.filter(f =>
        f?.conflict
      );

      return fs.length
        ? 'OFFENE KONFLIKTE (2.2)\n\n' +
          fs.map(describe).join('\n\n')
        : 'Keine offenen Konflikte.';
    }

    const m = s.match(
      /^konflikt pr[uü]fen\s*:\s*(LB-[\w-]+)\s*$/i
    );

    if (m) {
      return prepare(m[1]);
    }

    return null;
  }

  function onSubmit(e) {
    const input =
      document.getElementById('input') ||
      document.getElementById('lb6-input') ||
      document.getElementById('chat-input') ||
      document.getElementById('user-input') ||
      document.getElementById('lb6-fallback-input');

    if (!input) return;

    const value = input.value.trim();

    if (
      !/^(?:konfliktliste 2\.2|konflikt hilfe|konflikt pr[uü]fen\s*:|konflikt best[aä]tigen|konflikt abbrechen)/i.test(value)
    ) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    if (busy) return;

    busy = true;
    input.value = '';

    try {
      output(
        process(value) || 'Befehl nicht erkannt.'
      );
    } catch (err) {
      output('Konflikt-KI: ' + err.message);
    } finally {
      busy = false;
    }
  }

  function init() {
    const bar = document.getElementById('bar');

    if (bar) {
      bar.addEventListener(
        'submit',
        onSubmit,
        true
      );
    }

    document.addEventListener(
      'keydown',
      e => {
        if (
          e.key !== 'Enter' ||
          e.shiftKey ||
          e.isComposing
        ) {
          return;
        }

        const input =
          document.getElementById('input') ||
          document.getElementById('lb6-input') ||
          document.getElementById('lb6-fallback-input');

        if (document.activeElement === input) {
          onSubmit(e);
        }
      },
      true
    );

    const send =
      document.getElementById('send') ||
      document.getElementById('lb6-send') ||
      document.getElementById('lb6-fallback-send');

    if (send) {
      send.addEventListener(
        'click',
        onSubmit,
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
