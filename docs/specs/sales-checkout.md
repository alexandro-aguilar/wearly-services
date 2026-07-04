# Sales Checkout Feature Spec

## Purpose

Sales checkout completes purchases. It calculates authoritative totals, applies promotions, records sale history, and coordinates inventory reduction in one transaction.

## Domain Language

`Sale`:

```ts
type Sale = {
  id: string;
  storeId: string;
  customerId?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  createdAt: Date;
};
```

`SaleItem`:

```ts
type SaleItem = {
  saleId: string;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};
```

Important value objects include `StoreId`, `SaleId`, `ProductVariantId`, `Quantity`, `Money`, and `PaymentMethod`.

## Invariants

- Sale totals are calculated server-side.
- Client-provided totals, discounts, promotion results, and stock values are never trusted.
- Sale item quantity must be positive.
- Unit price comes from the authoritative product variant price.
- Discount comes from promotion evaluation or authorized manual discount behavior.
- Sale item total equals quantity times unit price minus discount.
- A completed sale creates sale items and inventory movements in the same transaction.
- A cancelled sale must not silently erase audit history.
- Refund behavior must be modeled explicitly before implementation.

## Commands

- `CompleteSaleCommand`
- `CancelSaleCommand`

`CompleteSaleCommand` coordinates catalog variant validation, promotion evaluation, total calculation, inventory movement creation, stock updates, and sale persistence.

## Queries

- `GetCheckoutSummaryQuery`
- `GetSaleByIdQuery`
- `ListSalesQuery`

`GetCheckoutSummaryQuery` should calculate the same prices and promotions as checkout without mutating state.

## API

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

## Cross-Context Workflow

1. Sales receives the checkout command.
2. Catalog validates variants are active and belong to the store.
3. Promotions evaluates applicable discounts deterministically.
4. Sales calculates authoritative totals.
5. Inventory records movements and updates stock within a transaction.
6. Sales records the completed sale and sale items.
7. Reporting reads sale and inventory projections.

Useful domain events:

- `SaleCompleted`
- `PromotionApplied`
- `InventoryAdjusted`

## Persistence

Sales owns sale and sale item persistence. Checkout requires a transaction that spans sale records, sale items, inventory movements, and stock updates.

Sales persistence records must not be returned directly as public API DTOs.

## Authorization

Suggested capabilities:

- `ADMIN`: complete and cancel sales.
- `MANAGER`: complete and cancel sales.
- `CASHIER`: complete sales and read limited sales history needed for checkout support.

## Tests

High-priority scenarios:

- Sales can be completed.
- Server recalculates all totals.
- Client-provided totals are ignored.
- Stock is reduced after sale completion.
- Insufficient stock prevents sale completion.
- Promotion discounts are applied automatically.
- Store A cannot sell Store B variants.
- Sale creation is transactional.
