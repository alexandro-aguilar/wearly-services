# Product And Scope Spec

## Product Identity

Wearly Services is the backend API for a modern clothing retail point-of-sale system.

The API serves:

- React web app.
- Future SwiftUI iPad app.
- Future mobile apps.

## Core Capabilities

The backend must support:

- Product catalog and product variants.
- Inventory tracking per product variant.
- Sales checkout.
- Automatic promotion application.
- Customer records.
- Authentication and role-based authorization.
- Daily reporting.
- Multi-store isolation through `storeId`.

## Bounded Contexts

Initial bounded contexts:

- `catalog`
- `inventory`
- `sales`
- `promotions`
- `customers`
- `reporting`
- `auth`
- `shared`

Each bounded context owns its domain language and invariants. Cross-context workflows should use application services, ports, or domain events instead of direct mutation across module boundaries.

## MVP Definition Of Done

The backend MVP is complete when:

- Products and variants can be created.
- Inventory can be adjusted.
- Sales can be completed.
- Stock is reduced after a sale.
- Promotions are applied automatically during checkout.
- Daily sales report works.
- Low stock report works.
- API has tests.
- API has OpenAPI documentation.

## Non-Functional Requirements

- Multi-store ready from day one.
- Stateless services.
- Fast cold starts.
- OpenAPI documentation.
- Mobile-friendly API responses.
- Strong input validation.
- Clear error responses.
- No business logic inside route handlers.

