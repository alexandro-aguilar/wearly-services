# Promotions Feature Spec

## Purpose

Promotions owns configurable discount rules. It determines eligibility and discount amounts without hard-coded campaign logic.

## Domain Language

Supported promotion types:

- `FIXED_COMBO`
- `MIXED_COMBO`
- `PERCENTAGE_DISCOUNT`
- `BUY_X_GET_Y`

`Promotion`:

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

`PromotionCondition`:

```ts
type PromotionCondition = {
  field: 'category' | 'productId' | 'variantId' | 'quantity' | 'brand';
  operator: 'EQUALS' | 'IN' | 'GREATER_THAN_OR_EQUAL';
  value: string | number | string[];
};
```

`PromotionAction`:

```ts
type PromotionAction = {
  type: 'SET_FIXED_PRICE' | 'PERCENTAGE_DISCOUNT' | 'FIXED_DISCOUNT' | 'CHEAPEST_ITEM_DISCOUNT';
  value: number;
};
```

Important value objects include `PromotionId`, `DateRange`, `PromotionCondition`, `PromotionAction`, `PromotionPriority`, and `Money`.

## Invariants

- Promotion name is required.
- Promotions belong to exactly one store.
- Active dates are optional but deterministic.
- Higher priority promotions are evaluated before lower priority promotions.
- Eligibility and discount calculation must be explicit and test-heavy.
- Promotions must not mutate catalog, inventory, or sales entities directly.
- Promotion behavior must be configurable without code changes.

## Commands

- `CreatePromotionCommand`
- `UpdatePromotionCommand`
- `DeactivatePromotionCommand`

Create and update validate condition and action compatibility for the promotion type.

## Queries

- `ListPromotionsQuery`
- `ListActivePromotionsQuery`
- `EvaluatePromotionsQuery`

Evaluation takes a store-scoped cart projection and deterministic clock input. It returns applied promotion summaries and discount amounts without mutating state.

## API

```text
GET   /api/v1/promotions
POST  /api/v1/promotions
PATCH /api/v1/promotions/:id
```

Expected behavior:

- Promotions are configurable data, not code branches.
- Active promotion listing respects `storeId`, dates, and active state.
- Create and update validate condition and action compatibility for the promotion type.

## Required Examples

- 2 shirts for 499.
- Shirt plus pants for 799.
- 20 percent off jackets.
- Buy 3, get 1 at 50 percent.

## Persistence

Promotions owns promotion, condition, and action persistence. Conditions and actions must be stored as configurable data and reconstructed into domain objects before evaluation.

## Authorization

Suggested capabilities:

- `ADMIN`: manage promotions.
- `MANAGER`: manage promotions if business policy allows.
- `CASHIER`: read active promotions and receive checkout-calculated discounts.

## Tests

High-priority scenarios:

- Fixed combo applies when required quantities are present.
- Mixed combo applies only when all required groups are present.
- Percentage discount applies to eligible items only.
- Buy X get Y discounts the intended item and amount.
- Promotion priority is deterministic.
- Inactive, future, and expired promotions do not apply.
- Store A promotions do not apply to Store B sales.
