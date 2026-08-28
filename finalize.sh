#!/usr/bin/env bash
# ONE COMMAND, after `gcloud auth login` as zubair@laspoh.com.
#
# Everything that needed a cloud identity, in the order the evidence has to be produced: deploy
# the frozen build, prove it live, measure it adversarially, and render the gallery from the
# receipt the system actually produced. No step invents an artifact — each one reads what the
# deployed service really did.
set -euo pipefail
cd "$(dirname "$0")"
export CLOUDSDK_CORE_ACCOUNT="${CLOUDSDK_CORE_ACCOUNT:-zubair@laspoh.com}"
URL="https://laspoh-proof-wqx6gkuc7a-uc.a.run.app"

echo "▶ 1/5 gates"
pnpm test >/dev/null && pnpm lint >/dev/null && pnpm typecheck >/dev/null
echo "  ✓ tests, lint, typecheck"

echo "▶ 2/5 deploy"
bash deploy.sh </dev/null | tail -3

echo "▶ 3/5 live proof"
curl -fsS "$URL/health" | python3 -m json.tool | head -20

echo "▶ 4/5 adversarial evaluation (8 real missions — a few minutes)"
node evals/adversarial-eval.mjs "$URL" 4

echo "▶ 5/5 hero receipt from the best real jobs mission"
MID=$(python3 -c "
import json
d=json.load(open('mission/live-eval-raw.json'))
runs=[r for r in d['results'] if r.get('scenario')=='jobs-constrained' and not r.get('error')]
runs.sort(key=lambda r: (r['proven'], r['safelyBlocked']), reverse=True)
print(runs[0]['missionId'] if runs else '')")
# THE HERO MUST ACTUALLY SHOW WHAT THE CAPTION CLAIMS.
#
# A competitor-aware review caught the previous hero image contradicting its own caption: the
# receipt was from a run that hallucinated two roles, never reached the recruiter, and never
# reached the deceptive employer — so "both are caught" was false, and "0 prohibited sent" was
# true only because the agent never got near one. For a project whose thesis is never claim more
# than the evidence shows, that is the failure mode reproduced in the marketing.
#
# So the hero is rendered ONLY from a run that genuinely discriminated: at least one step proven
# AND at least one safely blocked. Otherwise it refuses and says why.
PROVEN=$(python3 -c "
import json,sys
d=json.load(open('mission/live-eval-raw.json'))
r=[x for x in d['results'] if x.get('missionId')=='$MID']
print(r[0]['proven'] if r else 0)")
BLOCKED=$(python3 -c "
import json
d=json.load(open('mission/live-eval-raw.json'))
r=[x for x in d['results'] if x.get('missionId')=='$MID']
print(r[0].get('safelyBlocked',0) if r else 0)")
if [ -n "$MID" ] && [ "$PROVEN" -ge 1 ] && [ "$BLOCKED" -ge 1 ]; then
  node evals/render-receipt.mjs "$MID" "$URL" submission/gallery-01-receipt.png
  echo "  ✓ hero rendered from $MID (proven $PROVEN, blocked $BLOCKED) — it discriminates"
else
  echo "  ✖ NO HERO RENDERED. Best jobs run was proven=$PROVEN blocked=$BLOCKED."
  echo "    A hero receipt must show the gate PROCEEDING on a direct employer and BLOCKING the"
  echo "    recruiter — otherwise it shows a trivially-safe agent and the caption would overclaim."
  echo "    Investigate before recording; do not ship a receipt that does not demonstrate this."
fi
node evals/render-evals.mjs submission/gallery-04-evals.png
cp docs/architecture.png submission/gallery-03-architecture.png

echo
echo "✓ FINALIZED. Canonical run: $MID"
echo "  Receipt : $URL/missions/$MID/receipt"
echo "  Truth   : $URL/demo/jobs/submissions"
echo "  Gallery : submission/gallery-01-receipt.png, submission/gallery-03-architecture.png"
echo "  Numbers : mission/LIVE_EVAL_RESULTS.md"
echo "  Then: git add -A && git commit && git push  (then record the video)"
