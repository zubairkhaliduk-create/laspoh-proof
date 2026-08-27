/**
 * THE SECOND-OPINION AUDITOR AND THE FABRICATION FORENSIC.
 *
 * Two additional Google AI models joined the verification path — Gemma as an independent auditor
 * of grounded quotes, gemini-embedding-001 as a forensic on rejected ones. The property that
 * matters is the ASYMMETRY: each can only ever make the system more skeptical. These tests pin
 * that in both directions — a dissent demotes, and NOTHING an unavailable or malformed auditor
 * does can promote, veto by crashing, or change a verdict that grounding already settled.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyByDistance, cosine, PARAPHRASE_THRESHOLD, secondOpinion, secondOpinionConfigured } from "../src/flows/second-opinion.js";

const gemmaSays = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );
const answer = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GEMMA_API_KEY;
  delete process.env.SECOND_OPINION;
});

describe("second opinion — an auditor that can only demote", () => {
  it("is not configured without a key, and says so rather than guessing", async () => {
    expect(secondOpinionConfigured()).toBe(false);
    const r = await secondOpinion("the reference was issued", ["Your reference is GRT-2211"]);
    expect(r.outcome).toBe("unavailable");
  });

  it("SECOND_OPINION=0 disarms it even with a key present", () => {
    process.env.GEMMA_API_KEY = "test-key";
    process.env.SECOND_OPINION = "0";
    expect(secondOpinionConfigured()).toBe(false);
  });

  it("a strict false is a dissent, carried with the auditor's reason", async () => {
    process.env.GEMMA_API_KEY = "test-key";
    gemmaSays(answer('{"supported": false, "why": "the quote names a different reference"}'));
    const r = await secondOpinion("reference GRT-9999 was issued", ["Your reference is GRT-2211"]);
    expect(r.outcome).toBe("dissent");
    expect(r.why).toContain("different reference");
  });

  it("a strict true concurs", async () => {
    process.env.GEMMA_API_KEY = "test-key";
    gemmaSays(answer('{"supported": true, "why": "the quote states the reference"}'));
    const r = await secondOpinion("the reference was issued", ["Your reference is GRT-2211"]);
    expect(r.outcome).toBe("concur");
  });

  it("a merely-falsy answer is NOT a dissent — malformed output cannot become a veto", async () => {
    process.env.GEMMA_API_KEY = "test-key";
    gemmaSays(answer('{"supported": 0, "why": "shrug"}'));
    const r = await secondOpinion("c", ["q"]);
    expect(r.outcome).toBe("unavailable");
  });

  it("an HTTP failure is unavailable, never a dissent — the auditor cannot veto by crashing", async () => {
    process.env.GEMMA_API_KEY = "test-key";
    gemmaSays({ error: { code: 429 } }, 429);
    const r = await secondOpinion("c", ["q"]);
    expect(r.outcome).toBe("unavailable");
  });

  it("no grounded quotes → nothing to audit; it does not invent an opinion", async () => {
    process.env.GEMMA_API_KEY = "test-key";
    const spy = gemmaSays(answer('{"supported": true}'));
    const r = await secondOpinion("c", []);
    expect(r.outcome).toBe("unavailable");
    expect(spy).not.toHaveBeenCalled();
  });

  it("prose around the JSON is tolerated — Gemma has no native JSON mode", async () => {
    process.env.GEMMA_API_KEY = "test-key";
    gemmaSays(answer('Sure. Here is my verdict:\n```json\n{"supported": false, "why": "not established"}\n```'));
    const r = await secondOpinion("c", ["q"]);
    expect(r.outcome).toBe("dissent");
  });
});

describe("fabrication forensics — distance classifies, the gate is untouched", () => {
  it("cosine is 1 for identical directions, 0 for orthogonal, robust to zero vectors", () => {
    expect(cosine([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });

  it("classification is a pure threshold on similarity", () => {
    expect(classifyByDistance(PARAPHRASE_THRESHOLD)).toBe("paraphrase");
    expect(classifyByDistance(PARAPHRASE_THRESHOLD - 0.01)).toBe("invention");
    expect(classifyByDistance(0)).toBe("invention");
    expect(classifyByDistance(1)).toBe("paraphrase");
  });
});
