# User Action Required

Only items that genuinely cannot be done from this environment. Each states why, the exact
steps, and what unblocks afterwards.

**Nothing here blocks the rest of the program** — independent work continues regardless.

---

## Status: 4 open

---

### UA-004 — Re-authenticate the Google account that owns the hackathon project ⚠️ BLOCKING
**Why it requires you:** `gcloud auth login` opens a browser and cannot run non-interactively.
The hackathon project `laspoh-proof-260823` sits under **zubair@samstar.org**, and both that
account's token and Application Default Credentials have expired. The other account on this
machine (`zubair@blissio.ai`) is a different org and is refused by the project — verified, not
assumed.

**What this blocks right now:** deploying the Genkit plugin migration, probing model availability
in the hackathon project, and running a live mission against the deployed service. The service
itself is still up and serving (HTTP 200) on the previous revision, so nothing is down.

**Steps:**

    gcloud auth login                        # sign in as zubair@samstar.org
    gcloud auth application-default login    # same account — ADC is a SEPARATE credential store
    gcloud config set account zubair@samstar.org

Both commands are needed. `auth login` covers the CLI; `application-default login` covers what the
libraries use. Refreshing one and not the other is what happened last time.

**Unblocks:** Phase 02 deployment evidence, Phase 20 (Google Cloud proof), and every live-mission
run the later phases depend on.

---

### UA-001 — Record and upload the demo video
**Why it requires you:** it is a screen recording of your machine, narrated, uploaded to a
YouTube/Vimeo account only you can sign into. No automation can produce it.

**Blocked until then:** the Devpost submission cannot be completed (video URL is mandatory).

**Steps:** provided as a shot-by-shot script with timings in Phase 21. Rehearsal checklist
and contingency plan included. Expect two or three takes.

**Unblocks:** Devpost submission, Phase 27 final package.

---

### UA-002 — Devpost submission
**Why it requires you:** Devpost login and the act of submitting are yours. Submitting on
someone's behalf is not something I should do even if I could.

**Blocked until then:** the entry does not exist.

**Steps:** Phase 22 produces the complete copy — title, tagline, all long-form fields,
technology list, disclosure — ready to paste.

**Unblocks:** the submission itself.

---

### UA-003 — Publish the bonus article and social post (optional)
**Why it requires you:** posting from your LinkedIn/X account requires your credentials, and
publishing under your name is your decision.

**Blocked until then:** bonus points only. Core score is unaffected.

**Steps:** Phase 23 drafts both, including the required "created for the purposes of
entering the hackathon" statement and `#AllThingsAgenticHackathon`.

**Unblocks:** bonus criteria.

---

## Resolved

### UA-000 — Google Cloud account with credit *(resolved 2026-08-23)*
Required your `gcloud auth login` and access to the $300 billing account. Done; the service
now runs in project `laspoh-proof-260823` on billing account `01247A-B258F0-B4B3E1`.
