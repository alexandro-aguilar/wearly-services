# Domain Model Spec

## Shared Concepts

Use value objects for concepts that carry rules:

- `Money`
- `Quantity`
- `Sku`
- `Barcode`
- `StoreId`
- `DateRange`
- `PromotionCondition`
- Domain identifiers

Every tenant-scoped aggregate must carry or validate `storeId`.

## Catalog

### Product

```ts
type Product = {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  categoryId: string;
  brandId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

Rules:

- Product name is required.
- Product belongs to exactly one store.
- Soft deletion should be represented with `active: false`.
- Product variants cannot be created for inactive products.

### ProductVariant

```ts
type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  size?: string;
  color?: string;
  price: number;
  cost: number;
  stock: number;
  minimumStock: number;
  active: boolean;
};
```

Rules:

- SKU is required and unique within a store.
- Barcode is optional but unique within a store when present.
- Price and cost cannot be negative.
- Stock and minimum stock cannot be negative.
- Variant stock changes must go through inventory behavior, not catalog mutation.

## Inventory

### InventoryMovement

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

Rules:

- Movement quantity must be non-zero.
- Movement must record previous and new stock.
- Sale movements reduce stock.
- Purchase and return movements increase stock.
- Manual adjustment sets stock through an explicit business action and audit trail.
- Stock cannot become negative unless a future explicit backorder policy allows it.

## Sales

### Sale

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

Rules:

- Sale totals are calculated server-side.
- Client-provided totals, discounts, and stock values are never trusted.
- A completed sale creates sale items and inventory movements in the same transaction.
- A cancelled sale must not silently erase audit history.
- Refund behavior should be modeled explicitly before implementation.

### SaleItem

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

Rules:

- Quantity must be positive.
- Unit price comes from the current authoritative product variant price.
- Discount comes from promotion evaluation or authorized manual discount behavior.
- Total equals quantity times unit price minus discount.

## Promotions

Promotions are a first-class bounded context and must be configurable without code changes.

Supported promotion types:

- `FIXED_COMBO`
- `MIXED_COMBO`
- `PERCENTAGE_DISCOUNT`
- `BUY_X_GET_Y`

### Promotion

```ts
type Promotion = {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  type: PromotionType;
  conditions: PromotionCondition[];
  actions: PromotionAction[];
  startsAt?: Date;
  endsAt?: Date;
  priority: number;
  active: boolean;
};
```

Rules:

- Promotion name is required.
- Active dates are optional but deterministic.
- Higher priority promotions are evaluated before lower priority promotions.
- Promotion eligibility and discount calculation must be explicit and test-heavy.
- Promotions must not mutate catalog, inventory, or sales entities directly.

### PromotionCondition

```ts
type PromotionCondition = {
  field: 'category' | 'productId' | 'variantId' | 'quantity' | 'brand';
  operator: 'EQUALS' | 'IN' | 'GREATER_THAN_OR_EQUAL';
  value: string | number | string[];
};
```

### PromotionAction

```ts
type PromotionAction = {
  type:
    | 'SET_FIXED_PRICE'
    | 'PERCENTAGE_DISCOUNT'
    | 'FIXED_DISCOUNT'
    | 'CHEAPEST_ITEM_DISCOUNT';
  value: number;
};
```

Required examples:

- 2 shirts for 499.
- Shirt plus pants for 799.
- 20 percent off jackets.
- Buy 3, get 1 at 50 percent.

## Customers

Customer records support checkout attribution, customer history, and future loyalty features.

Initial rules:

- Customer belongs to a store.
- Customer contact fields must be validated at the boundary.
- Customer history must be scoped by `storeId`.

## Reporting

Initial reports:

- Daily sales.
- Best sellers.
- Low stock.

Reporting queries may use optimized read repositories or projections. They must not mutate state.

