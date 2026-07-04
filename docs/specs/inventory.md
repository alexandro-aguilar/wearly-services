# Inventory Feature Spec

## Purpose

Inventory owns stock availability and the audit trail of stock changes per product variant. It is the only feature allowed to change variant stock.

## Domain Language

`InventoryMovement`:

```ts
type InventoryMovement = {
  id: string;
  storeId: string;
  productVariantId: string;
  type: 'SALE' | 'PURCHASE' | 'MANUAL_ADJUSTMENT' | 'RETURN' | 'TRANSFER';
  quantity: number;
  previousStock: number;
  newStock: number;
  createdAt: Date;
};
```

Important value objects include `StoreId`, `ProductVariantId`, `Quantity`, and `StockLevel`.

## Invariants

- Movement quantity must be non-zero.
- Movement records previous and new stock.
- Sale movements reduce stock.
- Purchase and return movements increase stock.
- Manual adjustment sets stock through an explicit business action and audit trail.
- Stock cannot become negative unless a future explicit backorder policy allows it.
- Every stock mutation is scoped by `storeId`.

## Commands

- `AdjustInventoryCommand`
- `RecordSaleInventoryMovementCommand`
- `RecordReturnInventoryMovementCommand`

Manual adjustments should require a reason or audit note once that policy is approved. Sale movements are normally invoked by the sales checkout workflow inside the checkout transaction.

## Queries

- `GetInventoryAvailabilityQuery`
- `ListInventoryMovementsQuery`
- `ListLowStockVariantsQuery`

Queries are read-only and store-scoped.

## API

```text
GET  /api/v1/inventory
POST /api/v1/inventory/adjustments
GET  /api/v1/inventory/movements
```

Expected behavior:

- Inventory reads are scoped by store.
- Adjustments create inventory movements.
- Movements are append-only audit records.
- Low stock support compares current stock to `minimumStock`.

## Persistence

Inventory owns inventory movement persistence and participates in stock update transactions. Stock may be stored on product variants for fast reads, but only inventory application behavior may change it.

Checkout must update stock and write movement records in the same transaction as sale creation.

## Authorization

Suggested capabilities:

- `ADMIN`: adjust inventory and read movements.
- `MANAGER`: adjust inventory and read movements.
- `CASHIER`: read inventory availability needed for checkout.

## Tests

High-priority scenarios:

- Inventory can be adjusted.
- Every adjustment creates a movement.
- Stock cannot become negative.
- Sale movements reduce stock.
- Purchase and return movements increase stock.
- Store A cannot adjust or read Store B inventory.
