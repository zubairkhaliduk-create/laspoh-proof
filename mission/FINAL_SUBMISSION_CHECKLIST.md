# Final Submission Checklist

Two sections, deliberately separated. The program is **not** complete while anything in
"Requires Zubair" is open.

Last updated: 2026-08-24 (Phase 00).

---

## COMPLETED AND VERIFIED

| Item | Evidence |
|---|---|
| Hackathon repo with in-period history only | 0 commits before 2026-08-03 |
| Pre-existing work identified and disclosed | `PREEXISTING_DISCLOSURE.md` |
| No code dependency on pre-existing project | Import audit → zero matches |
| Deployed to Cloud Run | HTTP 200, project `laspoh-proof-260823` |
| Gemini 3.5 via Vertex AI | `/health` reports model + route |
| Genkit as the agent framework | three flows: plan, repair, verify |
| End-to-end mission with cross-checked evidence | `GR-133198` matched ground truth |
| Test suite green | 45 passed |

## REQUIRES ZUBAIR

| Item | Ref | Blocking |
|---|---|---|
| Record and upload the demo video | UA-001 | Devpost submission |
| Submit on Devpost | UA-002 | The entry itself |
| Publish bonus article + social post | UA-003 | Bonus only |

## IN PROGRESS — neither complete nor blocked on you

| Item | Phase |
|---|---|
| Public repository remote | 17 |
| Polished architecture diagram | 19 |
| Cold-machine setup validation | 18 |
| Adversarial verifier suite | 10 |
| Security / prompt-injection boundary | 13 |
| Reliability rate over repeated runs | 16 |
| Primary workflow selection | 15 |
