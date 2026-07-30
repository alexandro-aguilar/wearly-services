# Promotions Frontend Integration Guide

This document describes the currently implemented promotion API under `/api/v1`.
It is intentionally implementation-accurate: it records known contract gaps so
clients do not depend on behavior the service does not provide yet.

The consolidated machine-readable contract is
[`openapi/openapi.json`](./openapi/openapi.json). The promotion-focused
supplement is [`openapi/promotions.openapi.json`](./openapi/promotions.openapi.json).

## Authentication and tenant scope

Every request requires `Authorization: Bearer <token>`. The service derives the
store from the authenticated principal; clients must not send `storeId` in a
create or update request. A resource in another store is reported as `404`.

Success objects use the shared envelope:

```json
{ "body": { "...": "endpoint payload" } }
```

Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": []
  }
}
```

## Endpoints

### `GET /api/v1/promotions`

The response is a non-paginated list, ordered by `priority` descending and then
by ID ascending:

```json
{
  "body": {
    "promotions": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "storeId": "00000000-0000-4000-8000-000000000001",
        "name": "20% off jackets",
        "description": "Weekend outerwear offer",
        "type": "PERCENTAGE_DISCOUNT",
        "conditions": [{ "field": "category", "operator": "EQUALS", "value": "outerwear" }],
        "actions": [{ "type": "PERCENTAGE_DISCOUNT", "value": 20 }],
        "startsAt": "2026-08-01T00:00:00.000Z",
        "endsAt": "2026-08-31T23:59:59.999Z",
        "priority": 10,
        "active": true
      }
    ]
  }
}
```

`ADMIN` and `MANAGER` can retrieve the full list. The route declares an optional
`active` query parameter intended to return only effective promotions and to be
available to `CASHIER`. There is a current implementation bug: `?active=true`
falls through to the full-list handler and consequently returns `403` to a
cashier. Do not use it for cashier promotion discovery until it is fixed.

The list does not provide pagination, `endingSoon`, display labels for selectors,
or action/permission metadata. The frontend must derive `endingSoon` from
`endsAt` if required.

### `POST /api/v1/promotions`

Create requests require `name`, `type`, `conditions`, exactly one `action`, and
an integer `priority`. `active` defaults to `true`.

```json
{
  "name": "Two shirts for 499",
  "type": "FIXED_COMBO",
  "conditions": [
    { "field": "category", "operator": "EQUALS", "value": "tops" },
    { "field": "quantity", "operator": "GREATER_THAN_OR_EQUAL", "value": 2 }
  ],
  "actions": [{ "type": "SET_FIXED_PRICE", "value": 499 }],
  "priority": 20,
  "active": true
}
```

The implemented response is `200`, not `201`:

```json
{ "body": { "id": "11111111-1111-4111-8111-111111111111" } }
```

### `PATCH /api/v1/promotions/{id}`

The request must contain at least one mutable property. Omitted properties remain
unchanged. `startsAt: null` and `endsAt: null` clear dates; `description: ""`
clears the description. Activating or deactivating is a PATCH of `active`.

```json
{
  "active": false,
  "startsAt": null,
  "endsAt": null
}
```

`ADMIN` and `MANAGER` can create, edit, activate, and deactivate. `CASHIER` can
not manage promotions.

The current implementation has **no stable successful PATCH response**: it
resolves `void` and does not explicitly send a `200` body or `204`. Refresh with
`GET` after a successful transport invocation; do not assume a response body.

## Rule model

Selectors are raw strings and are not referentially validated on promotion
create/update:

- `productId` is a product UUID.
- `variantId` is a product-variant UUID.
- `category` is the catalog `categoryId` string.
- `brand` is the catalog `brandId` string.

They are matched literally against checkout cart data. Use `EQUALS` with one
non-empty string or `IN` with a non-empty array of strings. `quantity` is the
only numeric condition: it must use `GREATER_THAN_OR_EQUAL` and a positive
integer.

| Promotion type        | Required conditions                                      | Required action                           | Limits and behavior                                                                                                                                    |
| --------------------- | -------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FIXED_COMBO`         | At least one selector and a quantity condition           | `SET_FIXED_PRICE`                         | Fixed price is non-negative.                                                                                                                           |
| `MIXED_COMBO`         | At least two selector conditions                         | `SET_FIXED_PRICE`                         | A quantity condition is accepted but ignored by mixed-combo evaluation.                                                                                |
| `PERCENTAGE_DISCOUNT` | At least one valid condition                             | `PERCENTAGE_DISCOUNT` or `FIXED_DISCOUNT` | Percentage is `0..100`; fixed discount is non-negative. A quantity-only rule is accepted and acts globally after its threshold.                        |
| `BUY_X_GET_Y`         | A quantity condition; a selector is technically optional | `CHEAPEST_ITEM_DISCOUNT`                  | Percentage is `0..100`. The implementation has a fixed reward count of one: a quantity of 3 requires four eligible units to discount the cheapest one. |

The HTTP boundary requires at least one condition and exactly one action for all
types. The domain performs compatibility validation after partial update fields
are merged with the existing promotion.

## Scheduling, priority, and stacking

- `priority` is any integer; no business range is currently imposed.
- Higher priorities evaluate first; equal priorities sort by promotion ID.
- Promotions stack. There is no exclusivity or "stop after first" setting.
- A later promotion applies only to item value remaining after prior discounts.
- `startsAt` and `endsAt` are optional and inclusive (`startsAt <= now <= endsAt`).
- `startsAt` after `endsAt` is invalid.
- PostgreSQL stores timestamps with time zone and JSON responses serialize dates
  in UTC. Send an ISO 8601 timestamp with an explicit offset, preferably UTC
  (for example `2026-08-01T00:00:00.000Z`). Timezone-less date-times should not
  be sent because JavaScript parsing is runtime-timezone dependent.

## Error mapping

| Status | Code               | When to use it in the UI                                                            |
| ------ | ------------------ | ----------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Invalid body, selector/action compatibility, quantity, dates, or percentage bounds. |
| 401    | `UNAUTHENTICATED`  | Missing or invalid bearer token.                                                    |
| 403    | `FORBIDDEN`        | A cashier manages promotions, or currently requests `?active=true`.                 |
| 404    | `NOT_FOUND`        | The promotion does not exist in the selected store.                                 |
| 409    | `CONFLICT`         | Not currently emitted by promotion routes.                                          |

`details` is currently always an empty array for these routes. The validation
message may include a Joi path for HTTP validation, but domain validation only
provides a rule-level message. Map these to form-level errors rather than relying
on a stable field path. There is no duplicate-name, schedule-overlap, or other
promotion conflict rule at present.

## Deterministic fixtures

### Validation error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Fixed combos require a selector, quantity, and fixed-price action.",
    "details": []
  }
}
```

### Forbidden access

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not allowed to perform this action.",
    "details": []
  }
}
```

### Conflict

No deterministic promotion conflict fixture exists because the current promotion
implementation does not emit `CONFLICT` or any other `409` response.
