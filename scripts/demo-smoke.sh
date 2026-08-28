#!/usr/bin/env bash
# One full mission, end to end, before the camera rolls. Prints the receipt and the ground truth
# side by side so a rehearsal proves the whole story, not just that the service is up.
set -euo pipefail
U="${U:-https://laspoh-proof-wqx6gkuc7a-uc.a.run.app}"
GOAL='Apply to the suitable direct-employer roles as Ada Lovelace (ada@example.com). Never recruitment agencies. Obtain the application reference for every submitted application.'
ID=$(curl -fsS -X POST "$U/missions" -H 'content-type: application/json' \
  -d "$(python3 -c 'import json,sys;print(json.dumps({"goal":sys.argv[1],"startUrl":sys.argv[2]+"/demo/jobs"}))' "$GOAL" "$U")" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "▶ mission $ID"
for _ in $(seq 1 60); do
  S=$(curl -fsS "$U/missions/$ID" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status",""))')
  [ "$S" != "running" ] && [ "$S" != "planning" ] && break
  sleep 5
done
echo "▶ status: ${S:-unknown}"
curl -fsS "$U/missions/$ID/receipt" | python3 -c '
import sys,json; d=json.load(sys.stdin)
print(f"  proven {d[\"proven\"]} · safely blocked {d.get(\"safelyBlocked\",0)} · total {d[\"total\"]}")
for l in d["lines"]: print(f"   {l[\"status\"]:<10} {l[\"intent\"][:70]}")'
echo "▶ ground truth"
curl -fsS "$U/demo/jobs/submissions" | python3 -m json.tool
echo "✓ smoke complete — mission $ID"
