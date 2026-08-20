#!/usr/bin/env bash
# One command from source to a running Cloud Run service.
#
# Vertex is reached with the service's own identity — no API key is deployed, nothing to leak or
# rotate. Set GEMINI_API_KEY only if you deliberately want the Gemini API route instead.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="${PROJECT:-main-491010}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-laspoh-proof}"
MODEL="${GEMINI_MODEL:-gemini-3.6-flash}"

echo "▶ Building and deploying ${SERVICE} to Cloud Run (${PROJECT}/${REGION})…"
gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 2 --memory 2Gi \
  --timeout 900 \
  --min-instances 0 --max-instances 3 \
  --set-env-vars "GEMINI_MODEL=${MODEL},VERTEX_PROJECT=${PROJECT},VERTEX_LOCATION=${VERTEX_LOCATION:-global}"

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo "✓ Live: $URL"

echo "▶ Verifying the service actually answers…"
curl -fsS "$URL/health" | head -c 400; echo
echo "▶ Demo target: $URL/demo"
echo "▶ Start a mission:  curl -X POST $URL/missions -H 'content-type: application/json' -d '{\"goal\":\"…\",\"startUrl\":\"$URL/demo\"}'"
