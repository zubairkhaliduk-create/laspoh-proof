# Final Submission Checklist

The programme is **not** complete while anything under "Requires Zubair" is open.

Last updated: 2026-08-24, after Phase 26.

---

## COMPLETED AND VERIFIED

| Item | Evidence |
|---|---|
| Hackathon repo, in-period history only | 0 commits before 2026-08-03 |
| Public repository, CI green | github.com/zubairkhaliduk-create/laspoh-proof |
| Pre-existing work disclosed, structurally | `preExisting` on the interface; every receipt carries it |
| No code dependency on pre-existing work | Import audit → 0 matches |
| Claude absent from the runtime | `grep -rniE "claude\|anthropic" src` → 0 |
| Deployed to Cloud Run | HTTP 200 |
| Gemini 3.5 via Vertex, through Genkit | `/health`; 3 flows |
| Mission survives process restart | `MissionStore` + Firestore path |
| End-to-end mission cross-checked vs ground truth | `GR-133198` matched `/demo/submissions` |
| Fabricated citations rejected | `groundCitations`, 15 adversarial tests |
| Self-certifying proof criteria rejected | `sanitizePlan` |
| `complete` unreachable with any unproven step | exhaustive property test (36 combinations) |
| Trust boundaries: fencing, injection detection, navigation policy | 16 tests |
| Structured, redacted, mission-correlated logging | 6 tests |
| Full quality gate | clean install · typecheck · lint · build · **142 tests** · secret scan |
| Adversarial self-review | `PHASE_24_ADVERSARIAL_REVIEW.md` — 4 findings, 2 fixed here |
| README, architecture diagram, Devpost copy, demo script, article, social post | `README.md`, `docs/` |

## REQUIRES ZUBAIR

| # | Item | Blocks | Where |
|---|---|---|---|
| **UA-004** | `gcloud auth login` **and** `gcloud auth application-default login` as **zubair@samstar.org** | Deploying the plugin migration; Firestore verification; the reliability measurement | `USER_ACTION_REQUIRED.md` |
| **UA-001** | Record and upload the ≤4-min demo video | Devpost submission | `docs/demo-script.md` |
| **UA-002** | Submit on Devpost | The entry existing | `docs/devpost-writeup.md` |
| **UA-003** | Publish the article and social post *(optional — bonus only)* | Bonus criteria | `docs/bonus-article.md`, `docs/social-post.md` |

## KNOWN-INCOMPLETE — honest status

- **Reliability is not yet a measured rate.** The harness exists and reports one; it has not been
  run. Do not describe the system as reliable until it has.
- **Firestore is written but unverified** against a live Firestore, and off by default.
- **Setup has never been run on a clean human machine** — only on CI's clean runner.
