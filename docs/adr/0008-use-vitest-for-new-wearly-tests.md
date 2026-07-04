# 0008 - Use Vitest For New Wearly Tests

## Status

Accepted

## Context

The handoff specifies Vitest for the Wearly backend. The repository currently has some Jest dependencies, but new Wearly code needs a consistent test direction.

The most important business risks are promotion calculations, checkout totals, inventory movements, RBAC, and store isolation.

## Decision

Use Vitest for new Wearly tests.

Default to test-first development for business behavior.

## Consequences

- Domain tests cover entities, value objects, domain services, and promotion calculations.
- Application tests cover command and query handlers with fake repositories and deterministic clocks.
- Integration tests cover persistence adapters and HTTP routes when infrastructure is involved.
- Promotion engine tests are high priority.
- Existing Jest tests may remain until an explicit migration plan replaces them.

