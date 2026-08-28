/**
 * THE ADVERSARIAL VERIFIER SUITE.
 *
 * "No proof, no done" is a property of this code or it is marketing. These tests attack it the way
 * a hostile judge would: not by hoping a live model misbehaves, but by handing the guard the exact
 * output a misbehaving model produces and checking the guard holds.
 *
 * The case that matters most is a FABRICATED CITATION. Every other protection in this system
 * assumes the verifier is looking at real evidence — the isolation, the disbelief default, the
 * pre-committed criterion. A quote the model invented defeats all of them simultaneously, and it
 * is exactly what "can evidence be forged?" means.
 *
 * No model is involved here, deliberately. Asking a model to police a model reintroduces the
 * problem one level up.
 */
import { describe, expect, it } from "vitest";
import { enforceCitation, evidenceCorpus, groundCitations } from "../src/flows/verify.js";
import type { Evidence } from "../src/core/evidence.js";

const ev = (over: Partial<Evidence> = {}): Evidence => ({
  id: "ev_1", stepId: "s1", at: "2026-08-24T00:00:00Z",
  action: { kind: "inspect" }, url: "http://demo.test/demo",
  excerpt: "Research Grant Application. Your application has been submitted successfully. Confirmation reference: GR-481902. Keep this reference.",
  identifiers: ["GR-481902"], formState: ["Full name = Ada Lovelace", "Applying as = Independent researcher"],
  sha256: "abc123", producedBy: { executor: "reference", preExisting: false }, ...over,
});

describe("a citation must actually be in the evidence", () => {
  it("accepts a quote that is really there", () => {
    const { grounded, fabricated } = groundCitations(["Confirmation reference: GR-481902"], [ev()]);
    expect(grounded).toHaveLength(1);
    expect(fabricated).toHaveLength(0);
  });

  it("catches an INVENTED confirmation reference — the forgery that defeats everything else", () => {
    const { fabricated } = groundCitations(["Confirmation reference: GR-000000"], [ev()]);
    expect(fabricated, "a reference the page never showed was accepted as proof").toHaveLength(1);
  });

  it("catches a plausible sentence the page never contained", () => {
    const { fabricated } = groundCitations(["Your application was received and approved."], [ev()]);
    expect(fabricated).toHaveLength(1);
  });

  it("finds a quote in form state and in identifiers, not only in page text", () => {
    // A filled field never appears in visible page text; it is still real evidence.
    expect(groundCitations(["Applying as = Independent researcher"], [ev()]).grounded).toHaveLength(1);
    expect(groundCitations(["GR-481902"], [ev()]).grounded).toHaveLength(1);
  });

  it("tolerates re-wrapping and case, because that is not fabrication", () => {
    // A model that quotes accurately but re-wraps a line has invented nothing, and failing it
    // would train the system to distrust honest work.
    expect(groundCitations(["  confirmation   reference:   GR-481902  "], [ev()]).grounded).toHaveLength(1);
    expect(groundCitations(['"Your application has been submitted successfully."'], [ev()]).grounded).toHaveLength(1);
  });

  it("rejects a quote too short to mean anything", () => {
    // A two-character "quote" matches almost any corpus; accepting it would make the check decorative.
    expect(groundCitations(["GR"], [ev()]).fabricated).toHaveLength(1);
    expect(groundCitations(["."], [ev()]).fabricated).toHaveLength(1);
  });

  it("does not find evidence from a DIFFERENT step's page", () => {
    const wrongSite = ev({ excerpt: "Sign in to continue", identifiers: [], formState: [], url: "http://other.test/login" });
    expect(groundCitations(["Confirmation reference: GR-481902"], [wrongSite]).fabricated).toHaveLength(1);
  });
});

describe("what the verifier is allowed to conclude", () => {
  it("downgrades proven when ANY citation was fabricated — the verdict goes down whole", () => {
    // Not "drop the bad quote and keep the rest". A verifier that invented one quote has shown it
    // will assert what the evidence does not contain, and the rest came from the same answer.
    const v = enforceCitation(
      { verdict: "proven", citedEvidence: ["Confirmation reference: GR-481902", "and it was approved by a human"], reasoning: "looks done" },
      [ev()],
    );
    expect(v.verdict).toBe("unproven");
    expect(v.reasoning).toContain("does not appear in the evidence");
    expect(v.citedEvidence).toHaveLength(0);
  });

  it("keeps proven when every citation is grounded", () => {
    const v = enforceCitation(
      { verdict: "proven", citedEvidence: ["Confirmation reference: GR-481902"], reasoning: "the reference is shown" },
      [ev()],
    );
    expect(v.verdict).toBe("proven");
  });

  it("still downgrades a proven verdict that cites nothing at all", () => {
    expect(enforceCitation({ verdict: "proven", citedEvidence: [] }, [ev()]).verdict).toBe("unproven");
  });

  it("never UPGRADES — grounding a quote does not make an unproven verdict proven", () => {
    const v = enforceCitation({ verdict: "unproven", citedEvidence: ["Confirmation reference: GR-481902"] }, [ev()]);
    expect(v.verdict).toBe("unproven");
  });

  it("leaves contradicted alone — a contradiction is a finding, not a failure to prove", () => {
    expect(enforceCitation({ verdict: "contradicted", citedEvidence: ["Rejected."] }, [ev()]).verdict).toBe("contradicted");
  });

  it("with NO evidence at all, a proven verdict cannot stand", () => {
    // The empty-evidence case must not fall through the grounding check untested: `evidence.length
    // > 0` guards it, so the citation-exists rule has to catch this one.
    const v = enforceCitation({ verdict: "proven", citedEvidence: [] }, []);
    expect(v.verdict).toBe("unproven");
  });
});

describe("the corpus the check searches", () => {
  it("includes page text, form state, identifiers and the URL", () => {
    const c = evidenceCorpus([ev()]);
    expect(c).toContain("submitted successfully");
    expect(c).toContain("ada lovelace");
    expect(c).toContain("gr-481902");
    expect(c).toContain("demo.test");
  });

  it("is empty for no evidence, so nothing can be grounded against nothing", () => {
    expect(evidenceCorpus([])).toBe("");
    expect(groundCitations(["anything at all"], []).fabricated).toHaveLength(1);
  });
});

// FOUND BY A 31-RUN BLIND PRODUCTION EVALUATION. The prompt and the grounding corpus were two
// separate assemblies of the same evidence, and they disagreed: the verifier was shown
// "form controls now hold: Full name = Ada Lovelace", quoted it accurately, and was told the quote
// did not appear in the evidence. Through the pre-action gate — which needs a PROVEN licence —
// that refused four of five legitimate applications on the control scenario. The system blocked
// work it should have done, for a string-formatting reason, behind a principled-sounding refusal.
describe("a quote taken from what the verifier was SHOWN always grounds", () => {
  const ev = {
    id: "e1", stepId: "s1", url: "http://x/role", title: "t",
    excerpt: "Site Reliability Engineer — Orbital Systems Ltd",
    identifiers: ["JA-123456"], formState: ["Full name = Ada Lovelace", "Email address = ada@example.com"],
    sha256: "0".repeat(64), at: new Date(0).toISOString(),
    producedBy: { executor: "reference", preExisting: false },
  } as never;

  it("grounds the form-state line exactly as rendered, prefix included", () => {
    const { fabricated } = groundCitations(["form controls now hold: Full name = Ada Lovelace | Email address = ada@example.com"], [ev]);
    expect(fabricated).toHaveLength(0);
  });

  it("grounds the identifiers line and the page text too", () => {
    const { fabricated } = groundCitations(["identifiers: JA-123456", "Orbital Systems Ltd"], [ev]);
    expect(fabricated).toHaveLength(0);
  });

  it("still rejects an invented quote — this widened the corpus, it did not weaken the rule", () => {
    const { fabricated } = groundCitations(["form controls now hold: Full name = Charles Babbage"], [ev]);
    expect(fabricated).toHaveLength(1);
  });

  it("still rejects a reference the evidence never carried", () => {
    expect(groundCitations(["JA-999999"], [ev]).fabricated).toHaveLength(1);
  });
});
