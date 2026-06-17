# Wearly Services Specs

These specs turn `Handoff.md` and `AGENTS.md` into implementation guidance for the Wearly Services backend.

`Handoff.md` remains the source of truth for product direction until a fuller product specification exists. These documents should be updated when requirements become clearer or when the architecture migration is explicitly approved.

## Spec Index

- [Product And Scope](./product-and-scope.md)
- [Architecture](./architecture.md)
- [Domain Model](./domain-model.md)
- [API](./api.md)
- [Security And Authorization](./security-and-authorization.md)
- [Persistence](./persistence.md)
- [Testing](./testing.md)
- [Infrastructure And Observability](./infrastructure-and-observability.md)
- [MVP Roadmap](./mvp-roadmap.md)

## Implementation Defaults

- New Wearly features should use the target stack: Node.js 24, TypeScript, Fastify, PostgreSQL, Prisma, Vitest, and AWS CDK.
- Current inherited Lambda, Middy, Drizzle, and Terraform code may remain during migration, but new business logic should use Wearly bounded contexts instead of legacy DnD naming.
- Domain code must remain independent of Fastify, Prisma, Drizzle, AWS, HTTP, environment variables, and framework decorators.
- All tenant-scoped behavior must validate or carry `storeId`.
- Business rules should be specified and tested before implementation when feasible.

