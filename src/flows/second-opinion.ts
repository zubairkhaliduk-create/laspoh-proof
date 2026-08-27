/**
 * TWO MORE GOOGLE AI MODELS, EACH WITH A JOB THE PRIMARY CANNOT DO FOR ITSELF.
 *
 * The thesis of this project is that no model grades its own work. That principle has an obvious
 * next step: the VERIFIER should not be the only judge of its own citations either. This module
 * adds two independent checks around the verifier, each from a different Google AI model, and
 * each wired so that it can only ever make the system MORE skeptical:
 *
 *  1. GEMMA AS THE SECOND-OPINION AUDITOR (`secondOpinion`). After the Gemini verifier says
 *     "proven" and every quoted citation has been mechanically confirmed to appear verbatim in
 *     the evidence, a different model FAMILY — Gemma, over the Gemini API route rather than the
 *     verifier's own — is shown only the criterion and the grounded quotes and asked one bounded
 *     question: do these quotes establish this criterion? If it says no, the verdict is demoted
 *     to unproven with both opinions on the receipt. Two model families must now agree before
 *     anything is "proven"; a systematic blind spot in one is caught by the other.
 *
 *  2. GEMINI-EMBEDDING AS THE FABRICATION FORENSIC (`classifyFabrication`). When citation
 *     grounding rejects a quote, the interesting question is HOW it was fabricated. A quote that
 *     is semantically close to real evidence is a PARAPHRASE — the model saw the right thing and
 *     rewrote it; a quote close to nothing is an INVENTION — the model asserted something the
 *     page never showed. gemini-embedding-001 measures that distance. The classification changes
 *     the receipt's explanation only, never the verdict: paraphrase and invention are both
 *     downgraded identically, because "proven" quotes must be verbatim.
 *
 * ASYMMETRIC FAILURE POLICY, on purpose:
 *   - The auditor can DEMOTE a verdict but can never promote one, and if it is unreachable the
 *     single-verifier verdict stands unannotated. An outage must not stop honest work.
 *   - The forensic can only refine an explanation. If embeddings are unreachable the plain
 *     "fabricated" wording stands.
 * Both degrade to exactly the behaviour this system shipped with.
 */
import { ai, ROUTE } from "../genkit.js";
import { googleAI, vertexAI } from "@genkit-ai/google-genai";
import { missionLogger } from "../obs/log.js";
const warn = missionLogger("second-opinion");

export const GEMMA_MODEL = process.env.GEMMA_MODEL ?? "gemma-4-31b-it";
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";

/** The auditor deliberately does NOT reuse the verifier's route. Independence is the point: a
 *  different model family, reached over a different code path, with its own scoped key. */
const gemmaKey = () => process.env.GEMMA_API_KEY ?? process.env.GEMINI_API_KEY ?? "";

export function secondOpinionConfigured(): boolean {
  return process.env.SECOND_OPINION !== "0" && gemmaKey().length > 0;
}

export interface SecondOpinion {
  /** "concur" | "dissent" | "unavailable" — unavailable means the single-verifier verdict stands. */
  outcome: "concur" | "dissent" | "unavailable";
  model: string;
  why: string;
}

/**
 * Ask Gemma whether the grounded quotes establish the criterion. Bounded: temperature 0, one
 * retry, 15s per attempt. Anything short of a parseable, strict `false` is NOT a dissent — an
 * auditor that failed to answer has not disagreed, and must not be able to veto by crashing.
 */
export async function secondOpinion(criterion: string, groundedQuotes: readonly string[]): Promise<SecondOpinion> {
  if (!secondOpinionConfigured() || groundedQuotes.length === 0) {
    return { outcome: "unavailable", model: GEMMA_MODEL, why: "not configured" };
  }
  const prompt = `You are a skeptical, independent auditor. Another system claims a task criterion is PROVEN, citing quotes captured verbatim from the page evidence. Your only question: do the quotes, by themselves, establish the criterion?

CRITERION:
${criterion.slice(0, 1000)}

VERBATIM QUOTES FROM THE EVIDENCE:
${groundedQuotes.map((q, i) => `${i + 1}. "${q.slice(0, 500)}"`).join("\n")}

Rules: the burden is on the quotes. A quote that is merely consistent with the criterion does not establish it. Reply with JSON only: {"supported": true|false, "why": "<one sentence>"}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": gemmaKey() },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (!res.ok) throw new Error(`${res.status}`);
      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("no JSON in answer");
      const parsed = JSON.parse(m[0]) as { supported?: unknown; why?: unknown };
      // Strictly false, never merely falsy: a malformed answer must not become a veto.
      if (parsed.supported === false) return { outcome: "dissent", model: GEMMA_MODEL, why: String(parsed.why ?? "").slice(0, 300) };
      if (parsed.supported === true) return { outcome: "concur", model: GEMMA_MODEL, why: String(parsed.why ?? "").slice(0, 300) };
      throw new Error("verdict field missing");
    } catch (e) {
      if (attempt === 1) {
        warn("WARNING", "second-opinion unavailable", { model: GEMMA_MODEL, error: String(e).slice(0, 120) });
        return { outcome: "unavailable", model: GEMMA_MODEL, why: `auditor did not answer (${String(e).slice(0, 80)})` };
      }
    }
  }
  return { outcome: "unavailable", model: GEMMA_MODEL, why: "unreachable" };
}

/** Pure cosine similarity — exported so the threshold behaviour is testable without a model. */
export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { const x = a[i] ?? 0, y = b[i] ?? 0; dot += x * y; na += x * x; nb += y * y; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

/** Above this, a rejected citation is a rewording of something the page really showed. The gate
 *  itself is unaffected either way — this only decides which explanation the receipt carries. */
export const PARAPHRASE_THRESHOLD = 0.85;

export function classifyByDistance(similarity: number): "paraphrase" | "invention" {
  return similarity >= PARAPHRASE_THRESHOLD ? "paraphrase" : "invention";
}

/** The embedder rides the SAME route selection as the primary model — Vertex identity on Cloud
 *  Run, API key locally — so it needs no configuration of its own. */
// The plugin's embedder() narrows model names per family; the env override is a deliberate
// escape hatch, so it is cast once here rather than restricting the knob.
// ai.embed accepts either family's reference; the two plugins narrow their generics differently,
// so the union is stated at the seam where it is consumed.
const embedder: Parameters<typeof ai.embed>[0]["embedder"] = ROUTE === "gemini-api"
  ? (googleAI.embedder(EMBEDDING_MODEL as Parameters<typeof googleAI.embedder>[0]) as Parameters<typeof ai.embed>[0]["embedder"])
  : (vertexAI.embedder(EMBEDDING_MODEL as Parameters<typeof vertexAI.embedder>[0]) as Parameters<typeof ai.embed>[0]["embedder"]);

/**
 * Classify each fabricated citation as paraphrase or invention by its embedding distance to the
 * closest evidence window. Returns a one-line forensic note for the receipt, or "" when the
 * embedding model cannot be reached — the verdict never depends on this.
 */
export async function classifyFabrication(fabricated: readonly string[], evidenceExcerpts: readonly string[]): Promise<string> {
  if (fabricated.length === 0 || evidenceExcerpts.every((e) => !e.trim())) return "";
  try {
    // Windows keep each embedded chunk in the same size regime as a citation, so distance measures
    // wording, not length.
    const windows = evidenceExcerpts
      .flatMap((e) => e.split(/\n+/))
      .map((s) => s.trim())
      .filter((s) => s.length >= 8)
      .slice(0, 64);
    if (windows.length === 0) return "";
    const embedOne = async (text: string): Promise<number[]> => {
      const r = await ai.embed({ embedder, content: text.slice(0, 1500) });
      return (Array.isArray(r) ? (r[0] as { embedding: number[] })?.embedding : (r as { embedding?: number[] })?.embedding) ?? [];
    };
    const windowVecs = await Promise.all(windows.map(embedOne));
    const labels: string[] = [];
    for (const cite of fabricated.slice(0, 5)) {
      const v = await embedOne(cite);
      const best = Math.max(0, ...windowVecs.map((w) => cosine(v, w)));
      labels.push(`"${cite.slice(0, 40)}" → ${classifyByDistance(best)} (similarity ${best.toFixed(2)})`);
    }
    return `Fabrication forensics (${EMBEDDING_MODEL}): ${labels.join("; ")}. A paraphrase resembles real evidence but is not verbatim; an invention resembles nothing on the page. Both are rejected — proven quotes must be verbatim.`;
  } catch (e) {
    warn("WARNING", "fabrication forensics unavailable", { model: EMBEDDING_MODEL, error: String(e).slice(0, 120) });
    return "";
  }
}
