# 0001 - Use Clean Architecture With Bounded Contexts

## Status

Accepted

## Context

Wearly Services is the backend for a clothing retail POS. The system must support catalog, inventory, checkout, promotions, customers, reporting, auth, and multi-store isolation.

The repository currently contains inherited serverless infrastructure and some legacy project naming. New Wearly business logic needs a structure that protects the POS domain from framework, database, and infrastructure churn.

## Decision

Use Clean Architecture with dependency flow inward:

```text
presentation -> application -> domain
infrastructure -> application/domain contracts
```

Organize new Wearly code by bounded context:

- `catalog`
- `inventory`
- `sales`
- `promotions`
- `customers`
- `reporting`
- `auth`
- `shared`

Domain code must not depend on Fastify, Prisma, Drizzle, AWS, HTTP, environment variables, or framework decorators.

## Consequences

- Business rules live in domain entities, value objects, policies, and domain services.
- Application handlers orchestrate use cases through ports.
- Infrastructure implements ports for persistence, transactions, hashing, tokens, AWS clients, and adapters.
- Presentation handlers stay thin and translate HTTP requests into commands and queries.
- New Wearly code should not be spread through legacy `core` modules.
