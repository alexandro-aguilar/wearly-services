# 0004 - Use PostgreSQL And Drizzle For Wearly Persistence

## Status

Accepted

## Context

Wearly needs relational consistency for catalog, variants, inventory movements, sales, sale items, promotions, customers, and reporting.

The repository already contains PostgreSQL and Drizzle infrastructure. Standardizing on Drizzle avoids maintaining two ORM toolchains, reduces migration work, and lets new bounded contexts build on the existing database foundation while keeping persistence concerns behind application ports.

## Decision

Use PostgreSQL as the database and Drizzle as the ORM and schema-management toolkit for Wearly persistence.

Keep Drizzle schemas, database clients, migrations, and repository implementations in infrastructure. Repositories implement application or domain ports, and persistence records are not domain entities.

Use a single Drizzle transaction for workflows that span multiple writes or bounded-context adapters, including checkout.

## Consequences

- New Wearly persistence adapters use Drizzle rather than introducing another ORM.
- Checkout, sale item creation, inventory movement creation, and stock updates must be transactional.
- Tenant-scoped reads and writes must include `storeId`.
- Database constraints enforce uniqueness and referential integrity.
- Business explanations remain in domain and application errors rather than raw database errors.
- Existing Drizzle schema and configuration may be evolved incrementally as bounded contexts move from in-memory adapters to PostgreSQL.
- Domain and application layers remain independent of Drizzle through repository and transaction ports.
