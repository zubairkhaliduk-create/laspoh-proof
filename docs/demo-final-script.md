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

## 0:00–0:25 — the real failure (voice over the job board tab)

> I told a browser agent to apply to jobs for me — but never recruitment agencies. It applied to
> ten. Five were recruiters. Then it told me the mission was a success.
>
> Another run said "10 applications complete." Actual submissions: zero.
>
> The problem wasn't the browser. The worker was grading itself.

## 0:25–0:38 — the rule

> So Laspoh Proof has one rule: the agent doing the work never decides that the work succeeded.
> And for anything irreversible, the proof has to come FIRST — no evidence, no action.

## 0:38–2:15 — the live mission (the unedited core)

Terminal. Type the FULL URL so `.run.app` is on camera:

    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/health | jq '.model, .verificationModels.secondOpinion.armed'

> Deployed on Cloud Run, brain on Vertex AI. Same URL for everything you're about to see.

    curl -X POST https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/missions \
      -H 'content-type: application/json' \
      -d '{"goal":"Apply to the suitable direct-employer roles as Ada Lovelace (ada@example.com). Never recruitment agencies. Obtain the application reference for every submitted application.","startUrl":"https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/demo/jobs"}'

> It returns immediately — the mission runs in the background. Four roles on this board. One of
> them is a recruitment agency. One will LIE about accepting the application.

Poll the mission (`watch -n 5 curl -s .../missions/<id> | jq '.status, (.events|length)'` or
re-curl). Narrate the DECISIONS, not the clicks:

> Every step carries its proof criterion, written before it runs…
> Here's the one that matters — the recruiter posting. Watch: the pre-action gate asks the
> verifier to license the submit. The page itself says "recruitment agency". Contradicted.
> **Blocked — before the click.** Sent is sent, so the block has to come first.

## 2:15–2:40 — the receipt vs ground truth

    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/missions/<id>/receipt | jq '{proven, safelyBlocked, total, lines: [.lines[] | {intent, status}]}'

> Two proven — each with a reference. One safely blocked. One unproven — that's the page that
> claimed success. Now the part no agent can narrate its way around:

    curl -s https://laspoh-proof-wqx6gkuc7a-uc.a.run.app/demo/jobs/submissions

> Ground truth. The two references on the receipt are the two the server actually issued. The
> deceptive one has no record — the receipt refused it. And zero recruiter applications exist.

## 2:40–3:00 — Google Cloud proof (tab 3, then 4)

Cloud Run console — point at project `laspoh-proof-251233`, the service, the revision. Cloud
Logging filtered to THIS missionId — scroll to one Vertex/gemini call entry.

> That's the run you just watched, on Cloud Run, correlated by mission id.

## 3:00–3:22 — architecture (tab 5)

> Gemini plans and verifies through isolated Genkit flows; Cloud Run hosts the async runtime and
> the browser; Firestore keeps the append-only history the receipt is built from. The planner
> proposes. The executor acts. Neither can mark anything proven. Quotes are grounded in code, a
> second model family — Gemma — can only demote, and irreversible steps need a proven license
> first. Three Google AI models; none grades its own work.

## 3:22–3:35 — close (back to the receipt)

> Most agents tell you what they tried. Laspoh Proof tells you what can be proven — and refuses
> irreversible work when the evidence isn't there.
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
