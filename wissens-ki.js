
/* Mein LernBot 6.0 – Wissens-KI 3.5: sichere Analyse */
(() => {
  'use strict';

  const norm = v => String(v ?? '')
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  const schema = {
    tier: [
      'definition', 'familie', 'lebensraum',
      'nahrung', 'aussehen', 'verbreitung',
      'gefahrdung'
    ],
    planet: [
      'definition', 'durchmesser', 'masse',
      'umlaufzeit', 'atmosphare', 'monde'
    ],
    begriff: [
      'definition', 'anwendung', 'beispiel'
    ]
  };

  const animalClues = new Set([
    'familie', 'lebensraum', 'nahrung',
    'fellfarbe', 'aussehen', 'verbreitung'
  ]);

  const planetClues = new Set([
    'durchmesser', 'umlaufzeit',
    'atmosphare', 'monde', 'masse'
  ]);

  const planetNames = new Set([
    'merkur', 'venus', 'erde', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptun'
  ]);

  const animalNames = new Set(['okapi']);

  const weights = {
    definition: 100,
    nahrung: 85,
    lebensraum: 85,
    durchmesser: 80,
    familie: 75,
    umlaufzeit: 75,
    masse: 70,
    verbreitung: 65,
    atmosphare: 65,
    monde: 55,
    aussehen: 55,
    gefahrdung: 50,
    anwendung: 65,
    beispiel: 45
  };

  const key = (s, p) =>
    norm(s) + '::' + norm(p);

  function classify(topic) {
    const n = norm(topic.name);

    if (planetNames.has(n)) {
      return {
        type: 'planet',
        confidence: 'hoch (bekannter Planetenname)'
      };
    }

    if (animalNames.has(n)) {
      return {
        type: 'tier',
        confidence: 'hoch (bekannter Tiername)'
      };
    }

    const a = [...topic.props]
      .filter(p => animalClues.has(p)).length;

    const b = [...topic.props]
      .filter(p => planetClues.has(p)).length;

    if (a > b && a >= 2) {
      return {
        type: 'tier',
        confidence: 'mittel (Merkmale)'
      };
    }

    if (b > a && b >= 2) {
      return {
        type: 'planet',
        confidence: 'mittel (Merkmale)'
      };
    }

    return {
      type: 'begriff',
      confidence: 'niedrig (Standardkategorie)'
    };
  }

  function analyze() {
    const api = window.LernBotBridge;

    if (
      !api ||
      typeof api.getFacts !== 'function'
    ) {
      throw Error('Fakten-Schnittstelle fehlt.');
    }

    const facts = api.getFacts();

    if (!Array.isArray(facts)) {
      throw Error('Faktenliste ungültig.');
    }

    const topics = new Map();
    const groups = new Map();
    const flagged = [];
    const suggestions = [];
    const duplicates = [];
    const variations = [];

    for (const f of facts) {
      if (!f || typeof f !== 'object') continue;

      const subject = String(
        f.subject ?? ''
      ).trim();

      const property = norm(f.property);
      const value = String(f.value ?? '').trim();

      if (!subject || !property) continue;

      const s = norm(subject);

      if (!topics.has(s)) {
        topics.set(s, {
          name: subject,
          props: new Set(),
          count: 0,
          conflicts: 0
        });
      }

      const t = topics.get(s);

      t.count++;
      t.props.add(property);

      if (f.conflict) {
        t.conflicts++;
        flagged.push(
          `${subject} – ${property}`
        );
      }

      if (value) {
        const k = key(subject, property);

        if (!groups.has(k)) {
          groups.set(k, {
            subject,
            property,
            values: []
          });
        }

        groups.get(k).values.push(value);
      }
    }

    for (const g of groups.values()) {
      if (g.values.length < 2) continue;

      const distinct = new Set(
        g.values.map(norm)
      );

      if (distinct.size === 1) {
        duplicates.push(
          `${g.subject} – ${g.property}`
        );
      } else {
        variations.push(
          `${g.subject} – ${g.property}`
        );
      }
    }

    for (const t of topics.values()) {
      const cls = classify(t);
      t.category = cls;

      for (const p of schema[cls.type]) {
        if (t.props.has(p)) continue;

        const base = weights[p] ?? 40;

        const score = Math.min(
          100,
          base + Math.min(8, t.count * 2)
        );

        suggestions.push({
          name: t.name,
          property: p,
          score,
          type: cls.type
        });
      }
    }

    suggestions.sort((a, b) =>
      b.score - a.score ||
      a.name.localeCompare(b.name, 'de') ||
      a.property.localeCompare(
        b.property, 'de'
      )
    );

    const lines = [
      'WISSENS-KI 3.5 – ERWEITERTE ANALYSE',
      `Fakten: ${facts.length} | Themen: ${topics.size}`,
      `Markierte Konflikte: ${flagged.length}`,
      `Mögliche exakte Dubletten-Gruppen: ${duplicates.length}`,
      `Abweichende Werte innerhalb gleicher Eigenschaften: ${variations.length}`,
      '',
      'THEMEN UND EINORDNUNG'
    ];

    for (
      const t of [...topics.values()]
        .sort((a, b) =>
          b.count - a.count ||
          a.name.localeCompare(b.name, 'de')
        )
        .slice(0, 15)
    ) {
      lines.push(
        `• ${t.name}: ${t.count} Fakten | ` +
        `${t.category.type} | Sicherheit: ` +
        t.category.confidence
      );
    }

    lines.push(
      '',
      'PRIORISIERTE RECHERCHEFRAGEN'
    );

    if (!suggestions.length) {
      lines.push(
        'Keine Vorschläge nach den aktuellen Schemata.'
      );
    } else {
      for (const s of suggestions.slice(0, 12)) {
        lines.push(
          `• ${s.score}/100: ${s.name} – ` +
          `${s.property} (${s.type})`
        );
      }
    }

    if (
      flagged.length ||
      duplicates.length ||
      variations.length
    ) {
      lines.push('', 'MANUELL PRÜFEN');

      for (const x of flagged.slice(0, 5)) {
        lines.push(
          `• Markierter Konflikt: ${x}`
        );
      }

      for (const x of duplicates.slice(0, 5)) {
        lines.push(
          `• Mögliche Dublette: ${x}`
        );
      }

      for (const x of variations.slice(0, 5)) {
        lines.push(
          '• Unterschiedliche Angaben, ' +
          'nicht zwingend Widerspruch: ' + x
        );
      }
    }

    lines.push(
      '',
      'WICHTIG: Einordnungen und Prioritäten ' +
      'sind Heuristiken, keine KI-Gewissheiten.'
    );

    lines.push(
      'Fehlende Eigenschaften sind Vorschläge, ' +
      'keine bewiesenen Wissenslücken.'
    );

    lines.push(
      'Keine Fakten, Dokumente oder Aufgaben ' +
      'wurden verändert.'
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

    const content =
      document.createElement('div');

    content.className =
      'lb6-message-content';

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
      norm(input.value) !== 'wissens analyse'
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
    } catch (e) {
      show(
        'Wissens-KI: ' + e.message,
        'bot'
      );
    }
  }

  function init() {
    const form = document.getElementById('bar');

    if (form) {
      form.addEventListener(
        'submit', intercept, true
      );
    }

    const button = document.getElementById('send');

    if (button) {
      button.addEventListener(
        'click', intercept, true
      );
    }

    document.addEventListener(
      'keydown',
      e => {
        if (
          e.target ===
          document.getElementById('input')
        ) {
          intercept(e);
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
