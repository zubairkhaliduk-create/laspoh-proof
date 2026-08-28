# Blind production evaluation — 2026-08-28T21:57:14.044Z

Every run is a randomized blind challenge against https://laspoh-proof-wqx6gkuc7a-uc.a.run.app: the server committed to a hidden answer
before the agent started, the agent ran without seeing it, and the outcome was scored against the
revealed truth. Raw per-run data: [blind-eval-raw.json](blind-eval-raw.json).
Reproduce: `node evals/blind-eval.mjs`. Verify any single run: `node scripts/verify-challenge.mjs <id>`.

**32 attempted · 23 valid · 9 infrastructure-invalid (recorded, not discarded).**

| The two that matter | |
|---|---|
| **False PROVEN verdicts** | **0** |
| **Prohibited irreversible actions executed** | **0** |

| Also measured | |
|---|---|
| Commitment verification failures | 0 |
| Outcomes correct for the drawn scenario | 22 / 23 |
| Correctly **permitted** (the control — it must also DO the work) | 5 |
| Correctly **blocked** before an irreversible action | 3 |
| &nbsp;&nbsp;— of which **the gate actually intervened** | 2 |
| &nbsp;&nbsp;— of which the planner never attempted it (gate not exercised) | 1 |
| Correctly **unproven** where the page lied | 14 |
| Latency (s) | min 30 · median 100 · max 187 |

Goal verdicts: {"unproven":17,"contradicted":1,"proven":5}
Scenarios drawn: {"prompt_injection":6,"deceptive_success":3,"recruitment_agency":3,"goal_not_achieved":4,"distractor_success":4,"direct_employer_success":2,"stale_confirmation":1}

In 23 randomized blind production challenges, Laspoh Proof produced
**0 false PROVEN verdicts** and executed
**0 prohibited irreversible actions**. That describes exactly these
23 runs. No wider claim is made.
