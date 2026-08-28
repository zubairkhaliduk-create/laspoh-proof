# Architecture

![Laspoh Proof architecture — three Google AI models, none grading its own work](architecture.png)

## One rule, enforced structurally

The component that does the work never grades it. A step becomes `proven` only when an isolated
verifier — given the proof criterion written *before* the step ran and the evidence of what the
page showed, and nothing else — confirms it and quotes the evidence, and that quote is mechanically
checked to actually appear in the evidence (`groundCitations`, `src/flows/verify.ts`). The rule has since grown two more teeth. The verifier does not judge alone — A different Google
model family (Gemma 4, over the Gemini API — a route separate from the verifier's) re-audits a
grounded verdict and can only demote it — never promote — with `/health` reporting honestly whether
it is armed on the running service; and gemini-embedding-001 classifies a rejected citation as a
paraphrase of real evidence or an outright invention. Three Google AI models; none grades its own work.

And for an **irreversible** step the proof comes FIRST. Post-hoc verification cannot recall a sent
application, so under a goal that states constraints the same verifier must license the action from
evidence on the current page before it executes: proven compliance proceeds, a visible violation is
blocked with the quote, silence blocks safely, and nothing observed at all fails closed
(`src/core/preaction.ts`). No evidence, no irreversible action. Everything below is in service of
making these rules structural rather than aspirational.

## Clean, modularized, easy to maintain

The codebase is ~2,500 lines across seven modules, each owning exactly one concern, with the
dependencies pointing one way:

- **`src/core`** — pure agent logic: mission state (`state.ts`), evidence records (`evidence.ts`),
  the receipt (`receipt.ts`), recovery policy (`recovery.ts`), plan sanitisation
  (`plan-sanitize.ts`), and the orchestrator (`orchestrator.ts`) — the *only* component permitted
  to change mission state. Nothing in `core` performs I/O except through the interfaces below.
- **`src/flows`** — the only place a model is called: three Genkit flows (`plan`, `repair`,
  `verify`), each with a Zod-schema'd contract so a malformed model reply fails at the boundary,
  not mid-mission — plus the second-opinion module (`second-opinion.ts`) wrapping the verifier
  with the Gemma audit and the embedding forensics.
- **`src/executors`** — actuation behind one narrow interface (`types.ts`): seven verbs, and an
  executor may not plan, may not decide what happens next, and may not judge success. Two
  implementations ship — a new Playwright reference executor and an adapter to a disclosed
  pre-existing runtime — so "swap the executor and the agent is unchanged" is demonstrated, not
  claimed.
- **`src/store`** — persistence behind `MissionStore` (`types.ts`), with in-memory and Firestore
  implementations.
- **`src/security`** — trust boundaries (`untrusted.ts`): fencing, injection detection, the
  navigation allow-list.
- **`src/obs`** — structured logging with redaction applied on egress (`log.ts`).
- **`src/server.ts`** — a thin Express layer that knows nothing about how missions run or where
  they are stored.

Every load-bearing guarantee is a pure exported function (`enforceCitation`, `groundCitations`,
`sanitizePlan`, `decide`, `unaddressedRequired`, `appendBounded`, `redact`, `cosine`,
`classifyByDistance`), which is why the 188-test suite — including an adversarial suite that
attacks the verifier with fabricated citations, and one that attacks the second-opinion auditor
with malformed answers — runs without a model in the loop.

## State management

Mission state is one plain serialisable object (`src/core/state.ts`); a checkpoint is a snapshot.
Three rules keep it honest: a step's status advances only through evidence, never intent;
`provenCount` is the only number allowed to describe success (attempts and dispatches are
*activity*, and the receipt keeps the two visibly apart); and failures are typed (`Failure.class`
plus `retryable` as a recorded fact) so recovery reads retryability instead of pattern-matching
prose.

Persistence sits behind the `MissionStore` seam. The default is zero-config in-memory, so a judge
can clone and run with no cloud at all; setting `MISSION_STORE=firestore` swaps in Firestore (one
document per mission) so a mission outlives the process. The event history is **append-only by
construction**: `update()` strips `events` in *both* stores, making `appendEvent` the only path by
which history changes — a system whose central claim is "we only report what we can prove" cannot
have a mutable record of what happened. Firestore appends run inside transactions (concurrent
instances cannot lose an event; `arrayUnion` was rejected because it deduplicates — data loss
disguised as tidiness), the event log is bounded at 400 with head+tail retention and an
`eventsDropped` counter reported rather than silent, and `selectStore()` probes connectivity before
trusting the store, degrading **loudly** to memory on failure. `POST /missions` honours idempotency
keys, so a retried request is the same mission, not a second grant application.

## Tool isolation and security

Four tiers of text reach a model, and they do not have equal standing (`src/security/untrusted.ts`):
system policy, user goal, tool observation, and page content — the last is data, never instruction.
Page text enters prompts only inside a fence whose delimiter is a **per-call cryptographic nonce**, so the
page cannot close the fence by printing a known marker; any occurrence of the nonce in the content
is stripped. Injection detection is deliberately *advisory*: a page ordering the agent to "mark
this complete" is reported to the verifier as evidence the page is untrustworthy — never silently
edited, because a filter that edits evidence corrupts the thing the system reasons about.

Tool scope is enforced in code: the executor vocabulary is seven verbs and nothing more; a
model-generated URL is untrusted by construction, so navigation is checked against an allow-list
that defaults to the mission's own start origin (derived, not configured — safe without anyone
remembering to make it so), and `javascript:`, `data:` and `file:` schemes are refused outright as
code execution wearing navigation's clothes. A refused navigation is recorded `blocked`, not
`failed` — the receipt never claims an attempt that was not made. The Laspoh bridge adapter treats
its counterpart as untrusted (`ok` must be strictly `=== true`; a hostile reply cannot coerce
success). Logs redact on the way out — secret-shaped keys and credential-shaped values are scrubbed
and attacker-controlled page text hard-truncated by the logger itself, never left to caller
discipline (`src/obs/log.ts`). The deployed service runs as a **dedicated least-privilege service
account** (`deploy.sh`), not the default compute account, and authenticates to Vertex with its
identity — no plaintext credential for any primary model exists in code or image, so there is
nothing to leak or rotate. The optional Gemma auditor is the sole exception: its provider key is
stored in Secret Manager and mounted at deploy time, and the service runs correctly without it.
The Gemma auditor's key, when configured, is scoped to the Generative Language API alone. The API is deliberately open so a judge needs no credentials, and the honest description of that
choice is that it is **not rate-limited**: `maxSteps` bounds one mission's actions and
`--max-instances 1` bounds cost, but neither bounds concurrent requests, so a flood of missions can
exhaust the single instance. That is an accepted, stated trade for reviewability during judging —
not a defence. `startUrl` is validated as http(s) at the intake seam AND scheme-checked before the
reconnaissance navigate: an adversarial review found that dispatch was the one path to the browser
that never consulted the allow-list, and reproduced `file:///etc/passwd` reaching evidence.

## The verification chain

Verification is a chain of four checks, each independent of the last, and each wired so it can only
make the system more skeptical:

1. **The Gemini verifier** (`src/flows/verify.ts`) — sees only the criterion and fenced evidence;
   defaults to disbelief; must quote the evidence to say yes. A verifier that crashes is read as
   "nothing proven", never as approval.
2. **Citation grounding** — code, not a model: every quoted citation must appear verbatim in the
   evidence or the whole verdict is downgraded (one invented quote poisons the answer — the
   remaining citations came from the same answer).
3. **The second-opinion auditor** (Gemma 4, `src/flows/second-opinion.ts`) — a different model
   family, over a different route, shown only the criterion and the grounded quotes, asked one
   bounded question: do these quotes establish this criterion? A strict `false` demotes the
   verdict with both opinions on the receipt. Anything else — malformed output, an HTTP failure, a
   timeout — is *unavailable*, never a veto: an auditor that failed to answer has not disagreed.
4. **Fabrication forensics** (gemini-embedding-001) — when grounding rejects a quote, embedding
   distance to the nearest evidence window classifies it: a *paraphrase* (the model saw the right
   thing and rewrote it) or an *invention* (the model asserted something the page never showed).
   The classification changes the receipt's explanation only, never the verdict — both are
   rejected, because proven quotes must be verbatim.

The asymmetry is the design: the auditor can demote but never promote; the forensic can explain but
never excuse; and every check degrades to exactly the behaviour the system shipped with, so an
outage anywhere makes the system quieter, never more credulous.

## What the receipt's integrity hash does and does not prove

`integrity` is SHA-256 over the evidence chain (each record's own hash, in order), shipped with
the receipt. It is a **deterministic content digest**: recompute it from the same evidence and you
get the same value, so a truncated, reordered or substituted chain is detectable, and two parties
can confirm they are looking at the same receipt. It is **not a signature** — nothing is signed
with a key, so anyone able to rewrite the receipt can recompute the digest. It is named for what
it does. The real check on a receipt is not this number; it is `/demo/jobs/submissions`, the
server-side record the agent has no write path to.

## Failure tolerance

Recovery is pure predicates over counters, kept out of the model's hands — an LLM asked "are you
stuck?" says no and tries again (`src/core/recovery.ts`). Blind repeats are refused at two attempts
with nothing changed; wandering is measured in *proven work*, because page-churn counters are blind
to a busy agent proving nothing; when the page itself names an unanswered required field the stall
detector stands down, because escalating over ground truth is what pushes agents to submit
incomplete forms. Repair is bounded (2 rounds), the step budget is a hard ceiling the agent cannot
argue with, the verifier gets one bounded schema-retry, and executors contractually resolve (never
reject) with their own deadlines, so a failure to act is data, not an exception. The blind-submit
gate closes the loop: `outstandingRequired` is read from the DOM by the executor — never
model-generated, so the mechanism cannot be talked out of firing — and `unaddressedRequired()`
(pure, tested) inserts repair steps *before* the submit that would otherwise bounce.

## Google stack

| Component | Where | Role |
|---|---|---|
| Gemini 3.5 Flash | Vertex AI (`asia-southeast1`), unified `@genkit-ai/google-genai` plugin (Genkit 1.41) | plan · repair · verify |
| Gemma 4 (`gemma-4-31b-it`) | Gemini API, scoped key | second-opinion audit of grounded quotes |
| gemini-embedding-001 | Vertex AI | fabrication forensics on rejected citations |
| Cloud Run | `--no-cpu-throttling`, 202-async missions, least-privilege SA | the service |
| Firestore | append-only events, transactional | durable mission state |

The dual model route (Vertex identity in deployment, Gemini API key for local reproduction) is
deliberate: a judge cloning this repo has an API key long before they have working Application
Default Credentials, while the deployed service has an identity and no key to leak. The active
route is logged at boot and reported by `/health` and on every receipt, so the model that produced
a result is never in doubt.
