# Shot sequence — one line per shot

| # | t | Tab | On screen | Say (gist) |
|---|---|---|---|---|
| 1 | 0:00 | 2 board | the four roles | "I told an agent: apply to jobs, never recruiters. It applied to ten. Five were recruiters. Then it reported success." |
| 2 | 0:12 | 2 board | still the board | "Another run said ten applications complete. Actual submissions: zero. The worker was grading itself." |
| 3 | 0:25 | 5 diagram | `authority.png` | "One rule: the agent doing the work never decides it succeeded. And anything irreversible has to be proven allowed first." |
| 4 | 0:38 | 1 terminal | `demo-health.sh` output | "Deployed on Cloud Run, brain on Vertex. Same URL for everything you'll see." |
| 5 | 0:48 | 1 terminal | POST /missions, full `.run.app` URL typed | "One sentence, and I walk away. It returns immediately — this runs in the background." |
| 6 | 1:00 | 1+2 | plan appears; steps stream | "Each step carries its proof criterion, written before it runs." |
| 7 | 1:30 | 2 board | agent on the recruiter posting | "This one is the recruitment agency. Watch what happens at the submit." |
| 8 | 1:45 | 1 terminal | `preaction.blocked` event | "Blocked. Before the click. Not detected afterwards — refused." |
| 9 | 2:00 | 1 terminal | remaining steps finish | "And this employer's page says thank you while the server records nothing." |
| 10 | 2:15 | 1 terminal | receipt JSON | "Two proven, one safely blocked, one unproven." |
| 11 | 2:30 | 1 terminal | `/demo/jobs/submissions` | "Ground truth. The references match. Zero recruiter applications exist." |
| 12 | 2:45 | 3 console | Cloud Run service + revision, project id | "Running on Cloud Run, this project." |
| 13 | 2:55 | 4 logging | one Vertex call, this mission id | "Correlated by mission id." |
| 14 | 3:05 | 5 diagram | `authority.png` | planner ≠ verifier · grounding in code · Gemma demote-only · gate first |
| 15 | 3:25 | 1 terminal | receipt back on screen | "Most agents tell you what they tried. This one tells you what it can prove. No proof, no done." |
