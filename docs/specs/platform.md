# Platform Rules Spec

## Product Identity

Wearly Services is the backend API for a modern clothing retail point-of-sale system.

The API serves:

- React web app.
- Future SwiftUI iPad app.
- Future mobile apps.

## Architecture

Use Clean Architecture with dependency flow inward:

```text
presentation -> application -> domain
infrastructure -> application/domain contracts
```

Target source layout:

```text
src/
  catalog/
  inventory/
  sales/
  promotions/
  customers/
  reporting/
  auth/
  shared/
  main.ts
```

Each feature directory should own its `domain`, `application`, `infrastructure`, and `presentation` folders. The current repository contains inherited code under `src/app`; incremental migration is allowed, but new Wearly business behavior should live in the target bounded contexts.

## Layer Rules

Domain code contains business behavior and invariants. It must not depend on Prisma, Drizzle, AWS, HTTP objects, environment variables, or decorators.

Application code coordinates use cases with CQRS. Command and query handlers should depend on interfaces in `application/ports` for repositories, authorization, clocks, transactions, tokens, hashing, and external integrations.

Infrastructure implements application and domain contracts. It may contain Prisma clients, repositories, transaction managers, password hashers, token services, payment adapters, AWS clients, migrations, and seeders.

Presentation adapts HTTP to application commands and queries. It validates input, maps authenticated user and `storeId` context, returns response DTOs, and converts domain/application errors into HTTP responses.

## API Rules

Expose REST endpoints under:

```text
/api/v1
```

Route handlers must not contain business rules, trust client-provided totals or roles, or access persistence directly when an application handler exists.

Recommended error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": []
  }
}
```

Common mappings:

- Validation failure: `400`.
- Missing or invalid credentials: `401`.
- Authenticated but not authorized: `403`.
- Missing resource in store scope: `404`.
- Conflict such as duplicate SKU: `409`.
- Unexpected failure: `500`.

## Persistence Rules

Use PostgreSQL. The handoff target is Prisma, while the current repository contains inherited Drizzle scaffolding.

Rules:

- Keep schema and ORM code in infrastructure.
- Repositories implement application or domain ports.
- Persistence records are not domain entities.
- Do not mix Prisma and Drizzle inside the same feature without an explicit migration decision.
- Always include `storeId` in tenant-scoped reads and writes.
- Use database constraints for primary keys, foreign keys, required fields, uniqueness, and valid enum values.
- Keep user-facing business explanations in domain/application errors.

Use transactions for checkout, sale creation, sale item creation, inventory movement creation, stock updates, and any future refund flow that affects sale and inventory state together.

## Security Rules

Use AWS Cognito JWT Bearer tokens:

```text
Authorization: Bearer <token>
```

Initial roles:

- `ADMIN`
- `MANAGER`
- `CASHIER`

Rules:

- Authenticate at the presentation boundary.
- Authorize in application services or policies before mutating state.
- Scope every store-owned command and query by authenticated `storeId`.
- Never trust client-provided roles, store context, totals, discounts, stock values, or promotion results.
- Keep secrets in environment/configuration, never in source files.
- Resource-not-in-store should be returned as not found unless a more specific security policy is approved.

## Testing Rules

Use Vitest for new Wearly code.

Default to test-first development for business behavior:

1. Write a failing test that states the business rule.
2. Implement the smallest domain/application code needed to pass.
3. Refactor while keeping tests green.
4. Add edge cases for invalid input, permissions, store isolation, and money/quantity calculations.

Testing priorities:

- Domain tests for entities, value objects, policies, promotion calculations, checkout totals, inventory movement rules, money, and quantities.
- Application tests for command/query handlers using fake repositories, deterministic clocks, fake authorization policies, and fake transaction managers.
- Integration tests for persistence adapters, HTTP routes, authentication, authorization, and transactional checkout.
- Regression tests for every bug fix.

## Runtime And Observability

Target runtime:

- Node.js 24.
- TypeScript.

Target AWS services:

- API Gateway.
- Lambda.
- Aurora PostgreSQL Serverless v2.
- Cognito.
- S3 for product images, receipts, and reports.
- CloudWatch Logs.

Infrastructure as code target is AWS CDK with TypeScript. Keep current Terraform and LocalStack scripts working while they remain part of the active workflow.

Use structured logging, AWS Lambda Powertools, metrics, tracing, and request correlation IDs. Logs should include correlation ID, store ID when available, safe authenticated subject identifiers, route or command name, and handled error code. Logs must not include secrets, bearer tokens, payment card data, or sensitive customer data beyond approved operational identifiers.

Track request count, latency, error count by route and code, checkout completion and failure counts, promotion application count, and inventory adjustment count.
