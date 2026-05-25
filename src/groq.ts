import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const MODELS = {
  quality: "llama-3.3-70b-versatile",
  fast:    "llama-3.1-8b-instant",
  vision:  "meta-llama/llama-4-scout-17b-16e-instruct",
} as const;

// ── Logging ───────────────────────────────────────────────────────────────────

function log(level: "info" | "warn" | "error", msg: string) {
  const prefix = { info: "✦ [groq]", warn: "⚠ [groq]", error: "✗ [groq]" }[level];
  console[level === "info" ? "log" : level](`${prefix} ${msg}`);
}

// ── Error detection ───────────────────────────────────────────────────────────

function isRateLimit(err: any): boolean {
  return (
    err?.status === 429 ||
    err?.status === 413 ||
    err?.message?.includes("429") ||
    err?.message?.includes("413") ||
    err?.message?.includes("rate_limit") ||
    err?.message?.includes("quota") ||
    err?.message?.includes("Too Many Requests")
  );
}

// ── JSON parser ───────────────────────────────────────────────────────────────

function parseJson<T>(raw: string, context: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`[groq] JSON parse failed for ${context}: ${cleaned.slice(0, 120)}...`);
  }
}

// ── Main class ────────────────────────────────────────────────────────────────

class GroqFunctions {

  async askGroq<T>(prompt: string, model: string = MODELS.quality): Promise<T> {
    log("info", `calling ${model}...`);
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a brand strategy and design expert. " +
              "You ONLY respond with raw valid JSON. " +
              "No markdown, no backticks, no explanation. Just the JSON object itself.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8192,
      });

      const choice = response.choices[0];
      if (!choice) throw new Error("Empty choices array");
      if (choice.finish_reason === "length") {
        throw new Error(`Response truncated on ${model} — increase max_tokens`);
      }

      log("info", `${model} responded ✓`);
      return parseJson<T>(choice.message?.content ?? "", model);

    } catch (err: any) {
      if (isRateLimit(err)) {
        log("warn", `rate limit on ${model} — falling back to Gemini`);
        // Lazy import avoids circular dependency
        const { default: GeminiFunctions } = await import("./gemini.js");
        return GeminiFunctions.askDirect<T>(prompt);
      }
      log("error", `${model} failed: ${err.message}`);
      throw err;
    }
  }

  async askGroqVision<T>(
    prompt: string,
    imageBase64: string,
    mimeType: string
  ): Promise<T> {
    log("info", `calling ${MODELS.vision} (vision)...`);
    const response = await groq.chat.completions.create({
      model: MODELS.vision,
      messages: [
        {
          role: "system",
          content:
            "You are a brand strategy and design expert. " +
            "You ONLY respond with raw valid JSON. " +
            "No markdown, no backticks, no explanation. Just the JSON object itself.",
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: "text", text: prompt },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error("Vision: empty choices array");
    if (choice.finish_reason === "length") throw new Error("Vision response truncated");

    log("info", `vision responded ✓`);
    return parseJson<T>(choice.message?.content ?? "", "vision");
  }
}

export default new GroqFunctions();