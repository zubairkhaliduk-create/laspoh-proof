# Hostile judge panel — independent scoring, acted upon

Three judges reviewed the project in isolation, with no sight of each other's findings and no
input from the author. Everything below is their language, and every finding named "fixed" was
verified against running code afterwards.

## Judge 1 — time-starved product judge (90 seconds, no source code)
**Innovation 4 · Architecture 4 · Demo 3 → 3.7 weighted.**
- *"The demo verifies itself… very few submissions hand a judge a way to catch them lying."*
- **Deduction:** *"the architecture diagram is an 18-box sprawl I could not parse at a glance. I
  got the twist from the prose, not the picture."* → **FIXED:** `docs/authority.png` answers one
  question in ten seconds; the detailed diagram stays for deeper readers.
- **Deduction:** a dense paragraph at the top he *"skipped entirely"*, and a relative link that
  404s on GitHub. → **FIXED:** README first screen rebuilt (failure → twist → three truths →
  real receipt); link removed.
- **Open:** no demo video. Owner action, and correctly identified as close to fatal on a 90-second pass.

## Judge 3 — hostile security engineer
**Architecture 4/5.** Verified findings, all fixed:
- **CRITICAL:** the reconnaissance navigate never consulted the allow-list; `file:///etc/passwd`
  reproduced into evidence, publishable via `GET /missions/:id`. → scheme-checked before dispatch
  + http(s) validation at intake; 6 tests.
- **HIGH:** `"Submit the application and read the reference"` disarmed the pre-action gate. →
  order now decides; a commit control arms the gate whatever the intent calls it.
- Three prompts consumed page text unfenced while docs claimed fencing is "always on". → fenced.
- Nonce was `Math.random()` beside a claim it "cannot be guessed". → crypto-random.
- Integrity digest was unverifiable — evidence hashes never shipped. → shipped.
- `maxSteps` accepted a string → NaN → budget silently removed. → clamped.
- Two doc claims falsified (navigation bounding; "bounded by --max-instances 1"). → corrected.
- **Accepted and stated, not fixed:** the API is unauthenticated and unrated for judging; the
  jobs ledger is in-process memory.

## Judge 5 — skeptical eligibility reviewer
**Stage One: PASS.** *"I went looking for grounds to disqualify and did not find them."*
- Verified 51 commits, all in-window, author dates == committer dates, no rewritten history.
  Measured cross-repo code overlap on every colliding filename: **max 12 shared lines**, all
  braces and field declarations. No extracted module.
- **RISK, fixed:** the disclosure's own removal recipe (`rm src/executors/laspoh.ts`) breaks
  typecheck, build and one test suite, and README claimed *"the entire test suite runs on the new
  reference executor"* — false for `test/adapter.test.ts`. *"In a submission whose entire thesis
  is 'never claim more than you can prove', handing a hostile reviewer a checkable overclaim about
  its own boundary is the single most damaging thing in the repo."* → recipe corrected to one that
  actually passes; the exception stated by name.
- **RISK, fixed:** disclosure buried at line 332 of 375, below "Limitations" → moved above it.
- **Fixed:** stale stat (462/542 → 461/569); `.env.example` pointed at the stale project
  `laspoh-proof-260823`; a `VERTEX_LOCATION` hint contradicting the same file; a stale Limitation
  claiming Firestore was "unverified in production" when `/health` reports it live.

## What the panel changed
Nine defects, two of them real vulnerabilities, one of them introduced the same morning by the
change that fixed a different problem. None would have been found by grading our own work — which
is the entire argument this project makes.
