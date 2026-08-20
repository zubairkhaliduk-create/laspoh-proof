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
MODEL="${GEMINI_MODEL:-gemini-3.5-flash}"
# A dedicated identity holding exactly one role (roles/aiplatform.user). The default compute
# account carries far more than this service needs, and "it already works" is not a reason to run
# a deployment on it.
RUNTIME_SA="${RUNTIME_SA:-laspoh-proof-runtime@${PROJECT}.iam.gserviceaccount.com}"

# Two flags this service cannot run without:
#
#   --no-cpu-throttling  POST /missions returns 202 and the mission continues in the background.
#                        Cloud Run's default throttles CPU to near zero outside a request, so the
#                        mission would crawl or stall after the response was sent — with nothing in
#                        the logs to say why.
#   --max-instances 1    Mission state is in memory. A second instance means a caller can start a
#                        mission on one and poll another, getting a 404 for work that is running
#                        fine. One instance is the honest fix until state is externalised.
echo "▶ Building and deploying ${SERVICE} to Cloud Run (${PROJECT}/${REGION})…"
gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --service-account "$RUNTIME_SA" \
  --port 8080 \
  --cpu 2 --memory 4Gi \
  --timeout 900 \
  --min-instances 0 --max-instances 1 \
  --no-cpu-throttling \
  --set-env-vars "GEMINI_MODEL=${MODEL},VERTEX_PROJECT=${PROJECT},VERTEX_LOCATION=${VERTEX_LOCATION:-asia-southeast1}"

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo "✓ Live: $URL"

echo "▶ Verifying the service actually answers…"
curl -fsS "$URL/health" | head -c 400; echo
echo "▶ Demo target: $URL/demo"
echo "▶ Start a mission:  curl -X POST $URL/missions -H 'content-type: application/json' -d '{\"goal\":\"…\",\"startUrl\":\"$URL/demo\"}'"
