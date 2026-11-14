
/* Mein LernBot 6.0 – Paket 3.1: Intelligente Lernplanung */
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

  const rules = {
    animal: ['definition', 'aussehen', 'lebensraum', 'nahrung', 'familie'],
    planet: ['definition', 'durchmesser'],
    general: ['definition']
  };

  const animalClues = new Set(['lebensraum', 'nahrung', 'familie', 'fellfarbe']);
  const planetClues = new Set(['durchmesser', 'umlaufzeit', 'masse']);

  function classify(properties) {
    if ([...properties].some(p => animalClues.has(p))) return 'animal';
    if ([...properties].some(p => planetClues.has(p))) return 'planet';
    return 'general';
  }

  function analyze() {
    const api = window.LernBotBridge;
    if (!api || typeof api.getFacts !== 'function') {
      return 'Agenten-KI: Die Schnittstelle getFacts() fehlt.';
    }

    const facts = api.getFacts();
    if (!Array.isArray(facts)) return 'Agenten-KI: Ungültige Faktendaten.';

    const topics = new Map();
    const conflicts = [];

    for (const fact of facts) {
      const subject = String(fact?.subject ?? '').trim();
      const property = normalize(fact?.property);
      if (!subject || !property) continue;
      const key = normalize(subject);
      if (!topics.has(key)) {
        topics.set(key, { subject, properties: new Set(), count: 0 });
      }
      const topic = topics.get(key);
      topic.properties.add(property);
      topic.count++;
      if (fact.conflict) conflicts.push(fact);
    }

    const tasks = [];
    for (const topic of topics.values()) {
      const category = classify(topic.properties);
      const desired = rules[category];
      for (const property of desired) {
        if (topic.properties.has(property)) continue;
        const priority = property === 'definition' ? 90 :
          property === 'nahrung' ? 75 :
          property === 'lebensraum' ? 70 :
          property === 'familie' ? 60 : 50;
        tasks.push({
          subject: topic.subject,
          property,
          priority,
          category
        });
      }
    }
    tasks.sort((a, b) => b.priority - a.priority ||
      a.subject.localeCompare(b.subject, 'de') ||
      a.property.localeCompare(b.property, 'de'));

    const lines = [
      'AGENTEN-ANALYSE 3.1',
      `Gespeicherte Fakten: ${facts.length}`,
      `Erkannte Themen: ${topics.size}`,
      `Offene Konflikte: ${conflicts.length}`,
      `Mögliche Wissenslücken: ${tasks.length}`,
      '',
      'WISSENSPRÜFUNG'
    ];

    if (conflicts.length) {
      for (const f of conflicts.slice(0, 8)) {
        lines.push(`• Prüfen: ${f.subject} – ${f.property} (ID: ${f.id || 'unbekannt'})`);
      }
      if (conflicts.length > 8) lines.push('… weitere Konflikte vorhanden');
    } else {
      lines.push('Keine als offen markierten Faktenkonflikte.');
    }

    lines.push('', 'PRIORISIERTE LERNAUFGABEN');
    if (!tasks.length) {
      lines.push('Keine Lücken nach den aktuellen Regeln erkannt.');
    } else {
      for (const task of tasks.slice(0, 10)) {
        lines.push(`• Priorität ${task.priority}: ${task.subject} – ${task.property}`);
      }
      if (tasks.length > 10) lines.push('… weitere Aufgaben vorhanden');
    }

    lines.push('', 'NÄCHSTER SCHRITT');
    if (conflicts.length) {
      lines.push(`Zuerst prüfen: ${conflicts[0].subject} – ${conflicts[0].property}`);
      lines.push(`Befehl: Konflikt prüfen: ${conflicts[0].id}`);
    } else if (tasks.length) {
      const next = tasks[0];
      lines.push(`Wissen ergänzen: ${next.subject} – ${next.property}`);
      lines.push('Recherchiere die Information und speichere sie erst nach Prüfung.');
    } else {
      lines.push('Keine unmittelbare Aufgabe nach den aktuellen Regeln.');
    }
    lines.push('', 'Hinweis: Kategorien und Prioritäten beruhen auf einfachen Regeln. ' +
      'Nicht erkannte Wissenslücken sind möglich. Es wurden keine Daten verändert.');
    return lines.join('\n');
  }

  function input() { return document.getElementById('input'); }

  function output(message, role) {
    const chat = document.getElementById('log');
    if (!chat) { alert(message); return; }
    const item = document.createElement('div');
    item.className = role === 'user' ? 'msg user' : 'msg bot';
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
    if (!el || normalize(el.value) !== 'agenten analyse') return;
    if (event.type === 'keydown' &&
      (event.key !== 'Enter' || event.shiftKey || event.isComposing)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const command = el.value.trim();
    el.value = '';
    output(command, 'user');
    try { output(analyze(), 'assistant'); }
    catch (error) { output('Agenten-KI: ' + error.message, 'assistant'); }
  }

  function init() {
    const form = document.getElementById('bar');
    if (form) form.addEventListener('submit', intercept, true);
    document.addEventListener('keydown', event => {
      if (event.target === input()) intercept(event);
    }, true);
    const button = document.getElementById('send');
    if (button) button.addEventListener('click', intercept, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
