# Hackathon Requirements Matrix

**PASS · FAIL · NEEDS_USER_ACTION · NOT_APPLICABLE · RISK** — no row is PASS without evidence.

Last audited: **2026-08-24** (Phase 25). Live service verified by direct request, not from a script's echo.

---

## Mandatory technology

| # | Requirement | Status | Implementation | Evidence |
|---|---|---|---|---|
| T1 | Gemini 3.5 or newer | **PASS** | `gemini-3.5-flash` via Vertex AI | `/health` → `{"model":"gemini-3.5-flash","route":"vertex-ai"}` |
| T2 | Approved Google agent framework | **PASS** | **Genkit 1.41** (`@genkit-ai/google-genai`) — 3 flows carry every model decision | `src/flows/{plan,repair,verify}.ts` |
| T3 | Google Cloud infrastructure | **PASS** | **Cloud Run** + **Firestore** | `/health` → `"store":"firestore"`; both verified live |
| T4 | Gemini makes meaningful decisions | **PASS** | Plan, repair values, and every verdict. The **only** path to `proven` is a cited Gemini verdict | Phase 24 review |
| T5 | Runtime is not Claude | **PASS** | `grep -rniE "claude\|anthropic" src` → **0 matches** | Phase 26 gate |

## Eligibility — New Projects Only

| # | Requirement | Status | Evidence |
|---|---|---|---|
| E1 | Created during 3–31 Aug 2026 | **PASS** | First commit 2026-08-20; `git rev-list --count --before=2026-08-03 HEAD` → **0** |
| E2 | Pre-existing work disclosed | **PASS** | README, Devpost, `PREEXISTING_DISCLOSURE.md`; `preExisting` on the `Executor` interface |
| E3 | Submitted work built in period | **PASS** | Every source file first added in-period |
| E4 | Not a repackaging | **PASS** | Import audit: 0 references. Copy audit: 2/9/2 idiom lines. Adapter off by default |
| E5 | Disclosure matches git history | **PASS** | Both generated from the same forensic facts; commands published for independent checking |

## Track — Taskmaster

| # | Requirement | Status | Evidence |
|---|---|---|---|
| K1 | Complete autonomous workflow | **PASS** | plan → act → observe → evidence → verify → receipt |
| K2 | Multi-step reasoning | **PASS** | 8-step plan from one sentence |
| K3 | Real state change | **PASS** | Form submission recorded server-side; `GR-133198` in `/demo/submissions` |
| K4 | Truthful partial completion | **PASS** | `Proven 7 of 8`; exhaustive property test that `complete` needs all-proven |

## Deliverables

| # | Requirement | Status | Evidence / blocker |
|---|---|---|---|
| D1 | Public repository | **PASS** | https://github.com/zubairkhaliduk-create/laspoh-proof — CI green |
| D2 | Working hosted project | **PASS** | HTTP 200 |
| D3 | Demo video ≤4 min | **NEEDS_USER_ACTION** | Script + shot list in `docs/demo-script.md` — **UA-001** |
| D4 | Devpost submission | **NEEDS_USER_ACTION** | Copy ready in `docs/devpost-writeup.md` — **UA-002** |
| D5 | Architecture diagram | **PASS** | README + `docs/architecture.md`, matching the code |
| D6 | Reproducible setup | **RISK** | CI runs the documented commands green each push; **never run on a clean human machine** |
| D7 | Google Cloud proof (Phase 20) | **PASS** | Cloud Run revision `00004`, Firestore live, structured logs correlated by `missionId` |

## Open risks, stated

| # | Risk | Severity | Status |
|---|---|---|---|
| R1 | Genkit plugin migration not exercised against a live model | **CLOSED** | Deployed; live mission proved 7/8 citing `GR-106847`; **0 deprecation warnings** on the serving revision |
| R2 | Firestore never talked to Firestore | **CLOSED** | Database created, `roles/datastore.user` granted, `/health` reports `firestore` |
| R3 | Reliability is not a measured rate | **CLOSED** | **8/8 honest, 8/8 proved** after the navigate-first fix (was 7/9) |
| R4 | A hostile page showing fake confirmation text is believed | ACCEPTED | Architectural limit, stated in README |
| R5 | Verifier may be wrong about *sufficiency* | ACCEPTED | Stated in README |
| R6 | Secret scanner matches `"private_key"` in `EXECUTION_STATE.md` | BENIGN | It is documentation listing the patterns scanned for — left readable rather than obfuscated |
