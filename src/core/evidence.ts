/**
 * EVIDENCE — the raw material a claim is judged against.
 *
 * Evidence is only ever what the world SHOWED: page text the executor read, an identifier the page
 * displayed, the URL it ended on. The agent's own narration is never evidence, which is why
 * nothing here accepts model output. If a claim cannot be traced to one of these records, the
 * verifier has nothing to confirm it with, and the correct outcome is "unproven".
 */
import { createHash } from "node:crypto";
import type { Action, Observation } from "../executors/types.js";

export interface Evidence {
  id: string;
  stepId: string;
  at: string;
  action: Action;
  url: string;
  /** Bounded: evidence must stay reviewable by a human and cheap to carry in a prompt. */
  excerpt: string;
  identifiers: string[];
  /** The page's own report of what its form controls hold, at the moment of this observation. */
  formState: string[];
  /** Hash of the full observed text, so truncation can never be mistaken for tampering. */
  sha256: string;
  /** WHICH executor produced this, and whether that executor is pre-existing work.
   *  Provenance belongs on the evidence itself, not only on the receipt's summary: a receipt can
   *  be regenerated, and evidence gathered through a disclosed pre-existing runtime must carry
   *  that fact with it wherever it travels. */
  producedBy: { executor: string; preExisting: boolean };
}

const MAX_EXCERPT = 1200;

export function recordEvidence(
  stepId: string,
  action: Action,
  obs: Observation,
  producedBy: { executor: string; preExisting: boolean } = { executor: "unknown", preExisting: false },
): Evidence {
  const full = obs.pageText ?? "";
  const formState = obs.formState ?? [];
  // The hash covers the form state too: it is evidence, so it must be as tamper-evident as the text.
  // THE URL IS INSIDE THE HASH, because it is inside the grounding corpus.
  //
  // An adversarial review found the one field the digest omitted was the one that says WHERE the
  // evidence came from: the verifier is shown `e.url` and citations can ground against it, so
  // rewriting a record's url (recruiter → direct employer) changed which quotes ground while
  // leaving `integrity` bit-identical. Everything the verifier can see must be covered by the
  // digest, or the digest attests to less than the verdict rests on.
  const sha256 = createHash("sha256").update(`${obs.url ?? ""}\n${full}\n${formState.join("\n")}`).digest("hex");
  return {
    // Scoped by step: the id was derived from page content alone, so two steps observing an
    // unchanged page — routine on the pre-action and already-satisfied paths — minted colliding
    // ids that a reader of `evidenceIds` could not tell apart.
    id: `ev_${stepId}_${sha256.slice(0, 12)}`,
    stepId,
    at: new Date().toISOString(),
    action,
    url: obs.url,
    excerpt: full.length > MAX_EXCERPT ? `${full.slice(0, MAX_EXCERPT)}…[truncated ${full.length - MAX_EXCERPT} chars]` : full,
    identifiers: obs.identifiers ?? [],
    formState,
    sha256,
    producedBy,
  };
}
