# Backend Requirements: Phase 4 POS and Checkout

## Purpose

Implement the Wearly Services capabilities required for Wearly Web Phase 4:
server-authoritative cart pricing and safe, idempotent sale completion. The web
client must never calculate prices, taxes, promotions, or stock availability.

## Required endpoints

### Product discovery

```text
GET /api/v1/products?q=&categoryId=&page=&pageSize=
GET /api/v1/variants?q=&barcode=&productId=&page=&pageSize=
```

Support name, SKU, and barcode lookup. Each sellable variant response needs:

```json
{
  "id": "variant_1",
  "productId": "product_1",
  "productName": "Linen shirt",
  "sku": "SHIRT-LINEN-M",
  "barcode": "1234567890123",
  "price": "499.00",
  "stock": 8,
  "stockStatus": "IN_STOCK",
  "active": true
}
```

`stockStatus` is one of `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, or
`UNAVAILABLE`. The service is authoritative for sellability.

### Authoritative checkout quote

```text
POST /api/v1/checkout/quote
```

Request:

```json
{
  "items": [{ "variantId": "variant_1", "quantity": 2 }],
  "manualDiscount": { "amount": "50.00", "reason": "Manager approval" }
}
```

`manualDiscount` is optional and permitted only for `ADMIN` and `MANAGER`.
Validate all quantities, item ownership, active status, stock, and discount
policy server-side.

Response:

```json
{
  "quoteId": "quote_1",
  "expiresAt": "2026-07-11T20:00:00.000Z",
  "currency": "MXN",
  "items": [
    {
      "variantId": "variant_1",
      "productName": "Linen shirt",
      "sku": "SHIRT-LINEN-M",
      "quantity": 2,
      "unitPrice": "499.00",
      "discount": "50.00",
      "total": "948.00"
    }
  ],
  "appliedPromotions": [{ "id": "promotion_1", "name": "Two shirts", "discount": "50.00" }],
  "subtotal": "998.00",
  "discount": "50.00",
  "tax": "0.00",
  "total": "948.00"
}
```

Quotes expire after five minutes and become invalid if price, promotion, or
stock facts change. Return `409 STALE_PRICING` when a quote cannot be used.

### Complete sale

```text
POST /api/v1/sales
GET  /api/v1/sales/idempotency/:key
GET  /api/v1/sales/:id
```

`POST /sales` requires `Idempotency-Key: <uuid>` and this body:

```json
{
  "quoteId": "quote_1",
  "paymentMethod": "CASH",
  "tenderedAmount": "1000.00"
}
```

Payment methods are `CASH`, `CARD`, and `TRANSFER`. Define and document the
card-terminal and transfer-reference payloads before enabling those methods in
the web app. Cash returns `changeAmount` when tendered value is supplied.

The sale response must include its ID, timestamp, store, line items, applied
promotions, payment method, subtotal, discount, tax, total, and change amount.
Replaying the same key returns the original successful sale. The idempotency
lookup endpoint returns pending, completed, or failed status and the completed
sale when available.

## Required guarantees

- Derive `storeId`, role, and user identity from the authenticated principal.
- Ignore client-provided prices, totals, tax, discounts, promotion outcomes, and
  stock values.
- Recalculate all commercial values from the quote and current trusted data.
- Complete sale, sale items, stock update, and inventory movement in one
  database transaction.
- Reject insufficient stock without partial writes.
- Apply promotions deterministically and return their attribution.
- Scope every read and write by `storeId`.
- Return the standard error envelope and stable codes: `VALIDATION_ERROR`,
  `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `STALE_PRICING`,
  `INSUFFICIENT_STOCK`, and `IDEMPOTENCY_CONFLICT`.

## Authentication prerequisites

- Cognito JWT validation and trusted role/store mapping.
- `GET /api/v1/session` returning user, role, selected store, currency, time
  zone, and available stores.
- `POST /api/v1/session/store` validating store access and changing context.

## Contract fixtures and tests

Provide OpenAPI schemas and deterministic fixtures for:

1. Successful product search and exact barcode lookup.
2. Successful quote with and without promotions.
3. Invalid quantity, inactive variant, out-of-stock item, and unauthorized
   manual discount.
4. Successful cash sale and idempotency replay.
5. Stale quote, insufficient stock, validation failure, and unknown/timeout
   outcome resolved through idempotency lookup.
6. Store-isolation and RBAC failures.

Backend tests must cover server-side totals, promotion application, transaction
rollback, inventory movement creation, idempotency, and store isolation.

## Definition of done

- All endpoints are implemented under `/api/v1` with documented DTOs.
- The endpoint behavior matches `docs/specs/api-v1-contract.md` in WearlyWeb.
- OpenAPI/fixture artifacts are shared with Wearly Web for MSW tests.
- Tests, typecheck, lint, and build pass in WearlyServices.
