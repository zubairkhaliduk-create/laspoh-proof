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
[ -n "$MID" ] && node evals/render-receipt.mjs "$MID" "$URL" submission/gallery-01-receipt.png
cp docs/architecture.png submission/gallery-03-architecture.png

echo
echo "✓ FINALIZED. Canonical run: $MID"
echo "  Receipt : $URL/missions/$MID/receipt"
echo "  Truth   : $URL/demo/jobs/submissions"
echo "  Gallery : submission/gallery-01-receipt.png, submission/gallery-03-architecture.png"
echo "  Numbers : mission/LIVE_EVAL_RESULTS.md"
echo "  Then: git add -A && git commit && git push  (then record the video)"
