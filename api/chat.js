export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST-Anfragen erlaubt."
    });
  }

  try {
    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Nachricht fehlt."
      });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map(item => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: String(item.content || "").slice(0, 4000)
        }))
      : [];

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions: "Du bist Mein LernBot. Du antwortest auf Deutsch, verständlich, freundlich und ehrlich. Du erklärst Zusammenhänge und gibst zu, wenn du etwas nicht weißt. Hilf dem Nutzer beim Lernen.",
          input: [
            ...safeHistory,
            { role: "user", content: message }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "KI-Anfrage fehlgeschlagen."
      });
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    return res.status(200).json({ answer });

  } catch (error) {
    return res.status(500).json({
      error: "Interner Serverfehler."
    });
  }
}
