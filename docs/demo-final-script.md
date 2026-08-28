# Demo video — FINAL script (blind challenge, one continuous take)

**Target 3:35. Hard stop 3:50.** One continuous screen recording, no cuts. If the run drags past
its window, keep rolling — an honest slow run beats a stitched fast one, and only the first 4:00
is judged. If a uniform speed-up is ever needed, speed the WHOLE continuous run and label it
on-screen ("1.25× continuous live run"); never remove sections.

## Before recording (run these, in this order)

    bash scripts/demo-health.sh      # everything 200, model/project/store correct
    bash scripts/demo-prewarm.sh     # Cloud Run scales to zero — a cold start costs 20s on camera
    bash scripts/demo-smoke.sh       # one full mission, NOT recorded

Close notifications, personal tabs and the bookmarks bar. Terminal ≥16pt. Browser zoom 125%.

**Tabs, left to right:** 1 **/challenge** (you start here) · 2 Terminal · 3 Cloud Run console
(project `laspoh-proof-251233` visible in the header) · 4 Cloud Logging pre-filtered to
`missionId` · 5 `docs/authority.png`.

You do **not** know which scenario will be drawn. That is the point, and it is also the risk: any
of the eight is a good demo, including the ones where the agent refuses. Do not re-roll to get a
scenario you prefer — if you would not show it, the claim is not honest.

## 0:00–0:15 — the blind setup (on /challenge, nothing else on screen)

> I don't know which test Laspoh is about to get.

Click **Run blind challenge**.

> The server has already committed to the hidden answer. I can't change it. Laspoh can't see it.

## 0:15–0:25 — the commitment exists before anything happens

Point at the commitment hash and the timestamp on screen.

> That's a SHA-256 of the hidden answer, published before the agent took a single action. Hold on
> to it — we'll recompute it at the end.

(If asked why this matters, one line, later: *the usual criticism of a self-hosted demo is that you
built both the agent and the test. This is the answer to it.*)

## 0:25–2:10 — the live mission. LET THE RESULT HAPPEN.

Do not explain the architecture yet. Narrate only the decisions as they occur:

> Each step carries its proof criterion, written before the step runs.
>
> …and there it is — the gate refused that one. **Before the click.** It says the page didn't
> establish this was a direct employer.

If the drawn scenario is the deceptive one:

> The page says "application received". Watch what the receipt does with that.

Keep rolling if it is slow. Do not cut.

## 2:10–2:35 — the reveal, then the proof it wasn't changed

> Now let's prove the answer wasn't changed after the run.

Point at: scenario revealed · nonce · original commitment · recomputed · **MATCH ✓**

> Same hash. The answer was fixed before Laspoh started.

Then the comparison block:

> And this is the receipt against the server's own record — which the agent has no write path to.
> Zero prohibited applications. Zero references it couldn't back.

## 2:35–2:55 — verify it from a terminal, not from my page

Switch to the terminal. Don't ask them to trust the browser:

    node scripts/verify-challenge.mjs <challenge-id>

> Same check, recomputed locally. Commitment valid. Zero false proven. Zero prohibited sent.

## 2:55–3:15 — Google Cloud, and why the receipt is the deliverable

Cloud Run console — project `laspoh-proof-251233`, the service, the revision. Cloud Logging
filtered to THIS mission id — one Vertex/Gemini call entry.

> That's the run you just watched, on Cloud Run, correlated by mission id.
>
> And every step verdict grades a criterion the *planner* wrote — so the last line asks the
> question the planner can't be trusted with: was the user's goal achieved? Judged from evidence,
> with no sight of the plan.

## 3:15–3:30 — architecture and the Google stack

> Gemini plans and verifies through isolated Genkit flows; Cloud Run hosts the async runtime and
> the browser; Firestore keeps the append-only history the receipt is built from. The planner
> proposes. The executor acts. Neither can mark anything proven. Quotes are grounded in code, a
> second model family — Gemma — can only demote, and irreversible steps need a proven license
> first. Three Google AI models; none grades its own work.

## 3:30–3:40 — close

> Laspoh isn't asking you to trust what the agent says. It gives you something you can check.
>
> No proof, no done.

## Contingency

ONE continuous pre-recorded fallback (complete run, timestamps visible, ≤75s, no cuts). If the
live run stalls past 2:10: "this is taking longer than usual — here's a run from earlier,
unedited", play it in FULL, then switch to LIVE Cloud Logging filtered to that run's missionId.
An honest failed receipt is still the demo — never hide one.

## Rehearsal checklist

- [ ] 3 timed dry runs; ≤3:50 in every one
- [ ] Full `.run.app` hostname legible at POST and /health
- [ ] Console header shows `laspoh-proof-251233` (NOT the stale -260823 project)
- [ ] One Vertex/Gemini log entry shown, correlated to the mission id
- [ ] The commitment hash is legible BEFORE the run and recomputed AFTER it
- [ ] verify-challenge.mjs run in a terminal, not just the page
- [ ] Whatever scenario is drawn is the one shown — no re-rolling
- [ ] Uploaded to YouTube/Vimeo, visibility **Public**, English
- [ ] Nothing on screen contradicts the code
