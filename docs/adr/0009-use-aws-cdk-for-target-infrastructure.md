# 0009 - Use AWS CDK For Target Infrastructure

## Status

Accepted

## Context

The target infrastructure includes API Gateway, Lambda, Aurora PostgreSQL Serverless v2, Cognito, S3, and CloudWatch Logs.

The handoff specifies AWS CDK with TypeScript. The current repository includes Terraform and LocalStack scripts from inherited infrastructure.

## Decision

Use AWS CDK with TypeScript for target Wearly infrastructure.

Keep existing Terraform and LocalStack workflows operational while they are still needed for inherited code or migration work.

### Phase 7 exception

Terraform is approved for the Phase 7 authentication migration. The repository's documented Terraform workflow exists but its stack was missing; restoring it is necessary to provision Cognito, protect the inherited Lambda API, and keep LocalStack development operational. This exception is limited to the current Lambda/API Gateway deployment surface. New infrastructure outside this migration remains subject to the CDK decision.

## Consequences

- New target infrastructure should be modeled in CDK.
- Infrastructure code can share TypeScript conventions with the application.
- Terraform is permitted for the Phase 7 Cognito and inherited Lambda/API Gateway migration described above.
- Terraform should not be expanded beyond that migration unless a later decision changes this ADR.
- Migration work must account for existing scripts and deployment workflows.
