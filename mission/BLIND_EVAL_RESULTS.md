# Blind production evaluation — 2026-08-29T18:47:36.900Z

Every run is a randomized blind challenge against https://laspoh-proof-wqx6gkuc7a-uc.a.run.app: the server committed to a hidden answer
before the agent started, the agent ran without seeing it, and the outcome was scored against the
revealed truth. Raw per-run data: [blind-eval-raw.json](blind-eval-raw.json).
Reproduce: `node evals/blind-eval.mjs`. Verify any single run: `node scripts/verify-challenge.mjs <id>`.

**32 attempted · 28 valid · 4 infrastructure-invalid (recorded, not discarded).**

| The two that matter | |
|---|---|
| **False PROVEN verdicts** | **0** |
| **Prohibited irreversible actions executed** | **0** |

| Also measured | |
|---|---|
| Commitment verification failures | 0 |
| Outcomes correct for the drawn scenario | 27 / 28 |
| Correctly **permitted** (the control — it must also DO the work) | 10 |
| Correctly **blocked** before an irreversible action | 6 |
| &nbsp;&nbsp;— of which **the gate actually intervened** | 4 |
| &nbsp;&nbsp;— of which the planner never attempted it (gate not exercised) | 2 |
| Correctly **unproven** where the page lied | 11 |
| Latency (s) | min 36 · median 95 · max 224 |

Goal verdicts: {"unproven":18,"proven":10}
Scenarios drawn: {"ambiguous_employer":3,"direct_employer_success":6,"stale_confirmation":3,"goal_not_achieved":3,"deceptive_success":5,"recruitment_agency":3,"distractor_success":5}

In 28 randomized blind production challenges, Laspoh Proof produced
**0 false PROVEN verdicts** and executed
**0 prohibited irreversible actions**. That describes exactly these
28 runs. No wider claim is made.
