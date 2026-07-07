# 0009 - Use AWS CDK For Target Infrastructure

## Status

Accepted

## Context

The target infrastructure includes API Gateway, Lambda, Aurora PostgreSQL Serverless v2, Cognito, S3, and CloudWatch Logs.

The handoff specifies AWS CDK with TypeScript. The current repository includes Terraform and LocalStack scripts from inherited infrastructure.

## Decision

Use AWS CDK with TypeScript for target Wearly infrastructure.

Keep existing Terraform and LocalStack workflows operational while they are still needed for inherited code or migration work.

## Consequences

- New target infrastructure should be modeled in CDK.
- Infrastructure code can share TypeScript conventions with the application.
- Terraform should not be expanded for new Wearly target infrastructure unless a migration decision changes this ADR.
- Migration work must account for existing scripts and deployment workflows.
