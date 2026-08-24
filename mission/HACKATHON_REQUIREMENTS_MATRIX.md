# Hackathon Requirements Matrix

**Statuses:** PASS · FAIL · NEEDS_USER_ACTION · NOT_APPLICABLE · RISK
No row is marked PASS without evidence in the evidence column.

Last audited: **2026-08-24** (Phase 00). Re-audited in full at Phase 25.

---

## Mandatory technology

| # | Requirement | Status | Implementation | Evidence |
|---|---|---|---|---|
| T1 | Gemini 3.5 or newer | PASS | `gemini-3.5-flash` via Vertex AI | `/health` reports `{"model":"gemini-3.5-flash"}` on the live service |
| T2 | Approved Google agent framework | PASS | **Genkit** 1.41 (`@genkit-ai/vertexai`) — three flows: plan, repair, verify | `src/genkit.ts`, `src/flows/*.ts` |
| T3 | Google Cloud infrastructure | PASS | **Cloud Run** — deployed service, least-privilege SA | `https://laspoh-proof-cffubwieta-uc.a.run.app` returns 200 |
| T4 | Gemini controls meaningful decisions | RISK | Planning, repair and verification are all model decisions | To be evidenced adversarially in Phase 24 |

## Eligibility

| # | Requirement | Status | Implementation | Evidence |
|---|---|---|---|---|
| E1 | Newly created during 3–31 Aug 2026 | PASS | First commit 2026-08-20; zero commits before 2026-08-03 | `git rev-list --count --before=2026-08-03 HEAD` → 0 |
| E2 | Pre-existing work disclosed | PASS | `mission/PREEXISTING_DISCLOSURE.md`; `preExisting` on the interface | Every receipt carries executor provenance |
| E3 | Submitted work built in period | PASS | All 18 source files created in period | `git log --diff-filter=A --format=%ad` per file |
| E4 | Not a repackaging of pre-existing work | PASS | Zero imports; swap test passes; default path never touches Laspoh | Import audit → no matches |

## Track fit — Taskmaster

| # | Requirement | Status | Implementation | Evidence |
|---|---|---|---|---|
| K1 | Complete autonomous workflow, not chat | PASS | plan → act → observe → evidence → verify → receipt | `run-demo.ts` end-to-end |
| K2 | Multi-step reasoning | PASS | 8-step plan generated from one sentence | Live receipt: "Proven 7 of 8" |
| K3 | Real state change in the world | PASS | Form submission the server records | `/demo/submissions` → `GR-133198` |
| K4 | Truthful partial completion | PASS | `terminalStatus` refuses `complete` unless every step proven | `test/integrity.test.ts` |

## Deliverables

| # | Requirement | Status | Implementation | Evidence |
|---|---|---|---|---|
| D1 | Public repository | PASS | https://github.com/zubairkhaliduk-create/laspoh-proof | PUBLIC, first commit 2026-08-20, CI green |
| D2 | Working hosted project | PASS | Cloud Run, publicly reachable | HTTP 200 on `/health` and `/demo` |
| D3 | Demo video ≤4 min | NEEDS_USER_ACTION | Script engineered in Phase 21 | UA-001 |
| D4 | Devpost submission | NEEDS_USER_ACTION | Copy drafted in Phase 22 | UA-002 |
| D5 | Architecture diagram | RISK | ASCII exists; polished version pending | Phase 19 |
| D6 | Judge-reproducible setup | RISK | README exists; not yet cold-tested | Phase 17/18 |

## Open risks

- **T4** "Gemini makes meaningful decisions" is true but not yet *proven against a sceptic*.
- **D6** the setup instructions have never been run on a clean machine.
