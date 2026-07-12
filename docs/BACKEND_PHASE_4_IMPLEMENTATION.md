# Backend Phase 4 Implementation Plan

## Goal

Deliver the server-authoritative POS and checkout contract defined in `BACKEND_PHASE_4_REQUIREMENTS.md`. The frontend must receive trusted product discovery, checkout quotes, idempotent sale completion, session context, OpenAPI schemas, and deterministic fixtures.

## Current baseline

Implemented foundations:

- Cognito JWT verification and trusted `AuthenticatedPrincipal` mapping.
- Store-scoped catalog, inventory, promotion, customer, and sales domain/application behavior.
- In-memory checkout transaction orchestration and promotion evaluation.
- Initial Wearly Drizzle schema and migration.

Missing Phase 4 capabilities:

- Product discovery DTOs, full-text-like lookup, and pagination.
- Checkout quotes, quote expiry, and stale-pricing detection.
- Manual-discount authorization and audit data.
- Idempotency records, idempotency lookup, and replay behavior.
- Drizzle repository adapters and a PostgreSQL checkout transaction.
- Payment settlement fields, cash change, session endpoints, OpenAPI, and fixtures.

## Delivery order

### 1. Error and contract foundation

1. Add `STALE_PRICING`, `INSUFFICIENT_STOCK`, and `IDEMPOTENCY_CONFLICT` to the stable platform error model and HTTP mapping.
2. Define explicit application DTOs for product discovery, quote, sale completion, idempotency status, and session context.
3. Add OpenAPI schemas under `docs/openapi/` and deterministic JSON fixtures under `docs/fixtures/phase-4/`.
4. Add HTTP contract tests that validate the success and failure envelopes required by Phase 4.

### 2. Product discovery

1. Extend catalog query ports with `q`, `categoryId`, `page`, and `pageSize`.
2. Add a checkout-oriented variant read projection that joins product name with variant price and stock.
3. Derive `stockStatus` server-side:
   - `UNAVAILABLE`: inactive variant or inactive product.
   - `OUT_OF_STOCK`: stock is zero.
   - `LOW_STOCK`: stock is positive and at/below minimum stock.
   - `IN_STOCK`: otherwise.
4. Add `GET /api/v1/products` and `GET /api/v1/variants` response DTO mapping; do not expose persistence records or raw domain snapshots.
5. Add Drizzle read repositories with `storeId` predicates and deterministic pagination.

### 3. Checkout quote

1. Create the sales quote domain model and application ports:
   - `CheckoutQuoteRepository`
   - `CheckoutPricingService`
   - deterministic clock and ID generator
2. Add quote persistence with: quote ID, store ID, subject ID, items, trusted price facts, promotion facts, manual-discount data, totals, currency, expiry, and invalidation/version data.
3. Implement `POST /api/v1/checkout/quote`:
   - authenticate principal and use its `storeId` only;
   - aggregate quantities;
   - load active variants and current stock;
   - evaluate promotions deterministically;
   - authorize manual discounts for `ADMIN` and `MANAGER` only;
   - calculate totals and return the Phase 4 quote DTO;
   - set expiry to five minutes.
4. Add tests for promotions, invalid quantity, inactive/out-of-stock variants, store isolation, and unauthorized manual discounts.

### 4. Idempotent transactional sale completion

1. Add `checkout_quotes` and `sale_idempotency` tables/migration, including unique `(store_id, idempotency_key)` and request fingerprint fields.
2. Add Drizzle repositories for catalog reads, sale writes, inventory movements, quote state, and idempotency state.
3. Implement a Drizzle transaction manager that atomically:
   - locks/revalidates quote facts and inventory stock;
   - rejects expired or changed facts with `STALE_PRICING`;
   - rejects insufficient stock with `INSUFFICIENT_STOCK`;
   - writes sale, sale items, and inventory movements;
   - updates stock;
   - marks the idempotency record complete.
4. Implement `POST /api/v1/sales` with required `Idempotency-Key`:
   - accepts `quoteId`, payment method, and settlement payload;
   - replays the completed sale for the same key and fingerprint;
   - returns `IDEMPOTENCY_CONFLICT` for a key reused with different input;
   - calculates `changeAmount` for cash.
5. Implement `GET /api/v1/sales/idempotency/:key` and return `PENDING`, `COMPLETED`, or `FAILED`, including the completed sale where available.
6. Expand `GET /api/v1/sales/:id` to return the documented Phase 4 sale DTO.

### 5. Payments and sessions

1. Define explicit payment payload rules:
   - `CASH`: optional tendered amount, server-calculated change.
   - `CARD`: terminal transaction reference required before enablement.
   - `TRANSFER`: transfer reference required before enablement.
2. Add payment reference fields to the sale schema only after the DTO is approved.
3. Implement `GET /api/v1/session` from the authenticated principal and store-role mapping.
4. Implement `POST /api/v1/session/store`, validating that the caller has an active role in the requested store and issuing/selecting the trusted store context according to the Cognito/session strategy.

### 6. Frontend handoff and verification

1. Publish OpenAPI and fixture artifacts consumed by Wearly Web MSW tests.
2. Add integration tests using PostgreSQL for quote expiry, stale pricing, idempotency replay/conflict, and transaction rollback.
3. Add Lambda/API tests for all Phase 4 endpoint contracts and error envelopes.
4. Run `yarn test`, `yarn typecheck`, `yarn lint`, `yarn build`, and the LocalStack Terraform verification.

## Completion criteria

- Every endpoint in `BACKEND_PHASE_4_REQUIREMENTS.md` is deployed under `/api/v1`.
- The frontend can use the documented DTOs without calculating commercial values client-side.
- Sales are quote-backed, idempotent, store-scoped, and transactionally persisted.
- OpenAPI schemas and fixtures are available for frontend development and MSW tests.
