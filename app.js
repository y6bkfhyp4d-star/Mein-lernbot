function extractArticleFacts(text, defaultSubject = "") {
  const sentences = splitSentences(text);
  const found = [];
  let currentSubject = defaultSubject || "";
  const seen = new Set();

  function remember(subject, property, value) {
    subject = subjectClean(subject);
    value = clean(value);
    if (!subject || !property || !value || value.length < 2) return;

    const key = norm(subject) + "|" + property + "|" + norm(value);
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ subject, property, value });
  }

  for (let original of sentences) {
    const s = original.replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ").trim();

    if (!s || s.length > 700) continue;
    if (/^(hinweis|quelle|literatur|weblinks|einzelnachweise)/i.test(s)) continue;

    let m;

    // Gegenstand erkennen
    m = s.match(/^(?:das|der|die|ein|eine)\s+([\p{L}-]{3,})\b/iu);
    if (m) currentSubject = m[1];

    if (!currentSubject) {
      m = s.match(/^([\p{Lu}][\p{L}-]{2,})\b/u);
      if (m) currentSubject = m[1];
    }

    if (!currentSubject) continue;
    const subject = currentSubject;

    // Definition
    m = s.match(/^(?:das|der|die)\s+[\p{L}-]+.*?\s+(?:ist|sind)\s+(.+?)(?:[.!?]|$)/iu);
    if (m) remember(subject, "definition", m[1]);

    // Familie und Tierart
    m = s.match(/familie\s+der\s+([\p{L}\s-]+?)(?:[,.]|$)/iu);
    if (m) remember(subject, "familie", m[1]);

    m = s.match(/gehört\s+(?:zu|zur|zum)\s+(.+?)(?:[,.]|$)/iu);
    if (m) remember(subject, "familie", m[1]);

    // Lebensraum
    m = s.match(/(?:lebt|wohnt|bewohnt)\s+(?:im|in|am|auf|unter|bei)\s+(.+?)(?:[.!?]|$)/iu);
    if (m) remember(subject, "lebensraum", m[1]);

    // Herkunft
    m = s.match(/(?:kommt|stammt)\s+aus\s+(.+?)(?:[.!?]|$)/iu);
    if (m) remember(subject, "herkunft", m[1]);

    // Nahrung
    m = s.match(/(?:frisst|isst|ernährt\s+sich\s+von)\s+(.+?)(?:[.!?]|$)/iu);
    if (m) remember(subject, "nahrung", m[1]);

    // Aussehen
    m = s.match(/(?:ist|sind)\s+(.+?)\s+gefärbt/iu);
    if (m) remember(subject, "aussehen", m[0]);

    m = s.match(/hat\s+(.+?)(?:[.!?]|$)/iu);
    if (m && /fell|streifen|flecken|beine|flügel|ohren|schwanz|muster/i.test(m[1])) {
      remember(subject, "aussehen", m[1]);
    }

    m = s.match(/(?:gekennzeichnet|charakterisiert)\s+(?:ist\s+es\s+)?durch\s+(.+?)(?:[.!?]|$)/iu);
    if (m) remember(subject, "aussehen", m[1]);

    // Gefährdung
    m = s.match(/(?:gilt\s+als|ist|sind)\s+(?:stark\s+)?(gefährdet|vom\s+aussterben\s+bedroht|bedroht)/iu);
    if (m) remember(subject, "gefährdung", m[1]);

    // Verwandtschaft
    m = s.match(/(?:verwandt|näher verwandt)\s+mit\s+(.+?)(?:[,.]|$)/iu);
    if (m) remember(subject, "verwandtschaft", m[1]);

    // Jahreszahlen
    m = s.match(/(?:im\s+jahr(?:e)?|seit)\s+(\d{4})\s+(?:beschrieben|entdeckt|erforscht|benannt)/iu);
    if (m) remember(subject, "beschrieben", m[1]);

    // Weitere einfache Fakten
    const direct = parseFact(s);
    if (direct && sameSubject(direct.subject, subject)) {
      remember(subject, direct.property, direct.value);
    }
  }

  return found;
}
