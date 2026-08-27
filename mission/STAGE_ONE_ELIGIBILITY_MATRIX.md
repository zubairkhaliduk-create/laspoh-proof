# Stage One eligibility matrix — verified 2026-08-27/28

| Requirement (rules) | Evidence | Status |
|---|---|---|
| New project in window (Aug 3–31) | first commit 34674e7 dated 2026-08-20; 45+ in-window commits | PASS |
| Pre-existing work disclosed | README "Hackathon disclosure", writeup disclosure section, /health executors[].preExisting, mission/PREEXISTING_DISCLOSURE.md; adapter off by default; all 180 tests run without it | PASS |
| Gemini 3.5+ via API/Vertex | gemini-3.5-flash via Vertex (asia-southeast1), reported on /health + every receipt | PASS |
| Google Agent Framework | Genkit 1.41 (@genkit-ai/google-genai) — plan/repair/verify flows ARE the reasoning | PASS |
| Google Cloud infra | Cloud Run (service) + Firestore (append-only mission state) | PASS |
| Track named | Taskmaster | PASS |
| Repo URL | public GitHub, CI green | PASS |
| README step-by-step setup | prerequisites, both model routes, local run, from-scratch cloud deploy (migrate.sh), Firestore provisioning | PASS |
| Architecture diagram | docs/architecture.png (rendered, boundaries drawn) in repo + gallery | PASS |
| Text description (features/tech/data sources/findings) | docs/devpost-writeup.md — all four present | PASS |
| Hosted URL | https://laspoh-proof-wqx6gkuc7a-uc.a.run.app with judge index at "/" | PASS |
| Video ≤4min, public, English, GCP visible, unedited live run | script + runbook ready; **video NOT yet recorded** | RISK — owner action |
| No third-party IP/trademarks | synthetic companies/people throughout; MIT-style licence in repo | PASS |
| Functionality matches claims | live proof runs + adversarial eval artifacts in mission/ | PASS |

Single remaining Stage One risk: the video. Everything else is done and re-verified.
