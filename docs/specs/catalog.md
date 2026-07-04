# Catalog Feature Spec

## Purpose

Catalog owns products and sellable product variants for a store. It answers what can be sold, how each item is identified, and what authoritative price applies before checkout promotions.

## Domain Language

`Product`:

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

`ProductVariant`:

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

Important value objects include `StoreId`, `ProductId`, `ProductVariantId`, `Sku`, `Barcode`, and `Money`.

## Invariants

- Product name is required.
- Product belongs to exactly one store.
- Soft deletion is represented with `active: false`.
- Product variants cannot be created for inactive products.
- SKU is required and unique within a store.
- Barcode is optional but unique within a store when present.
- Price and cost cannot be negative.
- Stock and minimum stock cannot be negative.
- Variant stock changes must go through inventory behavior, not catalog mutation.

## Commands

- `CreateProductCommand`
- `UpdateProductCommand`
- `DeactivateProductCommand`
- `CreateProductVariantCommand`
- `UpdateProductVariantCommand`
- `DeactivateProductVariantCommand`

Command handlers must authorize the caller, load store-scoped aggregates through repository ports, enforce catalog invariants, and return minimal results such as created IDs or status.

## Queries

- `GetProductByIdQuery`
- `ListProductsQuery`
- `GetProductVariantByIdQuery`
- `ListProductVariantsQuery`

Variant listing should support filtering by product, SKU, barcode, active state, and low stock status.

## API

```text
GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PATCH  /api/v1/products/:id
DELETE /api/v1/products/:id

GET    /api/v1/variants
POST   /api/v1/variants
PATCH  /api/v1/variants/:id
```

Expected behavior:

- List and detail endpoints return only resources in the caller's store.
- Create and update validate required fields and category/brand references.
- Delete deactivates the product unless hard deletion is explicitly approved.
- Variant create validates SKU and barcode uniqueness within the store.
- Variant stock is not adjusted directly from catalog routes.

## Persistence

Catalog owns product and product variant persistence. Store-local uniqueness is required for SKU and barcode when barcode is present.

Persistence models must remain separate from domain entities. Catalog repositories should expose domain-oriented methods and hide Prisma or Drizzle records.

## Authorization

Suggested capabilities:

- `ADMIN`: manage products and variants.
- `MANAGER`: manage products and variants.
- `CASHIER`: read products and variants needed for checkout.

Every command and query must include authenticated `storeId`.

## Tests

High-priority scenarios:

- Product creation requires name and store.
- Inactive products cannot receive new variants.
- SKU uniqueness is enforced within a store.
- Barcode uniqueness is enforced within a store when present.
- Store A cannot read or mutate Store B products.
- Catalog routes do not mutate stock.
