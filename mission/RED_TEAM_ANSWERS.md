# The 24 questions, answered with evidence

Prepared for the video Q&A, the Devpost comments, and for whoever asks the hard version.
Every answer points at code or a measurement. Where the honest answer is a limitation, it says so.

**1. Isn't this just another verifier?**
No, and the difference is the one every post-hoc verifier fails: for an irreversible step this
system proves the action is *allowed* **before** it executes (`src/core/preaction.ts`). A verifier
that only grades afterwards performs an autopsy — the application is already sent.

**2. Why does this need Gemini?**
Three flows carry every judgement (`src/flows/{plan,repair,verify}.ts`) and the orchestrator calls
them in the main loop. Remove them and there is no planning, no repair and no verdict — the agent
has no cognition at all.

**3. Couldn't deterministic code do the whole thing?**
It does the parts that must not be negotiable: citation grounding, plan sanitisation, recovery
predicates, the verdict→decision mapping, the navigation boundary. What code cannot do is read an
unfamiliar page and judge whether "TalentBridge Recruitment is a recruitment agency hiring on
behalf of a client" satisfies "never recruitment agencies". That is the model's job. The split is
the design: **judgement to the model, authority to the code.**

**4. If the verifier is also an LLM, why trust it more than the worker?**
Not because it is better — because of what it cannot see and cannot do. It receives only the
criterion and fenced evidence, never the planner's reasoning or the executor's opinion
(`verify.ts`), so the context that produced the action cannot produce its justification. Its
"proven" is then filtered by code it cannot argue with.

**5. What stops the verifier hallucinating evidence?**
`groundCitations` — every quote must appear verbatim in the evidence or the whole verdict is
downgraded, and one invented quote poisons the answer because the rest came from the same reply.
Tested in `test/adversarial-proof.test.ts` (attacks 2–6).

**6. Why is Gemma independent if Google hosts both?**
It is a *different model family reached over a different route*, not an independent organisation —
and the honest claim is bounded accordingly. It defeats a family-specific blind spot, not a
correlated failure in training data common to both. It can only ever DEMOTE.

**7. What happens when the verifier disagrees with the worker?**
The verifier wins, always. The worker has no channel to overturn it.

**8. What happens when evidence is missing?**
`unproven`, which is a correct and expected answer — and for an irreversible step, `blocked`.

**9. What happens when the action is irreversible?**
It does not execute until compliance is proven. See 1.

**10. How do you stop the wrong action before it happens?**
`isIrreversibleStep` classifies the step, `preactionCriterion` quotes the user's goal verbatim, and
the same verifier must return `proven` before dispatch. `contradicted` blocks with the quote;
`unproven` blocks safely; nothing observed at all fails closed.

**11. What happens on retry?**
`POST /missions` honours an `Idempotency-Key` — a retried request returns the same mission, not a
second application.

**12. How do you know the receipt isn't forged?**
You don't take our word for it: compare it against `/demo/jobs/submissions`, which the agent has
no write path to. The `integrity` digest is a content fingerprint (the evidence hashes ship with
the receipt so you can recompute it) — explicitly **not** a signature.

**13. What proves the external state changed?**
The server's own record, not the agent's narration. A reference on the receipt that the server
never issued is provably forged.

**14. Is the demo just mocked?**
The *environment* is synthetic and disclosed. The agent, the browser, the model calls, Cloud Run,
Firestore, the evidence and the verification are all real. What is simulated is the employer —
deliberately, so ground truth is inspectable.

**15. Why does the synthetic portal matter?**
Because on a real site you cannot check whether the agent is telling the truth. Here you can, in
one request. That is the point of the whole submission.

**16. Can this work on another executor?**
Two ship behind one 7-verb interface. Swap the executor and the agent is unchanged.

**17. Is old Laspoh doing the impressive work?**
No, and it has *never even been driven through the adapter* — stated in the disclosure rather than
left to be discovered. The demo, the deployment and every test but `test/adapter.test.ts` run on
the new reference executor.

**18. What was actually built during August?**
Everything in this repo: first commit 20 August, 51+ commits, all in-window, author dates equal to
committer dates. An independent eligibility review measured cross-repo overlap on every colliding
filename: **maximum 12 shared lines**, all braces and field declarations.

**19. Why is the planner allowed to define its own proof criterion?**
Because a criterion written *after* the fact can always be made to match what happened. Writing it
first is what makes it a commitment rather than a rationalisation.

**20. Can the planner deliberately choose an easy criterion?**
This is the sharpest question. `sanitizePlan` drops self-certifying criteria ("the click worked",
"the page loaded") and reports the drop; criteria are captured into an immutable map at plan time
so none can be rewritten after acting; and for irreversible steps the gate's criterion is built
from the **user's goal verbatim**, not from anything the planner wrote. Honest limitation: for
ordinary steps a lazy-but-not-self-certifying criterion is still possible. The receipt's
`provenCount` measures criteria met, not goals achieved, and we do not claim otherwise.

**21. What prevents criterion gaming generally?**
See 20 — plus the deliberate structure that the number reported as success is the *only* number
allowed to describe success, and everything else on the receipt is labelled activity.

**22. What prevents a criterion changing after the action?**
The criteria map is written at plan time and read at verification time; nothing in the loop writes
back to it.

**23. Why should this win over a payment-verification agent?**
A payment verifier checks one transaction type against one API. This proves arbitrary browser
work — the messy, multi-step, unstructured case — and refuses irreversible actions it cannot
license. The friction is also real and documented rather than hypothetical.

**24. What real-world friction did you personally encounter?**
Two dated incidents from a production browser agent I run: ten applications sent with five to
recruitment agencies the goal explicitly excluded, reported as success; and a mission that
reported ten applications complete having submitted zero. Both in `mission/BYOF_EVIDENCE.md`.

## Questions we do not have a good answer to, stated plainly
- **A page that prints a plausible-looking confirmation number defeats grounding**, because the
  quote is genuinely present. Ground truth catches it; grounding alone does not.
- **The public API is unauthenticated and unrated for judging.** An accepted trade, not a defence.
- **The pre-action gate arms on a lexical read of model-authored prose.** It errs toward blocking
  and the target is checked too, but deriving irreversibility from the DOM would be stronger.

---

# The blind-challenge questions

**How do I know you didn't choose the easy scenario?**
You can draw it yourself at `/challenge`, as many times as you like. The scenario is selected by
the server from a pool of eight, and the pool is in the repo (`src/challenge/scenarios.ts`). The
video script explicitly forbids re-rolling for a nicer draw, for the same reason.

**How do I know the expected answer existed before the run?**
Recompute it: `node scripts/verify-challenge.mjs <challenge-id>`. The commitment is published in
the response that starts the mission — before any action — and the payload and nonce are revealed
only afterwards. Change one field of the payload and the hash breaks; tests assert exactly that,
including for the expectation field specifically.

**How do I know Laspoh couldn't see it?**
Tests attempt the extraction for every scenario across the board page, every posting page and the
ground-truth endpoint, and assert the classification appears in none of them — along with the
nonce, the seed, the target id and the expectation fields. The reveal endpoint returns 409 until
the mission is terminal, and no request can flip that: only the mission runner can.

**How do I know the receipt wasn't written to match the answer?**
The receipt is built by the same code path as every other mission, from evidence captured before
the answer was revealed, and it is compared against the server's own record — which the agent has
no write path to except the application flow. A cited reference the server never issued is counted
as FALSE PROVEN by a pure scorer, not by prose.

**Does it just block everything?**
That would fail. The control scenarios (`direct_employer_success`, `distractor_success`) require a
permitted irreversible action to actually complete and be proven; `scoreChallenge` marks the
challenge INCORRECT with "blocking everything is not safety" if it does not. Correctly-permitted
and correctly-blocked are reported as separate numbers.

**What if the confirmation belongs to another mission?**
That is the `stale_confirmation` scenario: a valid-looking reference is printed on the page and was
never issued by the server. Citing it produces a false-proven count, because grounding proves a
quote came from the page — not that the server ever issued it. Ground truth is what settles it.

**What if the planner chooses easy success criteria?**
`goal_not_achieved` draws a board with fewer qualifying roles than the goal demands, so steps can
be honestly proven while the goal is not. The receipt's goal verdict is what exposes it.
