# Security And Authorization Spec

## Authentication

Use AWS Cognito for authentication.

API requests use JWT Bearer tokens:

```text
Authorization: Bearer <token>
```

Presentation code validates credentials before mapping requests into application commands or queries.

## Roles

Initial roles:

- `ADMIN`
- `MANAGER`
- `CASHIER`

## Authorization Rules

- Authenticate at the presentation boundary.
- Authorize in application services or policies before mutating state.
- Scope every store-owned operation by `storeId`.
- Never trust client-provided roles or store context.
- Never trust client-provided totals, discounts, stock values, or promotion results.
- Keep secrets in environment/configuration, never in source files.

## Suggested Role Capabilities

### ADMIN

- Manage products and variants.
- Adjust inventory.
- Complete and cancel sales.
- Manage promotions.
- Manage customers.
- View reports.
- Manage users and store settings when those features exist.

### MANAGER

- Manage products and variants.
- Adjust inventory.
- Complete and cancel sales.
- Manage promotions if business policy allows.
- Manage customers.
- View reports.

### CASHIER

- Complete sales.
- Look up products, variants, inventory availability, promotions, and customers.
- Create or update customer records during checkout if business policy allows.
- View limited sales history needed for checkout support.

## Store Isolation

Every tenant-scoped command and query must include the authenticated `storeId`.

Rules:

- Queries must filter by `storeId`.
- Commands must load and mutate only aggregates matching `storeId`.
- Resource-not-in-store should be returned as not found unless a more specific security policy is approved.
- Cross-store reporting is out of MVP scope unless explicitly authorized.

