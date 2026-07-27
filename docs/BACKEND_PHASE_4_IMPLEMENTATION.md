# Backend Phase 4 Implementation Status

## Goal

Deliver the server-authoritative POS and checkout contract defined in `BACKEND_PHASE_4_REQUIREMENTS.md`. The frontend must receive trusted product discovery, checkout quotes, idempotent sale completion, session context, OpenAPI schemas, and deterministic fixtures.

## Status summary

**Implementation is substantially complete.** The required Phase 4 routes, DTOs, persistence migrations, fixtures, application behavior, and LocalStack deployment are present. The phase is **not yet ready to be marked complete** because the PostgreSQL and Lambda/API coverage still needs to cover every required failure workflow.

Verification completed on 2026-07-22:

- `yarn test` passed: 16 files and 78 tests; one PostgreSQL integration suite is skipped unless `RUN_POSTGRES_INTEGRATION=1` is set.
- `yarn typecheck` passed.
- `yarn lint` passed, with an ESLint warning that `.eslintignore` is deprecated.
- `yarn build` passed.
- `RUN_POSTGRES_INTEGRATION=1 ... yarn vitest run DrizzleCheckoutStateRepository.integration.test.ts` passed: quote persistence/date hydration, transaction rollback, concurrent idempotency claim, and failed-key reclamation.
- LocalStack Terraform deployment completed; the deployed API gateway returned `401` for an unauthenticated product request when reached through the LocalStack gateway. The generated API hostname is not locally resolvable, so the repository verification script needs a LocalStack gateway-aware URL.

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

### Quote-backed sale completion — implemented with integration verification pending

- `checkout_quotes` and `sale_idempotency` tables and the `(store_id, idempotency_key)` unique index are included in the Drizzle migration.
- Drizzle repositories exist for checkout quotes and idempotency state, alongside sale and inventory adapters.
- The checkout transaction context wraps database work in a Drizzle transaction.
- Quote completion revalidates and locks product/variant inventory facts, rejects stale quotes and insufficient stock, creates sales and inventory movements, and updates stock in the transaction.
- `POST /api/v1/sales`, `GET /api/v1/sales/idempotency/{key}`, and `GET /api/v1/sales/{id}` are routed and documented.
- The sale endpoint requires `Idempotency-Key`, atomically claims a new or failed key, rejects a pending duplicate request, replays a completed sale for the same request fingerprint, and returns `IDEMPOTENCY_CONFLICT` when the key is reused with different input.
- Cash completion returns `changeAmount` when `tenderedAmount` is supplied.
- Focused application tests cover completion, replay without a second stock reduction, and pending-key rejection.
- Idempotency lookup reloads the stored quote snapshot so a completed response retains item merchandising and promotion attribution.

### Payments and sessions — implemented with operational verification pending

- `CASH`, `CARD`, and `TRANSFER` payload validation exists at the sale endpoint; card and transfer requests require their respective references.
- Terminal and transfer references are carried through quote-backed completion, persisted on the sale, and documented in OpenAPI.
- `GET /api/v1/session` returns the authenticated user, role, selected store, currency, time zone, and active stores from the `user_store_roles` mapping.
- `POST /api/v1/session/store` validates selection against active, database-backed store roles that also match the trusted JWT roles.
- Application tests cover available-store filtering and selection authorization.
- Subsequent authenticated requests may send `X-Wearly-Store-Id`; the API resolves it only to an active database assignment whose role is also present in the trusted JWT, then scopes authorization to that role.

## Remaining work

### Required verification

1. Expand PostgreSQL integration tests to cover quote expiry, stale pricing, idempotency replay/conflict, insufficient stock, and full quote-backed-sale rollback. Concurrent claims and transaction rollback are verified.
2. Add executable Lambda/API contract tests for every Phase 4 route and required success/failure envelope, including the idempotency status endpoint. The OpenAPI/fixture contract test currently verifies all documented routes and error-envelope coverage.
3. Update `verifyLocalstackDeployment.sh` to use the LocalStack gateway URL or host-header routing so it works without a local wildcard-DNS configuration.

### Required behavior decisions or implementation

1. Confirm PostgreSQL-level behavior for simultaneous same-key requests during full sale completion, beyond the repository-level claim verification.

## Completion criteria

Phase 4 can be marked complete when all of the following are true:

- Every endpoint in `BACKEND_PHASE_4_REQUIREMENTS.md` is deployed and verified under `/api/v1`.
- PostgreSQL integration and Lambda/API contract tests cover the required Phase 4 behavior and pass.
- Idempotent sale completion is proven safe for concurrent retries against PostgreSQL.
- Selected-store propagation across subsequent authenticated requests matches the approved Cognito/session strategy.
- The frontend can use the documented DTOs, OpenAPI schemas, and fixtures without calculating commercial values client-side.
