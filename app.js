
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const KEY = "meinLernBot.v1";

  const seed = [
    ["Hallo Hi Guten Tag", "Hallo! Schön, dass du da bist. Tippe „hilfe“, um zu sehen, was ich kann."],
    ["Notfall", "Bei akuter Gefahr zuerst 112 anrufen. Polizei: 110. Nenne den genauen Ort und beschreibe kurz, was passiert ist. Befolge die Anweisungen der Leitstelle."],
    ["Notruf Nummer Polizei Feuerwehr Krankenwagen", "112: Rettungsdienst und Feuerwehr. 110: Polizei. 116 117: ärztlicher Bereitschaftsdienst. Bei Lebensgefahr immer 112."],
    ["Herzstillstand Wiederbelebung Reanimation", "Bei Bewusstlosigkeit und keiner normalen Atmung sofort 112 wählen, Lautsprecher einschalten und den Anweisungen der Leitstelle folgen."],
    ["Bewusstlos Seitenlage", "Bei Bewusstlosigkeit 112 rufen und Atmung prüfen. Bei normaler Atmung stabile Seitenlage, sofern keine Verletzung dagegenspricht. Atmung weiter kontrollieren."],
    ["Blutung Wunde blutet", "Bei starker Blutung 112 rufen und mit einem sauberen Tuch oder Verband direkten, festen Druck auf die Wunde ausüben."],
    ["Verbrennung verbrannt Verbrühung", "Von der Hitzequelle entfernen. Keine Eiswürfel oder Hausmittel verwenden. Bei größeren Verbrennungen oder Atemproblemen 112 rufen."],
    ["Schlaganfall", "Mögliche Zeichen: hängender Mundwinkel, Schwäche auf einer Seite, Sprach- oder Sehstörungen. Sofort 112 rufen und den Beginn der Symptome merken."],
    ["Herzinfarkt Brustschmerzen", "Bei Verdacht auf Herzinfarkt, etwa Brustschmerzen, Atemnot oder kaltem Schweiß, sofort 112 rufen."],
    ["Vergiftung vergiftet Gift", "Kein Erbrechen auslösen und keine Hausmittel geben. Bei Bewusstlosigkeit, Krämpfen oder Atemnot 112 rufen."],
    ["Brand Feuer brennt", "Menschen warnen, Gebäude verlassen, Türen schließen und keinen Aufzug benutzen. Von draußen 112 rufen. Brennendes Fett niemals mit Wasser löschen."],
    ["Wer bist du Was kannst du", "Ich bin dein lokaler LernBot. Ich speichere Wissen auf diesem Gerät und kann aus deinen Eingaben lernen. Ich habe kein eigenes Internet."]
  ];

  const help = `SO KANNST DU MIT MIR ARBEITEN

LERNEN:
„Ich bringe dir bei: Ein Okapi ist ein Waldtier.“
„Merke dir: Die Hauptstadt von Frankreich ist Paris.“

KORRIGIEREN:
„Nein, das stimmt nicht.“
„Richtig ist: ...“

FRAGEN:
„Was ist ein Okapi?“
„Was weißt du?“

WEITERE BEFEHLE:
„Hilfe“ – zeigt diese Übersicht.
„Vergiss: Okapi“ – löscht einen Eintrag.
„Verlauf löschen“ – löscht den Chatverlauf.
„Grundwissen laden“ – ergänzt mein Grundwissen.

Ich lerne aus deinen Eingaben und speichere das Wissen auf diesem Gerät.`;

  // Bestehende Daten laden – niemals automatisch zurücksetzen.
  let data;

  try {
    data = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch (e) {
    data = null;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    data = {
      qa: [],
      classes: [],
      log: [],
      pending: null,
      theme: "dark"
    };
  }

  data.qa = Array.isArray(data.qa) ? data.qa : [];
  data.classes = Array.isArray(data.classes) ? data.classes : [];
  data.log = Array.isArray(data.log) ? data.log : [];

  // Alte Einträge bleiben kompatibel.
  data.qa = data.qa.filter(x => x && typeof x === "object" && typeof x.k === "string");

  function save() {
    data.log = data.log.slice(-150);

    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      alert("Speichern fehlgeschlagen. Bitte exportiere dein Wissen.");
      return false;
    }
  }

  function norm(s) {
    return String(s ?? "")
      .toLocaleLowerCase("de")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const stop = new Set(
    "der die das den dem des ein eine einen einem einer ist sind war was wer wie wo wann und oder von zu in im am an auf für mit ich du es mir dir wir ihr sie bitte mal denn also".split(" ")
  );

  function toks(s) {
    return norm(s)
      .split(" ")
      .filter(w => w.length > 1 && !stop.has(w))
      .map(w => {
        if (w.length > 6) {
          for (const end of ["ern", "en", "er", "es", "e", "n", "s"]) {
            if (w.endsWith(end) && w.length - end.length >= 4) {
              return w.slice(0, -end.length);
            }
          }
        }
        return w;
      });
  }

  function counts(a) {
    const result = {};
    a.forEach(x => result[x] = (result[x] || 0) + 1);
    return result;
  }

  function cosine(a, b) {
    const keys = Object.keys(a);
    const dot = keys.reduce((v, k) => v + a[k] * (b[k] || 0), 0);
    const na = Math.sqrt(keys.reduce((v, k) => v + a[k] ** 2, 0));
    const nb = Math.sqrt(Object.values(b).reduce((v, x) => v + x * x, 0));

    return na && nb ? dot / (na * nb) : 0;
  }

  function grams(s) {
    s = " " + norm(s) + " ";
    const result = [];

    for (let i = 0; i < s.length - 2; i++) {
      result.push(s.slice(i, i + 3));
    }

    return result;
  }

  function sim(a, b) {
    const ta = toks(a);
    const tb = toks(b);

    const tokenScore = cosine(counts(ta), counts(tb));
    const gramScore = cosine(counts(grams(a)), counts(grams(b)));

    return 0.68 * tokenScore + 0.32 * gramScore;
  }

  function entryTexts(entry) {
    return [
      entry.k,
      ...(Array.isArray(entry.aliases) ? entry.aliases : [])
    ].filter(Boolean);
  }

  function findQuestion(q) {
    const nq = norm(q);

    return data.qa.findIndex(x =>
      entryTexts(x).some(k => norm(k) === nq)
    );
  }

  function best(q) {
    let bestIndex = -1;
    let bestScore = 0;

    data.qa.forEach((entry, i) => {
      const score = Math.max(
        ...entryTexts(entry).map(k => sim(q, k))
      );

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    });

    return { i: bestIndex, s: bestScore };
  }

  function lastUserQuestion() {
    for (let i = data.log.length - 1; i >= 0; i--) {
      const item = data.log[i];

      if (item && item.role === "user") {
        return item.text;
      }
    }

    return null;
  }

  function addSeed() {
    const known = new Set(data.qa.map(x => norm(x.k)));
    let added = 0;

    seed.forEach(([k, a]) => {
      if (!known.has(norm(k))) {
        data.qa.push({
          k,
          a,
          aliases: [],
          source: "seed"
        });

        added++;
      }
    });

    save();
    return added;
  }

  if (!data.seeded) {
    addSeed();
    data.seeded = true;
    save();
  }

  // Wissen speichern oder vorhandenes Wissen verbessern.
  function learn(question, answer, aliases = []) {
    question = String(question || "").trim();
    answer = String(answer || "").trim();

    if (!question || !answer) {
      return "Frage und Antwort dürfen nicht leer sein.";
    }

    const existing = findQuestion(question);
    const entry = existing >= 0 ? data.qa[existing] : null;

    if (entry) {
      entry.k = question;
      entry.a = answer;
      entry.source = "user";
      entry.aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
    } else {
      data.qa.push({
        k: question,
        a: answer,
        aliases: [],
        source: "user"
      });
    }

    const target = existing >= 0 ? entry : data.qa[data.qa.length - 1];

    aliases.forEach(alias => {
      alias = String(alias || "").trim();

      if (
        alias &&
        norm(alias) !== norm(target.k) &&
        !target.aliases.some(x => norm(x) === norm(alias))
      ) {
        target.aliases.push(alias);
      }
    });

    save();

    return "Danke! Das habe ich gelernt.\n\nFrage: " +
      question +
      "\nAntwort: " +
      answer +
      "\n\nIch habe jetzt " +
      data.qa.length +
      " Wissenseinträge.";
  }

  function setPending(kind, payload) {
    data.pending = { kind, ...payload };
    save();
  }

  function getPending() {
    if (typeof data.pending === "string") {
      return { kind: "answer", question: data.pending };
    }

    return data.pending && typeof data.pending === "object"
      ? data.pending
      : null;
  }

  // Erkennt einfache Fakten wie:
  // "Ein Okapi ist ein Waldtier."
  function parseFact(text) {
    const match = text.match(
      /^(.+?)\s+(ist|sind|war|heißt|bedeutet|liegt in|lebt in|besteht aus)\s+(.+)[.!?]*$/i
    );

    if (!match) return null;

    const subject = match[1].trim();
    const answer = match[3].trim().replace(/[.!?]+$/, "");

    if (!subject || !answer) return null;

    return {
      question: "Was ist " + subject + "?",
      answer,
      original: text
    };
  }

  function learnFact(text) {
    const fact = parseFact(text);

    if (!fact) return null;

    return learn(
      fact.question,
      fact.answer,
      [fact.original]
    );
  }

  function classify(text) {
    const groups = {};

    data.classes.forEach(x => {
      (groups[x.c] ??= []).push(x.t);
    });

    const names = Object.keys(groups);

    if (names.length < 2) {
      return "Ich brauche Beispiele aus mindestens zwei Kategorien.";
    }

    const words = toks(text);
    const vocabulary = new Set();

    Object.values(groups).flat().forEach(x => {
      toks(x).forEach(w => vocabulary.add(w));
    });

    const total = data.classes.length;

    const scores = names.map(name => {
      const countsByWord = {};
      let count = 0;

      groups[name].forEach(x => {
        toks(x).forEach(w => {
          countsByWord[w] = (countsByWord[w] || 0) + 1;
          count++;
        });
      });

      let score = Math.log(groups[name].length / total);

      words.forEach(w => {
        score += Math.log(
          ((countsByWord[w] || 0) + 0.5) /
          (count + 0.5 * (vocabulary.size + 1))
        );
      });

      return [name, score / Math.sqrt(Math.max(1, words.length))];
    }).sort((a, b) => b[1] - a[1]);

    const exp = scores.map(x =>
      Math.exp(Math.max(-30, (x[1] - scores[0][1]) * 2.5))
    );

    const totalExp = exp.reduce((a, b) => a + b, 0);
    const confidence = Math.round(exp[0] / totalExp * 100);

    return "Ich tippe auf: " + scores[0][0] +
      " (" + confidence + " %).";
  }

  function handle(text, previousQuestion) {
    const low = text.toLocaleLowerCase("de");
    let match;

    // Sicherheitsrelevante Eingaben.
    if (/(selbstmord|suizid|umbringen|nicht mehr leben|sterben (will|möchte)|töten will|ritzen|selbstverletz)/i.test(text)) {
      return "Das klingt ernst. Bitte bleib damit nicht allein und sprich mit einer vertrauten Person. Die TelefonSeelsorge erreichst du kostenlos unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr ruf 112.";
    }

    if (/^(hilfe|help|\?)$/.test(low)) return help;

    if (/^(wer bist du|was kannst du)\??$/i.test(text)) {
      return "Ich bin dein lokaler LernBot. Ich kann Wissen speichern, Fragen beantworten, Zusammenhänge anhand gespeicherter Beispiele erkennen und aus deinen Eingaben lernen. Ich habe kein eigenes Internet und bin noch keine vollwertige Sprachmodell-KI.";
    }

    if (low === "grundwissen laden") {
      return "Grundwissen ergänzt: " + addSeed() + " neue Einträge.";
    }

    if (low === "verlauf löschen") {
      data.log = [];
      save();
      return "Chatverlauf gelöscht. Dein gelerntes Wissen bleibt erhalten.";
    }

    if (/^(was weißt du|was hast du gelernt|zeig.*gelernt)/i.test(text)) {
      return data.qa.length
        ? "Das habe ich gelernt:\n" +
          data.qa.map(x =>
            "• " + x.k + " → " + (x.a || "(nur gemerkt)")
          ).join("\n")
        : "Noch nichts gelernt.";
    }

    if (low === "vergiss alles") {
      return "Zum Schutz vor versehentlichem Löschen: Tippe „ALLES LÖSCHEN“ zum Bestätigen.";
    }

    if (low === "alles löschen") {
      if (!confirm("Wirklich alle gelernten Einträge und Kategorien löschen? Exportiere dein Wissen vorher, wenn du es behalten möchtest.")) {
        return "Löschen abgebrochen. Dein Wissen bleibt erhalten.";
      }

      data.qa = [];
      data.classes = [];
      data.pending = null;
      save();

      return "Dein gelerntes Wissen und die Kategorien wurden gelöscht.";
    }

    // Einzelnen Eintrag vergessen.
    if (match = text.match(/^vergiss\s*:?\s+(.+)$/i)) {
      const b = best(match[1]);

      if (b.i < 0 || b.s < 0.28) {
        return "Dazu finde ich keinen passenden Eintrag.";
      }

      const deleted = data.qa.splice(b.i, 1)[0];
      save();

      return "Vergessen: „" + deleted.k + "“";
    }

    // Kategorien lernen.
    if (match = text.match(/^(?:lern|lerne|merk dir|merke dir|speichere)\s*:?\s*kategorie\s+([^:]+?)\s*:\s*(.+)$/i)) {
      data.classes.push({
        t: match[2].trim(),
        c: match[1].trim()
      });

      save();

      return "Gespeichert: „" + match[2] +
        "“ gehört zu „" + match[1] + "“.";
    }

    // Explizite Lehrversuche.
    if (match = text.match(/^(?:ich bringe dir bei|ich bring dir bei|ich möchte dir beibringen|ich will dir beibringen|pass auf|merk dir bitte|merke dir|lern|lerne)\s*:?\s*(.+)$/i)) {
      const fact = learnFact(match[1].trim());

      if (fact) return fact;

      setPending("teach_fact", {
        topic: match[1].trim()
      });

      return "Sehr gerne! Was soll ich über „" +
        match[1].trim() +
        "“ lernen? Erkläre es mir in einem Satz.";
    }

    // Alternative Lehrformulierung.
    if (match = text.match(/^(?:das bedeutet|das heißt|richtig ist|die richtige antwort ist)\s*:?\s*(.+)$/i)) {
      const fact = learnFact(match[1].trim());

      if (fact) return fact;

      if (previousQuestion) {
        return learn(previousQuestion, match[1]);
      }

      setPending("teach_fact", {
        topic: match[1].trim()
      });

      return "Zu welchem Begriff oder welcher Frage gehört diese Erklärung?";
    }

    // Direkte Fakten als Lehrversuch erkennen.
    const directFact = parseFact(text);

    if (directFact && getPending()?.kind === "teach_fact") {
      return learn(
        directFact.question,
        directFact.answer,
        [directFact.original]
      );
    }

    // Klassifikation.
    if (match = text.match(/^(?:ordne ein|einordnen|kategorie\?)\s*:?\s*(.+)$/i)) {
      return classify(match[1]);
    }

    // Auf eine vorherige Antwort warten.
    const pending = getPending();

    if (pending) {
      if (/^(abbrechen|egal|stop|lass es)$/i.test(low)) {
        data.pending = null;
        save();
        return "Alles klar. Wir lassen das.";
      }

      if (pending.kind === "answer") {
        data.pending = null;
        save();

        return learn(pending.question, text);
      }

      if (pending.kind === "teach_fact") {
        data.pending = null;
        save();

        return learn(
          "Was ist " + pending.topic + "?",
          text
        );
      }

      if (pending.kind === "correction") {
        data.pending = null;
        save();

        return learn(pending.question, text);
      }
    }

    // Explizite Korrektur.
    if (match = text.match(/^(?:nein[, ]+)?(?:richtig ist|korrekt ist|stattdessen|die richtige antwort ist)\s*:?\s*(.+)$/i)) {
      if (previousQuestion) {
        return learn(previousQuestion, match[1]);
      }

      return "Welche meiner Antworten möchtest du korrigieren?";
    }

    if (/^(nein|falsch|das stimmt nicht|nicht ganz|du liegst falsch|das ist falsch|stimmt nicht)\b/i.test(text)) {
      if (previousQuestion) {
        setPending("correction", {
          question: previousQuestion
        });

        return "Danke für die Korrektur! Was wäre denn richtig? Ich werde meine Antwort verbessern.";
      }

      return "Was genau soll ich korrigieren? Erkläre mir bitte die richtige Information.";
    }

    // Gespeichertes Wissen suchen.
    const result = best(text);

    if (result.i >= 0 && result.s >= 0.34) {
      const entry = data.qa[result.i];

      const answer = entry.a || "Das habe ich gelernt: " + entry.k;

      if (result.s < 0.43) {
        return "Ich bin mir nicht ganz sicher, aber vielleicht meinst du:\n" + answer;
      }

      return answer;
    }

    // Wenn unbekannt: gezielt nach der Antwort fragen.
    setPending("answer", {
      question: text
    });

    return "Das weiß ich noch nicht sicher.\n\nDu kannst es mir beibringen. Was ist die richtige Antwort?";
  }

  function bubble(role, text, store = true) {
    const element = document.createElement("div");

    element.className = "msg " + role;
    element.textContent = text;

    $("log").appendChild(element);
    $("log").scrollTop = $("log").scrollHeight;

    if (store) {
      data.log.push({ role, text });
      save();
    }
  }

  function send(text) {
    text = (text ?? $("input").value).trim();

    if (!text) return;

    $("input").value = "";

    // Vor der neuen Nachricht die vorherige Frage sichern.
    const previousQuestion = lastUserQuestion();

    bubble("user", text);

    const response = handle(text, previousQuestion);

    bubble("bot", response);
  }

  $("bar").addEventListener("submit", event => {
    event.preventDefault();
    send();
  });

  $("menu").onclick = () => {
    $("drawer").classList.toggle("open");
  };

  document.querySelectorAll("[data-msg]").forEach(button => {
    button.onclick = () => send(button.dataset.msg);
  });

  document.querySelectorAll("[data-cmd]").forEach(button => {
    button.onclick = () => {
      const command = button.dataset.cmd;

      $("drawer").classList.remove("open");

      if (command === "theme") {
        document.body.classList.toggle("light");
        return;
      }

      if (command === "refresh") {
        $("status").textContent = "Suche nach Updates ...";

        (async () => {
          try {
            const registration =
              await navigator.serviceWorker.getRegistration();

            if (registration) {
              await registration.update();
            }

            $("status").textContent = "App wird aktualisiert ...";

            setTimeout(() => location.reload(), 1500);
          } catch (error) {
            $("status").textContent =
              "Update fehlgeschlagen. Bitte Internet prüfen.";
          }
        })();

        return;
      }

      if (command === "export") {
        const backup = {
          version: 2,
          qa: data.qa,
          classes: data.classes
        };

        const blob = new Blob(
          [JSON.stringify(backup, null, 2)],
          { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "mein-lernbot-wissen.json";
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        return;
      }

      if (command === "import") {
        $("filepick").click();
        return;
      }

      send(command);
    };
  });

  const picker = document.createElement("input");

  picker.type = "file";
  picker.accept = ".json,application/json";
  picker.hidden = true;
  picker.id = "filepick";

  document.body.appendChild(picker);

  picker.onchange = () => {
    const file = picker.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);

        if (
          !Array.isArray(imported.qa) ||
          !Array.isArray(imported.classes) ||
          !confirm("Der Import ersetzt dein bisheriges Wissen. Hast du vorher ein Backup erstellt?")
        ) {
          bubble("bot", "Import abgebrochen. Dein bisheriges Wissen bleibt erhalten.");
          picker.value = "";
          return;
        }

        data.qa = imported.qa.filter(
          x => x && typeof x === "object" && typeof x.k === "string"
        );

        data.classes = imported.classes;
        save();

        bubble("bot", "Wissen erfolgreich importiert.");
      } catch (error) {
        bubble("bot", "Die Datei konnte nicht importiert werden.");
      }

      picker.value = "";
    };

    reader.readAsText(file);
  };

  // Vorhandenen Chatverlauf wiederherstellen.
  if (data.log.length) {
    data.log.forEach(item => {
      if (item && typeof item.text === "string") {
        bubble(item.role === "user" ? "user" : "bot", item.text, false);
      }
    });
  } else {
    bubble(
      "bot",
      "Hallo! Ich bin dein LernBot. Du kannst mir Fragen stellen oder Wissen beibringen.",
      false
    );
  }

  // Service Worker registrieren.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
