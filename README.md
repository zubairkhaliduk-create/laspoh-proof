# Laspoh Proof

**An autonomous agent that proves what it did.**
Gemini 3.5 Flash · Genkit · Cloud Run

**Live:** https://laspoh-proof-578405952710.us-central1.run.app
([`/health`](https://laspoh-proof-578405952710.us-central1.run.app/health) ·
[`/demo`](https://laspoh-proof-578405952710.us-central1.run.app/demo))

Most agents report what they *attempted*. This one reports only what it can **prove**, and says so
plainly when it cannot. A step counts as done when an independent verifier — which never sees the
planner's reasoning or the executor's opinion — confirms it from what the page actually showed, and
cites that evidence. Everything else is reported as unproven rather than rounded up.

The output is a **receipt**: `Proven 7 of 8`, with the reason for each one it could not prove.

---

## ⚠️ Disclosure of pre-existing work

**Laspoh** is a pre-existing experimental browser-automation platform. Its repository dates from
**June 2026**, before this hackathon's submission period, and it is **not** presented as work
created during the hackathon.

**Everything in this repository was built during the submission period (3–31 August 2026):** the
mission orchestrator, planner, state machine, evidence model, independent verifier, recovery
policy, receipts, the reference executor, the demo target, and the Cloud Run deployment.

The single point of contact with the pre-existing platform is
[`src/executors/laspoh.ts`](src/executors/laspoh.ts) — a ~100-line adapter (new) that exposes it
through the same `Executor` interface the reference executor implements. It contains no automation
logic of its own.

The agent does not depend on it. The default executor
([`src/executors/reference.ts`](src/executors/reference.ts)) is new, and the demo runs on it. Two
executors behind one interface exist precisely so the separation is demonstrable: **swap the
executor and the agent is unchanged.** Every receipt records which executor produced it and whether
that executor is pre-existing work.

---

## Spin-up

### Prerequisites
- Node 22+, `pnpm`
- Either a **Gemini API key**, or `gcloud` with Application Default Credentials for **Vertex AI**
- A Google Cloud project (for deployment)

### Run locally

```bash
pnpm install
npx playwright install chromium

# Route A — Gemini API (simplest; no cloud credentials needed)
export GEMINI_API_KEY="your-key"

# Route B — Vertex AI (used by the deployed service; no key involved)
#   gcloud auth application-default login
#   export VERTEX_PROJECT="your-project"

pnpm dev            # http://localhost:8080
```

The route in use is logged at boot and reported by `/health`, so which model answered is never
ambiguous.

### Run a mission

```bash
# The demo target is served by this same service, so the demo is reproducible with no third-party
# credentials and cannot break because someone else changed their markup.
curl -X POST http://localhost:8080/missions \
  -H 'content-type: application/json' \
  -d '{
    "goal": "Apply for the research grant as Ada Lovelace (ada@example.com), an independent researcher. Get a confirmation reference.",
    "startUrl": "http://localhost:8080/demo"
  }'
# → { "id": "m_1a2b3c4d", "status": "running", "poll": "/missions/m_1a2b3c4d" }

curl http://localhost:8080/missions/m_1a2b3c4d           # live state + event stream
curl http://localhost:8080/missions/m_1a2b3c4d/receipt   # the proof
```

### Deploy to Cloud Run

```bash
./deploy.sh          # PROJECT / REGION / SERVICE overridable by env var
```

Vertex is reached with the service's own identity — **no API key is deployed**. The service runs as
`laspoh-proof-runtime`, which holds exactly one role (`roles/aiplatform.user`).

**Known limit:** mission state is held in memory, and `--max-instances` is enforced per *revision*.
During a rollout the previous revision keeps serving, so a mission started just before a deploy
returns `404` from the new revision the moment traffic shifts. The work itself is unaffected — it
runs to completion on the old revision — but don't deploy while a mission is in flight.

### Tests

```bash
pnpm test
```

- `test/core.test.ts` — the guarantees that must hold whatever the model says: attempted never
  counts as proven; partial results report the true number; the stall detector stands down when
  the page states the next action.
- `test/integrity.test.ts` — the citation rule (a "proven" verdict that quotes nothing is
  downgraded, in code, not by prompt), success accounting, and the blind-submit gate.
- `test/executor.test.ts` — the executor against a **real Chromium and a real server**: what the
  form reports as required, what its controls actually hold, and that ticking a checkbox counts as
  an effect even though no page text changes.
- `test/loop.e2e.test.ts` — a fill is `ok` only when the value stayed in the field, a click only
  when something changed, and submitting with a required box unticked is reported as the rejection
  it is.

---

## The agent does not submit blind

The failure this project kept hitting is the one that makes agents look careless: plan every field
up front, fill what was guessed, submit, get refused, read the refusal, and only *then* go back for
the controls the form had been advertising as required the whole time.

It is fixed structurally, not with a better prompt:

1. The executor reads the DOM after every action and reports which controls are **required and
   still empty** (`Observation.outstandingRequired`). That list is ground truth from the surface
   that can actually see the form — never a model's recollection.
2. Before dispatching anything, the orchestrator subtracts what the remaining plan already covers.
   `unaddressedRequired` is a pure, tested function; what survives it is exactly the set the agent
   would otherwise have discovered by being rejected.
3. If anything survives, a narrow **repair flow** runs first. It is asked one question — what
   values belong in *these specific controls* — and explicitly not "what should we do next", which
   is re-planning and is how an agent talks itself into repeating a failed action. Bounded to two
   rounds, because an agent allowed to repair forever is an agent allowed to loop.

The mirror image also matters. Once repair has set a control, a later planned step aimed at the
same control has nothing left to do — and a no-effect re-attempt would be recorded as a *failed*
step for work that was actually completed. Such a step is **verified rather than skipped**: its
criterion still has to be confirmed from evidence, exactly as if the action had run. What is saved
is a pointless action, not the burden of proof.

A related gap this exposed: a filled input's value never appears in the page's visible text, so a
fill could never be *proven* — the verifier was judging a criterion against material that
structurally could not contain the answer. Observations now carry the page's own report of what its
controls hold, hashed alongside the rest of the evidence.

---

## Why the demo target has a trap

`/demo` is a grant application with a consent checkbox that is easy to miss, and a server that
**rejects** an incomplete submission. The confirmation reference appears only on genuine success.

That makes the failure mode legible: an agent that submits early gets a rejection page, and a
receipt claiming success without a reference is provably wrong. It is the smallest honest test of
whether a system is reporting reality or its own intentions.

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md).

| Requirement | Used |
|---|---|
| Gemini 3.5+ | `gemini-3.5-flash`, via Vertex AI (`asia-southeast1`) or the Gemini API |
| Google agent framework | **Genkit** 1.41 |
| Google Cloud infrastructure | **Cloud Run** |

## Endpoints

| | |
|---|---|
| `GET /health` | model route, model id, available executors |
| `POST /missions` | start a mission; returns immediately (`202`) |
| `GET /missions/:id` | live state and event stream |
| `GET /missions/:id/receipt` | the receipt, with evidence and integrity hash |
| `GET /demo` | the demo target |
| `GET /demo/submissions` | ground truth — what the server actually received |
