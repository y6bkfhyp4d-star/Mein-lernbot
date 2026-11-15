
/* =====================================================
   MEIN LERNBOT 6.0
   PAKET 4.4 – INTELLIGENTE GEDÄCHTNISVERWALTUNG

   Funktionen:
   - Persönliche Erinnerungen anzeigen
   - Fachwissen und Dokumente unterscheiden
   - Ähnliche und doppelte Erinnerungen erkennen
   - Unterschiedliche Faktenwerte melden
   - Erinnerungen durchsuchen
   - Verbesserungsvorschläge anzeigen
   - Einzelne Erinnerungen prüfen
   - Erinnerungen nach Bestätigung ändern

   SICHERHEIT:
   - Keine automatische Löschung
   - Keine automatische Zusammenführung
   - Keine Änderung ohne Bestätigung
   - Sicherheitskopie vor dem Speichern
   - Bestehende Erinnerungs-IDs bleiben erhalten
   ===================================================== */

(() => {
  'use strict';

  const VERSION = '4.4';
  let pending = null;

  const clean = value =>
    String(value ?? '').trim();

  const norm = value =>
    clean(value)
      .toLocaleLowerCase('de')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  /* ==========================================
     1. VERBINDUNG ZUM HAUPTSYSTEM
     ========================================== */

  function bridge() {
    const b = window.LernBotBridge;

    if (
      !b ||
      typeof b.getMemories !== 'function' ||
      typeof b.getFacts !== 'function'
    ) {
      throw Error(
        'Gedächtnis-Schnittstelle fehlt. ' +
        'Bitte app.js prüfen.'
      );
    }

    return b;
  }

  function memories() {
    const items = bridge().getMemories();

    if (!Array.isArray(items)) {
      throw Error('Ungültige Erinnerungsdaten.');
    }

    return items.map((item, index) => ({
      ...item,
      index: index + 1,
      id: clean(item?.id),
      type: norm(item?.type || 'notiz'),
      content: clean(item?.content)
    }));
  }

  function facts() {
    const result = bridge().getFacts();

    if (!Array.isArray(result)) {
      throw Error('Ungültige Faktenliste.');
    }

    return result;
  }

  /* ==========================================
     2. ERINNERUNGEN EINORDNEN
     ========================================== */

  function category(memory) {
    const type = memory.type;
    const content = norm(memory.content);

    if (
      type === 'dokument' ||
      content.startsWith('dokument importiert')
    ) {
      return 'dokument';
    }

    if (
      type === 'fakt' ||
      type === 'lerninhalt' ||
      content.startsWith('lerninhalt ')
    ) {
      return 'fachwissen';
    }

    if (
      ['notiz', 'personlich', 'persoenlich']
        .includes(type)
    ) {
      return 'persoenlich';
    }

    return 'sonstige';
  }

  function groups(items) {
    const result = {
      persoenlich: [],
      fachwissen: [],
      dokument: [],
      sonstige: []
    };

    for (const item of items) {
      result[category(item)].push(item);
    }

    return result;
  }

  /* ==========================================
     3. FAKTEN ERKENNEN
     ========================================== */

  function parseFact(memory) {
    if (category(memory) !== 'fachwissen') {
      return null;
    }

    const content = memory.content.replace(
      /^lerninhalt(?: gespeichert)?\s*:\s*/i,
      ''
    );

    const match = content.match(
      /^([^:\n]+)\s*:\s*([^=–—:\n]+?)\s*(?:=|–|—|:)\s*(.+)$/s
    );

    if (!match) return null;

    return {
      subject: clean(match[1]),
      property: norm(match[2]),
      value: clean(match[3]),
      source: `Erinnerung ${memory.index}`
    };
  }

  /* ==========================================
     4. ÄHNLICHKEITEN ERKENNEN
     ========================================== */

  const stopwords = new Set(
    (
      'ich du der die das ein eine und oder ' +
      'ist sind mit von fur den dem im in ' +
      'am auf als gespeichert lerninhalt ' +
      'dokument importiert'
    ).split(' ')
  );

  function wordSet(value) {
    return new Set(
      norm(value)
        .split(' ')
        .filter(word =>
          word.length > 2 &&
          !stopwords.has(word)
        )
    );
  }

  function similarity(a, b) {
    const x = wordSet(a);
    const y = wordSet(b);

    if (!x.size || !y.size) {
      return 0;
    }

    let matches = 0;

    for (const word of x) {
      if (y.has(word)) {
        matches++;
      }
    }

    return matches / Math.max(x.size, y.size);
  }

  function findPairs(items) {
    const duplicates = [];
    const similar = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];

        if (!a.content || !b.content) {
          continue;
        }

        if (category(a) !== category(b)) {
          continue;
        }

        const factA = parseFact(a);
        const factB = parseFact(b);

        if (
          factA &&
          factB &&
          (
            norm(factA.subject) !==
              norm(factB.subject) ||
            factA.property !== factB.property
          )
        ) {
          continue;
        }

        const pair = { a, b };

        if (
          norm(a.content) === norm(b.content)
        ) {
          duplicates.push(pair);
        } else if (
          similarity(a.content, b.content) >= 0.8
        ) {
          similar.push(pair);
        }
      }
    }

    return {
      duplicates,
      similar
    };
  }

  /* ==========================================
     5. NUMERISCHE WERTE VERGLEICHEN
     ========================================== */

  function comparable(value) {
    const match = clean(value).match(
      /^(\d[\d.,\s]*)\s*(.*)$/
    );

    if (!match) return null;

    const number = Number(
      match[1]
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}(?:\D|$))/g, '')
        .replace(',', '.')
    );

    if (!Number.isFinite(number)) {
      return null;
    }

    return {
      number,
      unit: norm(match[2])
    };
  }

  function differences(savedFacts, savedMemories) {
    const map = new Map();

    const entries = [
      ...savedFacts.map(fact => ({
        subject: fact.subject,
        property: fact.property,
        value: fact.value,
        source: 'Wissensdatenbank'
      })),
      ...savedMemories
        .map(parseFact)
        .filter(Boolean)
    ];

    for (const entry of entries) {
      if (
        !clean(entry.subject) ||
        !clean(entry.property) ||
        !clean(entry.value)
      ) {
        continue;
      }

      const key =
        norm(entry.subject) +
        '\u0000' +
        norm(entry.property);

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(entry);
    }

    const result = [];

    for (const list of map.values()) {
      const unique = [
        ...new Map(
          list.map(item => [
            norm(item.value),
            item
          ])
        ).values()
      ];

      if (unique.length < 2) {
        continue;
      }

      const numeric = unique.map(item =>
        comparable(item.value)
      );

      let note =
        'Unterschiedliche Angaben – manuell prüfen.';

      if (
        numeric.every(Boolean) &&
        numeric.every(item =>
          item.unit === numeric[0].unit
        )
      ) {
        const values = numeric.map(
          item => item.number
        );

        const min = Math.min(...values);
        const max = Math.max(...values);
        const delta = max - min;

        const percent = max
          ? delta / max * 100
          : 0;

        note =
          'Numerische Abweichung: ' +
          delta.toLocaleString('de-DE') +
          ' (' +
          percent.toFixed(1).replace('.', ',') +
          ' %). Rundung und Messdefinition prüfen.';
      }

      result.push({
        subject: unique[0].subject,
        property: unique[0].property,
        values: unique,
        note
      });
    }

    return result;
  }

  /* ==========================================
     6. PERSÖNLICHE ÜBERSICHT
     ========================================== */

  function overview() {
    const organized = groups(memories());

    const lines = [
      `GEDÄCHTNIS-KI ${VERSION}`,
      'WAS WEISS ICH ÜBER DICH?',
      '',
      'Persönliche Erinnerungen: ' +
        organized.persoenlich.length,
      '',
      'GESPEICHERTE PERSÖNLICHE INFORMATIONEN'
    ];

    if (!organized.persoenlich.length) {
      lines.push(
        'Noch keine persönlichen Erinnerungen erkannt.'
      );
    }

    for (const memory of organized.persoenlich) {
      lines.push('• ' + memory.content);
    }

    lines.push(
      '',
      'WEITERES GESPEICHERTES WISSEN',
      'Fachwissen: ' +
        organized.fachwissen.length,
      'Importierte Dokumente: ' +
        organized.dokument.length,
      'Sonstige Erinnerungen: ' +
        organized.sonstige.length,
      '',
      'Die Einordnung basiert auf Erinnerungstypen.',
      'Nicht jede Notiz muss eine persönliche Tatsache sein.',
      'Es wurden keine Daten verändert.'
    );

    return lines.join('\n');
  }

  /* ==========================================
     7. ERINNERUNGEN DURCHSUCHEN
     ========================================== */

  function search(query) {
    const q = norm(query);
    const queryWords = wordSet(query);

    const matches = memories()
      .map(memory => {
        const content = norm(memory.content);
        const contentWords = wordSet(
          memory.content
        );

        let score = 0;

        if (content === q) {
          score += 100;
        }

        if (q && content.includes(q)) {
          score += 50;
        }

        for (const word of queryWords) {
          if (contentWords.has(word)) {
            score += 10;
          }
        }

        return {
          memory,
          score
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) =>
        b.score - a.score ||
        a.memory.index - b.memory.index
      );

    const lines = [
      `GEDÄCHTNIS-KI ${VERSION} – SUCHE`,
      'Suchbegriff: ' + query,
      'Treffer: ' + matches.length,
      ''
    ];

    if (!matches.length) {
      lines.push(
        'Keine passende Erinnerung gefunden.'
      );
    }

    for (const item of matches.slice(0, 15)) {
      lines.push(
        '• [' +
        category(item.memory) +
        '] ' +
        item.memory.content
      );
    }

    lines.push(
      '',
      'Es wurden keine Daten verändert.'
    );

    return lines.join('\n');
  }

  /* ==========================================
     8. GESAMTANALYSE
     ========================================== */

  function analysis() {
    const savedMemories = memories();
    const savedFacts = facts();

    const organized = groups(savedMemories);
    const pairs = findPairs(savedMemories);

    const valueDifferences = differences(
      savedFacts,
      savedMemories
    );

    const empty = savedMemories.filter(
      memory => !memory.content
    );

    const lines = [
      `GEDÄCHTNIS-KI ${VERSION} – ANALYSE`,
      '',
      'DATENBESTAND',
      'Fakten: ' + savedFacts.length,
      'Erinnerungen: ' + savedMemories.length,
      '',
      'GEDÄCHTNISORGANISATION',
      'Persönlich: ' +
        organized.persoenlich.length,
      'Fachwissen: ' +
        organized.fachwissen.length,
      'Dokumente: ' +
        organized.dokument.length,
      'Sonstige: ' +
        organized.sonstige.length,
      '',
      'QUALITÄTSPRÜFUNG',
      'Exakte doppelte Erinnerungen: ' +
        pairs.duplicates.length,
      'Ähnliche Erinnerungen: ' +
        pairs.similar.length,
      'Leere Erinnerungen: ' +
        empty.length,
      'Unterschiedliche Faktenwerte: ' +
        valueDifferences.length,
      '',
      'MÖGLICHE DUBLETTEN'
    ];

    if (!pairs.duplicates.length) {
      lines.push(
        'Keine exakten Dubletten erkannt.'
      );
    }

    for (
      const pair of pairs.duplicates.slice(0, 5)
    ) {
      lines.push(
        '• Eintrag ' +
        pair.a.index +
        ' ↔ ' +
        pair.b.index,
        '• ' + pair.a.content.slice(0, 150),
        '• ' + pair.b.content.slice(0, 150)
      );
    }

    lines.push(
      '',
      'ÄHNLICHE ERINNERUNGEN'
    );

    if (!pairs.similar.length) {
      lines.push(
        'Keine auffälligen Ähnlichkeiten erkannt.'
      );
    }

    for (
      const pair of pairs.similar.slice(0, 5)
    ) {
      lines.push(
        '• Eintrag ' +
        pair.a.index +
        ' ↔ ' +
        pair.b.index,
        '• ' + pair.a.content.slice(0, 150),
        '• ' + pair.b.content.slice(0, 150)
      );
    }

    lines.push(
      '',
      'UNTERSCHIEDLICHE FAKTENWERTE'
    );

    if (!valueDifferences.length) {
      lines.push(
        'Keine Wertabweichungen erkannt.'
      );
    }

    for (
      const item of valueDifferences.slice(0, 10)
    ) {
      lines.push(
        '• ' +
        item.subject +
        ' – ' +
        item.property
      );

      for (
        const value of item.values.slice(0, 5)
      ) {
        lines.push(
          '  - ' +
          value.value +
          ' (' +
          value.source +
          ')'
        );
      }

      lines.push('  ' + item.note);
    }

    lines.push(
      '',
      'SYSTEMSTATUS',
      'Persönliches Gedächtnis: getrennt',
      'Fachwissen: getrennt',
      'Dokumente: getrennt',
      'Faktenvergleich: aktiv',
      'Automatische Änderungen: deaktiviert',
      '',
      'HINWEIS',
      'Die Trennung erfolgt nur bei der Anzeige.',
      'Unterschiedliche Werte sind nicht zwingend Widersprüche.',
      'Die Diagnose kann Unterschiede übersehen.',
      'Keine Daten wurden verändert.'
    );

    return lines.join('\n');
  }

  /* ==========================================
     9. VERBESSERUNGSVORSCHLÄGE
     ========================================== */

  function suggestions() {
    const savedMemories = memories();
    const pairs = findPairs(savedMemories);

    const empty = savedMemories.filter(
      memory => !memory.content
    );

    const lines = [
      `GEDÄCHTNIS-KI ${VERSION} – VORSCHLÄGE`,
      '',
      'Exakte Dubletten: ' +
        pairs.duplicates.length,
      'Ähnliche Einträge: ' +
        pairs.similar.length,
      'Leere Einträge: ' +
        empty.length,
      ''
    ];

    if (
      !pairs.duplicates.length &&
      !pairs.similar.length &&
      !empty.length
    ) {
      lines.push(
        'Keine auffälligen Erinnerungen erkannt.'
      );
    }

    for (
      const pair of pairs.duplicates.slice(0, 10)
    ) {
      lines.push(
        'DUBLETTE: ' +
        pair.a.index +
        ' und ' +
        pair.b.index,
        '• ' + pair.a.content,
        '• ' + pair.b.content,
        'Nur Hinweis – keine automatische Löschung.',
        ''
      );
    }

    for (
      const pair of pairs.similar.slice(0, 10)
    ) {
      lines.push(
        'ÄHNLICH: ' +
        pair.a.index +
        ' und ' +
        pair.b.index,
        '• ' + pair.a.content,
        '• ' + pair.b.content,
        'Inhalt vor Änderung vergleichen.',
        ''
      );
    }

    for (const memory of empty.slice(0, 10)) {
      lines.push(
        'LEER: Eintrag ' +
        memory.index +
        ', ID: ' +
        memory.id,
        ''
      );
    }

    lines.push(
      'Zum Prüfen:',
      'Gedächtnis Prüfen: NUMMER oder ID',
      '',
      'Zum Ändern:',
      'Gedächtnis Ändern: NUMMER oder ID = neuer Text',
      '',
      'Änderungen werden erst nach',
      '„Gedächtnis Bestätigen“ gespeichert.',
      '',
      'Es wurden keine Daten verändert.'
    );

    return lines.join('\n');
  }

  /* ==========================================
     10. EINZELNE ERINNERUNG FINDEN
     ========================================== */

  function findMemory(reference) {
    const savedMemories = memories();
    const ref = clean(reference);

    if (/^\d+$/.test(ref)) {
      return savedMemories[Number(ref) - 1] || null;
    }

    return savedMemories.find(
      memory => memory.id === ref
    ) || null;
  }

  /* ==========================================
     11. EINZELNE ERINNERUNG PRÜFEN
     ========================================== */

  function inspect(reference) {
    const memory = findMemory(reference);

    if (!memory) {
      return (
        'Erinnerung nicht gefunden. ' +
        'Verwende eine Nummer oder die genaue ID.'
      );
    }

    const others = memories()
      .filter(item =>
        item.id !== memory.id &&
        item.content &&
        category(item) === category(memory)
      )
      .map(item => ({
        memory: item,
        score: similarity(
          memory.content,
          item.content
        )
      }))
      .filter(item =>
        item.score >= 0.8 ||
        norm(item.memory.content) ===
          norm(memory.content)
      )
      .sort((a, b) =>
        b.score - a.score
      )
      .slice(0, 5);

    const lines = [
      `GEDÄCHTNIS-KI ${VERSION} – EINZELPRÜFUNG`,
      '',
      'Nummer: ' + memory.index,
      'ID: ' + memory.id,
      'Kategorie: ' + category(memory),
      'Typ: ' + memory.type,
      '',
      'INHALT',
      memory.content || '(leer)',
      '',
      'MÖGLICHERWEISE ÄHNLICHE EINTRÄGE'
    ];

    if (!others.length) {
      lines.push('Keine erkannt.');
    }

    for (const item of others) {
      lines.push(
        '• ' +
        item.memory.index +
        ': ' +
        item.memory.content
      );
    }

    lines.push(
      '',
      'Zum Ändern:',
      'Gedächtnis Ändern: ' +
        memory.id +
        ' = neuer Text',
      '',
      'Es wurden keine Daten verändert.'
    );

    return lines.join('\n');
  }

  /* ==========================================
     12. ÄNDERUNG VORSCHLAGEN
     ========================================== */

  function propose(raw) {
    const match = raw.match(
      /^(.+?)\s*=\s*([\s\S]+)$/
    );

    if (!match) {
      return (
        'Format:\n' +
        'Gedächtnis Ändern: ' +
        'NUMMER oder ID = neuer Text'
      );
    }

    const memory = findMemory(match[1]);
    const value = clean(match[2]);

    if (!memory) {
      return 'Erinnerung nicht gefunden.';
    }

    if (!memory.id) {
      return (
        'Erinnerung besitzt keine gültige ID. ' +
        'Änderung aus Sicherheitsgründen abgebrochen.'
      );
    }

    if (
      !value ||
      value.length > 10000
    ) {
      return (
        'Neuer Text muss zwischen ' +
        '1 und 10.000 Zeichen enthalten.'
      );
    }

    if (value === memory.content) {
      return (
        'Der neue Text ist mit dem ' +
        'bisherigen identisch.'
      );
    }

    pending = {
      id: memory.id,
      before: memory.content,
      after: value
    };

    return [
      `GEDÄCHTNIS-KI ${VERSION} – ÄNDERUNGSVORSCHLAG`,
      '',
      'ID: ' + memory.id,
      '',
      'BISHER',
      memory.content || '(leer)',
      '',
      'NEU',
      value,
      '',
      'Es wurde noch nichts gespeichert.',
      '',
      'Bestätige mit:',
      'Gedächtnis Bestätigen',
      '',
      'Oder brich ab mit:',
      'Gedächtnis Abbrechen'
    ].join('\n');
  }

  /* ==========================================
     13. ÄNDERUNG SICHER SPEICHERN
     ========================================== */

  function confirmChange() {
    if (!pending) {
      return (
        'Keine Gedächtnisänderung ' +
        'wartet auf Bestätigung.'
      );
    }

    const proposal = pending;
    const b = bridge();

    if (
      typeof b.saveMemories !== 'function'
    ) {
      return (
        'Sichere Speicherfunktion fehlt. ' +
        'Keine Änderung ausgeführt.'
      );
    }

    const list = b.getMemories();

    if (!Array.isArray(list)) {
      return (
        'Speicher nicht lesbar. ' +
        'Keine Änderung ausgeführt.'
      );
    }

    const memory = list.find(
      item => item.id === proposal.id
    );

    if (
      !memory ||
      memory.content !== proposal.before
    ) {
      pending = null;

      return (
        'Erinnerung wurde zwischenzeitlich ' +
        'verändert oder entfernt. ' +
        'Bitte erneut prüfen.'
      );
    }

    memory.content = proposal.after;
    memory.updated = Date.now();

    const result = b.saveMemories(
      list,
      true
    );

    if (!result?.ok) {
      return (
        'Nicht gespeichert: ' +
        (
          result?.message ||
          'Unbekannter Fehler'
        )
      );
    }

    pending = null;

    return [
      'GEDÄCHTNIS ERFOLGREICH AKTUALISIERT',
      '',
      'Die Erinnerung wurde geändert.',
      'Vorher wurde eine Sicherung erstellt.',
      '',
      'Sicherung:',
      result.backupId,
      '',
      'Erinnerungen insgesamt: ' +
        result.count
    ].join('\n');
  }

  /* ==========================================
     14. BEFEHLE ERKENNEN
     ========================================== */

  function commandType(value) {
    const command = norm(value);

    if (
      [
        'gedachtnis analyse',
        'gedaechtnis analyse'
      ].includes(command)
    ) {
      return { type: 'analyse' };
    }

    if (
      [
        'gedachtnis ubersicht',
        'gedaechtnis uebersicht',
        'was weisst du uber mich'
      ].includes(command)
    ) {
      return { type: 'overview' };
    }

    if (
      [
        'gedachtnis vorschlage',
        'gedaechtnis vorschlaege'
      ].includes(command)
    ) {
      return { type: 'suggestions' };
    }

    if (
      [
        'gedachtnis bestatigen',
        'gedaechtnis bestaetigen'
      ].includes(command)
    ) {
      return { type: 'confirm' };
    }

    if (
      [
        'gedachtnis abbrechen',
        'gedaechtnis abbrechen'
      ].includes(command)
    ) {
      return { type: 'cancel' };
    }

    const match = clean(value).match(
      /^(?:gedächtnis|gedaechtnis|gedachtnis)\s+(suche|prüfen|pruefen|andern|ändern|aendern)\s*:\s*([\s\S]+)$/i
    );

    if (!match) {
      return null;
    }

    const type = norm(match[1]);

    return {
      type: type === 'suche'
        ? 'search'
        : (
            type === 'prufen' ||
            type === 'pruefen'
          )
          ? 'inspect'
          : 'propose',
      arg: clean(match[2])
    };
  }

  /* ==========================================
     15. CHAT-AUSGABE
     ========================================== */

  function output(message, role) {
    const chat = document.getElementById('log');

    if (!chat) {
      alert(message);
      return;
    }

    const item = document.createElement('div');

    item.className =
      role === 'user'
        ? 'msg user'
        : 'msg bot';

    const content = document.createElement('div');

    content.className = 'lb6-message-content';
    content.style.whiteSpace = 'pre-wrap';
    content.textContent = String(message);

    item.appendChild(content);
    chat.appendChild(item);

    chat.scrollTop = chat.scrollHeight;
  }

  /* ==========================================
     16. CHAT-BEFEHLE ABFANGEN
     ========================================== */

  function intercept(event) {
    const input = document.getElementById('input');

    if (!input) {
      return;
    }

    const command = commandType(
      input.value
    );

    if (!command) {
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

    const original = input.value.trim();

    input.value = '';

    output(original, 'user');

    try {
      let result;

      switch (command.type) {
        case 'analyse':
          result = analysis();
          break;

        case 'overview':
          result = overview();
          break;

        case 'suggestions':
          result = suggestions();
          break;

        case 'search':
          result = search(command.arg);
          break;

        case 'inspect':
          result = inspect(command.arg);
          break;

        case 'propose':
          result = propose(command.arg);
          break;

        case 'confirm':
          result = confirmChange();
          break;

        case 'cancel':
          pending = null;
          result =
            'Gedächtnisänderung abgebrochen.';
          break;

        default:
          result =
            'Unbekannter Gedächtnisbefehl.';
      }

      output(result, 'bot');

    } catch (error) {
      output(
        'Gedächtnis-KI: ' + error.message,
        'bot'
      );
    }
  }

  /* ==========================================
     17. INITIALISIERUNG
     ========================================== */

  function init() {
    const form = document.getElementById('bar');
    const button = document.getElementById('send');

    if (form) {
      form.addEventListener(
        'submit',
        intercept,
        true
      );
    }

    if (button) {
      button.addEventListener(
        'click',
        intercept,
        true
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
