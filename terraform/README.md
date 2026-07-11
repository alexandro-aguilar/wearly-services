# Wearly Terraform migration stack

This stack restores the documented Lambda/API Gateway deployment workflow and adds Phase 7 Cognito authentication. It is the explicit migration exception recorded in ADR 0009; CDK remains the target for infrastructure outside this scope.

## Deploy locally

Build the Lambda bundles before Terraform packages them:

```bash
yarn build
yarn tf:init:local
yarn tf:apply:local
```

The stack provisions a Cognito user pool, app client, `ADMIN`/`MANAGER`/`CASHIER` groups, one Lambda per endpoint, a JWT-protected HTTP API, and CloudWatch log groups.

All `/api/v1` routes require a Cognito access or ID token. Create users with the `custom:store_id` attribute and assign a role group. Terraform exports the user-pool ID, app-client ID, issuer, JWKS URL, and API URL.

## Checks

```bash
yarn tf:fmt
yarn tf:validate
yarn tf:plan:local
```

LocalStack's Cognito and API Gateway JWT-authorizer support can differ by image edition/version. If its token issuer differs from the default LocalStack issuer, set `cognito_issuer_override` in a local-only tfvars file so API Gateway and Lambda use the exact same issuer.
