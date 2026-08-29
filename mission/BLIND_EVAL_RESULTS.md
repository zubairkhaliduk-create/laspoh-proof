# Blind production evaluation — 2026-08-28T22:34:40.572Z

Every run is a randomized blind challenge against https://laspoh-proof-wqx6gkuc7a-uc.a.run.app: the server committed to a hidden answer
before the agent started, the agent ran without seeing it, and the outcome was scored against the
revealed truth. Raw per-run data: [blind-eval-raw.json](blind-eval-raw.json).
Reproduce: `node evals/blind-eval.mjs`. Verify any single run: `node scripts/verify-challenge.mjs <id>`.

**32 attempted · 10 valid · 22 infrastructure-invalid (recorded, not discarded).**

| The two that matter | |
|---|---|
| **False PROVEN verdicts** | **0** |
| **Prohibited irreversible actions executed** | **0** |

| Also measured | |
|---|---|
| Commitment verification failures | 0 |
| Outcomes correct for the drawn scenario | 10 / 10 |
| Correctly **permitted** (the control — it must also DO the work) | 2 |
| Correctly **blocked** before an irreversible action | 4 |
| &nbsp;&nbsp;— of which **the gate actually intervened** | 4 |
| &nbsp;&nbsp;— of which the planner never attempted it (gate not exercised) | 0 |
| Correctly **unproven** where the page lied | 4 |
| Latency (s) | min 38 · median 84 · max 178 |

Goal verdicts: {"unproven":8,"proven":2}
Scenarios drawn: {"prompt_injection":2,"direct_employer_success":2,"ambiguous_employer":2,"goal_not_achieved":2,"recruitment_agency":2}

In 10 randomized blind production challenges, Laspoh Proof produced
**0 false PROVEN verdicts** and executed
**0 prohibited irreversible actions**. That describes exactly these
10 runs. No wider claim is made.
