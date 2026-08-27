# Demo video — engineered, not written

**Target: 3:50. Hard cap 4:00.** Rehearse three times with a stopwatch; the live run is the only
segment whose length you do not fully control, which is why it is bounded below.

---

## Before you record

    # 1. Service answering, on the hackathon project
    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/health | jq

    # 2. Ground truth visible and non-empty later
    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/demo/submissions

    # 3. Tests green, on camera-ready terminal
    pnpm test

**Tabs, left to right — set up before recording, do not create them on camera:**

1. Terminal (large font, ≥16pt, dark)
2. Browser: `/demo` (the target form)
3. Browser: Cloud Run console — service detail, revision visible
4. Browser: Cloud Logging, pre-filtered to `missionId`
5. Editor: `src/flows/verify.ts` open at `groundCitations`

**Contingency:** prepare the fallback as ONE continuous screen recording of a complete run — no
cuts inside it, on-screen timestamps, ≤75 seconds. If the live run stalls past 2:20, say *"this is
taking longer than usual — here is a run from earlier, unedited"*, play the fallback in full, then
switch to Cloud Logging live and filter to THAT run's missionId, so the pre-recorded run is
anchored to the deployed Cloud Run service on camera. Do **not** hide a failure: if it fails
honestly, that is a stronger demo than a success, and the receipt showing a truthful partial is the
entire point.

---

## 0:00–0:25 — the friction

> "Ask an agent to do ten things, and it tells you it did ten things."

*(Show a generic agent transcript ending in "Done! I've submitted your application.")*

> "You cannot tell whether that is true. The transcript looks identical whether the work happened
> or not. Every click succeeded, no errors appeared, the summary is green. The agent isn't
> malfunctioning — it's reporting its intentions and calling them results."

## 0:25–0:45 — what this is

> "Laspoh Proof gives you an outcome, then proves it. A separate verifier — which never sees the
> planner's reasoning or the executor's opinion — decides from the page's own output whether each
> step actually happened. And it has to quote the evidence to say yes."
>
> "No proof, no done."

## 0:45–2:35 — the live run (unedited; this is the 30%)

Open with the Google Cloud anchor (~8s) — on camera, run:

    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/health | jq

and point at `"route":"vertex-ai"`, `"model":"gemini-3.5-flash"`, `"project":"laspoh-proof-251233"`
— and at `verificationModels`, which names all three Google AI models in the verification chain.

> "This is the deployed service — Cloud Run URL, brain on Vertex AI. Same URL for everything
> you're about to watch."

(This puts a Google Cloud anchor inside the first minute, so the mandate is met even if the tail
slips past 4:00.)

Terminal and browser side by side. `POST /missions` — **type the full
`https://laspoh-proof-wqx6gkuc7a-uc.a.run.app` URL literally** (no alias, no env var) and point at
the `.run.app` hostname. Narrate as it happens:

**The plan appears.** Point at `provenBy` on one step.

> "Each step carries its proof criterion, written *before* the step runs. That matters: if you
> write the criterion afterwards you can always make it match what happened."

**The repair moment — the thing it does *not* do.**

> "The plan has no step for the consent checkbox. Watch what it doesn't do: it doesn't submit.
> Before dispatching anything it reads what the form says is required, sees a control nothing will
> fill, and inserts a step for it."
>
> "Most agents submit here, get rejected, read the rejection, and *then* go back for the fields the
> form had been advertising all along. That's a gate in code, not a prompt asking it to be careful."

**Submit, and the verifier proves the reference.**

**The honest failure — do not edit this out.**

> "The planner invented an 'Affiliation' field this form doesn't have. Look at the receipt: seven
> of eight. It got the job done and it still won't call itself eight out of eight. The step it
> couldn't do is on the receipt, in its own words, with the reason."

## 2:35–3:05 — Google Cloud proof

Cloud Run console: service, revision, region. **The console header must visibly show project
`laspoh-proof-251233`** — the same project as the URL in the terminal, or the correlation a judge
checks is broken. Then Cloud Logging filtered to the mission id, and **scroll to one entry showing
the Vertex/gemini-3.5-flash call for this missionId** — not only the agent's own log lines.

> "That's the run you just watched — structured, correlated by mission id, secrets redacted on the
> way out."

Then `/demo/submissions`:

> "And this is ground truth: the reference on the receipt, on a server the agent cannot write to."

## 3:05–3:40 — the architecture

Show the real system.

> "Gemini 3.5 through Genkit, on Cloud Run, with mission state in Firestore. Three flows: plan,
> repair, verify. The planner proposes. The executor acts. Neither can mark anything proven — only
> the verifier can, and it never sees their reasoning. And the verifier doesn't judge alone: its
> quotes are grounded in code, then a second model family — Gemma — audits them, and it can only
> demote. Three Google AI models; none grades its own work."

Then open `groundCitations` in the editor:

> "This is the part I'd point at. The verifier has to quote the evidence — but for a while nobody
> checked the quote was actually *in* the evidence. A model can invent a confirmation number.
> That one gap defeats the isolation, the disbelief default, everything. Now the quote has to be
> there, checked mechanically — because asking a model whether a model's quote is fair just moves
> the problem up a level."

Mention the seam:

> "Two executors behind one interface. Swap it and the agent is unchanged."

## 3:40–3:50 — close

> "Most agents tell you what they tried. Laspoh Proof tells you what it can prove."

---

## Rehearsal checklist

- [ ] Three timed dry runs; note where you overran
- [ ] Live execution unedited — no cuts during the run
- [ ] Google Cloud visible on screen
- [ ] The honest failure shown, not removed
- [ ] Ground truth shown alongside the receipt
- [ ] ≤ 3:50 in every rehearsal; uploaded to YouTube or Vimeo; visibility Public (not
      Unlisted/Private); English
- [ ] Cloud Run console shot shows project `laspoh-proof-251233` in the header
- [ ] Full `.run.app` hostname legible during the POST and the `/health` curl
- [ ] One Vertex/Gemini log entry shown in Cloud Logging, correlated to the mission id
- [ ] Nothing on screen contradicts the code
