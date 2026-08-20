# 4-minute demo script

Judging weights: Innovation & Utility 40% · Architecture 30% · Demo & Production Readiness 30%.
The single most valuable thing on screen is an **unedited live run that reports a partial result
honestly** — anyone can film a success.

---

**0:00–0:25 · The problem**
> "Agents tell you what they attempted. This one tells you what it can prove."
Show a generic agent transcript ending in "Done! I've submitted your application."
> "Did it? There's no way to know from that sentence. That's the whole problem."

**0:25–0:50 · The claim**
> "Laspoh Proof runs a mission, then a *separate* verifier decides whether it actually happened —
> from what the page showed, not from what the agent says. No proof, no done."
And it checks the form before it commits to anything, so it isn't discovering requirements by
being rejected.

**0:50–2:30 · The live run (unedited — this is the 30%)**
Terminal + browser side by side. `POST /missions` with the grant-application goal.
Narrate as it happens:
- the plan appears, each step carrying its proof criterion *written before it runs*
- **the thing it does not do**: the plan has no step for the "Applying as" dropdown or the consent
  checkbox — but before dispatching anything, the agent reads what the form reports as required and
  still empty, sees two controls nothing would fill, and inserts steps for them.
  > "That's the moment. Most agents submit here, get rejected, read the rejection, and *then* go
  > back for the fields the form had been advertising the whole time. This one never submits blind
  > — and that's a gate in code, not a prompt asking it to be careful."
- it submits, and gets `GR-######`
- the verifier returns `proven`, **citing the reference**
- **the honest failure** (do not edit this out): the planner had invented an "Affiliation" field
  that does not exist on this form. The receipt says `Proven 7 of 8` and names that step as failed,
  with the reason.
  > "It got the job done and still won't call itself 8 out of 8. The step it couldn't do is on the
  > receipt, in its own words."

**2:30–3:10 · The receipt and the architecture**
Show `/missions/:id/receipt`: `Proven N of M`, the citation, the integrity hash, the executor
provenance. Then `docs/architecture.md`:
> "The planner proposes. The executor acts. Neither can mark anything proven — only the verifier
> can, and it never sees their reasoning."
Mention the executor seam: two executors, one interface, agent unchanged.

**3:10–3:40 · Google Cloud proof (required on camera)**
Cloud Run console showing the live service and revision → `/health` in the browser showing
`route: vertex-ai, model: gemini-3.5-flash` → Cloud Run logs for the run just performed.

**3:40–4:00 · Close**
> "Built on Gemini 3.5 and Genkit, running on Cloud Run. It doesn't tell you what it tried.
> It tells you what it proved."

---

### Checklist
- [ ] Unedited live execution (no cuts during the run)
- [ ] Google Cloud visible on screen
- [ ] The **repair moment** shown live — required controls discovered and filled *before* submitting
- [ ] The **honest failure** shown, not edited out — `Proven 7 of 8` with the reason, not a green tick
- [ ] ≤ 4:00, public on YouTube/Vimeo, English
