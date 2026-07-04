# 0003 - Use Fastify For The HTTP API

## Status

Accepted

## Context

The Wearly API will serve a React web app, a future SwiftUI iPad app, and future mobile clients. The target handoff specifies Node.js 24, TypeScript, Fastify, and a REST API under `/api/v1`.

The current repository includes inherited Lambda and Middy helpers. New implementation should align with the target stack while allowing incremental migration.

## Decision

Use Fastify as the HTTP framework for the Wearly REST API.

Expose endpoints under:

```text
/api/v1
```

When deployed to AWS Lambda, use a Fastify Lambda adapter.

## Consequences

- Presentation code validates input at the boundary.
- Presentation maps authenticated user, role, and `storeId` context into commands and queries.
- Route handlers return stable response DTOs.
- Domain and application layers remain framework-independent.
- OpenAPI documentation should be generated or maintained from the Fastify route boundary.

