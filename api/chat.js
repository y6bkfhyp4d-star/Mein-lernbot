
export default async function handler(req, res) {
  const allowedOrigin = "https://y6bkfhyp4d-star.github.io";
  const origin = req.headers.origin;

  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({
      error: "Diese Herkunft ist nicht erlaubt."
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST-Anfragen erlaubt."
    });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "API-Schlüssel fehlt auf dem Server."
      });
    }

    const { message, history = [] } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Nachricht fehlt."
      });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map(item => ({
          role:
            item.role === "assistant"
              ? "assistant"
              : "user",
          content: String(item.content || "").slice(0, 4000)
        }))
      : [];

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.4-mini",
          instructions:
            "Du bist Mein LernBot. Du sprichst Deutsch, " +
            "verstehst natürliche Sprache und Zusammenhänge. " +
            "Du antwortest freundlich, verständlich und ehrlich. " +
            "Du unterscheidest zwischen gesichertem Wissen und " +
            "Vermutungen. Du behauptest niemals, etwas dauerhaft " +
            "gespeichert zu haben, wenn du es nicht gespeichert hast. " +
            "Hilf dem Nutzer beim Lernen und stelle bei Unklarheiten " +
            "gezielte Rückfragen.",
          input: [
            ...safeHistory,
            {
              role: "user",
              content: message.trim().slice(0, 8000)
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data.error?.message ||
          "Die KI-Anfrage ist fehlgeschlagen."
      });
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    return res.status(200).json({
      answer: answer || "Ich konnte leider keine Antwort erzeugen."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Interner Serverfehler."
    });
  }
}
