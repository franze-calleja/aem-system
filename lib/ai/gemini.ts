// Server-side Gemini wrapper.
//
// Designed to be safe to call even when GEMINI_API_KEY is unset — every code
// path returns { ok: false, reason } and callers render algorithmic output
// instead. When the key arrives, the same call paths start producing real
// narratives without any code change.
//
// Caching: identical prompts to the same model hit the `AICache` table on
// the second call. The hash is over (model + prompt), so changing the prompt
// template or model implicitly invalidates the cache.

import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

export type GenerateReason =
  | "no_key"
  | "quota"
  | "network"
  | "empty_response"
  | "consent_revoked";

export type GenerateResult =
  | { ok: true; text: string; cached: boolean }
  | { ok: false; reason: GenerateReason };

type GenerateOpts = {
  prompt: string;
  kind: string; // e.g. "RISK_NARRATIVE"
  /** Override the cache key — useful if multiple prompts should share output. */
  cacheKey?: string;
  model?: string;
  /**
   * Force a fresh Gemini call, ignoring any existing cached row for this
   * content hash. The freshly generated text replaces the cached row so
   * subsequent reads see the new value. Use sparingly — every force-regen
   * spends tokens. Wired to user-facing "Regenerate" buttons that exist
   * precisely to override the cache when a counselor knows context has
   * changed in ways the prompt template can't see.
   */
  forceRegenerate?: boolean;
};

const DEFAULT_MODEL = "gemini-flash-latest";

let cachedClient: GoogleGenAI | null = null;

export function geminiKeyConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient(): GoogleGenAI | null {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

function hashContent(model: string, prompt: string): string {
  return createHash("sha256").update(`${model}::${prompt}`).digest("hex");
}

/**
 * Generate text via Gemini, with cache + graceful fallback. Always resolves —
 * never throws. Callers branch on `result.ok`.
 *
 * `consentRevoked` short-circuits before the SDK is called. Callers must pass
 * this when the surface is per-student and the student's AI_ANALYSIS consent
 * has been revoked.
 */
export async function generateText(
  opts: GenerateOpts & { consentRevoked?: boolean },
): Promise<GenerateResult> {
  if (opts.consentRevoked) return { ok: false, reason: "consent_revoked" };

  const model = opts.model ?? DEFAULT_MODEL;
  const cacheKey = opts.cacheKey ?? hashContent(model, opts.prompt);

  if (!opts.forceRegenerate) {
    const cached = await prisma.aICache.findUnique({ where: { contentHash: cacheKey } });
    if (cached) return { ok: true, text: cached.response, cached: true };
  }

  const client = getClient();
  if (!client) return { ok: false, reason: "no_key" };

  try {
    const result = await client.models.generateContent({
      model,
      contents: opts.prompt,
    });
    const text = (result.text ?? "").trim();
    if (!text) return { ok: false, reason: "empty_response" };

    // Upsert so force-regenerate replaces the prior cached text instead of
    // colliding on the unique contentHash.
    await prisma.aICache.upsert({
      where: { contentHash: cacheKey },
      update: { response: text, kind: opts.kind, prompt: opts.prompt, model },
      create: {
        contentHash: cacheKey,
        kind: opts.kind,
        prompt: opts.prompt,
        response: text,
        model,
      },
    });
    return { ok: true, text, cached: false };
  } catch (err) {
    const msg = String(err);
    // Gemini SDK surfaces quota and rate-limit errors as HTTP 429 strings.
    if (msg.includes("429") || /quota|rate.?limit/i.test(msg)) {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "network" };
  }
}

/** Human-readable fallback message for a non-ok generation reason. */
export function fallbackMessage(reason: GenerateReason): string {
  switch (reason) {
    case "no_key":
      return "AI narrative disabled (no GEMINI_API_KEY configured). Algorithmic output shown below.";
    case "quota":
      return "AI quota exhausted for now — algorithmic output shown below.";
    case "network":
      return "AI service unavailable. Algorithmic output shown below.";
    case "empty_response":
      return "AI returned no narrative for this input. Algorithmic output shown below.";
    case "consent_revoked":
      return "This student's AI analysis consent has been revoked. Only algorithmic output is shown.";
  }
}
