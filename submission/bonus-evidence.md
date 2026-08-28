# Additional Google AI models — evidence, not claims

The rule: +0.2 per additional Google AI model successfully integrated (max +0.6). Whether a given
model qualifies is the sponsor's call. Nothing here is asserted as earned.

## 1. Gemma 4 — `gemma-4-31b-it`
- **Role:** second-opinion auditor. Re-audits every grounded "proven" verdict from a different
  model family, over the Gemini API (a route separate from the verifier's Vertex identity).
  **Demotion-only** — it can never promote a verdict.
- **Code:** `src/flows/second-opinion.ts` (`secondOpinion`), wired in `src/flows/verify.ts`.
- **Tests:** `test/second-opinion.test.ts` — dissent demotes; malformed/HTTP-failure/timeout are
  "unavailable", never a veto; no-quotes short-circuits without a call.
- **Live status:** visible at `/health` → `verificationModels.secondOpinion.armed`. Currently
  **false**: the Gemini API returns 429 "prepayment credits depleted" for the project until
  billing is enabled (owner console action). A scoped API key restricted to
  generativelanguage.googleapis.com has already been minted; `deploy.sh` auto-mounts a
  `gemma-api-key` secret when present.
- **Availability verified:** `gemma-4-31b-it` appears in the Gemini API ListModels response for
  this key. Probed on Vertex (us-central1, global) → 404: it is a Gemini-API-route model.

## 2. `gemini-embedding-001`
- **Role:** fabrication forensics. When citation grounding rejects a quote, embedding distance to
  the nearest evidence window classifies it *paraphrase* vs *invention*. Explanation only —
  **never changes a verdict**.
- **Code:** `src/flows/second-opinion.ts` (`classifyFabrication`, `cosine`, `classifyByDistance`).
- **Tests:** threshold and cosine behaviour pinned without a model.
- **Live status:** reachable via the service's own Vertex identity — probed 200 in us-central1,
  asia-southeast1 and global.
- **Caveat:** an embedding model may or may not count as an "additional Google AI model" for the
  bonus. Listed as a candidate; the sponsor decides.

## Considered and rejected
Veo / Lyria — no honest role in a proof system; adding them would be decoration, which the rules
and the judging criteria both punish. A Cloud TTS "spoken receipt" was evaluated as a third
candidate; the Cloud Text-to-Speech API probe returned 403 (API not enabled on the project) and
arming it adds deploy surface days before the deadline for at most +0.2. Deferred as
NICE-TO-HAVE per the change-control rule: do not risk the base score chasing bonus.
