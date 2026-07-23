# Wearly Terraform migration stack

This stack restores the documented Lambda/API Gateway deployment workflow and adds Phase 7 Cognito authentication. It is the explicit migration exception recorded in ADR 0009; CDK remains the target for infrastructure outside this scope.

## State backends and workspaces

Terraform state is isolated through two environment roots and matching Terraform workspaces:

- `local` stores state on the developer's filesystem at `terraform/workspaces/local/terraform.tfstate.d/local/terraform.tfstate`.
- `dev` stores state in the already-provisioned S3 bucket at `s3://$TF_STATE_BUCKET/workspaces/dev/wearly-services.tfstate`. S3 server-side encryption and Terraform's S3 lockfile are enabled.

The dev bucket name is deliberately not committed. Authenticate to AWS through the standard AWS credential chain, then export the bucket and (when different from `us-east-1`) its region:

```bash
export TF_STATE_BUCKET="your-existing-terraform-state-bucket"
export TF_STATE_REGION="us-east-1"
```

The workspace command initializes the appropriate backend and selects or creates its matching workspace. Do not run `terraform workspace select` directly from `terraform/`; use the package scripts below.

## Deploy locally

Build the Lambda bundles before Terraform packages them:

```bash
yarn build
yarn tf:apply:local
```

On macOS using Colima, start its Docker daemon first:

```bash
colima start
docker ps
```

The stack provisions a Cognito user pool, app client, `ADMIN`/`MANAGER`/`CASHIER` groups, one Lambda per endpoint, a JWT-protected HTTP API, and CloudWatch log groups.

All `/api/v1` routes require a Cognito access or ID token. Create users with the `custom:store_id` attribute and assign a role group. Terraform exports the user-pool ID, app-client ID, issuer, JWKS URL, and API URL.

## Checks

```bash
yarn tf:fmt
yarn tf:plan:local
TF_STATE_BUCKET=your-existing-terraform-state-bucket yarn tf:plan:dev
```

## LocalStack deployment verification

Run the executable smoke check after LocalStack is running. It builds the handlers, applies the local Terraform environment, and verifies that a protected route rejects a request without a bearer token.

```bash
yarn verify:localstack
```

LocalStack's Cognito and API Gateway JWT-authorizer support can differ by image edition/version. If its token issuer differs from the default LocalStack issuer, set `cognito_issuer_override` in a local-only tfvars file so API Gateway and Lambda use the exact same issuer.
