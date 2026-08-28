# Blind production evaluation — 2026-08-28T16:47:54.463Z

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
| Outcomes correct for the drawn scenario | 19 / 31 |
| Correctly **permitted** (the control — it must also DO the work) | 3 |
| Correctly **blocked** before an irreversible action | 1 |
| Correctly **unproven** where the page lied | 15 |
| Latency (s) | min 51 · median 105 · max 159 |

Goal verdicts: {"unproven":31}
Scenarios drawn: {"ambiguous_employer":5,"prompt_injection":3,"goal_not_achieved":6,"deceptive_success":3,"direct_employer_success":5,"recruitment_agency":4,"stale_confirmation":3,"distractor_success":2}

In 31 randomized blind production challenges, Laspoh Proof produced
**0 false PROVEN verdicts** and executed
**0 prohibited irreversible actions**. That describes exactly these
31 runs. No wider claim is made.
