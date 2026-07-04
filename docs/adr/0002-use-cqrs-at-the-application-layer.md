# 0002 - Use CQRS At The Application Layer

## Status

Accepted

## Context

Wearly has workflows that mutate state, such as checkout and inventory adjustment, and read workflows that need projections, such as daily sales, best sellers, low stock, and product listings.

Mixing read and write concerns in route handlers would make authorization, store isolation, and business rule testing harder.

## Decision

Use CQRS at the application layer.

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

## Consequences

- Command handlers return minimal results such as IDs, statuses, or application DTOs.
- Query handlers do not mutate state.
- Route handlers do not receive or pass HTTP objects into application handlers.
- Commands load aggregates through repository ports and call domain behavior.
- Queries may use optimized read repositories or projections when useful.
- Cross-context workflows are coordinated by application services or domain events.

