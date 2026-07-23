#!/usr/bin/env bash
set -euo pipefail

readonly LOCALSTACK_HEALTH_URL="${LOCALSTACK_ENDPOINT:-http://localhost:4566}/_localstack/health"

if ! curl --fail --silent --show-error "$LOCALSTACK_HEALTH_URL" >/dev/null; then
  echo "LocalStack is unavailable at $LOCALSTACK_HEALTH_URL. Start it with: yarn localstack" >&2
  exit 1
fi

yarn build
./scripts/terraformWorkspace.sh local apply -input=false -auto-approve

api_url="$(./scripts/terraformWorkspace.sh local output -raw api_invoke_url)"
status_code="$(curl --silent --output /dev/null --write-out '%{http_code}' "${api_url}/api/v1/products")"

if [[ "$status_code" != "401" ]]; then
  echo "Expected unauthenticated GET /api/v1/products to return 401, received $status_code." >&2
  exit 1
fi

echo "LocalStack deployment verified: protected API returned 401 without a bearer token."
