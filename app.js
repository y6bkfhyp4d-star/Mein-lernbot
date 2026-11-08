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

  const help = `So kannst du mir etwas beibringen:

1. „Ich bringe dir bei: Ein Okapi ist ein Waldtier.“
2. „Merke dir: Die Hauptstadt von Frankreich ist Paris.“
3. Wenn ich falsch liege: „Nein, das stimmt nicht.“
4. Danach kannst du mir die richtige Antwort geben.
5. „Was weißt du?“ zeigt mein gespeichertes Wissen.
6. „Vergiss: Paris“ löscht einen Eintrag.
7. „Hilfe“ zeigt diese Übersicht.

Du kannst ganz normal mit mir schreiben.
Wenn ich etwas nicht weiß, frage ich dich nach der Antwort.
Ich speichere dein Wissen auf diesem Gerät.`;

    let data;

  // Einmaliger Neustart: alte Testdaten entfernen
  localStorage.removeItem(KEY);

  data = null;

  if (!data || typeof data !== "object") {
    data = { qa: [], classes: [], log: [], pending: null, theme: "dark" };
  }

  data.qa = Array.isArray(data.qa) ? data.qa : [];
  data.classes = Array.isArray(data.classes) ? data.classes : [];
  data.log = Array.isArray(data.log) ? data.log : [];

  function save() {
    data.log = data.log.slice(-150);
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      alert("Speicher voll oder nicht verfügbar. Bitte exportiere dein Wissen.");
    }
  }

  function norm(s) {
    return String(s)
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
          for (const x of ["ern", "en", "er", "es", "e", "n", "s"]) {
            if (w.endsWith(x) && w.length - x.length >= 4) {
              return w.slice(0, -x.length);
            }
          }
        }
        return w;
      });
  }

  function grams(s) {
    s = " " + norm(s) + " ";
    const a = [];
    for (let i = 0; i < s.length - 2; i++) a.push(s.slice(i, i + 3));
    return a;
  }

  function counts(a) {
    const m = {};
    a.forEach(x => (m[x] = (m[x] || 0) + 1));
    return m;
  }

  function cosine(a, b) {
    const keys = Object.keys(a);
    const dot = keys.reduce((v, k) => v + a[k] * (b[k] || 0), 0);
    const na = Math.sqrt(keys.reduce((v, k) => v + a[k] ** 2, 0));
    const nb = Math.sqrt(Object.values(b).reduce((v, x) => v + x * x, 0));
    return na && nb ? dot / (na * nb) : 0;
  }

  function sim(a, b) {
    return 0.68 * cosine(counts(toks(a)), counts(toks(b))) + 0.32 * cosine(counts(grams(a)), counts(grams(b)));
  }

  function findQuestion(q) {
    const nq = norm(q);
    return data.qa.findIndex(x => norm(x.k) === nq);
  }

  function best(q) {
    let bi = -1,
      bs = 0;
    data.qa.forEach((x, i) => {
      const s = sim(q, x.k || "");
      if (s > bs) {
        bs = s;
        bi = i;
      }
    });
    return { i: bi, s: bs };
  }

  function lastUserQuestion() {
    for (let i = data.log.length - 1; i >= 0; i--) {
      if (data.log[i] && data.log[i].role === "user") return data.log[i].text;
    }
    return null;
  }

  function addSeed() {
    const known = new Set(data.qa.map(x => norm(x.k)));
    let n = 0;
    seed.forEach(([k, a]) => {
      if (!known.has(norm(k))) {
        data.qa.push({ k, a, source: "seed" });
        n++;
      }
    });
    save();
    return n;
  }

  if (!data.seeded) {
    addSeed();
    data.seeded = true;
    save();
  }

  function learn(q, a) {
    q = String(q || "").trim();
    a = String(a || "").trim();

    if (!q || !a) return "Frage und Antwort dürfen nicht leer sein.";

    const existing = findQuestion(q);
    if (existing >= 0) {
      data.qa[existing] = { ...data.qa[existing], k: q, a, source: "user" };
    } else {
      const b = best(q);
      if (b.i >= 0 && b.s > 0.94) {
        data.qa[b.i] = { ...data.qa[b.i], k: q, a, source: "user" };
      } else {
        data.qa.push({ k: q, a, source: "user" });
      }
    }

    save();
    return "Danke! Das habe ich gelernt. Ich habe jetzt " + data.qa.length + " Wissenseinträge. Frag mich später danach!";
  }

  function setPending(kind, payload) {
    data.pending = { kind, ...payload };
    save();
  }

  function getPending() {
    if (typeof data.pending === "string") {
      return { kind: "answer", question: data.pending };
    }
    return data.pending && typeof data.pending === "object" ? data.pending : null;
  }

  function classify(t) {
    const groups = {};

    data.classes.forEach(x => {
      (groups[x.c] ??= []).push(x.t);
    });

    const names = Object.keys(groups);

    if (names.length < 2) {
      return "Ich brauche Beispiele aus mindestens zwei Kategorien.";
    }

    const words = toks(t);
    const vocab = new Set();

    Object.values(groups)
      .flat()
      .forEach(x => {
        toks(x).forEach(w => vocab.add(w));
      });

    const total = data.classes.length;

    const scores = names
      .map(n => {
        const c = {};
        let count = 0;

        groups[n].forEach(x => {
          toks(x).forEach(w => {
            c[w] = (c[w] || 0) + 1;
            count++;
          });
        });

        let s = Math.log(groups[n].length / total);

        words.forEach(w => {
          s += Math.log(((c[w] || 0) + 0.5) / (count + 0.5 * (vocab.size + 1)));
        });

        return [n, s / Math.sqrt(Math.max(1, words.length))];
      })
      .sort((a, b) => b[1] - a[1]);

    const ex = scores.map(x => Math.exp(Math.max(-30, (x[1] - scores[0][1]) * 2.5)));
    const z = ex.reduce((a, b) => a + b, 0);

    return "Ich tippe auf: " + scores[0][0] + " (" + Math.round((ex[0] / z) * 100) + " %).";
  }

  function handle(t) {
    const low = t.toLocaleLowerCase("de");
    let m;

    if (/(selbstmord|suizid|umbringen|nicht mehr leben|sterben (will|möchte)|töten will|ritzen|selbstverletz)/i.test(t)) {
      return "Das klingt ernst. Bitte bleib damit nicht allein und sprich mit einer vertrauten Person. Die TelefonSeelsorge erreichst du kostenlos unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr ruf 112.";
    }

    if (/^(hilfe|help|\?)$/.test(low)) return help;

    if (/^(wer bist du|was kannst du|wer bist du\?)$/i.test(t)) {
      return "Ich bin dein lokaler LernBot. Ich kann dir Wissen beibringen, Fragen beantworten und aus deinen Eingaben lernen. Tippe „hilfe“, um alle Befehle zu sehen.";
    }

    if (low === "grundwissen laden") {
      return "Grundwissen ergänzt: " + addSeed() + " neue Einträge.";
    }

    if (low === "verlauf löschen") {
      data.log = [];
      save();
      return "Chatverlauf gelöscht. Dein gelerntes Wissen bleibt erhalten.";
    }

    if (/^(was weißt du|was hast du gelernt|zeig.*gelernt)/i.test(t)) {
      return data.qa.length
        ? "Das habe ich gelernt:\n" + data.qa.map(x => "• " + x.k + " → " + (x.a || "(nur gemerkt)")).join("\n")
        : "Noch nichts gelernt.";
    }

    if (low === "vergiss alles") {
      return "Zum Schutz vor versehentlichem Löschen: Tippe „ALLES LÖSCHEN“ zum Bestätigen.";
    }

    if (low === "alles löschen") {
      data.qa = [];
      data.classes = [];
      data.pending = null;
      save();
      return "Dein gelerntes Wissen und die Kategorien wurden gelöscht.";
    }

    if (m = t.match(/^vergiss\s*:?\s+(.+)$/i)) {
      const b = best(m[1]);
      if (b.i < 0 || b.s < 0.28) return "Dazu finde ich nichts.";
      const x = data.qa.splice(b.i, 1)[0];
      save();
      return "Vergessen: „" + x.k + "“";
    }

    if (m = t.match(/^(?:lern|lerne|merk dir|merke dir|speichere)\s*:?\s+(.+)$/i)) {
      const b = m[1];
      const c = b.match(/^kategorie\s+([^:]+?)\s*:\s*(.+)$/i);

      if (c) {
        data.classes.push({ t: c[2], c: c[1] });
        save();
        return "Gespeichert: „" + c[2] + "“ gehört zu „" + c[1] + "“.";
      }

      const p = b.match(/^(.+?)\s*(?:=>|->|=| ist | bedeutet | heißt )\s*(.+)$/i);
      if (p) return learn(p[1], p[2]);

      setPending("teach_question", { answer: b });
      return "Gerne! Was genau soll ich mir dazu merken? Formuliere es bitte als Frage oder Thema.";
    }

    if (m = t.match(/^(?:ich bringe dir bei|ich bring dir bei|ich möchte dir beibringen|ich will dir beibringen|pass auf|merk dir bitte)\s*:?\s*(.+)$/i)) {
      const rest = m[1];
      const p = rest.match(/^(.+?)\s*(?:=|=>|->|\sist\s|\sbedeutet\s|\sheißt\s)(.+)$/i);
      if (p) return learn(p[1], p[2]);

      setPending("teach_question", { answer: rest });
      return "Okay, ich höre zu. Was ist die richtige Erklärung oder Antwort dazu?";
    }

    if (m = t.match(/^(?:das bedeutet|das heißt|richtig ist|die richtige antwort ist)\s*:?\s*(.+)$/i)) {
      const rest = m[1];
      const p = rest.match(/^(.+?)\s*(?:=|\sist\s|\sbedeutet\s|\sheißt\s)(.+)$/i);
      if (p) return learn(p[1], p[2]);

      setPending("teach_question", { answer: rest });
      return "Danke! Zu welcher Frage oder welchem Begriff gehört diese Erklärung?";
    }

    if (m = t.match(/^(?:ordne ein|einordnen|kategorie\?)\s*:?\s*(.+)$/i)) {
      return classify(m[1]);
    }

    const pending = getPending();
    if (pending) {
      if (/^(abbrechen|egal|stop|lass es)$/i.test(low)) {
        data.pending = null;
        save();
        return "Alles klar. Wir lassen das.";
      }

      if (pending.kind === "answer") {
        data.pending = null;
        return learn(pending.question, t) + "\nAuf „" + pending.question + "“ werde ich künftig so antworten: „" + t + "“";
      }

      if (pending.kind === "teach_question") {
        data.pending = null;
        return learn(t, pending.answer);
      }

      if (pending.kind === "correction") {
        data.pending = null;
        return learn(pending.question, t);
      }
    }

    if (m = t.match(/^(?:nein[, ]+)?(?:richtig ist|korrekt ist|stattdessen|das ist richtig)\s*:?\s*(.+)$/i)) {
      const previous = lastUserQuestion();
      if (previous) return learn(previous, m[1]);
    }

    if (/^(nein|falsch|das stimmt nicht|nicht ganz|du liegst falsch|das ist falsch|stimmt nicht)\b/i.test(t)) {
      const previous = lastUserQuestion();
      if (previous) {
        setPending("correction", { question: previous });
        return "Danke für die Korrektur. Was wäre denn richtig? Ich speichere deine Antwort zu deiner vorherigen Frage.";
      }
      return "Was genau soll ich korrigieren? Schreib mir bitte die richtige Information.";
    }

    const b = best(t);
    if (b.i >= 0 && b.s >= 0.34) {
      const x = data.qa[b.i];
      const a = x.a || "Das habe ich gelernt: " + x.k;
      return b.s < 0.43 ? "Ich bin nicht ganz sicher, aber vielleicht meinst du:\n" + a : a;
    }

    setPending("answer", { question: t });
    return "Das weiß ich noch nicht sicher. Du kannst mir die Antwort einfach erklären – ich speichere sie dann zu deiner Frage. Was ist die richtige Antwort?";
  }

  function bubble(role, text, store = true) {
    const d = document.createElement("div");
    d.className = "msg " + role;
    d.textContent = text;

    $("log").appendChild(d);
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
    bubble("user", text);
    bubble("bot", handle(text));
  }

  $("bar").addEventListener("submit", e => {
    e.preventDefault();
    send();
  });

  $("menu").onclick = () => {
    $("drawer").classList.toggle("open");
  };

  document.querySelectorAll("[data-msg]").forEach(b => {
    b.onclick = () => send(b.dataset.msg);
  });

  document.querySelectorAll("[data-cmd]").forEach(b => {
    b.onclick = () => {
      const c = b.dataset.cmd;
      $("drawer").classList.remove("open");

      if (c === "theme") {
        document.body.classList.toggle("light");
        return;
      }
if (c === "refresh") {
  $("status").textContent = "Suche nach Updates ...";

  (async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();

      if (reg) {
        await reg.update();
      }

      $("status").textContent = "App wird aktualisiert ...";

      setTimeout(() => {
        location.reload();
      }, 1500);

    } catch (e) {
      $("status").textContent = "Update fehlgeschlagen. Bitte Internet prüfen.";
    }
  })();

  return;
}
      if (c === "export") {
        const blob = new Blob([JSON.stringify({ qa: data.qa, classes: data.classes }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mein-lernbot-wissen.json";
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (c === "import") {
        $("filepick").click();
        return;
      }

      send(c);
    };
  });

  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = ".json,application/json";
  picker.hidden = true;
  picker.id = "filepick";
  document.body.appendChild(picker);

  picker.onchange = () => {
    const f = picker.files[0];
    if (!f) return;

    const r = new FileReader();

    r.onload = () => {
      try {
        const x = JSON.parse(r.result);

        if (!Array.isArray(x.qa) || !Array.isArray(x.classes)) {
          throw Error();
        }

        data.qa = x.qa;
        data.classes = x.classes;
        save();
        bubble("bot", "Wissen importiert.");
      } catch (e) {
        bubble("bot", "Datei konnte nicht importiert werden.");
      }
    };

    r.readAsText(f);
  };

  if (data.log.length) {
    data.log.forEach(x => bubble(x.role, x.text, false));
  } else {
    bubble("bot", "Hallo! Ich bin dein LernBot. Du kannst mir Fragen stellen oder Wissen beibringen.", false);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
