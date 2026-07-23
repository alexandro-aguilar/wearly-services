#!/usr/bin/env bash
set -euo pipefail

readonly workspace="${1:?Usage: terraformWorkspace.sh <local|dev> <terraform command> [args...]}"
shift
readonly command="${1:?Usage: terraformWorkspace.sh <local|dev> <terraform command> [args...]}"
shift

case "$workspace" in
  local)
    readonly root="terraform/workspaces/local"
    readonly workspace_name="local"
    readonly common_vars="../../environments/local/aws-common.tfvars"
    readonly environment_vars="../../environments/local/environment.tfvars"
    terraform -chdir="$root" init -input=false -reconfigure
    ;;
  dev)
    readonly root="terraform/workspaces/dev"
    readonly workspace_name="dev"
    readonly common_vars="../../environments/dev/aws-common.tfvars"
    readonly environment_vars="../../environments/dev/environment.tfvars"
    : "${TF_STATE_BUCKET:?Set TF_STATE_BUCKET to the already-provisioned S3 state bucket.}"
    terraform -chdir="$root" init -input=false -reconfigure \
      -backend-config="bucket=${TF_STATE_BUCKET}" \
      -backend-config="region=${TF_STATE_REGION:-us-east-1}"
    ;;
  *)
    echo "Unknown workspace '$workspace'. Expected local or dev." >&2
    exit 1
    ;;
esac

if ! terraform -chdir="$root" workspace select "$workspace_name" >/dev/null 2>&1; then
  terraform -chdir="$root" workspace new "$workspace_name" >/dev/null
fi

case "$command" in
  init)
    exit 0
    ;;
  plan|apply|destroy|refresh)
    exec terraform -chdir="$root" "$command" \
      -var-file="$common_vars" \
      -var-file="$environment_vars" \
      "$@"
    ;;
  *)
    exec terraform -chdir="$root" "$command" "$@"
    ;;
esac
