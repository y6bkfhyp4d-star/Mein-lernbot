
/* =========================================================
   MEIN LERNBOT 6.0
   MEISTERPRÜFER – CODE-DIAGNOSE 2.0
   ---------------------------------------------------------
   Rolle:
   Strenger technischer Meister und Code-Prüfer.

   Aufgaben:
   - Fehleranalyse
   - Syntaxprüfung
   - Qualitätskontrolle
   - Sicherheitsprüfung
   - HTML/CSS/JS-Abgleich
   - Speicher- und Datenprüfung
   - Erkennung doppelter Funktionen
   - Wartbarkeit und Performance
   - Schweregradbewertung
   - Reparaturvorschläge
   - Automatischer Meister-Optimierungsprompt

   Keine kostenpflichtige API erforderlich.
   Keine automatische Änderung von Projektdateien.
   ========================================================= */

(() => {
  "use strict";

  if (window.CodeDiagnose) return;

  const VERSION = "2.0";

  const state = {
    files: [],
    findings: [],
    report: "",
    prompt: "",
    lastRun: null
  };

  const SEVERITY = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1
  };

  const LABELS = {
    critical: "KRITISCH",
    high: "SCHWER",
    medium: "MITTEL",
    low: "GERING",
    info: "HINWEIS"
  };

  const COLORS = {
    critical: "#ff4545",
    high: "#ff8a45",
    medium: "#e8b84d",
    low: "#75aaff",
    info: "#a78bfa",
    success: "#56c58a"
  };

  const $ = (tag, attrs = {}) => {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (key === "text") el.textContent = value;
      else if (key === "class") el.className = value;
      else if (key === "style") Object.assign(el.style, value);
      else el.setAttribute(key, value);
    }

    return el;
  };

  const normalize = value =>
    String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

  const lineAt = (source, index) =>
    source.slice(0, index).split("\n").length;

  const count = (source, regex) =>
    (source.match(regex) || []).length;

  const escapeHTML = value =>
    String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function addFinding(file, severity, category, title, detail, line = null, fix = "") {
    state.findings.push({
      file,
      severity,
      category,
      title,
      detail,
      line,
      fix,
      id: "MP-" + String(state.findings.length + 1).padStart(3, "0")
    });
  }

  function fileType(name) {
    const lower = name.toLowerCase();

    if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "js";
    if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
    if (lower.endsWith(".css")) return "css";
    if (lower.endsWith(".json")) return "json";
    if (lower.endsWith(".md")) return "md";

    return "other";
  }

  function getFile(name) {
    return state.files.find(file => file.name === name);
  }

  function getFiles(type) {
    return state.files.filter(file => file.type === type);
  }

  /* =======================================================
     1. GRUNDKONTROLLE
     ======================================================= */

  function inspectBasic(file) {
    const code = file.content;
    const lines = code.split("\n");

    if (!code.trim()) {
      addFinding(
        file.name, "high", "Datei",
        "Datei ist leer",
        "Die Datei enthält keinen Programmcode.",
        1,
        "Prüfen, ob die Datei versehentlich geleert wurde."
      );
      return;
    }

    if (code.length > 1000000) {
      addFinding(
        file.name, "medium", "Größe",
        "Sehr große Datei",
        "Die Datei enthält über eine Million Zeichen. Wartbarkeit und Ladezeit prüfen."
      );
    }

    if (code.length > 500000) {
      addFinding(
        file.name, "low", "Wartbarkeit",
        "Großer Quellcode",
        "Eine Aufteilung in sinnvolle Module könnte die Wartbarkeit verbessern."
      );
    }

    lines.forEach((line, index) => {
      if (line.length > 300) {
        addFinding(
          file.name, "low", "Lesbarkeit",
          "Sehr lange Codezeile",
          "Die Zeile enthält mehr als 300 Zeichen.",
          index + 1,
          "Die Zeile sinnvoll auf mehrere Zeilen aufteilen."
        );
      }

      if (/\s+$/.test(line)) {
        addFinding(
          file.name, "info", "Formatierung",
          "Leerzeichen am Zeilenende",
          "Unnötige Leerzeichen gefunden.",
          index + 1,
          "Nachgestellte Leerzeichen entfernen."
        );
      }

      if (/\t/.test(line)) {
        addFinding(
          file.name, "info", "Formatierung",
          "Tabulator gefunden",
          "Prüfen, ob im Projekt einheitlich eingerückt wird.",
          index + 1
        );
      }
    });

    if (!code.endsWith("\n")) {
      addFinding(
        file.name, "info", "Formatierung",
        "Dateiende ohne Zeilenumbruch",
        "Die Datei endet nicht mit einem Zeilenumbruch."
      );
    }
  }

  /* =======================================================
     2. JAVASCRIPT-SYNTAX
     ======================================================= */

  function inspectJavaScript(file) {
    const code = file.content;

    const hasModuleSyntax =
      /^\s*(?:import\s|export\s)/m.test(code);

    if (hasModuleSyntax) {
      addFinding(
        file.name, "info", "Module",
        "JavaScript-Modulsyntax erkannt",
        "Die Datei enthält import/export. Die einfache Syntaxprüfung mit Function kann diese Syntax nicht vollständig prüfen."
      );
    } else {
      try {
        new Function(code);
      } catch (error) {
        const message = error && error.message
          ? error.message
          : "Unbekannter Syntaxfehler";

        addFinding(
          file.name, "critical", "Syntax",
          "JavaScript-Syntaxfehler",
          message,
          null,
          "Den Syntaxfehler beheben und anschließend erneut prüfen."
        );
      }
    }

    const opens = count(code, /\{/g);
    const closes = count(code, /\}/g);

    if (opens !== closes) {
      addFinding(
        file.name, "critical", "Klammern",
        "Geschweifte Klammern stimmen nicht überein",
        `Öffnend: ${opens}, schließend: ${closes}. Diese Zählung ist ein Hinweis und berücksichtigt keine Zeichenketten oder Kommentare.`
      );
    }

    const parenOpen = count(code, /\(/g);
    const parenClose = count(code, /\)/g);

    if (parenOpen !== parenClose) {
      addFinding(
        file.name, "high", "Klammern",
        "Runde Klammern stimmen nicht überein",
        `Öffnend: ${parenOpen}, schließend: ${parenClose}. Die einfache Zählung kann Zeichenketten und Kommentare falsch einordnen.`
      );
    }

    const bracketOpen = count(code, /\[/g);
    const bracketClose = count(code, /\]/g);

    if (bracketOpen !== bracketClose) {
      addFinding(
        file.name, "medium", "Klammern",
        "Eckige Klammern stimmen nicht überein",
        `Öffnend: ${bracketOpen}, schließend: ${bracketClose}.`
      );
    }

    const functions = [
      ...code.matchAll(
        /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g
      )
    ];

    const names = functions.map(match => match[1]);
    const seen = new Set();

    names.forEach(name => {
      if (seen.has(name)) {
        addFinding(
          file.name, "high", "Doppelte Funktionen",
          "Doppelte Funktionsdeklaration",
          `Die Funktion "${name}" wurde mehrfach als function deklariert.`,
          null,
          "Prüfen, ob eine Funktion versehentlich doppelt vorhanden ist."
        );
      }

      seen.add(name);
    });

    const declarations = [
      ...code.matchAll(
        /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g
      )
    ];

    const declarationNames = new Map();

    declarations.forEach(match => {
      const name = match[1];
      declarationNames.set(
        name,
        (declarationNames.get(name) || 0) + 1
      );
    });

    declarationNames.forEach((amount, name) => {
      if (amount > 1) {
        addFinding(
          file.name, "medium", "Variablen",
          "Mehrfach deklarierter Variablenname",
          `"${name}" wurde ${amount}-mal deklariert. Das kann innerhalb verschiedener Funktionen völlig korrekt sein; bitte den Gültigkeitsbereich prüfen.`
        );
      }
    });

    const dangerousPatterns = [
      {
        regex: /\beval\s*\(/g,
        title: "eval() gefunden",
        severity: "high",
        detail: "eval() kann fremden Code ausführen und stellt ein Sicherheitsrisiko dar."
      },
      {
        regex: /\bnew\s+Function\s*\(/g,
        title: "Dynamische Codeausführung",
        severity: "medium",
        detail: "new Function() erstellt ausführbaren Code dynamisch. Verwendung prüfen."
      },
      {
        regex: /\bdocument\.write\s*\(/g,
        title: "document.write gefunden",
        severity: "medium",
        detail: "document.write kann den Seiteninhalt überschreiben."
      },
      {
        regex: /\bdebugger\s*;/g,
        title: "Debugger-Anweisung",
        severity: "low",
        detail: "Eine debugger-Anweisung ist möglicherweise noch im Produktivcode."
      },
      {
        regex: /\binnerHTML\s*=/g,
        title: "innerHTML-Zuweisung",
        severity: "medium",
        detail: "Bei ungeprüften Inhalten besteht XSS-Gefahr. textContent oder sichere DOM-Erstellung bevorzugen."
      }
    ];

    dangerousPatterns.forEach(rule => {
      let match;

      while ((match = rule.regex.exec(code)) !== null) {
        addFinding(
          file.name,
          rule.severity,
          "Sicherheit",
          rule.title,
          rule.detail,
          lineAt(code, match.index)
        );
      }
    });

    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(code)) {
      addFinding(
        file.name, "critical", "Geheimnisse",
        "Privater Schlüssel im Quellcode",
        "Ein privater Schlüssel scheint im Quellcode enthalten zu sein. Sofort entfernen und gegebenenfalls widerrufen."
      );
    }

    if (/(?:api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/i.test(code)) {
      addFinding(
        file.name, "high", "Geheimnisse",
        "Möglicherweise fest eingebauter API-Schlüssel",
        "Eine Zeichenfolge sieht wie ein API-Schlüssel oder Geheimnis aus. Keine echten Schlüssel im Browsercode speichern."
      );
    }

    if (/\bconsole\.(?:log|debug|info)\s*\(/.test(code)) {
      addFinding(
        file.name, "info", "Wartbarkeit",
        "Console-Ausgaben vorhanden",
        "Prüfen, ob Debug-Ausgaben im fertigen Produkt bleiben sollen."
      );
    }

    if (/localStorage\.setItem/.test(code)) {
      addFinding(
        file.name, "info", "Speicher",
        "Browser-Speicherung erkannt",
        "Prüfen, ob Daten versioniert, validiert und gegen Datenverlust abgesichert werden."
      );
    }

    if (/\bfetch\s*\(/.test(code) && !/\.catch\s*\(/.test(code)) {
      addFinding(
        file.name, "low", "Netzwerk",
        "Fetch ohne erkennbares catch",
        "Prüfen, ob Netzwerkfehler an allen relevanten Stellen abgefangen werden. Die Prüfung ist nur ein grober Hinweis."
      );
    }

    if (/setInterval\s*\(/.test(code)) {
      addFinding(
        file.name, "low", "Performance",
        "Intervall-Timer gefunden",
        "Prüfen, ob Timer beendet werden und keine unnötige Dauerlast entsteht."
      );
    }

    if (/addEventListener\s*\(/.test(code)) {
      addFinding(
        file.name, "info", "Ereignisse",
        "Event-Listener gefunden",
        "Prüfen, ob Listener mehrfach registriert werden oder bei Bedarf entfernt werden."
      );
    }

    if (/\bTODO\b|\bFIXME\b|\bHACK\b/.test(code)) {
      addFinding(
        file.name, "info", "Offene Arbeit",
        "Offene Entwicklungsmarkierungen",
        "TODO, FIXME oder HACK gefunden. Prüfen, ob unerledigte Arbeiten vorhanden sind."
      );
    }
  }

  /* =======================================================
     3. HTML-PRÜFUNG
     ======================================================= */

  function inspectHTML(file) {
    const code = file.content;

    if (!/<html\b/i.test(code)) {
      addFinding(
        file.name, "medium", "HTML",
        "HTML-Grundstruktur fehlt",
        "Ein html-Element wurde nicht gefunden."
      );
    }

    if (!/<meta\s+[^>]*charset=/i.test(code)) {
      addFinding(
        file.name, "low", "HTML",
        "Zeichenkodierung nicht gefunden",
        "Ein Meta-Charset-Element fehlt möglicherweise."
      );
    }

    if (!/<meta\s+[^>]*name=["']viewport["']/i.test(code)) {
      addFinding(
        file.name, "low", "Mobile",
        "Viewport-Meta-Tag fehlt",
        "Die Darstellung auf Smartphones könnte beeinträchtigt sein."
      );
    }

    if (!/<title\b/i.test(code)) {
      addFinding(
        file.name, "low", "HTML",
        "Seitentitel fehlt",
        "Ein title-Element wurde nicht gefunden."
      );
    }

    const ids = [
      ...code.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)
    ].map(match => match[1]);

    const seen = new Set();

    ids.forEach(id => {
      if (seen.has(id)) {
        addFinding(
          file.name, "high", "HTML",
          "Doppelte HTML-ID",
          `Die ID "${id}" ist mehrfach vorhanden. IDs sollten eindeutig sein.`
        );
      }

      seen.add(id);
    });

    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(code, "text/html");

      doc.querySelectorAll("img:not([alt])").forEach(() => {
        addFinding(
          file.name, "low", "Barrierefreiheit",
          "Bild ohne alt-Attribut",
          "Mindestens ein Bild besitzt kein alt-Attribut."
        );
      });

      doc.querySelectorAll("button").forEach(button => {
        if (!button.getAttribute("type")) {
          addFinding(
            file.name, "low", "Formulare",
            "Button ohne type-Attribut",
            "Ein Button innerhalb eines Formulars kann ungewollt absenden. type explizit setzen."
          );
        }
      });

      doc.querySelectorAll("input, textarea, select").forEach(input => {
        if (
          input.id &&
          !doc.querySelector(`label[for="${CSS.escape(input.id)}"]`) &&
          !input.getAttribute("aria-label")
        ) {
          addFinding(
            file.name, "low", "Barrierefreiheit",
            "Formularfeld ohne erkennbare Beschriftung",
            `Das Feld "${input.id}" hat kein passendes label oder aria-label.`
          );
        }
      });
    }

    const scripts = [
      ...code.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)
    ];

    scripts.forEach(match => {
      const src = match[1];

      if (/^https?:\/\//i.test(src)) {
        addFinding(
          file.name, "info", "Abhängigkeiten",
          "Externes Script eingebunden",
          `Externe Scriptquelle: ${src}. Herkunft und Vertrauenswürdigkeit prüfen.`
        );
      }
    });
  }

  /* =======================================================
     4. CSS-PRÜFUNG
     ======================================================= */

  function inspectCSS(file) {
    const code = file.content;

    if (count(code, /\{/g) !== count(code, /\}/g)) {
      addFinding(
        file.name, "high", "CSS",
        "CSS-Klammern stimmen nicht überein",
        "Öffnende und schließende CSS-Blöcke zählen nicht überein."
      );
    }

    if (/!important/g.test(code)) {
      addFinding(
        file.name, "info", "CSS",
        "!important verwendet",
        "Prüfen, ob die CSS-Spezifität sauberer gelöst werden kann."
      );
    }

    if (/position\s*:\s*fixed/i.test(code)) {
      addFinding(
        file.name, "info", "Layout",
        "Fix positionierte Elemente",
        "Auf mobilen Geräten prüfen, ob fixierte Elemente Inhalte verdecken."
      );
    }

    if (/overflow\s*:\s*hidden/i.test(code)) {
      addFinding(
        file.name, "info", "Layout",
        "overflow:hidden gefunden",
        "Prüfen, ob Inhalte versehentlich abgeschnitten werden."
      );
    }

    const colors = code.match(/#[0-9a-f]{3,8}\b/gi) || [];

    if (colors.length > 100) {
      addFinding(
        file.name, "low", "Design",
        "Viele einzelne Farbwerte",
        "CSS-Farbvariablen könnten das Design konsistenter machen."
      );
    }
  }

  /* =======================================================
     5. JSON-PRÜFUNG
     ======================================================= */

  function inspectJSON(file) {
    try {
      JSON.parse(file.content);
    } catch (error) {
      addFinding(
        file.name, "critical", "JSON",
        "Ungültiges JSON",
        error.message,
        null,
        "JSON-Syntax korrigieren. Auf Kommas, Anführungszeichen und Klammern achten."
      );
    }
  }

  /* =======================================================
     6. DATEIÜBERGREIFENDE PRÜFUNG
     ======================================================= */

  function inspectCrossFiles() {
    const htmlFiles = getFiles("html");
    const jsFiles = getFiles("js");
    const cssFiles = getFiles("css");

    htmlFiles.forEach(html => {
      const code = html.content;

      const scriptSources = [
        ...code.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)
      ].map(match => match[1]);

      scriptSources.forEach(src => {
        if (/^(https?:|\/\/|data:)/i.test(src)) return;

        const normalized = src.replace(/^\.\//, "");
        const exists = state.files.some(file =>
          file.name === normalized ||
          file.name.endsWith("/" + normalized)
        );

        if (!exists) {
          addFinding(
            html.name, "high", "Dateiverknüpfung",
            "Eingebundene JavaScript-Datei nicht gefunden",
            `HTML bindet "${src}" ein, aber diese Datei wurde nicht mit ausgewählt.`
          );
        }
      });

      const styles = [
        ...code.matchAll(/<link\b[^>]*href=["']([^"']+\.css)["']/gi)
      ].map(match => match[1]);

      styles.forEach(src => {
        const exists = cssFiles.some(file =>
          file.name === src ||
          file.name.endsWith("/" + src)
        );

        if (!exists && !/^https?:/i.test(src)) {
          addFinding(
            html.name, "medium", "Dateiverknüpfung",
            "CSS-Datei nicht gefunden",
            `HTML verweist auf "${src}", die Datei wurde nicht mit ausgewählt.`
          );
        }
      });

      jsFiles.forEach(js => {
        const ids = [
          ...js.content.matchAll(
            /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g
          )
        ].map(match => match[1]);

        const htmlIds = new Set([
          ...code.matchAll(/\bid=["']([^"']+)["']/gi)
        ].map(match => match[1]));

        ids.forEach(id => {
          if (!htmlIds.has(id)) {
            addFinding(
              js.name, "medium", "HTML/JS-Abgleich",
              "JavaScript-ID nicht im HTML gefunden",
              `JavaScript sucht nach "#${id}", aber die ausgewählte HTML-Datei enthält diese ID nicht.`
            );
          }
        });
      });
    });

    if (!htmlFiles.length) {
      addFinding(
        "Projekt", "info", "Projektprüfung",
        "Keine HTML-Datei ausgewählt",
        "Der HTML/JavaScript-Abgleich konnte nicht vollständig durchgeführt werden."
      );
    }

    if (!jsFiles.length) {
      addFinding(
        "Projekt", "info", "Projektprüfung",
        "Keine JavaScript-Datei ausgewählt",
        "Die JavaScript-Analyse konnte nicht durchgeführt werden."
      );
    }
  }

  /* =======================================================
     7. LERNBOT-SPEZIALPRÜFUNG
     ======================================================= */

  function inspectLernBot() {
    const all = state.files.map(file => file.content).join("\n");

    const checks = [
      {
        pattern: /\bdata\.memory\b/,
        title: "Gedächtnisspeicher",
        detail: "Ein zentraler Memory-Speicher wurde gefunden."
      },
      {
        pattern: /\bsave\s*\(/,
        title: "Speicherfunktion",
        detail: "Eine Speicherfunktion wurde gefunden."
      },
      {
        pattern: /\bremember\s*\(/,
        title: "Erinnerungsfunktion",
        detail: "Eine Erinnerungsfunktion wurde gefunden."
      },
      {
        pattern: /\bforgetMemory\s*\(/,
        title: "Vergessensfunktion",
        detail: "Eine Funktion zum Löschen von Erinnerungen wurde gefunden."
      },
      {
        pattern: /\baddEventListener\s*\(/,
        title: "Ereignissteuerung",
        detail: "Ereignissteuerung wurde gefunden."
      },
      {
        pattern: /\btry\s*\{/,
        title: "Fehlerbehandlung",
        detail: "Try-Blöcke wurden gefunden."
      }
    ];

    checks.forEach(check => {
      if (!check.pattern.test(all)) {
        addFinding(
          "LernBot-Projekt", "info", "LernBot-Prüfung",
          "Funktion nicht erkannt: " + check.title,
          check.detail + " Die Funktion wurde in den ausgewählten Dateien nicht erkannt. Das bedeutet nicht automatisch, dass sie fehlt."
        );
      }
    });

    if (/data\.memories\b/.test(all) && /data\.memory\b/.test(all)) {
      addFinding(
        "LernBot-Projekt", "medium", "Gedächtnis",
        "Unterschiedliche Memory-Feldnamen",
        "Sowohl data.memory als auch data.memories wurden gefunden. Datenstruktur und Migration prüfen."
      );
    }

    if (/localStorage\.clear\s*\(/.test(all)) {
      addFinding(
        "LernBot-Projekt", "high", "Datenschutz",
        "localStorage.clear() gefunden",
        "Diese Funktion kann sämtliche lokalen Browserdaten löschen. Unbedingt prüfen."
      );
    }
  }

  /* =======================================================
     8. GESAMTANALYSE
     ======================================================= */

  function analyze() {
    state.findings = [];

    if (!state.files.length) {
      return {
        files: 0,
        findings: [],
        report: "Keine Dateien geladen."
      };
    }

    state.files.forEach(file => {
      inspectBasic(file);

      if (file.type === "js") inspectJavaScript(file);
      if (file.type === "html") inspectHTML(file);
      if (file.type === "css") inspectCSS(file);
      if (file.type === "json") inspectJSON(file);
    });

    inspectCrossFiles();
    inspectLernBot();

    state.findings.sort((a, b) =>
      SEVERITY[b.severity] - SEVERITY[a.severity]
    );

    state.lastRun = new Date().toISOString();
    state.report = createReport();

    return {
      files: state.files.length,
      findings: state.findings,
      report: state.report,
      score: getScore()
    };
  }

  /* =======================================================
     9. QUALITÄTSBEWERTUNG
     ======================================================= */

  function getScore() {
    let score = 100;

    state.findings.forEach(item => {
      const penalty = {
        critical: 25,
        high: 12,
        medium: 5,
        low: 2,
        info: 0
      }[item.severity];

      score -= penalty;
    });

    return Math.max(0, Math.min(100, score));
  }

  function getRating(score) {
    if (score >= 95) return "Sehr gut – wenige Auffälligkeiten";
    if (score >= 80) return "Gut – Verbesserungen empfohlen";
    if (score >= 60) return "Ausbaufähig – mehrere Probleme";
    if (score >= 35) return "Schwach – gründliche Überarbeitung nötig";

    return "Kritisch – zuerst grundlegende Fehler beheben";
  }

  /* =======================================================
     10. MEISTERBERICHT
     ======================================================= */

  function createReport() {
    const groups = {};

    state.findings.forEach(item => {
      groups[item.severity] ||= [];
      groups[item.severity].push(item);
    });

    const score = getScore();

    const output = [
      "MEIN LERNBOT – MEISTERPRÜFUNG",
      "Version: " + VERSION,
      "Prüfzeit: " + new Date().toLocaleString("de-DE"),
      "",
      "DATEIEN: " + state.files.length,
      "BEFUNDE: " + state.findings.length,
      "QUALITÄTSPUNKTZAHL: " + score + "/100",
      "BEWERTUNG: " + getRating(score),
      "",
      "DATEIÜBERSICHT:",
      ...state.files.map(file =>
        "- " + file.name + " (" + file.type + ", " +
        file.content.length + " Zeichen)"
      ),
      ""
    ];

    ["critical", "high", "medium", "low", "info"].forEach(level => {
      output.push(
        "===== " + LABELS[level] + " ====="
      );

      const items = groups[level] || [];

      if (!items.length) {
        output.push("Keine Befunde.");
      } else {
        items.forEach(item => {
          output.push(
            item.id + " | " + item.file +
            (item.line ? " | Zeile " + item.line : "")
          );
          output.push("Problem: " + item.title);
          output.push("Details: " + item.detail);

          if (item.fix) {
            output.push("Vorschlag: " + item.fix);
          }

          output.push("");
        });
      }

      output.push("");
    });

    output.push(
      "WICHTIGE EINSCHRÄNKUNG:",
      "Diese Prüfung ist eine statische Voranalyse. Sie ersetzt keine vollständigen Laufzeit-, Browser-, Sicherheits- oder Funktionstests."
    );

    return output.join("\n");
  }

  /* =======================================================
     11. MEISTER-OPTIMIERUNGSPROMPT
     ======================================================= */

  function createPrompt() {
    if (!state.files.length) {
      return "Bitte zuerst Projektdateien laden.";
    }

    if (!state.lastRun) analyze();

    const report = state.report;

    const source = state.files.map(file => {
      return [
        "",
        "==============================",
        "DATEI: " + file.name,
        "==============================",
        file.content
      ].join("\n");
    }).join("\n");

    state.prompt = `
DU BIST DER TECHNISCHE MEISTERPRÜFER UND SENIOR-ENTWICKLER.

Du kontrollierst dieses Softwareprojekt so streng und sorgfältig,
wie ein erfahrener Meister die Arbeit eines Auszubildenden prüft.

Du bist nicht dazu da, den Entwickler zu loben.
Du bist dazu da, Fehler aufzudecken, Qualität sicherzustellen
und eine fachgerechte Lösung zu verlangen.

DEINE GRUNDREGELN:

1. Arbeite sorgfältig und vollständig.
2. Erfinde keine Fehler.
3. Unterscheide echte Fehler von bloßen Vermutungen.
4. Erkläre, warum etwas falsch oder riskant ist.
5. Nenne betroffene Dateien und möglichst genaue Zeilen.
6. Prüfe nicht nur einzelne Funktionen, sondern ihre Zusammenarbeit.
7. Entferne keine funktionierenden Funktionen ohne Notwendigkeit.
8. Erhalte die vorhandene Projektarchitektur, wenn sie sinnvoll ist.
9. Vermeide unnötige Komplexität.
10. Schreibe keinen Code, den du nicht nachvollziehbar begründen kannst.
11. Behaupte niemals, etwas getestet zu haben, wenn du es nicht getestet hast.
12. Weise auf Unsicherheiten und fehlende Dateien ausdrücklich hin.

DEINE PRÜFGEBIETE:

A. SYNTAX UND STRUKTUR
- Klammern, Funktionen, Blöcke und Verschachtelung
- doppelte oder widersprüchliche Deklarationen
- fehlerhafte Aufrufe
- fehlende Rückgabewerte
- ungültige oder nicht erreichbare Codeabschnitte
- fehlerhafte Modulgrenzen

B. FUNKTIONSLOGIK
- falsche Bedingungen
- falsche Reihenfolgen
- unerreichbare Funktionen
- Endlosschleifen
- unerwartete Seiteneffekte
- Fehler bei leeren oder ungültigen Eingaben
- Fehler bei parallelen Aktionen

C. DATEIÜBERGREIFENDE KOMPATIBILITÄT
- HTML-Elemente und JavaScript-Selektoren
- CSS-Klassen und HTML-Struktur
- Script-Reihenfolge
- Funktionsaufrufe zwischen Modulen
- globale Variablen
- Namenskonflikte
- doppelte Event-Listener

D. GEDÄCHTNIS UND DATENSPEICHER
- Datenverlust
- falsche Feldnamen
- inkonsistente Speicherstrukturen
- fehlende Migration
- falsche Parameter
- falsche IDs
- fehlerhafte Such- und Löschfunktionen
- Sicherung und Wiederherstellung
- Umgang mit beschädigten Daten

E. SICHERHEIT
- unsichere HTML-Ausgabe
- dynamische Codeausführung
- offengelegte Zugangsdaten
- unsichere Datenimporte
- unkontrollierte Eingaben
- Datenschutz
- unnötige Berechtigungen

F. PERFORMANCE
- unnötige Wiederholungen
- doppelte Berechnungen
- große Datenmengen
- Speicherlecks
- unnötige Event-Listener
- unnötige DOM-Aktualisierungen
- überflüssige Funktionen

G. QUALITÄT UND WARTBARKEIT
- klare Benennung
- sinnvolle Modulaufteilung
- nachvollziehbare Funktionen
- Fehlerbehandlung
- Kommentare
- Erweiterbarkeit
- Vermeidung unnötiger Komplexität

H. BENUTZEROBERFLÄCHE
- mobile Darstellung
- Bedienbarkeit
- Formulare
- Statusmeldungen
- Ladezustände
- Fehleranzeigen
- Barrierefreiheit

ARBEITSWEISE:

PHASE 1 – BESTANDSAUFNAHME
Erkläre, welche Dateien vorhanden sind und welche fehlen könnten.

PHASE 2 – FEHLERPRÜFUNG
Überprüfe jeden Befund aus dem Meisterbericht.
Prüfe zusätzlich selbstständig nach weiteren Problemen.

PHASE 3 – BEWERTUNG
Ordne jeden bestätigten Fehler ein:
- KRITISCH
- SCHWER
- MITTEL
- GERING
- HINWEIS

PHASE 4 – REPARATURPLAN
Erstelle eine nummerierte Liste.
Nenne:
- betroffene Datei
- betroffenes Element oder Funktion
- Ursache
- Auswirkung
- konkrete Lösung
- mögliche Nebenwirkungen

PHASE 5 – OPTIMIERUNG
Schlage Verbesserungen vor, die den Code tatsächlich besser machen.
Keine Änderungen nur um des Änderns willen.

PHASE 6 – CODELIEFERUNG
Wenn Änderungen angefordert werden:
- liefere vollständige Dateien oder eindeutig abgegrenzte vollständige Ersatzabschnitte
- kennzeichne jede Datei eindeutig
- achte auf die richtige Reihenfolge
- erhalte bestehende Funktionen
- prüfe die Zusammenarbeit der Teile erneut

PHASE 7 – ABSCHLUSSKONTROLLE
Erstelle eine Liste:
- behobene Fehler
- noch offene Fehler
- nicht überprüfbare Punkte
- notwendige manuelle Tests
- verbleibende Risiken

MEISTERREGEL:

Ein Fehler gilt nicht als behoben, nur weil der Code anders aussieht.
Er gilt erst dann als behoben, wenn die Ursache nachvollziehbar beseitigt
und die Lösung angemessen überprüft wurde.

WICHTIG:
Ändere zunächst nichts automatisch.
Beginne mit einer vollständigen Analyse und einem Reparaturplan.
Warte auf meine Freigabe, bevor du größere Änderungen vornimmst.

========================================
AUTOMATISCHER DIAGNOSEBERICHT
========================================

${report}

========================================
VOLLSTÄNDIGE PROJEKTDATEIEN
========================================

${source}
`.trim();

    return state.prompt;
  }

  /* =======================================================
     12. BENUTZEROBERFLÄCHE
     ======================================================= */

  function createButton(label, action) {
    const button = $("button", { text: label });

    Object.assign(button.style, {
      padding: "12px",
      borderRadius: "9px",
      border: "1px solid #494960",
      background: "#29293b",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer"
    });

    button.addEventListener("click", action);

    return button;
  }

  function open() {
    if (document.getElementById("lb-meisterpruefer")) {
      return;
    }

    const panel = $("div", { id: "lb-meisterpruefer" });

    Object.assign(panel.style, {
      position: "fixed",
      inset: "3%",
      zIndex: "999999",
      background: "#11111a",
      color: "#f5f3ff",
      border: "1px solid #494960",
      borderRadius: "16px",
      padding: "16px",
      overflowY: "auto",
      fontFamily: "system-ui, sans-serif",
      boxShadow: "0 15px 60px #000a"
    });

    const heading = $("h2", {
      text: "Meisterprüfer – Codekontrolle"
    });

    const intro = $("p", {
      text: "Strenge technische Prüfung deines LernBot-Projekts."
    });

    const fileInput = $("input", {
      type: "file",
      multiple: "multiple",
      accept: ".js,.mjs,.html,.htm,.css,.json,.md"
    });

    const status = $("p", {
      text: "Noch keine Dateien geladen."
    });

    const report = $("pre");

    const prompt = $("textarea", {
      placeholder: "Hier erscheint dein Meister-Optimierungsprompt..."
    });

    Object.assign(report.style, {
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      background: "#20202e",
      padding: "12px",
      borderRadius: "10px",
      fontSize: "12px",
      lineHeight: "1.5"
    });

    Object.assign(prompt.style, {
      width: "100%",
      minHeight: "320px",
      boxSizing: "border-box",
      padding: "12px",
      marginTop: "12px",
      borderRadius: "10px",
      background: "#20202e",
      color: "#ffffff",
      border: "1px solid #494960",
      fontSize: "12px",
      lineHeight: "1.5"
    });

    const close = createButton("Schließen", () => panel.remove());

    const analyzeButton = createButton("1. Projekt prüfen", () => {
      if (!state.files.length) {
        status.textContent = "Bitte zuerst Dateien auswählen.";
        return;
      }

      const result = analyze();

      report.textContent = result.report;

      status.textContent =
        result.files + " Dateien geprüft | " +
        result.findings.length + " Auffälligkeiten | " +
        result.score + "/100 Punkte";
    });

    const promptButton = createButton(
      "2. Meister-Prompt erstellen",
      () => {
        if (!state.files.length) {
          status.textContent = "Bitte zuerst Dateien auswählen.";
          return;
        }

        if (!state.lastRun) analyze();

        prompt.value = createPrompt();
        status.textContent = "Meister-Prompt wurde erstellt.";
      }
    );

    const copyButton = createButton("3. Prompt kopieren", async () => {
      if (!prompt.value) {
        status.textContent = "Erstelle zuerst einen Prompt.";
        return;
      }

      try {
        await navigator.clipboard.writeText(prompt.value);
        status.textContent = "Prompt erfolgreich kopiert.";
      } catch {
        prompt.focus();
        prompt.select();

        status.textContent =
          "Prompt markiert. Bitte manuell kopieren.";
      }
    });

    fileInput.addEventListener("change", async event => {
      state.files = [];
      state.findings = [];
      state.lastRun = null;

      const selected = [...event.target.files];

      for (const file of selected) {
        try {
          const content = await file.text();

          state.files.push({
            name: file.name,
            content: normalize(content),
            type: fileType(file.name),
            size: file.size
          });
        } catch (error) {
          status.textContent =
            "Fehler beim Lesen von " + file.name + ": " + error.message;
        }
      }

      status.textContent =
        state.files.length + " Dateien erfolgreich geladen.";

      report.textContent = "";
      prompt.value = "";
    });

    panel.append(
      heading,
      intro,
      fileInput,
      status,
      analyzeButton,
      promptButton,
      copyButton,
      close,
      report,
      prompt
    );

    document.body.appendChild(panel);
  }

  /* =======================================================
     13. INTEGRATION IN DEN LERNBOT
     ======================================================= */

  function init() {
    document.addEventListener("click", event => {
      const button = event.target.closest("button");

      if (!button) return;

      const label = (button.textContent || "")
        .trim()
        .toLowerCase();

      if (label === "code-labor") {
        event.preventDefault();
        event.stopImmediatePropagation();
        open();
      }
    }, true);
  }

  window.CodeDiagnose = {
    version: VERSION,
    open,
    analyze,
    createPrompt,
    getReport: () => state.report,
    getFindings: () => [...state.findings],
    getFiles: () => state.files.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size
    }))
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
