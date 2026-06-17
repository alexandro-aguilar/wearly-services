# Infrastructure And Observability Spec

## Target Runtime

Use:

- Node.js 24.
- TypeScript.
- Fastify.
- Fastify Lambda adapter.

## AWS Infrastructure

Target AWS services:

- API Gateway.
- Lambda.
- Aurora PostgreSQL Serverless v2.
- Cognito.
- S3 for product images, receipts, and reports.
- CloudWatch Logs.

Infrastructure as code target:

- AWS CDK with TypeScript.

The current repository includes Terraform and LocalStack scripts. Keep them working while they are still part of the active workflow, but prefer AWS CDK for new target infrastructure once migration begins.

## Observability

Use:

- Structured logging.
- AWS Lambda Powertools.
- Metrics.
- Tracing.
- Request correlation IDs.

## Logging Requirements

Logs should include:

- Correlation ID.
- Store ID when available.
- Authenticated subject when safe.
- Route or command name.
- Error code for handled failures.

Logs must not include:

- Secrets.
- Bearer tokens.
- Payment card data.
- Sensitive customer data beyond approved operational identifiers.

## Metrics Requirements

Track:

- Request count.
- Request latency.
- Error count by route and code.
- Checkout completion count.
- Checkout failure count.
- Promotion application count.
- Inventory adjustment count.

## Tracing Requirements

Trace:

- API request handling.
- Application command/query execution.
- Repository calls.
- Checkout transaction boundaries.
- External AWS service calls.

