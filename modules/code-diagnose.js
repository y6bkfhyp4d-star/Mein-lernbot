
/* ============================================================
   MEIN LERNBOT 6.0
   TECHNISCHER MEISTERPRÜFER 4.0
   ============================================================

   Automatische Projektanalyse:
   - HTML, JavaScript und CSS
   - Eingebundene Dateien
   - Lokale JavaScript-Imports
   - Funktionen und Systemkomponenten
   - Speicher und Gedächtnis
   - Agenten und Schnittstellen
   - Sicherheits- und Qualitätsprüfung
   - Fehlerbericht
   - Automatischer Optimierungsprompt

   Keine kostenpflichtige API.
   Keine automatische Änderung von Quelldateien.
   ============================================================ */

(() => {
  "use strict";

  if (window.CodeDiagnose) return;

  const VERSION = "4.0";

  const state = {
    files: [],
    findings: [],
    inventory: [],
    report: "",
    prompt: "",
    running: false
  };

  const SEVERITY = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1
  };

  const LABEL = {
    critical: "KRITISCH",
    high: "SCHWER",
    medium: "MITTEL",
    low: "GERING",
    info: "HINWEIS"
  };

  const $ = (tag, props = {}) => {
    const el = document.createElement(tag);
    Object.assign(el, props);
    return el;
  };

  const normalize = value =>
    String(value || "").replace(/\r\n/g, "\n");

  const findAll = (source, regex) =>
    [...source.matchAll(regex)];

  function addFinding(level, category, title, detail, file = "Projekt") {
    state.findings.push({
      level,
      category,
      title,
      detail,
      file
    });
  }

  function addInventory(category, name, status, detail = "") {
    state.inventory.push({
      category,
      name,
      status,
      detail
    });
  }

  function getFile(name) {
    return state.files.find(file => file.name === name);
  }

  function filesOf(type) {
    return state.files.filter(file => file.type === type);
  }

  function typeOf(name) {
    const path = name.toLowerCase().split("?")[0];

    if (/\.(js|mjs|cjs)$/.test(path)) return "js";
    if (/\.html?$/.test(path)) return "html";
    if (/\.css$/.test(path)) return "css";
    if (/\.json$/.test(path)) return "json";

    return "other";
  }

  /* ============================================================
     1. SICHERER DATEIZUGRIFF
     ============================================================ */

  function resolveLocal(path, base) {
    try {
      const url = new URL(path, base);

      if (url.origin !== location.origin) return null;
      if (!["http:", "https:"].includes(url.protocol)) return null;

      return url.href;
    } catch {
      return null;
    }
  }

  async function fetchText(url) {
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    return response.text();
  }

  async function loadFile(url, type, depth = 0) {
    if (state.files.some(file => file.url === url)) return;

    if (depth > 8) {
      addFinding(
        "medium",
        "Projektstruktur",
        "Importtiefe überschritten",
        "Weitere Imports wurden nach acht Ebenen nicht mehr verfolgt.",
        url
      );
      return;
    }

    try {
      const content = normalize(await fetchText(url));

      const file = {
        name: new URL(url).pathname,
        url,
        type,
        content,
        size: content.length,
        status: "geladen"
      };

      state.files.push(file);

      if (type === "js") {
        await discoverJSImports(file, depth);
      }

      if (type === "css") {
        await discoverCSSImports(file, depth);
      }

    } catch (error) {
      addFinding(
        "high",
        "Dateizugriff",
        "Datei konnte nicht gelesen werden",
        url + " – " + error.message,
        url
      );
    }
  }

  /* ============================================================
     2. JAVASCRIPT-IMPORTS FINDEN
     ============================================================ */

  async function discoverJSImports(file, depth) {
    const patterns = [
      /\bimport\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g,
      /\bexport\s+[^'"]*?\s+from\s+["']([^"']+)["']/g,
      /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
    ];

    const imports = new Set();

    patterns.forEach(pattern => {
      findAll(file.content, pattern).forEach(match => {
        imports.add(match[1]);
      });
    });

    for (const path of imports) {
      if (!path.startsWith(".")) {
        addFinding(
          "info",
          "Abhängigkeiten",
          "Paket oder externes Modul erkannt",
          path + " wurde nicht automatisch aus einem CDN oder Paketverzeichnis geladen.",
          file.name
        );
        continue;
      }

      const url = resolveLocal(path, file.url);

      if (url) {
        await loadFile(url, "js", depth + 1);
      }
    }
  }

  async function discoverCSSImports(file, depth) {
    const imports = findAll(
      file.content,
      /@import\s+(?:url\()?["']([^"']+)["']/g
    );

    for (const match of imports) {
      const path = match[1];

      if (/^https?:\/\//i.test(path)) continue;

      const url = resolveLocal(path, file.url);

      if (url) {
        await loadFile(url, "css", depth + 1);
      }
    }
  }

  /* ============================================================
     3. HTML UND PROJEKTDATEIEN FINDEN
     ============================================================ */

  async function discoverProject() {
    state.files = [];
    state.findings = [];
    state.inventory = [];

    const htmlURL = new URL("./index.html", location.href).href;

    let htmlContent;

    try {
      htmlContent = normalize(await fetchText(htmlURL));
    } catch (error) {
      addFinding(
        "critical",
        "Hauptdatei",
        "index.html nicht erreichbar",
        error.message
      );
      return;
    }

    const htmlFile = {
      name: "index.html",
      url: htmlURL,
      type: "html",
      content: htmlContent,
      size: htmlContent.length,
      status: "geladen"
    };

    state.files.push(htmlFile);

    const doc = new DOMParser().parseFromString(
      htmlContent,
      "text/html"
    );

    const baseTag = doc.querySelector("base[href]");

    const baseURL = baseTag
      ? new URL(baseTag.getAttribute("href"), htmlURL).href
      : htmlURL;

    const discovered = new Map();

    /* Scripts */
    doc.querySelectorAll("script[src]").forEach(script => {
      const src = script.getAttribute("src");
      const url = resolveLocal(src, baseURL);

      if (url) {
        discovered.set(url, "js");
      } else {
        addFinding(
          "info",
          "Externe Abhängigkeiten",
          "Externes Script nicht untersucht",
          src
        );
      }
    });

    /* Stylesheets */
    doc.querySelectorAll('link[rel~="stylesheet"][href]')
      .forEach(link => {
        const href = link.getAttribute("href");
        const url = resolveLocal(href, baseURL);

        if (url) {
          discovered.set(url, "css");
        } else {
          addFinding(
            "info",
            "Externe Abhängigkeiten",
            "Externes CSS nicht untersucht",
            href
          );
        }
      });

    /* Inline-Scripts */
    let inlineJS = 0;

    doc.querySelectorAll("script:not([src])").forEach(script => {
      if (!script.textContent.trim()) return;

      inlineJS++;

      state.files.push({
        name: "index.html – Inline-JS-" + inlineJS,
        url: htmlURL,
        type: "js",
        content: normalize(script.textContent),
        size: script.textContent.length,
        status: "aus HTML gelesen"
      });
    });

    /* Inline-CSS */
    let inlineCSS = 0;

    doc.querySelectorAll("style").forEach(style => {
      if (!style.textContent.trim()) return;

      inlineCSS++;

      state.files.push({
        name: "index.html – Inline-CSS-" + inlineCSS,
        url: htmlURL,
        type: "css",
        content: normalize(style.textContent),
        size: style.textContent.length,
        status: "aus HTML gelesen"
      });
    });

    for (const [url, type] of discovered) {
      await loadFile(url, type);
    }

    /* Bekannte Hauptdatei zusätzlich suchen */
    const appURL = new URL("./app.js", htmlURL).href;

    if (!state.files.some(file => file.url === appURL)) {
      await loadFile(appURL, "js");

      if (state.files.some(file => file.url === appURL)) {
        addFinding(
          "info",
          "Projektstruktur",
          "app.js separat gefunden",
          "Die Datei wurde geladen, obwohl sie nicht über den erkannten Script-Pfad gefunden wurde."
        );
      }
    }
  }

  /* ============================================================
     4. JAVASCRIPT-SYNTAX UND STRUKTUR
     ============================================================ */

  function inspectJS(file) {
    const code = file.content;

    if (!code.trim()) return;

    const isModule =
      /^\s*(?:import\s|export\s)/m.test(code);

    if (!isModule) {
      try {
        new Function(code);
      } catch (error) {
        addFinding(
          "critical",
          "JavaScript-Syntax",
          "Syntaxfehler",
          error.message,
          file.name
        );
      }
    } else {
      addFinding(
        "info",
        "JavaScript-Syntax",
        "ES-Modul erkannt",
        "Die Syntaxprüfung über Function ist für ES-Module nicht vollständig geeignet.",
        file.name
      );
    }

    const functions = findAll(
      code,
      /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g
    ).map(match => match[1]);

    const seen = new Set();

    functions.forEach(name => {
      if (seen.has(name)) {
        addFinding(
          "medium",
          "Doppelte Funktionen",
          "Funktion mehrfach deklariert",
          name,
          file.name
        );
      }

      seen.add(name);
    });

    const checks = [
      [/\beval\s*\(/, "high", "eval() gefunden", "Dynamische Codeausführung prüfen."],
      [/document\.write\s*\(/, "medium", "document.write gefunden", "Kann die Seite überschreiben."],
      [/innerHTML\s*=/, "medium", "innerHTML verwendet", "Ungeprüfte Inhalte können Sicherheitsrisiken verursachen."],
      [/debugger\s*;/, "low", "Debugger gefunden", "Prüfen, ob die Anweisung entfernt werden sollte."],
      [/localStorage\.clear\s*\(/, "high", "Gesamter LocalStorage wird gelöscht", "Risiko für Benutzerdaten prüfen."]
    ];

    checks.forEach(([regex, level, title, detail]) => {
      if (regex.test(code)) {
        addFinding(level, "Sicherheit und Qualität", title, detail, file.name);
      }
    });

    if (/-----BEGIN .*PRIVATE KEY-----/.test(code)) {
      addFinding(
        "critical",
        "Sicherheit",
        "Privater Schlüssel im Quellcode",
        "Möglicherweise wurde ein privater Schlüssel veröffentlicht.",
        file.name
      );
    }

    if (/\bTODO\b|\bFIXME\b|\bHACK\b/.test(code)) {
      addFinding(
        "info",
        "Offene Arbeiten",
        "Entwicklungsmarkierungen",
        "Unerledigte Aufgaben im Code prüfen.",
        file.name
      );
    }

    addInventory(
      "JavaScript",
      file.name,
      "Vorhanden",
      functions.length + " benannte Funktionsdeklarationen erkannt."
    );
  }

  /* ============================================================
     5. HTML-PRÜFUNG
     ============================================================ */

  function inspectHTML(file) {
    const doc = new DOMParser().parseFromString(
      file.content,
      "text/html"
    );

    if (!doc.querySelector("title")) {
      addFinding(
        "low",
        "HTML",
        "Seitentitel fehlt",
        "Kein title-Element gefunden.",
        file.name
      );
    }

    if (!doc.querySelector('meta[name="viewport"]')) {
      addFinding(
        "low",
        "Mobile",
        "Viewport fehlt",
        "Mobile Darstellung überprüfen.",
        file.name
      );
    }

    const ids = [...doc.querySelectorAll("[id]")]
      .map(element => element.id);

    const seen = new Set();

    ids.forEach(id => {
      if (seen.has(id)) {
        addFinding(
          "high",
          "HTML",
          "Doppelte ID",
          "Die ID #" + id + " ist mehrfach vorhanden.",
          file.name
        );
      }

      seen.add(id);
    });

    doc.querySelectorAll("button").forEach(button => {
      if (!button.hasAttribute("type")) {
        addFinding(
          "low",
          "HTML",
          "Button ohne type",
          "Buttontyp explizit festlegen.",
          file.name
        );
      }
    });

    addInventory(
      "HTML",
      file.name,
      "Vorhanden",
      ids.length + " HTML-IDs erkannt."
    );
  }

  /* ============================================================
     6. CSS-PRÜFUNG
     ============================================================ */

  function inspectCSS(file) {
    const code = file.content;

    const opens = (code.match(/\{/g) || []).length;
    const closes = (code.match(/\}/g) || []).length;

    if (opens !== closes) {
      addFinding(
        "high",
        "CSS",
        "CSS-Klammern stimmen nicht überein",
        "Öffnende und schließende Blöcke stimmen nicht überein.",
        file.name
      );
    }

    if (/!important/.test(code)) {
      addFinding(
        "info",
        "CSS",
        "!important verwendet",
        "Prüfen, ob eine sauberere CSS-Struktur möglich ist.",
        file.name
      );
    }

    addInventory(
      "CSS",
      file.name,
      "Vorhanden",
      code.length + " Zeichen."
    );
  }

  /* ============================================================
     7. DATEIÜBERGREIFENDE PRÜFUNG
     ============================================================ */

  function inspectConnections() {
    const html = getFile("index.html");

    if (!html) return;

    const jsFiles = filesOf("js");

    const htmlIDs = new Set(
      [...html.content.matchAll(/\bid=["']([^"']+)["']/gi)]
        .map(match => match[1])
    );

    jsFiles.forEach(file => {
      const selectors = findAll(
        file.content,
        /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g
      );

      selectors.forEach(match => {
        const id = match[1];

        if (!htmlIDs.has(id)) {
          addFinding(
            "medium",
            "HTML/JavaScript-Verbindung",
            "HTML-Element nicht erkannt",
            "JavaScript sucht nach #" + id + ", aber diese ID wurde im Haupt-HTML nicht gefunden.",
            file.name
          );
        }
      });
    });
  }

  /* ============================================================
     8. LERNBOT-SYSTEMPRÜFUNG
     ============================================================ */

  function inspectSystems() {
    const js = filesOf("js")
      .map(file => file.content)
      .join("\n");

    const systems = [
      {
        name: "Gedächtnisspeicher",
        regex: /\bdata\.memory\b|\bmemory\s*:/,
        category: "Gedächtnis"
      },
      {
        name: "Erinnerungen speichern",
        regex: /\bremember\s*\(/,
        category: "Gedächtnis"
      },
      {
        name: "Erinnerungen suchen",
        regex: /\bsearchMemory\s*\(/,
        category: "Gedächtnis"
      },
      {
        name: "Erinnerungen löschen",
        regex: /\bforgetMemory\s*\(/,
        category: "Gedächtnis"
      },
      {
        name: "Datenspeicherung",
        regex: /\bsave\s*\(|localStorage\.setItem/,
        category: "Speicher"
      },
      {
        name: "Agentensystem",
        regex: /\bagents?\b|agentRun|agentOverview/i,
        category: "Agenten"
      },
      {
        name: "Wissenssystem",
        regex: /answerFact|learnFact|knowledgeOverview/i,
        category: "Wissen"
      },
      {
        name: "Dokumentensystem",
        regex: /searchDocuments|importDocumentText|summarizeDocument/i,
        category: "Dokumente"
      },
      {
        name: "Projektsystem",
        regex: /createProject|listProjects/i,
        category: "Projekte"
      },
      {
        name: "Aufgabensystem",
        regex: /createTask|listTasks|completeTask/i,
        category: "Aufgaben"
      },
      {
        name: "Fehlerbehandlung",
        regex: /\btry\s*\{/,
        category: "Stabilität"
      },
      {
        name: "Exportfunktion",
        regex: /exportData|downloadExport/i,
        category: "Datensicherung"
      },
      {
        name: "Importfunktion",
        regex: /importData|importDocumentText/i,
        category: "Datensicherung"
      }
    ];

    systems.forEach(system => {
      const found = system.regex.test(js);

      addInventory(
        system.category,
        system.name,
        found ? "Erkannt" : "Nicht erkannt",
        found
          ? "Passende Codebestandteile wurden gefunden."
          : "Kein passender Codebestandteil wurde erkannt."
      );

      if (!found) {
        addFinding(
          "info",
          system.category,
          system.name + " nicht erkannt",
          "Das System wurde anhand der bekannten Suchmuster nicht gefunden. Das ist kein sicherer Beweis, dass es fehlt."
        );
      }
    });

    if (/data\.memory\b/.test(js) && /data\.memories\b/.test(js)) {
      addFinding(
        "medium",
        "Gedächtnis",
        "Unterschiedliche Memory-Feldnamen",
        "data.memory und data.memories kommen vor. Datenstruktur und Migration prüfen."
      );
    }
  }

  /* ============================================================
     9. ANALYSE
     ============================================================ */

  async function analyze() {
    if (state.running) return null;

    state.running = true;

    try {
      await discoverProject();

      state.files.forEach(file => {
        if (!file.content) return;

        if (file.type === "js") inspectJS(file);
        if (file.type === "html") inspectHTML(file);
        if (file.type === "css") inspectCSS(file);
      });

      inspectConnections();
      inspectSystems();

      state.findings.sort((a, b) =>
        SEVERITY[b.level] - SEVERITY[a.level]
      );

      state.report = createReport();

      return {
        files: state.files.length,
        findings: state.findings.length,
        inventory: state.inventory,
        report: state.report
      };

    } finally {
      state.running = false;
    }
  }

  /* ============================================================
     10. MEISTERBERICHT
     ============================================================ */

  function createReport() {
    const output = [
      "MEIN LERNBOT 6.0 – MEISTERPRÜFUNG",
      "Version: " + VERSION,
      "Datum: " + new Date().toLocaleString("de-DE"),
      "",
      "DATEIEN: " + state.files.length,
      "BEFUNDE: " + state.findings.length,
      "",
      "===== DATEIÜBERSICHT ====="
    ];

    state.files.forEach(file => {
      output.push(
        file.name + " | " +
        file.type + " | " +
        file.status + " | " +
        file.size + " Zeichen"
      );
    });

    output.push("");
    output.push("===== SYSTEMINVENTAR =====");

    state.inventory.forEach(item => {
      output.push(
        item.category + " | " +
        item.name + " | " +
        item.status + " | " +
        item.detail
      );
    });

    ["critical", "high", "medium", "low", "info"].forEach(level => {
      output.push("");
      output.push("===== " + LABEL[level] + " =====");

      const items = state.findings.filter(
        item => item.level === level
      );

      if (!items.length) {
        output.push("Keine Befunde.");
        return;
      }

      items.forEach(item => {
        output.push("");
        output.push("Datei: " + item.file);
        output.push("Bereich: " + item.category);
        output.push("Problem: " + item.title);
        output.push("Details: " + item.detail);
      });
    });

    output.push("");
    output.push(
      "GRENZEN: Statische Voranalyse. " +
      "Keine vollständigen Laufzeit-, Browser- oder Funktionstests."
    );

    return output.join("\n");
  }

  /* ============================================================
     11. OPTIMIERUNGSPROMPT
     ============================================================ */

  function createPrompt() {
    if (!state.report) {
      return "Bitte zuerst eine Projektanalyse durchführen.";
    }

    const source = state.files.map(file =>
      "\n\n========== " + file.name + " ==========\n" +
      file.content
    ).join("\n");

    state.prompt = `
DU BIST DER TECHNISCHE MEISTER MEINES LERNBOT-PROJEKTS.

Du kontrollierst den Code wie ein sehr erfahrener,
strenger Meister, der jeden Arbeitsschritt überprüft.

Du sollst nicht einfach Code umschreiben.
Du sollst zuerst verstehen, was vorhanden ist,
was fehlt und was nicht richtig funktioniert.

DEINE AUFGABEN:

1. Lies alle bereitgestellten Dateien.
2. Erstelle eine vollständige Übersicht aller Systeme.
3. Prüfe die Verbindungen zwischen den Dateien.
4. Erkenne fehlende Funktionen und unvollständige Systeme.
5. Prüfe Speicher, Gedächtnis und Datenmigration.
6. Prüfe alle Agenten und ihre Zusammenarbeit.
7. Prüfe die Benutzeroberfläche.
8. Suche nach Syntax-, Logik- und Sicherheitsfehlern.
9. Erkenne doppelte und unnötige Funktionen.
10. Bewerte Performance und Wartbarkeit.

WICHTIGE REGELN:

- Erfinde keine Funktionen.
- Erfinde keine Fehler.
- Unterscheide bestätigte Fehler und Vermutungen.
- Prüfe, ob ein vermeintlich fehlendes System anders benannt wurde.
- Nenne immer die betroffene Datei.
- Erkläre Ursache und Auswirkung.
- Priorisiere kritische Probleme.
- Entferne keine funktionierenden Funktionen ohne Grund.
- Ändere nicht unnötig die Architektur.
- Behaupte keine Tests, die du nicht durchgeführt hast.

DEINE AUSGABE:

1. BESTANDSAUFNAHME
Was ist bereits vorhanden?

2. FEHLENDE FUNKTIONEN
Was fehlt tatsächlich?
Was wurde nur nicht erkannt?

3. FEHLER
Welche Fehler sind bestätigt?
Welche sind nur Verdachtsfälle?

4. QUALITÄT
Was ist unnötig kompliziert oder schlecht verbunden?

5. MEISTERBEWERTUNG
Bewerte jedes System einzeln.

6. REPARATURPLAN
Erstelle eine priorisierte Liste konkreter Verbesserungen.

7. CODEÄNDERUNGEN
Warte auf meine Freigabe.
Wenn du Code lieferst, müssen alle Dateien zusammenpassen.
Liefere vollständige Dateien oder eindeutig abgegrenzte Ersatzabschnitte.

8. ABSCHLUSSKONTROLLE
Liste behobene Probleme, offene Probleme und notwendige Tests.

====================================
AUTOMATISCHER MEISTERBERICHT
====================================

${state.report}

====================================
VOLLSTÄNDIGER GELADENER PROJEKTCODE
====================================

${source}
`.trim();

    return state.prompt;
  }

  /* ============================================================
     12. BENUTZEROBERFLÄCHE
     ============================================================ */

  function makeButton(text, callback) {
    const button = $("button", { textContent: text });

    Object.assign(button.style, {
      width: "100%",
      padding: "12px",
      margin: "6px 0",
      background: "#29293b",
      color: "#ffffff",
      border: "1px solid #494960",
      borderRadius: "9px",
      cursor: "pointer",
      fontWeight: "600"
    });

    button.addEventListener("click", callback);

    return button;
  }

  function open() {
    if (document.getElementById("lb-meisterpruefer")) return;

    const panel = $("div", { id: "lb-meisterpruefer" });

    Object.assign(panel.style, {
      position: "fixed",
      inset: "3%",
      zIndex: "999999",
      overflowY: "auto",
      padding: "16px",
      borderRadius: "16px",
      background: "#11111a",
      color: "#f5f3ff",
      border: "1px solid #494960",
      fontFamily: "system-ui,sans-serif",
      boxShadow: "0 15px 60px #000a"
    });

    const heading = $("h2", {
      textContent: "Technischer Meisterprüfer"
    });

    const description = $("p", {
      textContent:
        "Automatische Kontrolle der veröffentlichten Projektdateien."
    });

    const status = $("p", {
      textContent: "Bereit zur Prüfung."
    });

    const report = $("pre");
    const prompt = $("textarea", {
      placeholder: "Hier erscheint der Optimierungsprompt."
    });

    Object.assign(report.style, {
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      background: "#20202e",
      padding: "12px",
      borderRadius: "9px",
      fontSize: "12px",
      lineHeight: "1.5"
    });

    Object.assign(prompt.style, {
      width: "100%",
      minHeight: "300px",
      boxSizing: "border-box",
      background: "#20202e",
      color: "#ffffff",
      border: "1px solid #494960",
      borderRadius: "9px",
      padding: "12px"
    });

    const run = makeButton(
      "Projekt automatisch analysieren",
      async () => {
        status.textContent = "Meister untersucht die Dateien ...";
        report.textContent = "";
        prompt.value = "";

        try {
          const result = await analyze();

          if (!result) return;

          report.textContent = result.report;

          status.textContent =
            result.files + " Dateien geladen. " +
            result.findings + " Befunde gefunden.";

        } catch (error) {
          status.textContent =
            "Analyse fehlgeschlagen: " + error.message;
        }
      }
    );

    const makePrompt = makeButton(
      "Meister-Optimierungsprompt erstellen",
      () => {
        prompt.value = createPrompt();

        status.textContent = prompt.value.startsWith("Bitte")
          ? prompt.value
          : "Optimierungsprompt erstellt.";
      }
    );

    const copy = makeButton(
      "Prompt kopieren",
      async () => {
        if (!prompt.value) {
          status.textContent = "Erstelle zuerst einen Prompt.";
          return;
        }

        try {
          await navigator.clipboard.writeText(prompt.value);
          status.textContent = "Prompt kopiert.";
        } catch {
          prompt.focus();
          prompt.select();
          status.textContent = "Bitte manuell kopieren.";
        }
      }
    );

    const close = makeButton(
      "Schließen",
      () => panel.remove()
    );

    panel.append(
      heading,
      description,
      status,
      run,
      makePrompt,
      copy,
      close,
      report,
      prompt
    );

    document.body.appendChild(panel);
  }

  /* ============================================================
     13. LERNBOT-INTEGRATION
     ============================================================ */

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
    getInventory: () => [...state.inventory],
    getFiles: () => state.files.map(file => ({
      name: file.name,
      type: file.type,
      status: file.status,
      size: file.size
    }))
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
