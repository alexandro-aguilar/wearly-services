# API Spec

## Style

Expose a REST API under:

```text
/api/v1
```

Responses should be stable and friendly to web, iPad, and future mobile clients.

## Presentation Rules

Route handlers should:

- Authenticate at the boundary.
- Validate and parse request input.
- Map authenticated user, role, and `storeId` context into commands and queries.
- Call application handlers.
- Return response DTOs.
- Convert domain and application errors into HTTP errors.

Route handlers must not:

- Contain business rules.
- Trust client-provided totals, discounts, roles, or stock values.
- Access persistence directly when an application handler exists.

## Initial Endpoints

### Catalog Products

```text
GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PATCH  /api/v1/products/:id
DELETE /api/v1/products/:id
```

Expected behavior:

- List and detail endpoints return only products in the caller's store.
- Create and update validate required fields and category/brand references.
- Delete should deactivate the product unless hard deletion is explicitly approved.

### Product Variants

```text
GET   /api/v1/variants
POST  /api/v1/variants
PATCH /api/v1/variants/:id
```

Expected behavior:

- Variant list supports filtering by product, SKU, barcode, active state, and low stock status.
- Variant create validates SKU uniqueness within the store.
- Variant stock is not adjusted directly from catalog routes.

### Inventory

```text
GET  /api/v1/inventory
POST /api/v1/inventory/adjustments
GET  /api/v1/inventory/movements
```

Expected behavior:

- Inventory reads are scoped by store.
- Adjustments create inventory movements.
- Movements are append-only audit records.

### Sales

```text
POST /api/v1/sales
GET  /api/v1/sales
GET  /api/v1/sales/:id
```

Expected behavior:

- `POST /sales` completes checkout.
- Sale creation recalculates prices, promotions, tax, totals, and stock server-side.
- Sale creation writes sale, sale items, inventory movements, and stock updates in one transaction.
- Sale reads are scoped by store.

### Promotions

```text
GET   /api/v1/promotions
POST  /api/v1/promotions
PATCH /api/v1/promotions/:id
```

Expected behavior:

- Promotions are configurable data, not code branches.
- Active promotion listing respects `storeId`, dates, and active state.
- Create and update validate condition and action compatibility for the promotion type.

### Customers

```text
GET   /api/v1/customers
POST  /api/v1/customers
PATCH /api/v1/customers/:id
```

Expected behavior:

- Customer reads and writes are scoped by store.
- Customer creation validates contact fields.
- Customer updates preserve sale history.

### Reports

```text
GET /api/v1/reports/daily-sales
GET /api/v1/reports/best-sellers
GET /api/v1/reports/low-stock
```

Expected behavior:

- Daily sales reports use store-local reporting boundaries.
- Best sellers aggregate completed sales.
- Low stock reports compare stock to `minimumStock`.

## Error Shape

Use clear error responses with stable codes.

Recommended shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": []
  }
}
```

Common mappings:

- Validation failure: `400`.
- Missing or invalid credentials: `401`.
- Authenticated but not authorized: `403`.
- Missing resource in store scope: `404`.
- Conflict such as duplicate SKU: `409`.
- Unexpected failure: `500`.

