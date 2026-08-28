# Recording runbook — do these in order

## T-30 min · machine
- [ ] Close Slack, Mail, Messages; **Do Not Disturb on**
- [ ] Quit every app that can raise a notification banner
- [ ] New browser profile or window: no bookmarks bar, no personal tabs, no autofill
- [ ] Terminal: dark theme, font ≥16pt, window ~110 columns, clear scrollback
- [ ] Screen resolution 1920×1080 (not a scaled 4K — text must stay crisp after upload)
- [ ] Browser zoom 125% on the job board and console tabs

## T-15 min · service
    bash scripts/demo-health.sh        # everything 200, model/project/store correct
    bash scripts/demo-smoke.sh         # ONE full mission, not recorded — proves the whole story
    bash scripts/demo-reset.sh         # check the board state you want to start from

If the smoke run does not produce at least one PROVEN and one SAFELY BLOCKED, **do not record**.
Fix it, or record the honest result and narrate it as the honest result — but decide before the
camera is on, not during.

## T-5 min · tabs, left to right
1. Terminal
2. `/demo/jobs` — the board
3. Cloud Run console, service page, **project `laspoh-proof-251233` visible in the header**
4. Cloud Logging, pre-filtered to `missionId`
5. `docs/authority.png` — the 15-second diagram

## T-1 min
    bash scripts/demo-prewarm.sh       # Cloud Run scales to zero; cold start costs ~20s on camera

## Record
Follow `docs/demo-final-script.md` exactly. **One continuous take.** If a step drags, keep rolling
and keep narrating — the run is allowed to be slow, it is not allowed to be spliced.

## If it goes wrong
- Mission stalls past 2:10 → say the contingency line, play the pre-recorded continuous fallback
  in full, then switch to LIVE Cloud Logging filtered to that run's mission id.
- A step fails honestly → **keep it**. A truthful failed receipt is the product working.
- You fluff a line → keep going. Nobody is scoring your diction; they are scoring whether the
  execution is real and unedited.

## After
- [ ] Watch it once at 1×, stopwatch running. ≤3:50?
- [ ] Is the `.run.app` hostname legible at the POST?
- [ ] Is the project id legible in the console shot?
- [ ] Does anything on screen contradict the repo?
- [ ] Upload to YouTube, visibility **Public** (not Unlisted), English, not made for kids
- [ ] Paste the URL into `submission/submission-manifest.json` and the Devpost form
