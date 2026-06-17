# MVP Roadmap Spec

## Priority Order

Build MVP features in this order:

1. Catalog.
2. Inventory.
3. Sales checkout.
4. Promotion engine.
5. Customers.
6. Reports.
7. Auth.

Auth is listed last in the handoff priority order, but implementation should still avoid designs that assume a missing `storeId` or unauthenticated access. Temporary development auth should be isolated and easy to replace with Cognito.

## Phase 1: Catalog

Deliver:

- Product create, read, update, deactivate.
- Variant create, read, update.
- SKU and barcode validation.
- Store-scoped catalog reads.
- Domain and application tests.

Acceptance:

- Products and variants can be created.
- Inactive products and variants are handled consistently.
- Variant stock is not mutated through catalog routes.

## Phase 2: Inventory

Deliver:

- Inventory availability reads.
- Manual inventory adjustments.
- Inventory movement history.
- Low stock query support.

Acceptance:

- Inventory can be adjusted.
- Every adjustment creates an audit movement.
- Stock cannot become negative.

## Phase 3: Sales Checkout

Deliver:

- Checkout command.
- Sale and sale item records.
- Server-side total calculation.
- Transactional stock reduction.
- Sale listing and detail.

Acceptance:

- Sales can be completed.
- Stock is reduced after a sale.
- Insufficient stock prevents sale completion.
- Client totals are ignored.

## Phase 4: Promotion Engine

Deliver:

- Promotion create, list, update.
- Active promotion query.
- Deterministic evaluator for supported types.
- Checkout integration.

Acceptance:

- Promotions are applied automatically during checkout.
- Promotion behavior is configurable without code changes.
- Promotion engine has focused unit tests.

## Phase 5: Customers

Deliver:

- Customer create, list, update.
- Customer lookup for checkout.
- Customer association with sales.

Acceptance:

- Customer records can be maintained per store.
- Customer history remains scoped by store.

## Phase 6: Reports

Deliver:

- Daily sales report.
- Best sellers report.
- Low stock report.

Acceptance:

- Daily sales report works.
- Low stock report works.
- Reports are store-scoped and read-only.

## Phase 7: Auth

Deliver:

- Cognito JWT verification.
- Role mapping.
- Store context mapping.
- Role-based authorization policies.

Acceptance:

- Unauthenticated requests fail.
- Unauthorized mutations fail.
- Store isolation is enforced for every endpoint.

