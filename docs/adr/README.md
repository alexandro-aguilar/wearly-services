# Architecture Decision Records

This folder records architecture decisions for Wearly Services.

`Handoff.md` is still the product direction source of truth. These ADRs document implementation decisions derived from that handoff, `AGENTS.md`, and the specs under `docs/specs/`.

## Status Values

- `Proposed`: under discussion.
- `Accepted`: active decision.
- `Deprecated`: no longer recommended.
- `Superseded`: replaced by a later ADR.

## Decisions

- [0001 - Use Clean Architecture With Bounded Contexts](./0001-use-clean-architecture-with-bounded-contexts.md)
- [0002 - Use CQRS At The Application Layer](./0002-use-cqrs-at-the-application-layer.md)
- [0003 - Use Fastify For The HTTP API](./0003-use-fastify-for-the-http-api.md)
- [0004 - Use PostgreSQL And Prisma For New Wearly Persistence](./0004-use-postgresql-and-prisma-for-new-wearly-persistence.md)
- [0005 - Keep Promotions As A First-Class Bounded Context](./0005-keep-promotions-as-a-first-class-bounded-context.md)
- [0006 - Enforce Store Isolation With Store ID](./0006-enforce-store-isolation-with-store-id.md)
- [0007 - Use AWS Cognito JWTs And Role-Based Authorization](./0007-use-aws-cognito-jwts-and-role-based-authorization.md)
- [0008 - Use Vitest For New Wearly Tests](./0008-use-vitest-for-new-wearly-tests.md)
- [0009 - Use AWS CDK For Target Infrastructure](./0009-use-aws-cdk-for-target-infrastructure.md)
- [0010 - Use Structured Observability With AWS Lambda Powertools](./0010-use-structured-observability-with-aws-lambda-powertools.md)

