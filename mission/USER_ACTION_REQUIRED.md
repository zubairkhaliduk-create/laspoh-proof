# Owner actions — the only things that cannot be done without you

Deadline: **Mon 31 Aug 2026, 17:00 PT**. Everything else in this repository is complete, tested
and frozen.

---

## 1. ONE COMMAND — unblocks deployment AND the blind evaluation  ⟵ do this first

    gcloud auth login          # as zubair@laspoh.com
    cd ~/andiwal/laspoh-proof && ./finalize.sh

`zubair@laspoh.com`'s gcloud session has expired ("Reauthentication failed. cannot prompt during
non-interactive execution"), and Application Default Credentials are expired too, so nothing on
this machine can currently deploy or reach Vertex.

**This is the single blocker for three deliverables:**
- the Blind Judge Challenge is not on the live service (`/challenge` returns the index page)
- the blind production evaluation cannot run (it drives the deployed service)
- the hero receipt cannot be rendered (it is deliberately refused unless a real run discriminates)

`finalize.sh` deploys, proves the service live, runs the evaluation and renders the gallery.
Then commit and push what it produces.

## 2. Record the video

`docs/demo-recording-runbook.md` — T-30 checklist onward. Script: `docs/demo-final-script.md`.
≤3:50, one continuous take, YouTube/Vimeo **Public**. Metadata in `docs/youtube-metadata.md`.

## 3. Devpost — draft now, submit early

Paste `submission/devpost-final.md`. Track **The Taskmaster**. Gallery images in the order given
in `submission/submission-fields.md`. Add the video URL when it exists.

## 4. Bonus (+0.4 candidate, ~20 minutes)

- Publish `submission/article-final.md` on dev.to — **public**. It already carries the required
  "created for the purposes of entering this hackathon" sentence.
- Post `submission/linkedin-final.md` and/or `submission/x-final.md` — hashtag
  **#AllThingsAgenticHackathon** exactly.
- Put both URLs into the Devpost bonus fields.

## 5. Gemma arming (+0.2 candidate, 5 minutes, console only)

ai.studio/projects → `laspoh-proof-251233` → enable Gemini API billing (currently returns 429
"prepayment credits depleted"). Then say "gemma billing done" and the already-minted scoped key is
stored as the `gemma-api-key` secret, granted, and redeployed; `/health` flips `armed: true` on its
own. If it stays false nothing is wrong — `/health` says so and no asset claims otherwise.

## 6. Hygiene

Delete project **laspoh-proof-260823** (visible only to `zubair@samstar.org`). Harmless until then:
no submission asset references that URL.
