# PHASE 10 — The Independent Verifier

**Status:** VERIFIED_COMPLETE

## 1. Why this is the most important phase

Everything else in this project is scaffolding around one claim: **the agent that does the work
does not grade its own homework.** If the verifier can be fooled, nothing else matters — the
receipts are decoration, the evidence is theatre, and "no proof, no done" is marketing.

## 2. Current verified state at phase start

    src/flows/verify.ts
      VerdictSchema        proven | unproven | contradicted, + citedEvidence, reasoning
      ModelVerdictSchema   looser — the model may omit optional fields
      verifyFlow           isolated: sees ONLY the criterion + evidence
      enforceCitation      pure; downgraded proven-with-no-citation

## 3. The gap that mattered

`enforceCitation` checked that a citation **existed**. It never checked that the cited text
appeared anywhere in the evidence.

So a model could invent a plausible quote — *"Confirmation reference: GR-000000"* — and the verdict
stood on it. Every other protection assumes the verifier is looking at real evidence: the
isolation, the disbelief default, the pre-committed criterion. **A fabricated citation defeats all
of them simultaneously**, and it is exactly what a judge means by "can evidence be forged?".

## 4. The fix, and why it is mechanical

`groundCitations` asks whether the characters are there. It does **not** ask a model whether the
quote is fair, because asking a model to police a model reintroduces the problem one level up.

Matching is normalised — lowercase, whitespace collapsed, surrounding punctuation stripped — since
a model that quotes accurately but re-wraps a line has fabricated nothing, and failing it would
train the system to distrust honest work. Beyond that it is verbatim, which is what the verifier is
instructed to produce.

The corpus searched is everything the verifier was shown: page text, **form state** (a filled field
never appears in visible page text and is still real evidence), identifiers, and the URL.

## 5. The decision worth defending

**A fabricated quote poisons the whole verdict** — not "drop the bad citation and keep the rest".
A verifier that invented one quote has demonstrated it will assert what the evidence does not
contain, and the remaining citations came out of the same answer. False negatives are cheap here;
false completion is the failure this project exists to prevent.

## 6. Adversarial cases covered, and by what

| Adversarial case | Covered by | Enforced by |
|---|---|---|
| Claims submitted, no confirmation exists | grounding — the quote is not in the corpus | code |
| Invented reference number | `GR-000000` test | code |
| Evidence from the wrong site/page | wrong-page corpus test | code |
| Quote too short to mean anything | `< 4 chars` rejected | code |
| Proven with no citation at all | citation-exists rule | code |
| Proven with no evidence at all | explicit empty-evidence test | code |
| Verdict upgraded by grounding | never-upgrades test | code |
| Model confidently asserts despite contradiction | disbelief default + isolation | prompt + architecture |
| Stale confirmation from an earlier action | evidence is scoped per step | architecture |
| Executor hallucinated success | action truth in the executor (Phase 07) | code |

Rows marked **prompt + architecture** are honestly weaker than the code rows and are labelled so
rather than presented as equivalent.

## 7. Tests

15 adversarial tests, no model involved. `106 total` (was 91).

## 8. Residual risk, stated

A verifier that quotes real evidence but reasons badly about it — cites a genuine sentence that
does not actually establish the criterion — is **not** caught by grounding. Grounding proves the
quote is real, not that it is sufficient. That judgement remains the model's, and the mitigations
are isolation, the pre-committed criterion, and the disbelief default. It is the honest limit of
this design and is recorded rather than glossed.
