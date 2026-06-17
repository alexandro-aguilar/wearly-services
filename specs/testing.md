# Testing Spec

## Test Runner

Use Vitest for new Wearly code.

Existing Jest dependencies may remain during migration, but new business behavior should be covered with Vitest unless a migration plan says otherwise.

## TDD Loop

Default to test-first development for business behavior:

1. Write a failing test that states the business rule.
2. Implement the smallest domain/application code needed to pass.
3. Refactor while keeping tests green.
4. Add edge cases for invalid input, permissions, store isolation, and money/quantity calculations.

## Test Priorities

### Domain Tests

Cover:

- Entities.
- Value objects.
- Domain services.
- Promotion calculations.
- Checkout totals.
- Inventory movement rules.
- Money and quantity invariants.

### Application Tests

Cover command and query handlers using:

- Fake repositories.
- Deterministic clocks.
- Fake authorization policies.
- Fake transaction managers.

### Integration Tests

Cover:

- Persistence adapters.
- HTTP routes.
- Authentication and authorization behavior.
- Transactional checkout.

### Regression Tests

Every bug fix should include a focused regression test that fails before the fix.

## High-Priority Test Scenarios

Promotion engine:

- Fixed combo applies when required quantities are present.
- Mixed combo applies only when all required groups are present.
- Percentage discount applies to eligible items only.
- Buy X get Y discounts the intended item and amount.
- Promotion priority is deterministic.
- Inactive, future, and expired promotions do not apply.

Checkout:

- Server recalculates all totals.
- Client-provided totals are ignored.
- Stock is reduced after sale completion.
- Insufficient stock prevents sale completion.
- Sale item totals match authoritative prices and discounts.

Store isolation:

- Store A cannot read Store B products.
- Store A cannot sell Store B variants.
- Store A promotions do not apply to Store B sales.

Authorization:

- Unauthenticated requests fail.
- Cashier cannot perform manager-only mutations.
- Authorized roles can perform allowed actions.

