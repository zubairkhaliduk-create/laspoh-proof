# Why your agent says it finished when it didn't

*I created this article for the purposes of entering the All Things Agentic Hackathon.*

Ask an agent to do ten things and it will tell you it did ten things.

You cannot tell whether that is true. The transcript reads the same either way: every click
"succeeded", no errors appeared, the summary is green. The agent is not malfunctioning when this
happens. It is reporting its **intentions** and calling them results — and the two are
indistinguishable from the outside.

I found this the expensive way. A mission reported *"Applied to 10 jobs. Task complete."* having
submitted zero.

## The shape of the problem

An agent loop produces a stream of actions and a stream of claims, and nothing structural connects
them. A click fires — that's an action. "I submitted the application" — that's a claim. The loop
treats the second as following from the first, because in the happy path it does.

The failure is not that models lie. It is that **"I did X" and "X happened" are different
propositions**, and most agent architectures have no place to put the difference.

## What I built instead

Laspoh Proof runs a mission, then a **separate verifier** decides what actually happened. It never
sees the planner's reasoning or the executor's opinion. It gets the criterion — written *before*
the step ran — and the evidence, and it must quote the evidence to say yes.

    Proven 7 of 8. The rest is reported unproven, not counted.

Seven were proven. One was not, and the receipt says which and why.

## Three things I got wrong, which are the interesting part

**1. A citation nobody checks is not a citation.**

The verifier had to quote evidence for any "proven" verdict. For a long time nothing checked the
quote was *in* the evidence. A model can invent `Confirmation reference: GR-000000`, and the verdict
stands on it — defeating the isolation, the disbelief default and the pre-committed criterion at
once.

The fix is mechanical on purpose: does this string appear in what the verifier was shown? Asking a
model whether a model's quote is fair just moves the problem up a level.

**2. Self-certification can launder itself through an independent component.**

Each step's proof criterion is written before the step runs, so success cannot be redefined
afterwards. But a criterion like *"the button was clicked"* hands that redefinition back — the
verifier is now asked to confirm the **action**, not the outcome. And it answers *correctly*, about
the wrong question.

Every component behaves as designed and the central claim dies anyway. Those are the failures worth
hunting: not the ones where something breaks, but the ones where everything works.

**3. Evidence has to be able to contain the answer.**

Fills kept coming back unproven and I assumed the verifier was harsh. It wasn't. An input's value
never appears in a page's visible text, so the verifier was judging a criterion against material
that structurally could not confirm it. Being strict about evidence is worthless if you are strict
about the wrong evidence.

## The architecture, briefly

Gemini 3.5 through Genkit on Cloud Run, mission state in Firestore. Three flows — plan, repair,
verify. A narrow executor interface separates reasoning from browser actuation, so the agent does
not depend on any one automation stack. Recovery is pure code: an LLM asked "are you stuck?" says
no and tries again.

## The principle

**No proof, no done.** The system is permitted to report less than it achieved. It is never
permitted to report more.

Under-claiming is honest. Over-claiming is the only failure.

---

*Repository: https://github.com/zubairkhaliduk-create/laspoh-proof — includes the full engineering
programme, the adversarial self-review, and a disclosure of pre-existing work.*

*Disclosure: Laspoh, a pre-existing browser-automation platform of mine (June 2026), is a disclosed,
optional, off-by-default execution dependency and is not presented as hackathon work.*

*Published as my content-publication entry for the All Things Agentic Hackathon.*
