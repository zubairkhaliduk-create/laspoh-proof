# Demo video — FINAL script (jobs demo, one continuous take)

**Target 3:35. Hard stop 3:50.** One continuous screen recording, no cuts. If the run drags past
its window, keep rolling — an honest slow run beats a stitched fast one, and only the first 4:00
is judged. If a uniform speed-up is ever needed, speed the WHOLE continuous run and label it
on-screen ("1.25× continuous live run"); never remove sections.

## Before recording (run these, in this order)

    # 1. Fresh ground truth + warm service
    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/health | jq .verificationModels
    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/demo/jobs/submissions

    # 2. One smoke mission end-to-end (not recorded)
    # 3. Close notifications, personal tabs, bookmarks bar. Terminal ≥16pt. Browser zoom 125%.

**Tabs, left to right:** 1 Terminal · 2 /demo/jobs (the board) · 3 Cloud Run console (service
page, project `laspoh-proof-251233` visible in the header) · 4 Cloud Logging pre-filtered to
`missionId` · 5 docs/architecture.png.

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

## 2:35–2:55 — the receipt

    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/missions/<id>/receipt | jq '{proven, safelyBlocked, total, lines: [.lines[] | {intent, status}]}'

> Two proven — each with a reference. One safely blocked. One unproven — that's the page that
> claimed success. Now the part no agent can narrate its way around:

    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/demo/jobs/submissions

> Ground truth. The two references on the receipt are the two the server actually issued. The
> deceptive one has no record — the receipt refused it. And zero recruiter applications exist.

## 2:55–3:15 — why this matters

Cloud Run console — point at project `laspoh-proof-251233`, the service, the revision. Cloud
Logging filtered to THIS missionId — scroll to one Vertex/gemini call entry.

> That's the run you just watched, on Cloud Run, correlated by mission id.

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
- [ ] Ground truth shown AFTER the receipt, including the zero-recruiter check
- [ ] Uploaded to YouTube/Vimeo, visibility **Public**, English
- [ ] Nothing on screen contradicts the code
