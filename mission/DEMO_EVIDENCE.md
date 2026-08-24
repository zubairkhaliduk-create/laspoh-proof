# Demo Evidence

Raw, dated evidence. Append; never erase — a superseded run stays as the record of what was
true at the time.

---

## 2026-08-23 — Migration smoke mission (first run on the hackathon GCP project)

Service: `https://laspoh-proof-cffubwieta-uc.a.run.app`
Project: `laspoh-proof-260823` · billing `01247A-B258F0-B4B3E1` ("laspoh")
Model: `gemini-3.5-flash` via Vertex AI, `asia-southeast1`
Runtime identity: `laspoh-proof-runtime`, holding exactly `roles/aiplatform.user`

    Proven 7 of 8. The rest is reported unproven, not counted.
    cited references: GR-133198
    server issued   : GR-133198
    ✓ every claim on the receipt is backed by something the server actually did

**Why this run matters:** the reference is not asserted by the agent — it is cross-checked
against `/demo/submissions`, an endpoint the agent does not write to. A fabricated reference
fails the check.

---

## 2026-08-23 — Region probe (evidence for AD-004)

Direct `:generateContent` POSTs for `gemini-3.5-flash` in project `laspoh-proof-260823`:

    us-central1     → 404 (not served here)
    us-east4        → 404 (not served here)
    europe-west4    → 404 (not served here)
    asia-southeast1 → 200 ✓

Reproduces the same finding independently obtained in the older project — regional
availability, not a project quirk.

---

## 2026-08-23 — Live service configuration

    maxScale             1
    cpu                  2
    memory               4Gi
    cpu-throttling       false
    serviceAccount       laspoh-proof-runtime@laspoh-proof-260823.iam.gserviceaccount.com
    runtime SA roles     roles/aiplatform.user        (exactly one)

`--no-cpu-throttling` is load-bearing: missions continue after the 202 response, and Cloud
Run's default would throttle CPU to near zero outside a request.

---

## 2026-08-20 — Local end-to-end run (reference executor)

    Proven 7 of 8 · cited GR-779049 · server issued GR-779049 · HONEST? YES

Step-level detail: navigate ✓ · select 'Independent researcher' ✓ (inserted by repair) ·
consent ✓ (inserted by repair) · full name ✓ · email ✓ · **affiliation FAILED — no such
field** · submit ✓ · read reference ✓.

**The eighth step is the point.** The planner invented a field the form does not have. The
receipt reports it failed, with the reason, rather than quietly dropping it — so the run
demonstrates truthful partial completion on a mission that otherwise succeeded.

---

## Evidence still to collect

| Evidence | Phase |
|---|---|
| Cloud Run request/Vertex logs suitable for the video | 20 |
| Repeated-run reliability rate (n ≥ 10) | 16 |
| Resume-after-restart proof | 05 |
| Both executors running the same action through one interface | 08 |
| Prompt-injection containment proof | 13 |
