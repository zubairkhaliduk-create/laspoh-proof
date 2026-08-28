# Grand Prize scorecard — hostile, updated as evidence lands

Scores are what a SKEPTICAL judge defensibly gives, not what we hope for.

## Innovation & Operational Utility — 40%

**Current: 4.5 → target 5.**
For: BYOF is real, dated, and documented (mission/BYOF_EVIDENCE.md); the pre-action proof gate
answers the one hostile question every post-hoc verifier fails ("the bad application already
went"); the jobs demo reproduces the exact incident, recruiter trap live; autonomous multi-step
background workflow with no human in the loop; honest partial as product, not apology.
Deductions a judge could make: demo environment is synthetic (mitigated: disclosed, and it exists
to make ground truth inspectable); "verification agents" is a crowded lane this year (mitigated:
none of the known entrants gate BEFORE irreversible actions on arbitrary browser workflows).
To reach 5: the video must SHOW the block happening before the click, and the receipt's
"0 recruiter applications" line must be checked against ground truth on camera.

## Architectural Discipline — 30%

**Current: 5 (defensible).**
For: one-way module dependencies; authority model with deliberately absent edges (documented +
tested); append-only Firestore history; recovery as pure predicates; per-call nonce fencing;
navigation allow-list; least-privilege SA, keyless Vertex; the gate reusing the full verifier
chain rather than a second weaker judge; 180 model-free tests incl. adversarial suites; the
id-correlation and fail-closed holes found by our own verification and fixed with tests.
Deduction risk: Gemma armed:false at judging (mitigated: /health states it honestly; claim is
worded as capability + current state, never as always-on).

## Demo & Production Readiness — 30%

**Current: 3.5 — capped by the missing video. With the scripted video recorded well: 5.**
For: reproducible README (audited), rendered architecture diagram, judge portal at "/", live
adversarial eval artifacts with raw JSON, canonical proof runs with receipt↔truth match.
Against: THE VIDEO DOES NOT EXIST. It is 30% and the judges' primary experience.

## Bonus — target defensible 1.0, never claimed as guaranteed

article +0.2 (ready, unpublished) · social +0.2 (ready, unposted) · Gemma +0.2 (integrated+tested,
armed pending owner billing) · embedding +0.2 (integrated, live via Vertex; organizer
interpretation of "model" not confirmed — candidate only) · third model: TTS spoken receipt
evaluated; only if zero-risk after freeze.

## 90-second judge skim (first README screen / first 90s video / first 200 words Devpost)

They learn: the agent that lied → the rule (worker never grades itself) → the gate (no evidence,
no irreversible action) → the receipt with a checkable ground truth. PASS — provided the video
follows docs/demo-final-script.md.
