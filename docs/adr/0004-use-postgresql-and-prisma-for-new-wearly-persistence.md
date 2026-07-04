# 0004 - Use PostgreSQL And Prisma For New Wearly Persistence

## Status

Accepted

## Context

Wearly needs relational consistency for catalog, variants, inventory movements, sales, sale items, promotions, customers, and reporting.

The handoff targets PostgreSQL and Prisma. The current repository contains inherited Drizzle scaffolding. Mixing persistence tools inside one feature would increase migration risk and blur ownership.

## Decision

Use PostgreSQL as the database and Prisma for new Wearly persistence after the migration path is approved.

Keep persistence code in infrastructure. Repositories implement application or domain ports. Persistence records are not domain entities.

Do not mix Prisma and Drizzle inside the same feature without an explicit migration decision.

## Consequences

- Checkout, sale item creation, inventory movement creation, and stock updates must be transactional.
- Tenant-scoped reads and writes must include `storeId`.
- Database constraints enforce uniqueness and referential integrity.
- Business explanations remain in domain and application errors rather than raw database errors.
- Existing Drizzle infrastructure can remain for legacy code until migrated.

