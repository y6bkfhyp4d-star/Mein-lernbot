
/* =====================================================
   MEIN LERNBOT 6.0
   PAKET 4.1 – DIAGNOSE-KI

   Technische Selbstdiagnose
   Modulprüfung, Schnittstellen, Speicher,
   Fehlerbericht und Reparatur-Prompt

   SICHERHEIT:
   - Keine Änderungen an LernBot-Daten
   - Keine automatischen Reparaturen
   - Keine externen APIs
   ===================================================== */

(() => {
  "use strict";

  if (window.LernBotDiagnose) return;

  const VERSION = "4.1";
  const STORAGE_KEY = "meinLernBot.v1";

  const MODULES = [
    "modules/code-diagnose.js",
    "app.js",
    "konflikt-ki.js",
    "gedaechtnis-ki.js",
    "agenten-ki.js",
    "aufgaben-ki.js",
    "wissens-ki.js",
    "feedback-ki.js",
    "wissensnetz-ki.js",
    "zentrale-ki.js",
    "diagnose-ki.js"
  ];

  const ELEMENTS = [
    "log",
    "input",
    "send",
    "bar",
    "status"
  ];

  const MAX_ERRORS = 30;
  const runtimeErrors = [];
  let lastReport = null;
  let lastCommandTime = 0;

  /* =====================================================
     1. HILFSFUNKTIONEN
     ===================================================== */

  function clean(value) {
    return String(value ?? "").trim();
  }

  function normalize(value) {
    return clean(value)
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/\s+/g, " ")
      .trim();
  }

  function addResult(results, level, area, message, fix) {
    results.push({
      level,
      area,
      message,
      fix: fix || ""
    });
  }

  function safeError(error) {
    return clean(error?.message || error)
      .slice(0, 300);
  }

  function recordError(kind, message, source) {
    const entry = {
      kind: clean(kind),
      message: clean(message).slice(0, 300),
      source: clean(source).slice(0, 200)
    };

    if (
      runtimeErrors.some(e =>
        e.kind === entry.kind &&
        e.message === entry.message &&
        e.source === entry.source
      )
    ) {
      return;
    }

    runtimeErrors.push(entry);

    if (runtimeErrors.length > MAX_ERRORS) {
      runtimeErrors.shift();
    }
  }

  /* =====================================================
     2. JAVASCRIPT-FEHLER BEOBACHTEN
     ===================================================== */

  window.addEventListener("error", event => {
    const target = event.target;

    if (
      target &&
      target !== window &&
      target.tagName === "SCRIPT"
    ) {
      recordError(
        "Skript-Ladefehler",
        "JavaScript-Datei konnte nicht geladen werden",
        target.src
      );
      return;
    }

    if (event.message) {
      recordError(
        "JavaScript-Fehler",
        event.message,
        event.filename
      );
    }
  }, true);

  window.addEventListener(
    "unhandledrejection",
    event => {
      recordError(
        "Promise-Fehler",
        safeError(event.reason),
        ""
      );
    }
  );

  /* =====================================================
     3. MODULDATEIEN PRÜFEN
     ===================================================== */

  function checkModules(results) {
    const scripts = [
      ...document.querySelectorAll("script[src]")
    ];

    const paths = scripts.map(script => {
      try {
        return new URL(
          script.getAttribute("src"),
          document.baseURI
        ).pathname;
      } catch {
        return "";
      }
    });

    for (const module of MODULES) {
      const expected = new URL(
        module,
        document.baseURI
      ).pathname;

      const matches = paths.filter(
        path => path === expected
      );

      if (!matches.length) {
        addResult(
          results,
          "FEHLER",
          "Moduldatei",
          `${module} ist nicht eingebunden.`,
          `Prüfe den script-Eintrag in index.html für ${module}.`
        );
      } else if (matches.length > 1) {
        addResult(
          results,
          "WARNUNG",
          "Moduldatei",
          `${module} ist mehrfach eingebunden.`,
          "Prüfe doppelte script-Einträge in index.html."
        );
      } else {
        addResult(
          results,
          "OK",
          "Moduldatei",
          `${module} ist eingebunden.`
        );
      }
    }

    const resources =
      performance.getEntriesByType("resource");

    for (const module of MODULES) {
      const expected = new URL(
        module,
        document.baseURI
      ).pathname;

      const matching = resources.filter(entry => {
        try {
          return new URL(entry.name).pathname === expected;
        } catch {
          return false;
        }
      });

      for (const entry of matching) {
        if (
          typeof entry.responseStatus === "number" &&
          entry.responseStatus >= 400
        ) {
          addResult(
            results,
            "FEHLER",
            "Dateiladen",
            `${module}: HTTP ${entry.responseStatus}`,
            "Dateipfad, Dateiname und Bereitstellung prüfen."
          );
        }
      }
    }
  }

  /* =====================================================
     4. BENUTZEROBERFLÄCHE PRÜFEN
     ===================================================== */

  function checkInterface(results) {
    for (const id of ELEMENTS) {
      const element = document.getElementById(id);

      if (element) {
        addResult(
          results,
          "OK",
          "Benutzeroberfläche",
          `Element #${id} vorhanden.`
        );
      } else {
        addResult(
          results,
          id === "status" ? "WARNUNG" : "FEHLER",
          "Benutzeroberfläche",
          `Element #${id} fehlt.`,
          `Prüfe die ID "${id}" in index.html.`
        );
      }
    }
  }

  /* =====================================================
     5. BRIDGE UND DATEN PRÜFEN
     ===================================================== */

  function checkBridge(results) {
    const bridge = window.LernBotBridge;

    if (!bridge) {
      addResult(
        results,
        "FEHLER",
        "LernBotBridge",
        "Zentrale Datenschnittstelle fehlt.",
        "Prüfe app.js und die Initialisierung von LernBotBridge."
      );
      return;
    }

    for (const method of [
      "getFacts",
      "getTasks",
      "listConflicts"
    ]) {
      if (typeof bridge[method] === "function") {
        addResult(
          results,
          "OK",
          "LernBotBridge",
          `${method} verfügbar.`
        );
      } else {
        addResult(
          results,
          "FEHLER",
          "LernBotBridge",
          `${method} fehlt.`,
          `Prüfe die Bridge-Funktion ${method} in app.js.`
        );
      }
    }

    for (const method of ["getFacts", "getTasks"]) {
      if (typeof bridge[method] !== "function") {
        continue;
      }

      try {
        const data = bridge[method]();

        if (!Array.isArray(data)) {
          addResult(
            results,
            "FEHLER",
            "Datenzugriff",
            `${method} liefert kein Array.`,
            "Prüfe den Rückgabewert der Bridge."
          );
        } else {
          addResult(
            results,
            "OK",
            "Datenzugriff",
            `${method}: ${data.length} Einträge lesbar.`
          );
        }
      } catch (error) {
        addResult(
          results,
          "FEHLER",
          "Datenzugriff",
          `${method}: ${safeError(error)}`,
          "Prüfe die entsprechende Funktion in app.js."
        );
      }
    }
  }

  /* =====================================================
     6. SPEICHER PRÜFEN
     ===================================================== */

  function checkStorage(results) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw === null) {
        addResult(
          results,
          "WARNUNG",
          "Speicher",
          `Kein Eintrag unter ${STORAGE_KEY} gefunden.`,
          "Prüfe, ob LernBot bereits Daten gespeichert hat. Nichts zurücksetzen."
        );
        return;
      }

      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        addResult(
          results,
          "FEHLER",
          "Speicher",
          "Gespeicherte Daten sind kein gültiges JSON.",
          "Vor jeder Reparatur eine Sicherung erstellen. Nicht löschen."
        );
        return;
      }

      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {
        addResult(
          results,
          "FEHLER",
          "Speicher",
          "Der gespeicherte Hauptdatensatz ist kein Objekt.",
          "Datenstruktur prüfen und vorher sichern."
        );
        return;
      }

      addResult(
        results,
        "OK",
        "Speicher",
        "Hauptdatensatz ist lesbares JSON."
      );

      for (const field of [
        "facts",
        "tasks",
        "memory"
      ]) {
        if (Array.isArray(data[field])) {
          addResult(
            results,
            "OK",
            "Speicher",
            `${field}: ${data[field].length} Einträge.`
          );
        } else {
          addResult(
            results,
            "WARNUNG",
            "Speicher",
            `${field} ist kein Array.`,
            "Datenstruktur mit app.js vergleichen. Nicht automatisch überschreiben."
          );
        }
      }
    } catch (error) {
      addResult(
        results,
        "FEHLER",
        "Speicher",
        safeError(error),
        "Browser-Speicherzugriff und Berechtigungen prüfen."
      );
    }
  }

  /* =====================================================
     7. FEEDBACK-SCHNITTSTELLE
     ===================================================== */

  function checkFeedback(results) {
    const api = window.LernBotFeedback;

    if (!api) {
      addResult(
        results,
        "WARNUNG",
        "Feedback",
        "Feedback-Schnittstelle nicht erreichbar.",
        "feedback-ki.js und dessen Initialisierung prüfen."
      );
      return;
    }

    if (typeof api.getSummary !== "function") {
      addResult(
        results,
        "WARNUNG",
        "Feedback",
        "getSummary fehlt.",
        "Schnittstelle von feedback-ki.js prüfen."
      );
      return;
    }

    try {
      const summary = api.getSummary();

      addResult(
        results,
        "OK",
        "Feedback",
        `${Number(summary?.count) || 0} Bewertungen lesbar.`
      );
    } catch (error) {
      addResult(
        results,
        "FEHLER",
        "Feedback",
        safeError(error),
        "getSummary in feedback-ki.js prüfen."
      );
    }
  }

  /* =====================================================
     8. BEOBACHTETE FEHLER
     ===================================================== */

  function checkRuntime(results) {
    if (!runtimeErrors.length) {
      addResult(
        results,
        "OK",
        "Laufzeit",
        "Seit Aktivierung der Diagnose keine Fehler beobachtet."
      );
      return;
    }

    for (const error of runtimeErrors) {
      addResult(
        results,
        "FEHLER",
        error.kind,
        `${error.message}${
          error.source ? " | " + error.source : ""
        }`,
        "Betroffene Datei und Browser-Konsole prüfen."
      );
    }
  }

  /* =====================================================
     9. GESAMTDIAGNOSE
     ===================================================== */

  function runDiagnosis() {
    const results = [];

    checkModules(results);
    checkInterface(results);
    checkBridge(results);
    checkStorage(results);
    checkFeedback(results);
    checkRuntime(results);

    const errors = results.filter(
      result => result.level === "FEHLER"
    );

    const warnings = results.filter(
      result => result.level === "WARNUNG"
    );

    const passed = results.filter(
      result => result.level === "OK"
    );

    const report = {
      version: VERSION,
      timestamp: new Date().toISOString(),
      results,
      errors,
      warnings,
      passed
    };

    lastReport = report;

    return report;
  }

  /* =====================================================
     10. DIAGNOSEBERICHT
     ===================================================== */

  function formatReport(report) {
    const lines = [
      `DIAGNOSE-KI ${VERSION} – SYSTEMPRÜFUNG`,
      "",
      "ERGEBNIS",
      `Erfolgreiche Prüfungen: ${report.passed.length}`,
      `Fehler: ${report.errors.length}`,
      `Warnungen: ${report.warnings.length}`,
      "",
      "FEHLER"
    ];

    if (!report.errors.length) {
      lines.push("Keine Fehler erkannt.");
    }

    for (const item of report.errors) {
      lines.push(
        `• ${item.area}: ${item.message}`
      );

      if (item.fix) {
        lines.push(`  Lösungshinweis: ${item.fix}`);
      }
    }

    lines.push("", "WARNUNGEN");

    if (!report.warnings.length) {
      lines.push("Keine Warnungen.");
    }

    for (const item of report.warnings) {
      lines.push(
        `• ${item.area}: ${item.message}`
      );

      if (item.fix) {
        lines.push(`  Hinweis: ${item.fix}`);
      }
    }

    lines.push(
      "",
      "ERFOLGREICHE PRÜFUNGEN"
    );

    for (const item of report.passed) {
      lines.push(
        `• ${item.area}: ${item.message}`
      );
    }

    lines.push(
      "",
      "BEWERTUNG"
    );

    if (report.errors.length) {
      lines.push(
        "Technische Probleme erkannt. Bitte Fehlerbericht prüfen."
      );
    } else if (report.warnings.length) {
      lines.push(
        "Keine erkannten Fehler, aber Hinweise zur Prüfung vorhanden."
      );
    } else {
      lines.push(
        "Alle durchgeführten Prüfungen bestanden."
      );
    }

    lines.push(
      "",
      "WICHTIG",
      "Die Diagnose prüft bekannte Schnittstellen und beobachtbare Fehler.",
      "Sie kann nicht alle internen Programmfehler erkennen.",
      "Frühere Fehler vor dem Laden dieses Moduls können fehlen.",
      "Eine eingebundene Datei ist nicht automatisch fehlerfrei.",
      "Es wurden keine gespeicherten Daten verändert."
    );

    return lines.join("\n");
  }

  /* =====================================================
     11. REPARATUR-PROMPT
     ===================================================== */

  function createRepairPrompt(report) {
    const problems = [
      ...report.errors,
      ...report.warnings
    ];

    const lines = [
      "REPARATUR-PROMPT FÜR MEIN LERNBOT 6.0",
      "",
      "Du bist ein erfahrener JavaScript-Entwickler.",
      "Untersuche die folgenden Diagnoseergebnisse.",
      "",
      "PROJEKT",
      "Name: Mein LernBot 6.0",
      "Technik: JavaScript, HTML, PWA",
      "Hosting: Vercel",
      "Gerät: iPhone",
      "Keine kostenpflichtige API.",
      "",
      "WICHTIGE REGELN",
      "1. Bestehende Daten unbedingt erhalten.",
      "2. localStorage meinLernBot.v1 nicht löschen.",
      "3. Keine Funktionen ohne Grund entfernen.",
      "4. Keine doppelten Event-Handler einbauen.",
      "5. Änderungen möglichst auf einzelne Dateien begrenzen.",
      "6. Vollständigen kopierbaren Ersatzcode liefern.",
      "7. Keine unbelegten Reparaturbehauptungen machen.",
      "",
      "DIAGNOSE",
      `Fehler: ${report.errors.length}`,
      `Warnungen: ${report.warnings.length}`,
      ""
    ];

    if (!problems.length) {
      lines.push(
        "Keine Fehler oder Warnungen erkannt.",
        "Prüfe, ob weitere sinnvolle Tests nötig sind."
      );
    }

    for (const item of problems) {
      lines.push(
        `[${item.level}] ${item.area}`,
        item.message
      );

      if (item.fix) {
        lines.push(
          `Bisheriger Hinweis: ${item.fix}`
        );
      }

      lines.push("");
    }

    lines.push(
      "DEINE AUFGABE",
      "Erkläre die wahrscheinlichen Ursachen.",
      "Unterscheide bestätigte Fehler von Vermutungen.",
      "Fordere fehlende Quelldateien an, wenn nötig.",
      "Erstelle eine sichere Reparatur mit Testanleitung.",
      "Verändere keine Nutzerdaten."
    );

    return lines.join("\n");
  }

  /* =====================================================
     12. CHAT-AUSGABE
     ===================================================== */

  function show(message, role) {
    const chat = document.getElementById("log");

    if (!chat) {
      alert(message);
      return;
    }

    const item = document.createElement("div");

    item.className =
      role === "user" ? "msg user" : "msg bot";

    const content = document.createElement("div");

    content.className = "lb6-message-content";
    content.style.whiteSpace = "pre-wrap";
    content.textContent = String(message);

    item.appendChild(content);
    chat.appendChild(item);

    chat.scrollTop = chat.scrollHeight;
  }

  /* =====================================================
     13. BEFEHLE
     ===================================================== */

  function intercept(event) {
    const input = document.getElementById("input");

    if (!input) return;

    const command = normalize(input.value);

    if (
      command !== "diagnose" &&
      command !== "diagnose prompt"
    ) {
      return;
    }

    if (
      event.type === "keydown" &&
      (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.isComposing
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    // Schutz gegen unmittelbar doppelte Auslösung
    const currentTime = Date.now();

    if (currentTime - lastCommandTime < 250) {
      return;
    }

    lastCommandTime = currentTime;

    const original = input.value.trim();
    input.value = "";

    show(original, "user");

    try {
      const report = runDiagnosis();

      if (command === "diagnose prompt") {
        show(
          createRepairPrompt(report),
          "bot"
        );
      } else {
        show(
          formatReport(report),
          "bot"
        );
      }
    } catch (error) {
      show(
        "Diagnose-KI: " + safeError(error),
        "bot"
      );
    }
  }

  /* =====================================================
     14. INITIALISIERUNG
     ===================================================== */

  function init() {
    const form = document.getElementById("bar");
    const button = document.getElementById("send");

    if (form) {
      form.addEventListener(
        "submit",
        intercept,
        true
      );
    }

    if (button) {
      button.addEventListener(
        "click",
        intercept,
        true
      );
    }

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.target ===
          document.getElementById("input")
        ) {
          intercept(event);
        }
      },
      true
    );
  }

  window.LernBotDiagnose = Object.freeze({
    version: VERSION,
    run: runDiagnosis,
    getLastReport() {
      return lastReport;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();
