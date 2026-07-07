# 0005 - Keep Promotions As A First-Class Bounded Context

## Status

Accepted

## Context

Promotions are central to retail checkout and include fixed combos, mixed combos, percentage discounts, and buy-X-get-Y offers. The system must apply promotions automatically during checkout and allow promotion configuration without code changes.

Promotion behavior is calculation-heavy and must be deterministic, especially when priorities, active dates, eligibility, and discount amounts interact.

## Decision

Keep promotions as a first-class bounded context with its own domain model, application use cases, infrastructure, and presentation routes.

Support these promotion types:

- `FIXED_COMBO`
- `MIXED_COMBO`
- `PERCENTAGE_DISCOUNT`
- `BUY_X_GET_Y`

Represent eligibility and effects through configurable conditions and actions.

## Consequences

- Promotion evaluation is deterministic and test-heavy.
- Checkout calls promotion application behavior rather than embedding promotion logic in sales routes.
- Promotions do not directly mutate catalog, inventory, or sales state.
- Promotion data must be scoped by `storeId`, active dates, priority, and active state.
- Edge cases need focused unit tests before broad integration tests.
