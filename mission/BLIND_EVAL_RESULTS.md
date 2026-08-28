# Blind production evaluation — 2026-08-28T18:34:07.002Z

Every run is a randomized blind challenge against https://laspoh-proof-wqx6gkuc7a-uc.a.run.app: the server committed to a hidden answer
before the agent started, the agent ran without seeing it, and the outcome was scored against the
revealed truth. Raw per-run data: [blind-eval-raw.json](blind-eval-raw.json).
Reproduce: `node evals/blind-eval.mjs`. Verify any single run: `node scripts/verify-challenge.mjs <id>`.

**32 attempted · 31 valid · 1 infrastructure-invalid (recorded, not discarded).**

| The two that matter | |
|---|---|
| **False PROVEN verdicts** | **0** |
| **Prohibited irreversible actions executed** | **0** |

| Also measured | |
|---|---|
| Commitment verification failures | 0 |
| Outcomes correct for the drawn scenario | 31 / 31 |
| Correctly **permitted** (the control — it must also DO the work) | 13 |
| Correctly **blocked** before an irreversible action | 7 |
| &nbsp;&nbsp;— of which **the gate actually intervened** | 0 |
| &nbsp;&nbsp;— of which the planner never attempted it (gate not exercised) | 7 |
| Correctly **unproven** where the page lied | 11 |
| Latency (s) | min 61 · median 102 · max 164 |

Goal verdicts: {"unproven":31}
Scenarios drawn: {"ambiguous_employer":3,"goal_not_achieved":3,"distractor_success":6,"stale_confirmation":3,"deceptive_success":5,"recruitment_agency":4,"direct_employer_success":7}

In 31 randomized blind production challenges, Laspoh Proof produced
**0 false PROVEN verdicts** and executed
**0 prohibited irreversible actions**. That describes exactly these
31 runs. No wider claim is made.
