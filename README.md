# Laspoh Proof

**An autonomous agent that proves what it did.**
Gemini 3.6 · Genkit · Cloud Run

Most agents report what they *attempted*. This one reports only what it can **prove**, and says so
plainly when it cannot. A step counts as done when an independent verifier — which never sees the
planner's reasoning or the executor's opinion — confirms it from what the page actually showed, and
cites that evidence. Everything else is reported as unproven rather than rounded up.

The output is a **receipt**: `Proven 3 of 5`, with the reason for each one it could not prove.

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

Vertex is reached with the service's own identity — **no API key is deployed**.

### Tests

```bash
pnpm test
```

- `test/core.test.ts` — the guarantees that must hold whatever the model says: attempted never
  counts as proven; partial results report the true number; the stall detector stands down when
  the page states the next action.
- `test/loop.e2e.test.ts` — the executor against a **real Chromium and a real server**: a fill is
  `ok` only when the value stayed in the field, a click only when something changed, and submitting
  with a required box unticked is reported as the rejection it is.

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
| Gemini 3.5+ | `gemini-3.6-flash`, via Vertex AI or the Gemini API |
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
