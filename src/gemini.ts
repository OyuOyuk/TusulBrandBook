import { GoogleGenAI } from "@google/genai";

// ── Key pool — add as many keys as you have accounts ─────────────────────────
// In .env: GEMINI_API_KEY_1=..., GEMINI_API_KEY_2=..., GEMINI_API_KEY_3=...
// Falls back to GEMINI_API_KEY if none of the numbered ones are set.

const API_KEYS: string[] = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,

  process.env.GEMINI_API_KEY,
].filter((k): k is string => !!k && k.trim().length > 0); // ← explicit type predicate
if (API_KEYS.length === 0) {
  throw new Error("No Gemini API keys found. Set GEMINI_API_KEY or GEMINI_API_KEY_1 in .env");
}

const GEMINI_MODEL    = "gemini-2.5-flash";
const RETRY_DELAY_MS  = 35_000;
const MAX_RETRIES     = 2;

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

// ── Raw Gemini call — tries one specific key ──────────────────────────────────

async function callGeminiWithKey<T>(prompt: string, keyIndex: number): Promise<T> {
  const key = API_KEYS[keyIndex];
  const client = new GoogleGenAI({ apiKey: key as string });
  const response = await client.models.generateContent({
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

// ── Try all keys in sequence before giving up ─────────────────────────────────

async function callGeminiWithRotation<T>(prompt: string, startIndex = 0): Promise<T> {
  for (let i = startIndex; i < API_KEYS.length; i++) {
    try {
      log("info", `trying key ${i + 1}/${API_KEYS.length} (${GEMINI_MODEL})...`);
      const result = await callGeminiWithKey<T>(prompt, i);
      log("info", `key ${i + 1} responded ✓`);
      return result;
    } catch (err: any) {
      if (isRateLimit(err)) {
        log("warn", `key ${i + 1}/${API_KEYS.length} rate limited — trying next key`);
        // Continue to next key immediately, no delay needed when rotating
        continue;
      }
      // Non-rate-limit error on this key — still try next key
      log("warn", `key ${i + 1} error (${err.message}) — trying next key`);
      continue;
    }
  }
  // All keys exhausted
  throw new Error(`All ${API_KEYS.length} Gemini API key(s) exhausted or rate limited.`);
}

// ── Main class ────────────────────────────────────────────────────────────────

class GeminiFunctions {

  // Full ask: rotates through all keys, then retries with delay, then falls back to Groq
  async ask<T>(prompt: string, retries = MAX_RETRIES): Promise<T> {
    try {
      return await callGeminiWithRotation<T>(prompt);

    } catch (err: any) {
      // All keys exhausted — retry after delay if retries remain
      if (retries > 0) {
        log("warn", `all keys exhausted — waiting ${RETRY_DELAY_MS / 1000}s then retrying (${retries} retries left)`);
        await delay(RETRY_DELAY_MS);
        return this.ask<T>(prompt, retries - 1);
      }

      // Retries also exhausted — fall back to Groq
      log("warn", `all retries exhausted — falling back to Groq 70B`);
      const { default: GroqFunctions, MODELS } = await import("./groq.js");
      return GroqFunctions.askGroq<T>(prompt, MODELS.quality);
    }
  }

  // Direct call with NO retry/fallback — used by groq.ts to avoid circular loops
  async askDirect<T>(prompt: string): Promise<T> {
    log("info", `direct call (fallback from Groq)...`);
    try {
      const result = await callGeminiWithRotation<T>(prompt);
      log("info", `direct call responded ✓`);
      return result;
    } catch (err: any) {
      log("error", `direct call failed: ${err.message}`);
      throw new Error(
        `Both Groq and Gemini failed. Gemini error: ${err.message}. ` +
        `Please wait a moment and try again.`
      );
    }
  }
}

export default new GeminiFunctions();