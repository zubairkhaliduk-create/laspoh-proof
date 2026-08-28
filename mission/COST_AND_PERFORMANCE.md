# Cost and performance — measured, not estimated

From 7 end-to-end missions on the deployed stack (`mission/live-eval-raw.json`).

| | seconds |
|---|---|
| fastest mission | 32 |
| median | 48 |
| slowest | 92 |
| mean | 52 |

**Fits the video.** The demo window in `docs/demo-final-script.md` is 0:48–2:15 — about 87
seconds. The median mission finishes inside that and the slowest observed run (92s) still
lands before the hard stop, which is why the script keeps rolling rather than cutting.

## Where the time goes
A mission is dominated by model round-trips, not by the browser. Per mission: 1 plan call, 1
verify call per completed step, 1 extra verify call per irreversible step (the pre-action gate),
0–2 repair calls, plus one Gemma audit per proven verdict when armed. Browser actions are
sub-second against a same-process demo target; `NAV_TIMEOUT` is 20s and click timeouts are 8s, so
a slow mission is a slow model or a retry, not slow actuation.

## What we deliberately did not optimise
The gate adds one verifier call per irreversible step. That is the point of it, and at ~2–4s it is
a fraction of a mission. Removing it to save time would be trading the product for a stopwatch.

## Known cost surface, stated
The public API is unauthenticated and unrated for judging, and every mission spends Vertex tokens
on the owner's project. That is an accepted trade for reviewability, documented in
`docs/architecture.md`, not a defence.
