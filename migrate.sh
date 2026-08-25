#!/usr/bin/env bash
# Move this service to another GCP project — idempotent, and safe to re-run.
#
# Everything the service needs in a project is created here rather than by hand, because the last
# migration's failures were all "something was never enabled/granted in the new project" and none of
# them announced themselves. Each step verifies its own result; nothing is assumed from an exit code.
#
#   ./migrate.sh TARGET_PROJECT_ID [BILLING_ACCOUNT_ID]
#
# Auth: uses gcloud's active login. If that needs reauth and you cannot run `gcloud auth login`
# here, mint one from ADC first:
#   export CLOUDSDK_AUTH_ACCESS_TOKEN=$(gcloud auth application-default print-access-token)
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="${1:-}"
BILLING="${2:-}"
SERVICE="${SERVICE:-laspoh-proof}"
REGION="${REGION:-us-central1}"
MODEL="${GEMINI_MODEL:-gemini-3.5-flash}"
SA_ID="${SA_ID:-laspoh-proof-runtime}"
SA="${SA_ID}@${PROJECT}.iam.gserviceaccount.com"

# Regions to try for the model, in preference order. Vertex availability is PER-REGION and differs
# between projects, so this is probed, never assumed — the previous project served 3.5-flash only
# from asia-southeast1 while us-central1 had nothing newer than 2.5.
CANDIDATE_REGIONS=("${VERTEX_LOCATION:-}" us-central1 us-east4 europe-west4 asia-southeast1)

[ -n "$PROJECT" ] || { echo "usage: ./migrate.sh TARGET_PROJECT_ID [BILLING_ACCOUNT_ID]" >&2; exit 2; }

say() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }

# ── 1. Preflight ────────────────────────────────────────────────────────────────────────────────
say "Preflight on ${PROJECT}"
gcloud projects describe "$PROJECT" --format='value(projectId)' >/dev/null 2>&1 \
  || die "cannot see project '${PROJECT}'. Either it does not exist, or the active credentials have no access to it."
ok "project reachable"

if [ -n "$BILLING" ]; then
  gcloud billing projects link "$PROJECT" --billing-account="$BILLING" >/dev/null 2>&1 \
    || die "could not link billing account ${BILLING} (needs roles/billing.user on that account)"
fi
BILLED="$(gcloud billing projects describe "$PROJECT" --format='value(billingEnabled)' 2>/dev/null || echo false)"
[ "$BILLED" = "True" ] || die "billing is not enabled on ${PROJECT}. Link a billing account first (pass it as the 2nd argument)."
ok "billing enabled ($(gcloud billing projects describe "$PROJECT" --format='value(billingAccountName)'))"

# ── 2. APIs ─────────────────────────────────────────────────────────────────────────────────────
say "Enabling required APIs"
for API in run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com; do
  if gcloud services list --enabled --project="$PROJECT" --filter="config.name=${API}" --format='value(config.name)' 2>/dev/null | grep -q .; then
    ok "${API} (already on)"
  else
    gcloud services enable "$API" --project="$PROJECT" >/dev/null 2>&1 || die "could not enable ${API}"
    ok "${API} (enabled)"
  fi
done

# ── 3. Runtime identity ─────────────────────────────────────────────────────────────────────────
# One dedicated account with exactly one role. The default compute account carries far more than
# this service needs, and "it already works" is not a reason to deploy onto it.
say "Runtime service account"
if gcloud iam service-accounts describe "$SA" --project="$PROJECT" >/dev/null 2>&1; then
  ok "${SA_ID} (exists)"
else
  gcloud iam service-accounts create "$SA_ID" --project="$PROJECT" \
    --display-name="laspoh-proof runtime (least privilege)" >/dev/null 2>&1 || die "could not create ${SA_ID}"
  ok "${SA_ID} (created)"
fi
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${SA}" --role="roles/aiplatform.user" \
  --condition=None --quiet >/dev/null 2>&1 || die "could not grant roles/aiplatform.user to ${SA}"
ROLES="$(gcloud projects get-iam-policy "$PROJECT" --flatten='bindings[].members' \
  --filter="bindings.members:${SA}" --format='value(bindings.role)' 2>/dev/null | tr '\n' ' ')"
ok "roles: ${ROLES:-none}"

# ── 3b. Build identity ──────────────────────────────────────────────────────────────────────────
# Separate from the runtime account on purpose. `gcloud run deploy --source` builds through Cloud
# Build, and in projects created recently Google no longer auto-grants that identity its
# permissions — the deploy then fails on a storage read with a message that names a service account
# you never chose. The runtime account stays least-privilege; this role is build-time only.
say "Build identity"
PNUM="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
BUILD_SA="${PNUM}-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${BUILD_SA}" --role="roles/cloudbuild.builds.builder" \
  --condition=None --quiet >/dev/null 2>&1 || die "could not grant build permissions to ${BUILD_SA}"

# GRANTING IS NOT THE SAME AS THE GRANT BEING IN EFFECT.
#
# On a fresh project this script granted the role, reported success, and the very next step failed
# with PERMISSION_DENIED on that exact service account. The binding was present when checked
# afterwards — it simply had not propagated. "Grant, then immediately use" is a race, and on a new
# project it loses often enough to look like a permissions bug rather than a timing one.
#
# Read the policy back until the binding is visible, then wait a little longer, because visible in
# the policy is not the same as honoured by every backend. Bounded, and it never fails the run: a
# grant that is merely slow should not kill a deploy that would otherwise have worked.
printf '  waiting for the grant to take effect'
for _ in $(seq 1 12); do
  if gcloud projects get-iam-policy "$PROJECT" --flatten='bindings[].members' \
       --filter="bindings.members:${BUILD_SA}" --format='value(bindings.role)' 2>/dev/null \
       | grep -q cloudbuild; then
    sleep 10
    break
  fi
  printf '.'; sleep 5
done
echo
ok "${BUILD_SA} can build"

# ── 4. Which region actually serves the model ───────────────────────────────────────────────────
# Asked of Vertex directly. A docs table is not evidence, and a 401 is not a "no" — the probe below
# distinguishes them, because reading an auth failure as unavailability once cost me a whole region.
say "Probing ${MODEL} availability"
TOKEN="${CLOUDSDK_AUTH_ACCESS_TOKEN:-$(gcloud auth print-access-token 2>/dev/null || true)}"
[ -n "$TOKEN" ] || TOKEN="$(gcloud auth application-default print-access-token 2>/dev/null || true)"
[ -n "$TOKEN" ] || die "no access token available to probe Vertex — run 'gcloud auth login' (or 'gcloud auth application-default login')"
FOUND=""
AUTH_TROUBLE=0
for R in "${CANDIDATE_REGIONS[@]}"; do
  [ -n "$R" ] || continue
  CODE="$(curl -s -o /tmp/vertex-probe.$$ -w '%{http_code}' --max-time 60 \
    -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' \
    "https://${R}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${R}/publishers/google/models/${MODEL}:generateContent" \
    -d '{"contents":[{"role":"user","parts":[{"text":"ok"}]}],"generationConfig":{"maxOutputTokens":8}}' || echo 000)"
  case "$CODE" in
    200) ok "${R} serves ${MODEL}"; FOUND="$R"; rm -f /tmp/vertex-probe.$$; break ;;
    401|403) echo "  ! ${R}: HTTP ${CODE} — auth/permission, NOT a verdict on availability"; AUTH_TROUBLE=1 ;;
    404) echo "  · ${R}: not served here" ;;
    *)   echo "  · ${R}: HTTP ${CODE} $(head -c 120 /tmp/vertex-probe.$$ 2>/dev/null | tr -d '\n')" ;;
  esac
  rm -f /tmp/vertex-probe.$$
done
# Distinguish "nowhere serves it" from "we never got to ask". Reporting an auth failure as a model
# availability verdict is the precise mistake this probe exists to avoid, so it must not be the
# mistake the probe itself makes.
if [ -z "$FOUND" ] && [ "$AUTH_TROUBLE" = "1" ]; then
  die "could not authenticate to Vertex in any region, so availability is UNKNOWN — not unavailable.
     Refresh credentials and re-run:
       gcloud auth login                       # or, for ADC:
       gcloud auth application-default login
       export CLOUDSDK_AUTH_ACCESS_TOKEN=\$(gcloud auth application-default print-access-token)"
fi
[ -n "$FOUND" ] || die "no candidate region serves ${MODEL} in ${PROJECT}. Set VERTEX_LOCATION or GEMINI_MODEL and re-run."

# ── 5. Deploy ───────────────────────────────────────────────────────────────────────────────────
say "Deploying to ${PROJECT}/${REGION}"
PROJECT="$PROJECT" REGION="$REGION" SERVICE="$SERVICE" \
  GEMINI_MODEL="$MODEL" VERTEX_LOCATION="$FOUND" RUNTIME_SA="$SA" ./deploy.sh

URL="$(gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" --format='value(status.url)')"

# ── 6. Prove it works there, rather than assuming the deploy implies it ─────────────────────────
say "Verifying the migrated service"
HEALTH_FILE="$(mktemp)"
curl -fsS --max-time 60 "${URL}/health" -o "$HEALTH_FILE" || die "/health did not answer at ${URL}"
grep -q '"ok":true' "$HEALTH_FILE" || die "/health answered but not ok: $(head -c 200 "$HEALTH_FILE")"
# Compute BEFORE reporting. Interpolating this straight into ok "..." meant a failure here printed a
# traceback and a green tick on the same screen — a verification step that passes while erroring is
# worse than no verification step.
MODEL_LINE="$(python3 -c 'import json,sys;print(json.dumps(json.load(open(sys.argv[1]))["model"]))' "$HEALTH_FILE")" \
  || die "/health returned something that is not a readable model identity"
ok "health: ${MODEL_LINE}"
rm -f "$HEALTH_FILE"

say "Smoke mission (end to end, against the service's own ground truth)"
MID="$(curl -fsS --max-time 90 -X POST "${URL}/missions" -H 'content-type: application/json' \
  -d "{\"goal\":\"Apply for the research grant as Ada Lovelace (ada@example.com), an independent researcher. Obtain the confirmation reference that proves the application was submitted.\",\"startUrl\":\"${URL}/demo\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')"
echo "  mission ${MID}"
for _ in $(seq 1 90); do
  ST="$(curl -fsS --max-time 60 "${URL}/missions/${MID}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status","MISSING"))')"
  [ "$ST" = "running" ] || break
  sleep 10
done
echo "  status: ${ST}"
RECEIPT_FILE="$(mktemp)"
curl -fsS --max-time 60 "${URL}/missions/${MID}/receipt" -o "$RECEIPT_FILE" || die "no receipt produced"
python3 - "$URL" "$RECEIPT_FILE" <<'PY' || die "the migrated service did not produce an honest, evidence-backed receipt"
import json, sys, urllib.request
# The receipt path is passed in, not globbed: picking up a stale /tmp/receipt.* from an earlier run
# would verify the wrong mission and say so confidently.
receipt = json.load(open(sys.argv[2]))
truth = json.load(urllib.request.urlopen(f"{sys.argv[1]}/demo/submissions", timeout=60))
cited = {c for l in receipt["lines"] for c in (l.get("citedEvidence") or [])}
refs = {r for r in truth.get("refs", [])}
import re
claimed = {m for c in cited for m in re.findall(r"GR-\d{4,10}", c)}
print(f"  {receipt['headline']}")
print(f"  cited references: {', '.join(sorted(claimed)) or '(none)'}")
print(f"  server issued   : {', '.join(sorted(refs)) or '(none)'}")
fabricated = claimed - refs
if fabricated:
    print(f"  ✗ FABRICATED: {', '.join(sorted(fabricated))}")
    raise SystemExit(1)
if receipt["outcome"] == "complete" and not refs:
    print("  ✗ reported complete with nothing submitted")
    raise SystemExit(1)
if not claimed:
    print("  ! no reference proven — the service runs, but this run proved nothing. Re-run before trusting it.")
print("  ✓ every claim on the receipt is backed by something the server actually did")
PY
rm -f "$RECEIPT_FILE"

say "Done"
echo "  service : ${URL}"
echo "  project : ${PROJECT}"
echo "  region  : ${REGION}  ·  vertex: ${FOUND}  ·  model: ${MODEL}"
echo "  identity: ${SA}"
echo
echo "  Update README.md's Live: line and docs/demo-script.md if this URL is the one you will demo."
