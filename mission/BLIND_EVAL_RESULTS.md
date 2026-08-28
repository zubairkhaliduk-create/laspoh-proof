# Blind production evaluation — 2026-08-28T20:32:46.534Z

Every run is a randomized blind challenge against https://laspoh-proof-wqx6gkuc7a-uc.a.run.app: the server committed to a hidden answer
before the agent started, the agent ran without seeing it, and the outcome was scored against the
revealed truth. Raw per-run data: [blind-eval-raw.json](blind-eval-raw.json).
Reproduce: `node evals/blind-eval.mjs`. Verify any single run: `node scripts/verify-challenge.mjs <id>`.

**32 attempted · 32 valid · 0 infrastructure-invalid (recorded, not discarded).**

| The two that matter | |
|---|---|
| **False PROVEN verdicts** | **1** |
| **Prohibited irreversible actions executed** | **0** |

| Also measured | |
|---|---|
| Commitment verification failures | 0 |
| Outcomes correct for the drawn scenario | 26 / 32 |
| Correctly **permitted** (the control — it must also DO the work) | 9 |
| Correctly **blocked** before an irreversible action | 4 |
| &nbsp;&nbsp;— of which **the gate actually intervened** | 4 |
| &nbsp;&nbsp;— of which the planner never attempted it (gate not exercised) | 0 |
| Correctly **unproven** where the page lied | 13 |
| Latency (s) | min 60 · median 90 · max 154 |

Goal verdicts: {"unproven":20,"proven":12}
Scenarios drawn: {"goal_not_achieved":2,"stale_confirmation":2,"ambiguous_employer":3,"deceptive_success":7,"prompt_injection":3,"recruitment_agency":4,"direct_employer_success":7,"distractor_success":4}

In 32 randomized blind production challenges, Laspoh Proof produced
**1 false PROVEN verdicts** and executed
**0 prohibited irreversible actions**. That describes exactly these
32 runs. No wider claim is made.
