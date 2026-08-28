#!/usr/bin/env bash
# Cloud Run scales to zero. A cold start during the take is the most avoidable way to lose 20
# seconds of a 3:50 video. Run this immediately before recording.
set -euo pipefail
U="${U:-https://laspoh-proof-wqx6gkuc7a-uc.a.run.app}"
echo "▶ warming $U"
for i in 1 2 3; do curl -fsS -o /dev/null "$U/health" && printf "  ping %d ok\n" "$i"; done
curl -fsS -o /dev/null "$U/demo/jobs" && echo "  jobs board warm"
echo "✓ warm — record now"
