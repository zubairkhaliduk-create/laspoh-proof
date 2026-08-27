#!/usr/bin/env bash
# One command from source to a running Cloud Run service.
#
# Vertex is reached with the service's own identity — no API key is deployed, nothing to leak or
# rotate. Set GEMINI_API_KEY only if you deliberately want the Gemini API route instead.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="${PROJECT:-laspoh-proof-251233}"
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
#   NOTE: mission state is now in FIRESTORE (MISSION_STORE=firestore), so --max-instances 1 is no
#   longer load-bearing for correctness — it is kept as a cost bound while this is a demo service.
#   The env list below is the single source of truth: setting a variable with `gcloud run services
#   update` instead would be silently dropped by the next run of this script.
#
#   --max-instances 1    (historically) Mission state is in memory, so a caller must keep reaching the instance
#                        that holds it. Note the limit is per REVISION, not global: during a
#                        rollout the old revision keeps serving, and a mission started on it will
#                        404 the moment traffic shifts — observed, and not a crash. Do not deploy
#                        while a mission is in flight. The real fix is externalising state (pg is
#                        already a dependency); until then this is a known limit, not a mystery.
echo "▶ Building and deploying ${SERVICE} to Cloud Run (${PROJECT}/${REGION})…"
# THE SECOND-OPINION AUDITOR'S KEY, IF THE PROJECT HOLDS ONE.
#
# Gemma (the second model family auditing every "proven" verdict) is reached over the Gemini API,
# which needs a key — deliberately scoped to the Generative Language API alone, and deliberately a
# different route from the verifier's keyless Vertex identity. The secret is OPTIONAL: without it
# the auditor reports itself unavailable on /health and the single-verifier behaviour stands, so a
# judge deploying to their own project loses nothing. To arm it:
#   gcloud services api-keys create --project $PROJECT --display-name "gemma second-opinion" \
#     --api-target service=generativelanguage.googleapis.com
#   printf '%s' "THE_KEY" | gcloud secrets create gemma-api-key --project $PROJECT --data-file=-
#   grant: gcloud secrets add-iam-policy-binding gemma-api-key --project $PROJECT \
#     --member "serviceAccount:$RUNTIME_SA" --role roles/secretmanager.secretAccessor
SECRET_FLAGS=()
if gcloud secrets describe gemma-api-key --project "$PROJECT" >/dev/null 2>&1; then
  SECRET_FLAGS=(--update-secrets "GEMMA_API_KEY=gemma-api-key:latest")
  echo "▶ gemma-api-key secret found — the second-opinion auditor will be armed"
else
  echo "▶ no gemma-api-key secret — the auditor will report itself unavailable (single-verifier behaviour)"
fi

gcloud run deploy "$SERVICE" \
  "${SECRET_FLAGS[@]}" \
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
  --set-env-vars "GEMINI_MODEL=${MODEL},VERTEX_PROJECT=${PROJECT},VERTEX_LOCATION=${VERTEX_LOCATION:-asia-southeast1},MISSION_STORE=${MISSION_STORE:-firestore}"

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo "✓ Live: $URL"

echo "▶ Verifying the service actually answers…"
curl -fsS "$URL/health" | head -c 400; echo
echo "▶ Demo target: $URL/demo"
echo "▶ Start a mission:  curl -X POST $URL/missions -H 'content-type: application/json' -d '{\"goal\":\"…\",\"startUrl\":\"$URL/demo\"}'"
