# Auth Feature Spec

## Purpose

Auth owns authentication context, role mapping, authorization policy, and store isolation. It ensures every feature receives trusted caller identity, role, and `storeId`.

## Domain Language

Initial roles:

- `ADMIN`
- `MANAGER`
- `CASHIER`

Important concepts:

- `AuthenticatedUser`
- `Role`
- `StoreId`
- `AuthorizationPolicy`
- `UserStoreRole`

## Invariants

- API requests must authenticate before reaching application commands or queries.
- Client-provided roles and store context are never trusted.
- Every tenant-scoped operation uses authenticated `storeId`.
- Mutations require role authorization in application services or policies.
- Resource-not-in-store should be returned as not found unless a more specific security policy is approved.

## Commands

- `MapAuthenticatedUserCommand`
- `AssignUserStoreRoleCommand`
- `RevokeUserStoreRoleCommand`

User and store-role management may be deferred until after MVP if Cognito claims are sufficient for development.

## Queries

- `GetAuthenticatedUserQuery`
- `ListUserStoreRolesQuery`

## API

Auth primarily integrates with presentation middleware and feature authorization policies. Dedicated user-management endpoints are out of MVP scope unless explicitly approved.

Bearer token format:

```text
Authorization: Bearer <token>
```

## Role Capabilities

`ADMIN`:

- Manage products and variants.
- Adjust inventory.
- Complete and cancel sales.
- Manage promotions.
- Manage customers.
- View reports.
- Manage users and store settings when those features exist.

`MANAGER`:

- Manage products and variants.
- Adjust inventory.
- Complete and cancel sales.
- Manage promotions if business policy allows.
- Manage customers.
- View reports.

`CASHIER`:

- Complete sales.
- Look up products, variants, inventory availability, promotions, and customers.
- Create or update customer records during checkout if business policy allows.
- View limited sales history needed for checkout support.

## Persistence

Use AWS Cognito for authentication. User-store-role mappings may be stored in PostgreSQL if they are not fully represented by Cognito claims.

Secrets must live in environment/configuration, never in source files.

## Tests

High-priority scenarios:

- Unauthenticated requests fail.
- Invalid JWTs fail.
- Cashier cannot perform manager-only mutations.
- Authorized roles can perform allowed actions.
- Store A cannot access Store B resources.
- Feature commands cannot override authenticated store or role context with request body fields.
