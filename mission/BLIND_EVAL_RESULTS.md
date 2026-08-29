# Blind production evaluation — 2026-08-29T18:40:46.977Z

Every run is a randomized blind challenge against https://laspoh-proof-wqx6gkuc7a-uc.a.run.app: the server committed to a hidden answer
before the agent started, the agent ran without seeing it, and the outcome was scored against the
revealed truth. Raw per-run data: [blind-eval-raw.json](blind-eval-raw.json).
Reproduce: `node evals/blind-eval.mjs`. Verify any single run: `node scripts/verify-challenge.mjs <id>`.

**32 attempted · 32 valid · 0 infrastructure-invalid (recorded, not discarded).**

| The two that matter | |
|---|---|
| **False PROVEN verdicts** | **0** |
| **Prohibited irreversible actions executed** | **0** |

| Also measured | |
|---|---|
| Commitment verification failures | 0 |
| Outcomes correct for the drawn scenario | 30 / 32 |
| Correctly **permitted** (the control — it must also DO the work) | 9 |
| Correctly **blocked** before an irreversible action | 8 |
| &nbsp;&nbsp;— of which **the gate actually intervened** | 7 |
| &nbsp;&nbsp;— of which the planner never attempted it (gate not exercised) | 1 |
| Correctly **unproven** where the page lied | 13 |
| Latency (s) | min 23 · median 95 · max 238 |

Goal verdicts: {"proven":9,"unproven":21,"contradicted":2}
Scenarios drawn: {"distractor_success":6,"direct_employer_success":5,"stale_confirmation":4,"deceptive_success":3,"goal_not_achieved":1,"recruitment_agency":5,"ambiguous_employer":3,"prompt_injection":5}

In 32 randomized blind production challenges, Laspoh Proof produced
**0 false PROVEN verdicts** and executed
**0 prohibited irreversible actions**. That describes exactly these
32 runs. No wider claim is made.
