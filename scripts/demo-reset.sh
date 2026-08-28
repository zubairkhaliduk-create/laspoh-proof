#!/usr/bin/env bash
# Reset the demo before a take. The jobs ledger is in-process memory on --max-instances 1, so a
# fresh revision (or a cold start) is what empties it — there is deliberately NO reset endpoint,
# because an endpoint that clears ground truth is a write path to ground truth.
set -euo pipefail
U="${U:-https://laspoh-proof-wqx6gkuc7a-uc.a.run.app}"
echo "▶ current ground truth"
curl -fsS "$U/demo/jobs/submissions" | python3 -m json.tool
cat <<'TXT'

To start from an empty board, redeploy (new revision = new process):
    CLOUDSDK_CORE_ACCOUNT=zubair@laspoh.com bash deploy.sh

Do NOT add a reset endpoint to make this convenient. The agent must have no route to the truth
store other than the application flow — that is the property the whole demo rests on.
TXT
