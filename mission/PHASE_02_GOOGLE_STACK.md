# PHASE 02 — Verify and Lock the Google Stack

**Status:** IN_PROGRESS → see completion report
**Specification written before execution:** yes

---

## 1. Current verified state

Read from the repository and from npm on 2026-08-24 — not from memory.

    genkit                  1.41.0
    @genkit-ai/vertexai     1.41.0     ← in use
    @genkit-ai/googleai     1.28.0     ← in use (unused route)
    @genkit-ai/express      1.41.0
    zod                     3.25.76    (Genkit 1.41 requires v3, not v4)
    playwright-core         1.62.1

    Genkit flows defined:   src/flows/plan.ts · repair.ts · verify.ts
    Deployed:               https://laspoh-proof-cffubwieta-uc.a.run.app (HTTP 200)
    Model in production:    gemini-3.5-flash via Vertex AI, asia-southeast1

## 2. Objective

Establish that the Google stack is not merely *present* but **current, supported, and chosen
on evidence** — and prove the qualifying path end to end on deployed infrastructure.

Success means: every mandatory technology requirement is satisfied by something running in
production, the package choices match what Google currently ships, and the reasoning behind each
choice is written down with the alternative that was rejected.

## 3. Why this phase exists

**Eligibility.** Three of the hackathon's mandatory requirements are technology requirements.
If any is satisfied only nominally — a package imported but unused, a model id that no longer
resolves — the submission fails on a technicality that has nothing to do with the quality of the
work.

**Judging (30% architecture).** "Google-native architecture used meaningfully rather than
cosmetically" is explicit. A deprecated plugin printing a removal warning on every cold start is
the opposite of that, and a judge reading the Cloud Run logs would see it.

**Reliability.** A plugin scheduled for removal is a dependency with a deadline. Discovering that
during judging week is strictly worse than discovering it now.

## 4. Exact scope

1. Verify, against current official sources, which Genkit packages Google ships today.
2. Verify the model identifier resolves — by calling it, not by reading a table.
3. Migrate off any deprecated plugin, if verification shows one.
4. Re-probe region/model availability under the new plugin (the old one rejected `global`, which
   is where the newer models are served — the new one may not).
5. Prove the qualifying path end to end on the deployed service and record the evidence.

## 5. Explicit non-scope

- No changes to orchestration, state, evidence, verification or receipts. This phase changes
  *which client library reaches the model*, and nothing above it.
- No new capability.
- No model change unless the evidence shows the current one is unavailable or clearly inferior —
  and if it changes, that is a recorded decision, not a silent upgrade.

## 6. Protected functionality

The three flows (`plan`, `repair`, `verify`) must behave identically after the migration. The
45-test suite must stay green. The deployed service must keep answering. `/health` must keep
reporting which route and model served the call — that endpoint is the evidence a judge reads.

## 7. Findings from verification

**`@genkit-ai/vertexai` and `@genkit-ai/googleai` are superseded by `@genkit-ai/google-genai`** —
a single unified plugin exposing both `vertexAI` (enterprise, ADC) and `googleAI` (API key).

Evidence, strongest first:

1. **Our own production logs.** Every cold start of `laspoh-api` prints:
   *"The @genkit-ai/vertexai plugin is deprecated and will be REMOVED in a future release.
   👉 Please migrate to @genkit-ai/google-genai"* — the runtime saying it, not a document.
2. `npm view @genkit-ai/google-genai` → **1.41.0**, "Genkit AI framework plugin for Google AI &
   Vertex APIs, including Gemini APIs" — same version as the rest of the stack.
3. genkit.dev's Vertex AI integration page documents `@genkit-ai/google-genai` as the package to
   install, with `vertexAI({ location })` as the initializer.

**A known limitation worth recording rather than discovering later:** the JS plugins do not yet
persist Gemini 3 `thought_signature` across turns, which returns a 400 on multi-turn reasoning.
Our flows are all **single-turn** (plan, repair, verify each take one prompt and return one
structured answer), so the gap does not apply — but it constrains any future multi-turn design,
and it is why the model choice below is not simply "the newest one".

## 8. Architecture

The seam is `src/genkit.ts`, which is the only file that knows a model vendor exists. Everything
above it — flows, orchestrator, verifier — receives an `ai` object and a model identity. That is
what makes this migration a one-file change and why the boundary was drawn there.

    src/genkit.ts        ← the ONLY vendor-aware module
      ├── route selection (Gemini API key wins if present, else Vertex/ADC)
      ├── model identity  → published on /health, recorded in every receipt
      └── ai              → consumed by plan / repair / verify

## 9. Data contracts

`modelIdentity()` must keep returning `{ route, model, location?, project? }`. It is read by
`/health` (judge-facing evidence) and stamped into every receipt (provenance). Changing its shape
would silently break both.

## 10. Google technology usage after this phase

| Requirement | Satisfied by | Meaningfully, or cosmetically? |
|---|---|---|
| Gemini 3.5+ | `gemini-3.5-flash` (or newer if the probe supports it) | Every plan, repair and verdict is a model decision |
| Google agent framework | **Genkit** — three `ai.defineFlow` flows with zod-typed structured output | The flows *are* the agent's reasoning |
| Google Cloud infra | **Cloud Run** — the deployed service, least-privilege runtime SA | The demo runs there; not a static host |

## 11. Eligibility safeguards

The migration touches one file and no judged capability, so it cannot blur the boundary. The
adapter to pre-existing Laspoh is untouched and stays off by default. `preExisting` remains a
field on the `Executor` interface.

## 12. Security requirements

- **No key is deployed.** Vertex is reached with the service's own identity; `GEMINI_API_KEY` is
  read from the environment only for local convenience and is never committed.
- The runtime service account keeps exactly `roles/aiplatform.user`.
- Model identity published on `/health` must contain the project id and region but **never** a
  credential.

## 13. Failure modes

| Scenario | Detection | Handling |
|---|---|---|
| New plugin's API differs and flows break | typecheck + 45 tests | Fix or revert before deploying |
| `global` still rejected | the region probe | Keep `asia-southeast1`; record it |
| Newer model unavailable in the reachable region | probe returns 404 | Stay on the verified model, record why |
| Deployed service regresses | `/health` + a live smoke mission | Roll back to the previous revision |
| A 401/403 during probing | explicit status check | **Not a verdict on availability** — refresh credentials and re-probe |

That last row is written from experience: an expired token has twice been misread in this program
as "the model is not served here".

## 14. Tests

- `pnpm typecheck`, `pnpm lint` — clean
- `pnpm test` — 45 passing, unchanged (the flows' behaviour must not move)
- Region/model probe — direct `:generateContent`, status codes recorded per region
- A live mission on the deployed service, with the cited reference cross-checked against
  `/demo/submissions` — the same asymmetric honesty test used elsewhere

## 15. Acceptance criteria

- [ ] No deprecated Genkit plugin remains in `package.json`
- [ ] No deprecation warning in the deployed service's cold-start logs
- [ ] `/health` reports route, model, and location
- [ ] 45 tests green after the migration
- [ ] A mission completes on the deployed service and its cited reference matches ground truth
- [ ] Region/model availability recorded as probe output, not assumption

## 16. Rollback

One file (`src/genkit.ts`) and `package.json`. `git revert` restores the previous plugin, which
still works — it is deprecated, not removed. Cloud Run keeps the previous revision, so traffic can
be shifted back without a rebuild.

## 17. Evidence required

- `npm view` output for the packages
- The deprecation warning quoted from our own Cloud Run logs
- Region probe: per-region HTTP status for the model
- `/health` from the deployed service after migration
- A live receipt with its reference matched against ground truth
- Commit SHA
