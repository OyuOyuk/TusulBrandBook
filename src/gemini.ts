import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const GEMINI_MODEL = "gemini-2.5-flash";
const RETRY_DELAY_MS = 35_000;
const MAX_RETRIES = 2;

// ── Logging ───────────────────────────────────────────────────────────────────

function log(level: "info" | "warn" | "error", msg: string) {
  const prefix = { info: "✦ [gemini]", warn: "⚠ [gemini]", error: "✗ [gemini]" }[level];
  console[level === "info" ? "log" : level](`${prefix} ${msg}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function isRateLimit(err: any): boolean {
  return (
    err?.status === 429 ||
    err?.status === 413 ||
    err?.message?.includes("429") ||
    err?.message?.includes("quota") ||
    err?.message?.includes("rate_limit") ||
    err?.message?.includes("Too Many Requests")
  );
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Gemini JSON parse failed: ${cleaned.slice(0, 120)}...`);
  }
}

// ── Raw Gemini call ───────────────────────────────────────────────────────────

async function callGemini<T>(prompt: string): Promise<T> {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      systemInstruction:
        "You are a brand strategy and design expert. " +
        "You ONLY respond with raw valid JSON matching the structure in the prompt. " +
        "Be specific and detailed — not generic.",
    },
  });
  if (!response.text) throw new Error("Gemini returned empty response");
  return parseJson<T>(response.text);
}

// ── Main class ────────────────────────────────────────────────────────────────

class GeminiFunctions {

  // Full ask: retries on rate limit, then falls back to Groq
  async ask<T>(prompt: string, retries = MAX_RETRIES): Promise<T> {
    log("info", `calling ${GEMINI_MODEL}...`);
    try {
      const result = await callGemini<T>(prompt);
      log("info", `${GEMINI_MODEL} responded ✓`);
      return result;

    } catch (err: any) {
      if (isRateLimit(err)) {
        if (retries > 0) {
          log("warn", `rate limit — waiting ${RETRY_DELAY_MS / 1000}s then retrying (${retries} retries left)`);
          await delay(RETRY_DELAY_MS);
          return this.ask<T>(prompt, retries - 1);
        }
        log("warn", `retries exhausted — falling back to Groq 70B`);
        // Lazy import avoids circular dependency
        const { default: GroqFunctions, MODELS } = await import("./groq.js");
        return GroqFunctions.askGroq<T>(prompt, MODELS.quality);
      }

      // Non-rate-limit error — go straight to Groq
      log("warn", `error (${err.message}) — falling back to Groq 70B`);
      const { default: GroqFunctions, MODELS } = await import("./groq.js");
      return GroqFunctions.askGroq<T>(prompt, MODELS.quality);
    }
  }

  // Direct call with NO retry/fallback — used by groq.ts to avoid circular loops
  // Groq → Gemini.askDirect → stops here, no further fallback
  async askDirect<T>(prompt: string): Promise<T> {
    log("info", `calling ${GEMINI_MODEL} (direct fallback from Groq)...`);
    try {
      const result = await callGemini<T>(prompt);
      log("info", `${GEMINI_MODEL} direct fallback responded ✓`);
      return result;
    } catch (err: any) {
      log("error", `direct fallback also failed: ${err.message}`);
      throw new Error(
        `Both Groq and Gemini failed. Gemini error: ${err.message}. ` +
        `Please wait a moment and try again.`
      );
    }
  }
}

export default new GeminiFunctions();