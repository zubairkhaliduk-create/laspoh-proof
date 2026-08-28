# Social post — LinkedIn / X

> **Do not publish without Zubair's authorisation.** Posting requires his account.

---

Ask an agent to do ten things and it'll tell you it did ten things.

You can't tell whether that's true. The transcript looks identical either way — every click
"succeeded", no errors, green summary. It isn't malfunctioning. It's reporting its *intentions* and
calling them results.

I found that out the expensive way: a mission reported "Applied to 10 jobs. Task complete." having
submitted zero.

So I built Laspoh Proof — an agent where a **separate verifier** decides what actually happened. It
never sees the planner's reasoning. It gets the proof criterion (written *before* the step ran) and
the evidence, and it has to quote the evidence to say yes.

The output isn't "done". It's a receipt: **Proven 7 of 8** — naming the one it couldn't prove, and
why.

Three things I got wrong along the way, which turned out to be the interesting part:

→ A citation nobody checks isn't a citation. The verifier had to quote evidence — and nothing
checked the quote was actually *in* the evidence. A model can invent a confirmation number.

→ Self-certification can launder itself through an independent component. A proof criterion of
"the button was clicked" asks the verifier to confirm the action, not the outcome — and it answers
correctly, about the wrong question.

→ Evidence has to be able to contain the answer. Fills kept returning "unproven" because an input's
value never appears in a page's visible text.

Built on Gemini 3.5 + Gemma 4 + gemini-embedding-001, with Genkit on Cloud Run, for the Google All
Things Agentic Hackathon — three Google AI models, none grading its own work.

Most agents tell you what they tried. This one tells you what it can prove.

Full write-up: <ARTICLE_URL — fill in after publishing>
github.com/zubairkhaliduk-create/laspoh-proof

#AllThingsAgenticHackathon
