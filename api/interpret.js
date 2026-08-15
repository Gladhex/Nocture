// Vercel serverless function.
// Runs on the server, so the ANTHROPIC_API_KEY never reaches the browser.

function buildPrompt(dreamText, lenses) {
  const fields = [];
  if (lenses.scientific)
    fields.push(
      `"scientific": "2-3 sentences on the psychological/neuroscience reading of this dream (Jungian/cognitive dream research framing, e.g. threat simulation, memory consolidation, anxiety processing). Grounded, not mystical."`
    );
  if (lenses.health)
    fields.push(
      `"health": "2-3 sentences on plausible physical/lifestyle correlates that dream research associates with this dream type (e.g. dehydration, sleep position, screen time before bed, stress hormones, sleep apnea signals). Clearly speculative and framed as 'worth noticing', never a diagnosis. If nothing physical is plausible, say so honestly and pivot to sleep-hygiene general advice."`
    );
  if (lenses.biblical) {
    fields.push(
      `"biblical": "2-3 sentences on a biblical/spiritual reading of this dream theme, referencing how scripture treats that symbol (broadly, not tied to one denomination)."`
    );
    fields.push(
      `"prayer": "A short 2-3 sentence prayer point or guidance reflection connected to the dream's theme."`
    );
  }
  return `You are a dream interpretation engine for a website called Nocturne. A user described this dream: "${dreamText}"

Respond with ONLY a JSON object, no preamble, no markdown fences, in this exact shape:
{
  "essence": "a short 3-6 word poetic title for this dream",
  ${fields.join(",\n  ")},
  "voices": ["a short first-person reflection, 1-2 sentences, written in the voice of someone else who once had a similar dream, warm and informal in tone", "a second one, different angle, same style"]
}`;
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Couldn't find a JSON object in the model's reply.");
  return JSON.parse(match[0]);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { dreamText, lenses } = req.body || {};
  if (!dreamText || typeof dreamText !== "string") {
    return res.status(400).json({ error: "dreamText is required" });
  }
  const safeLenses = {
    scientific: !!lenses?.scientific,
    health: !!lenses?.health,
    biblical: !!lenses?.biblical,
  };
  if (!safeLenses.scientific && !safeLenses.health && !safeLenses.biblical) {
    safeLenses.scientific = safeLenses.health = safeLenses.biblical = true;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: buildPrompt(dreamText.trim(), safeLenses) }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "Anthropic API error" });
    }

    const text = data.content?.map((b) => (b.type === "text" ? b.text : "")).join("\n") || "";
    const parsed = extractJson(text.replace(/```json|```/g, "").trim());

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unknown server error" });
  }
}
