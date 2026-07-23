# Backend Phase 4 Implementation Status

## Goal

Deliver the server-authoritative POS and checkout contract defined in `BACKEND_PHASE_4_REQUIREMENTS.md`. The frontend must receive trusted product discovery, checkout quotes, idempotent sale completion, session context, OpenAPI schemas, and deterministic fixtures.

## Status summary

**Implementation is substantially complete.** The required Phase 4 routes, DTOs, persistence migration, fixtures, and baseline application behavior are present. The phase is **not yet ready to be marked complete** because database integration, Lambda/API contract coverage, idempotency-concurrency behavior, payment-reference persistence, session-store selection, and deployment verification remain outstanding.

Verification completed on 2026-07-22:

- `yarn test` passed: 13 files and 68 tests.
- `yarn typecheck` passed.
- `yarn lint` passed, with an ESLint warning that `.eslintignore` is deprecated.
- `yarn build` passed.

## Implemented capabilities

### Error and contract foundation — implemented

- Stable `STALE_PRICING`, `INSUFFICIENT_STOCK`, and `IDEMPOTENCY_CONFLICT` platform errors and HTTP mappings are implemented.
- Explicit DTOs exist for product discovery, checkout quotes, completed sales, idempotency status, and session context.
- Phase 4 OpenAPI is published at `docs/openapi/phase-4.openapi.json`.
- Deterministic fixtures are published under `docs/fixtures/phase-4/`.
- Contract-artifact tests validate the documented error envelope and fixture set.

### Product discovery — implemented

- `GET /api/v1/products` and `GET /api/v1/variants` are routed in Terraform and documented in OpenAPI.
- Product and variant discovery support store-scoped filtering, lookup, and deterministic pagination.
- Variant projections expose trusted merchandising and inventory facts, including server-derived `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, and `UNAVAILABLE` statuses.
- Unit tests cover store scoping, pagination, lookup, and stock-status derivation.

### Checkout quotes — implemented

- The sales quote model, repository port, pricing service, clock, and ID generator are implemented.
- `POST /api/v1/checkout/quote` derives the store and actor from the authenticated principal, aggregates quantities, loads trusted catalog and inventory facts, evaluates promotions, and returns a five-minute quote.
- Manual discounts are authorized for `ADMIN` and `MANAGER` roles only.
- Quote persistence stores the quote snapshot, owner, store, and expiry.
- Unit tests cover trusted totals and promotion attribution, invalid quantities, unavailable stock, and unauthorized manual discounts.

### Quote-backed sale completion — implemented with verification gaps

- `checkout_quotes` and `sale_idempotency` tables and the `(store_id, idempotency_key)` unique index are included in the Drizzle migration.
- Drizzle repositories exist for checkout quotes and idempotency state, alongside sale and inventory adapters.
- The checkout transaction context wraps database work in a Drizzle transaction.
- Quote completion revalidates and locks product/variant inventory facts, rejects stale quotes and insufficient stock, creates sales and inventory movements, and updates stock in the transaction.
- `POST /api/v1/sales`, `GET /api/v1/sales/idempotency/{key}`, and `GET /api/v1/sales/{id}` are routed and documented.
- The sale endpoint requires `Idempotency-Key`, replays a completed sale for the same request fingerprint, and returns `IDEMPOTENCY_CONFLICT` when the key is reused with different input.
- Cash completion returns `changeAmount` when `tenderedAmount` is supplied.

### Payments and sessions — partially implemented

- `CASH`, `CARD`, and `TRANSFER` payload validation exists at the sale endpoint; card and transfer requests require their respective references.
- `GET /api/v1/session` returns the authenticated user, role, selected store, currency, time zone, and available-store shape.
- `POST /api/v1/session/store` validates the requested store against the principal's current store context.

## Remaining work

### Required verification

1. Add PostgreSQL integration tests for quote expiry, stale pricing, idempotency replay/conflict, insufficient stock, and full transaction rollback.
2. Add focused tests for quote-backed sale completion, including the idempotency status endpoint.
3. Add Lambda/API contract tests for every Phase 4 route and required success/failure envelope.
4. Run the LocalStack Terraform deployment and verification workflow; deployment has not been verified in this status update.

### Required behavior decisions or implementation

1. Make concurrent same-key idempotency handling explicit and test it. The current unique record prevents duplicate keys, but concurrent completion behavior has not been proven serialized.
2. Persist card terminal and transfer references, and expose them through the approved sale DTO if required by the payment contract. The current endpoint validates these values but the completion command and sale persistence model do not retain them.
3. Implement genuine multi-store session selection. The current session endpoints derive a single store from the JWT principal and cannot select from independently validated active store roles.
4. Confirm the idempotency lookup response preserves all completed-sale presentation details required by the frontend, including item merchandising and promotion attribution.

## Completion criteria

Phase 4 can be marked complete when all of the following are true:

- Every endpoint in `BACKEND_PHASE_4_REQUIREMENTS.md` is deployed and verified under `/api/v1`.
- PostgreSQL integration and Lambda/API contract tests cover the required Phase 4 behavior and pass.
- Idempotent sale completion is proven safe for concurrent retries.
- Payment references and multi-store session behavior match the approved frontend contract.
- The frontend can use the documented DTOs, OpenAPI schemas, and fixtures without calculating commercial values client-side.
