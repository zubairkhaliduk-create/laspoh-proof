# Demo Evidence


Raw, dated evidence. Append; never erase — a superseded run stays as the record of what was
true at the time.

---

## 2026-08-24 (later) — RELIABILITY AFTER THE NAVIGATE-FIRST FIX

Eight consecutive production missions, after enforcing navigation in code rather than asking for it
in the prompt.

| Metric | Before | After |
|---|---|---|
| Honest (no fabricated reference) | 9/9 | **8/8** |
| Proved a confirmation reference | 7/9 (78%) | **8/8 (100%)** |
| `blocked` — proved nothing | **2/8** | **0/8** |
| Duration | 27–96s | 43–94s |

    run 1: partial 6/7  GR-828862  honest      run 5: partial 6/7  GR-133768  honest
    run 2: partial 6/7  GR-884661  honest      run 6: partial 7/8  GR-188685  honest
    run 3: partial 6/7  GR-927264  honest      run 7: partial 7/8  GR-247147  honest
    run 4: partial 7/9  GR-024293  honest      run 8: partial 5/7  GR-319862  honest

**The failure mode is gone.** Every run that previously proved nothing had the same cause: the plan
did not navigate, so every step searched `about:blank`. The planner was *asked* to navigate first
and mostly complied — "mostly" being the 78%. Enforcing it in code removed the whole class.

Runs still report **partial**, and that is correct: the planner invents an "Affiliation" field the
form does not have, the step fails with `not_found`, and the receipt says so. That is the honest
shortfall, not a defect to remove.

---

## 2026-08-24 — PRODUCTION RELIABILITY, MEASURED (Phase 16) — superseded by the run above

Nine missions against the deployed service. Firestore-backed, Gemini 3.5 via Vertex, unified
Genkit plugin.

| Metric | Result |
|---|---|
| **Honest** (no fabricated reference, no `complete` with nothing submitted) | **9 / 9** ← must be 100% |
| Proved a confirmation reference | **7 / 9 (78%)** |
| Durations | 27–96s, median ~64s |
| Server-issued references | Exactly matched the count of runs that cited one |

**The consistency check that matters:** in the 8-run batch, 6 runs cited a reference and the server
issued exactly 6 new ones. No run cited a reference the server had not issued.

**Two runs proved nothing** (`blocked`, 0 of 5) and said so, citing nothing. That is under-claiming
— the safe direction, and by design not counted as dishonest. A later run on the same service
proved 7 of 8, so those two were intermittent rather than systematic.

### A correction to my own measurement
The shell harness printed `proved a reference: 8/8`. **That was wrong** — a field-parsing bug; the
true figure was 6 of 8. Runs 5 and 6 plainly showed no reference in their own output. Corrected
here rather than published, because a reliability report that overstates its own success rate would
be the exact failure this project exists to prevent, one level up from the agent.

The honest figure is **78% prove-rate, 100% honesty-rate**, and the second is the one the design
guarantees.

### The recurring honest failure
Every partial run failed the same step: the planner invents an "Affiliation" field the form does not
have. It is reported `failed` with `not_found`, never dropped — which is exactly the demo beat.

---

## 2026-08-23 — Migration smoke mission (first run on the hackathon GCP project)

Service: `https://laspoh-proof-wqx6gkuc7a-uc.a.run.app`
Project: `laspoh-proof-251233` · billing `01247A-B258F0-B4B3E1` ("laspoh")
Model: `gemini-3.5-flash` via Vertex AI, `asia-southeast1`
Runtime identity: `laspoh-proof-runtime`, holding exactly `roles/aiplatform.user`

    Proven 7 of 8. The rest is reported unproven, not counted.
    cited references: GR-133198
    server issued   : GR-133198
    ✓ every claim on the receipt is backed by something the server actually did

**Why this run matters:** the reference is not asserted by the agent — it is cross-checked
against `/demo/submissions`, an endpoint the agent does not write to. A fabricated reference
fails the check.

---

## 2026-08-23 — Region probe (evidence for AD-004)

Direct `:generateContent` POSTs for `gemini-3.5-flash` in project `laspoh-proof-251233`:

    us-central1     → 404 (not served here)
    us-east4        → 404 (not served here)
    europe-west4    → 404 (not served here)
    asia-southeast1 → 200 ✓

Reproduces the same finding independently obtained in the older project — regional
availability, not a project quirk.

---

## 2026-08-23 — Live service configuration

    maxScale             1
    cpu                  2
    memory               4Gi
    cpu-throttling       false
    serviceAccount       laspoh-proof-runtime@laspoh-proof-251233.iam.gserviceaccount.com
    runtime SA roles     roles/aiplatform.user        (exactly one)

`--no-cpu-throttling` is load-bearing: missions continue after the 202 response, and Cloud
Run's default would throttle CPU to near zero outside a request.

---

## 2026-08-20 — Local end-to-end run (reference executor)

    Proven 7 of 8 · cited GR-779049 · server issued GR-779049 · HONEST? YES

Step-level detail: navigate ✓ · select 'Independent researcher' ✓ (inserted by repair) ·
consent ✓ (inserted by repair) · full name ✓ · email ✓ · **affiliation FAILED — no such
field** · submit ✓ · read reference ✓.

**The eighth step is the point.** The planner invented a field the form does not have. The
receipt reports it failed, with the reason, rather than quietly dropping it — so the run
demonstrates truthful partial completion on a mission that otherwise succeeded.

---

## Evidence still to collect

| Evidence | Phase |
|---|---|
| Cloud Run request/Vertex logs suitable for the video | 20 |
| Repeated-run reliability rate (n ≥ 10) | 16 |
| Resume-after-restart proof | 05 |
| Both executors running the same action through one interface | 08 |
| Prompt-injection containment proof | 13 |
