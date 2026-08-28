#!/usr/bin/env bash
# The shot that cannot be argued with: what the server actually recorded.
set -euo pipefail
U="${U:-https://laspoh-proof-wqx6gkuc7a-uc.a.run.app}"
echo "▶ jobs ground truth (the agent has no write path to this)"
curl -fsS "$U/demo/jobs/submissions" | python3 -m json.tool
