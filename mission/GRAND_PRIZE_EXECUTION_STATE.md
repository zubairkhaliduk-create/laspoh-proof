# Grand Prize execution state

**Status: FROZEN for submission, pending one owner action and the video.**

## Programme phases
| Phase | State |
|---|---|
| 00 Forensic audit | done — git provenance, live probes, model availability re-verified by probe |
| 01 Stage One kill switch | done — `STAGE_ONE_ELIGIBILITY_MATRIX.md`; independently reviewed → PASS |
| 02 BYOF evidence | done — `BYOF_EVIDENCE.md`, two dated incidents from production receipts |
| 03 Proof-contract authority | done — pre-action gate built, `PROOF_AUTHORITY_MODEL.md` |
| 04 Adversarial proof tests | done — `test/adversarial-proof.test.ts`, 16 attacks |
| 05 Live evaluation | 16 missions measured; **re-measurement owed on the fixed build** (`finalize.sh`) |
| 06 Competitive differentiation | done — `COMPETITION_GAP_ANALYSIS.md` + judge 6 review |
| 07/20 Judge-facing UX | partial — judge index at `/`, receipt JSON, rendered hero; no HTML mission viewer |
| 08 Google stack audit | done — every component's role documented and verified load-bearing |
| 09 Gemma auditor | integrated + tested; **armed:false pending owner billing** |
| 10 Embedding forensics | done — and honestly labelled explanation-only |
| 11 Third model | evaluated, rejected (Cloud TTS 403; not worth deploy risk) |
| 12 Security audit | done — independent review, 6 findings fixed, 1 verified exploit closed |
| 13 Reliability + recovery | audited; **three overclaims retracted rather than papered over** |
| 14 Architecture diagram 2.0 | done — `authority.png` (15-second) + `architecture.png` (detailed) |
| 15 README for a 90-second judge | done — rebuilt after a judge said he skipped the old opening |
| 16 Devpost rebuild | done — BYOF opening, gate, measured numbers, disclosure |
| 17 Gallery assets | 3 of 4 rendered; hero receipt owed by `finalize.sh` (guarded) |
| 18 Video | script, runbook, shot sequence, metadata ready — **recording is owner-only** |
| 19 GCP proof | scripted into the video and `demo-health.sh` |
| 21/22 Bonus article + social | ready, unpublished (owner) |
| 23 Bonus audit | done — `BONUS_MODEL_EVIDENCE.md`, nothing claimed as earned |
| 24 Repo polish | done — stale counts, dead links, stale project id all fixed |
| 25 Clean-env reproducibility | `readme-check.md`; CI runs the README's own commands |
| 26 Deployment hygiene | canonical URL everywhere; stale duplicate is owner-only to delete |
| 27 Cross-asset truth audit | done — twice; every contradiction found was fixed, not softened |
| 28 Hostile judge panel | done — 6 personas, `HOSTILE_JUDGE_PANEL.md`; 20+ defects found |
| 29 Receipt integrity | done — retracted "cannot be edited without detection", ship evidence hashes |
| 30 Cost/performance | measured: 32–92s per mission, comfortably inside the video window |
| 31 Demo failure drill | runbook contingency + `demo-smoke.sh` gate before recording |
| 32 Devpost asset set | done — `submission/` |
| 33 Prize strategy | done — `PRIZE_ELIGIBILITY_DECISION.md` (stay individual) |
| 34 Final live proof run | **owed — needs `gcloud auth login`, then `./finalize.sh`** |
| 35 Release manifest | done — `SUBMISSION_MANIFEST.md` + `submission/submission-manifest.json` |

## The three things still open
1. `./finalize.sh` after `gcloud auth login` — deploys the fixed build, re-measures, renders the
   guarded hero. **The hero will refuse to render unless the run genuinely discriminates.**
2. The video.
3. Devpost + article + social publishing, and the Gemma billing console step.
