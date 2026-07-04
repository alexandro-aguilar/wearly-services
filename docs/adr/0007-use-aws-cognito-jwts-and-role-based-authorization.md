# 0007 - Use AWS Cognito JWTs And Role-Based Authorization

## Status

Accepted

## Context

Wearly requires authentication and role-based authorization. The handoff specifies AWS Cognito, JWT Bearer tokens, and roles for `ADMIN`, `MANAGER`, and `CASHIER`.

Authorization must protect store-scoped operations and prevent clients from spoofing roles, totals, discounts, or stock values.

## Decision

Use AWS Cognito for authentication and JWT Bearer tokens for API requests.

Use role-based authorization with these initial roles:

- `ADMIN`
- `MANAGER`
- `CASHIER`

Authenticate at the presentation boundary. Authorize mutations in application services or policies before changing state.

## Consequences

- Missing or invalid tokens return `401`.
- Authenticated users without required permissions return `403`.
- Application code receives an authenticated principal and store context, not raw token claims.
- Role and store context come from trusted auth mapping.
- Sensitive operations such as promotion management, inventory adjustment, and sale cancellation need explicit policy checks.

