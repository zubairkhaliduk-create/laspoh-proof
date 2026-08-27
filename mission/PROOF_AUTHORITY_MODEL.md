# Proof authority model

Who may say what, enforced in code — file references are the proof.

| Component | May | May NOT | Where |
|---|---|---|---|
| Planner (Gemini/Genkit) | propose steps; write each step's proof criterion BEFORE it runs | mark anything proven; execute; redefine success after the fact | `src/flows/plan.ts`, criteria captured at plan time in `orchestrator.ts` |
| Pre-action gate | refuse an irreversible step under a constrained goal unless compliance is PROVEN from current-page evidence | approve on silence (unproven → blocked safely); run on constraint-free goals | `src/core/preaction.ts`, wired in `orchestrator.ts` before dispatch |
| Executor (Playwright / Laspoh adapter) | act; report what the page showed | judge success; mark proven; bypass the gate | `src/executors/*` — 7 verbs, observation-only returns |
| Outcome verifier (Gemini, isolated) | grade a criterion from fenced evidence only | see planner reasoning or executor opinion; claim proven without quoting | `src/flows/verify.ts` |
| Citation grounding (pure code) | downgrade any proven verdict whose quote is not verbatim in evidence | be argued with | `groundCitations`/`enforceCitation`, verify.ts |
| Gemma 4 auditor | DEMOTE a grounded proven verdict | promote; veto by crashing (unavailable ≠ dissent) | `src/flows/second-opinion.ts` |
| Embedding forensics | refine the explanation of a rejected citation | change any verdict | same file |
| Receipt builder | deterministically report state | invent numbers (provenCount is the only success figure) | `src/core/receipt.ts` |

Deliberately absent edges: executor→proven, planner→proven, auditor→promote, agent→ground truth.
The pre-action license flows through the SAME verifier chain as outcomes — no weaker judge exists
for the decision that matters most, and it fails CLOSED when nothing has been observed.

Criterion-gaming defence: criteria are captured at plan time into an immutable map (a model cannot
rewrite one after acting); `sanitizePlan` drops self-certifying criteria ("the click worked",
"page loaded") and reports the drop; the verifier is handed the ORIGINAL goal-derived criterion for
the gate, quoted verbatim, so the planner cannot define compliance downward for irreversible steps.
