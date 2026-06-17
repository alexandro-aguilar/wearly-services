# Persistence Spec

## Database

Use PostgreSQL.

The handoff target is Prisma. The current repository contains inherited Drizzle scaffolding. Do not mix Prisma and Drizzle inside the same feature without an explicit migration decision.

## Persistence Boundaries

- Keep schema and ORM code in infrastructure.
- Repositories implement application or domain ports.
- Persistence records are not domain entities.
- Application handlers should depend on ports, not database clients.

## Required Transaction Boundaries

Use transactions for:

- Checkout.
- Sale creation.
- Sale item creation.
- Inventory movement creation.
- Stock updates.
- Any future refund flow that affects sale and inventory state together.

## Store Scope

Always include `storeId` in tenant-scoped reads and writes.

Required uniqueness should be scoped by store when business identity is store-local:

- Product variant SKU.
- Product variant barcode when present.
- Future customer contact uniqueness if required by policy.

## Data Integrity

Use database constraints for:

- Primary keys.
- Foreign keys.
- Required fields.
- Uniqueness.
- Valid enum values when represented in the database.

Keep user-facing business explanations in domain/application errors instead of relying only on database error text.

## Initial Persistence Model

Initial tables or Prisma models should support:

- Stores.
- Products.
- Product variants.
- Inventory movements.
- Sales.
- Sale items.
- Promotions.
- Promotion conditions.
- Promotion actions.
- Customers.
- Users or user-store-role mappings if not fully represented by Cognito claims.

## Migration Guidance

When migrating from inherited infrastructure:

- Keep legacy Drizzle code stable unless the task is migration-specific.
- Build new Wearly features in target bounded contexts.
- Prefer Prisma for new Wearly persistence once migration is approved.
- Avoid translating database rows directly into public API responses.

