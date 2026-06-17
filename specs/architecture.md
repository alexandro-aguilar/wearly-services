# Architecture Spec

## Target Architecture

Use Clean Architecture with dependency flow inward:

```text
presentation -> application -> domain
infrastructure -> application/domain contracts
```

## Layer Responsibilities

### Domain

Domain code contains business behavior and invariants.

Domain code must not depend on:

- Fastify.
- Prisma or Drizzle.
- AWS SDKs or Lambda types.
- HTTP request or response objects.
- Environment variables.
- Framework decorators.

Domain objects should use Wearly business language, including `Product`, `ProductVariant`, `Sale`, `SaleItem`, `InventoryMovement`, `Promotion`, `PromotionCondition`, `PromotionAction`, `Customer`, `Store`, and `Role`.

### Application

Application code coordinates use cases with CQRS.

Commands mutate state and express intent. Examples:

- `CreateProductCommand`
- `UpdateVariantStockCommand`
- `CompleteSaleCommand`
- `CreatePromotionCommand`
- `CancelSaleCommand`

Queries read state and return projections. Examples:

- `GetProductByIdQuery`
- `ListProductsQuery`
- `GetCheckoutSummaryQuery`
- `GetDailySalesReportQuery`
- `ListActivePromotionsQuery`

Application handlers:

- Must not receive HTTP request objects.
- Must not receive database clients directly.
- Should depend on repository, clock, transaction, authorization, token, and hashing ports.
- Should return stable DTOs or minimal command results.

### Infrastructure

Infrastructure implements application and domain contracts.

Infrastructure may contain:

- Prisma clients and repositories.
- Transaction managers.
- Password hashers.
- Token services.
- Payment adapters.
- AWS clients.
- Database migrations and seeders.

Do not mix Prisma and Drizzle inside one feature without an explicit migration decision.

### Presentation

Presentation adapts HTTP to application commands and queries.

Presentation handlers should:

- Validate and parse input at the boundary.
- Map authenticated user and `storeId` context into commands and queries.
- Return stable response DTOs.
- Convert domain and application errors into appropriate HTTP responses.
- Keep business logic out of route handlers.

## Target Source Layout

```text
src/
  catalog/
    domain/
    application/
    infrastructure/
    presentation/
  inventory/
    domain/
    application/
    infrastructure/
    presentation/
  sales/
    domain/
    application/
    infrastructure/
    presentation/
  promotions/
    domain/
    application/
    infrastructure/
    presentation/
  customers/
    domain/
    application/
    infrastructure/
    presentation/
  reporting/
    domain/
    application/
    infrastructure/
    presentation/
  auth/
    domain/
    application/
    infrastructure/
    presentation/
  shared/
  main.ts
```

The current repository contains inherited code under `src/app`. Incremental migration is allowed, but new Wearly modules should follow the target context names and avoid adding business logic to `core`.

## Cross-Context Workflows

Checkout is the main cross-context workflow:

1. Sales receives the checkout command.
2. Catalog validates variants are active and belong to the store.
3. Promotions evaluates applicable discounts deterministically.
4. Sales calculates authoritative totals.
5. Inventory records movements and updates stock within a transaction.
6. Sales records the completed sale and sale items.
7. Reporting reads sale and inventory projections.

Use domain events when useful:

- `SaleCompleted`
- `InventoryAdjusted`
- `PromotionApplied`

