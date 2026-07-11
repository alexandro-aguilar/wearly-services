# Wearly Services Specs

These specs turn `Handoff.md` and `AGENTS.md` into implementation guidance for the Wearly Services backend.

`Handoff.md` remains the source of truth for product direction until a fuller product specification exists. The specs are organized by business capability so the documentation structure matches the architecture the code should grow into.

## Spec Index

- [Platform Rules](./platform.md)
- [Catalog](./catalog.md)
- [Inventory](./inventory.md)
- [Sales Checkout](./sales-checkout.md)
- [Promotions](./promotions.md)
- [Customers](./customers.md)
- [Reporting](./reporting.md)
- [Auth](./auth.md)
- [MVP Roadmap](./mvp-roadmap.md)

## Scream Architecture Rule

Feature specs own the behavior for their bounded context. Each feature spec should describe:

- Business purpose.
- Domain language and invariants.
- Commands and queries.
- REST API under `/api/v1`.
- Persistence ownership.
- Authorization and store isolation.
- Test scenarios.

Cross-cutting implementation rules belong in [Platform Rules](./platform.md). Do not create new broad specs organized only by technical layer, such as a standalone API spec or standalone domain-model spec, unless the topic is genuinely shared across every feature.

## Implementation Defaults

- New Wearly features should use the target stack: Node.js 24, TypeScript, PostgreSQL, Prisma, Vitest, and AWS CDK.
- Current inherited Lambda, Middy, Drizzle, and Terraform code may remain during migration, but new business logic should use Wearly bounded contexts instead of legacy project naming.
- Domain code must remain independent of Prisma, Drizzle, AWS, HTTP, environment variables, and framework decorators.
- All tenant-scoped behavior must validate or carry `storeId`.
- Business rules should be specified and tested before implementation when feasible.
