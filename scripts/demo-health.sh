#!/usr/bin/env bash
# Is the service ready to be recorded? One screen, no scrolling.
set -euo pipefail
U="${U:-https://laspoh-proof-wqx6gkuc7a-uc.a.run.app}"
echo "▶ health"
curl -fsS "$U/health" | python3 -c '
import sys,json; d=json.load(sys.stdin)
vm=d.get("verificationModels",{})
print("  model      ", d["model"]["model"], "via", d["model"]["route"], "in", d["model"].get("location","-"))
print("  project    ", d["model"].get("project","-"))
print("  store      ", d.get("store"))
print("  gemma armed", vm.get("secondOpinion",{}).get("armed"))
print("  build ok   ", d.get("ok"))'
echo "▶ pages"
for p in / /demo/jobs /demo/jobs/role-b /demo/jobs/submissions; do
  printf "  %-26s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$U$p")"
done
