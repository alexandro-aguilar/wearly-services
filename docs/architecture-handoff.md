# Architecture Handoff

This document captures the reusable software architecture in `app/src`. Use it as the handoff guide when creating a downstream project that should keep the same source tree, module boundaries, request flow, and implementation conventions.

## Architecture Summary

The application is a TypeScript serverless API built as a modular monolith of AWS Lambda handlers. Each HTTP operation is compiled as its own Lambda entrypoint, while shared behavior is centralized in `app/src/core`.

Core architectural choices:

- Runtime: Node.js Lambda handlers written in TypeScript.
- Handler framework: Middy middleware pipeline.
- Dependency injection: Inversify containers per module.
- Persistence: PostgreSQL through Drizzle ORM.
- Validation: Joi schemas at the Lambda boundary.
- Observability: AWS Lambda Powertools logger, metrics, and tracer.
- Build: `esbuild.ts` discovers `app/**/interface/handlers/*Handler.ts` and bundles each handler to `.dist`.
- Imports: `@src/*` resolves to `app/src/*`.

The downstream project should preserve the layer order:

```text
HTTP/API Gateway
  -> module interface/handlers
  -> core middleware
  -> module interface/controllers
  -> module application handlers, when needed
  -> module domain contracts/entities
  -> module infrastructure adapters
  -> core infrastructure/database
```

## Source Tree To Reuse

```text
app/src/
  core/
    config/
      commonTypes.ts
    domain/
      entities/
        BaseEntity.ts
      exceptions/
        BadRequestException.ts
        Exception.ts
        ForbiddenException.ts
        NotFoundException.ts
        UnauthorizerException.ts
    infrastructure/
      database/
        postgres-drizzle.config.ts
        schema.ts
        seed.ts
        er_dnd.md
    interface/
      ParsedAPIGatewayProxyEventV2.ts
    middleware/
      requestHandler.ts
      requestValidator.ts
      responseHandler.ts
    utils/
      Environment.ts
      ILogger.ts
      JwtDecoder.ts
      Logger.ts
      MetricsService.ts
      TracerService.ts

  modules/
    <module>/
      config/
        container.ts
        types.ts
      domain/
        dtos/
          <Entity>Dto.ts
        entities/
          <Entity>.ts
        repositories/
          <EntityPlural>Repository.ts
      infrastructure/
        repositories/
          Drizzle<EntityPlural>Repository.ts
      interface/
        controllers/
          <Action><EntityPlural>Controller.ts
        handlers/
          <action><EntityPlural>Handler.ts
          input<Action><Entity>Schema.ts

      application/                  # Include when use cases need orchestration.
        commands/
          <Action><Entity>Command.ts
        queries/
          <Entity>ByIdQuery.ts
        handlers/
          <Action><Entity>CommandHandler.ts
          <Entity>ByIdQueryHandler.ts
```

Not every module needs every folder. Simple read-only reference modules can omit `application/` and call repository contracts directly from controllers. Write operations or multi-step reads should use application commands, queries, and handlers.

## Layer Responsibilities

### `core`

`core` is shared application infrastructure. It should stay domain-neutral.

- `core/config`: common DI symbols reused by module containers.
- `core/domain/entities`: base contracts shared by entities.
- `core/domain/exceptions`: typed exceptions that `responseHandler` maps to HTTP status codes.
- `core/infrastructure/database`: Drizzle schema, singleton PostgreSQL pool/client, seed utilities, and database documentation.
- `core/interface`: common API Gateway event types.
- `core/middleware`: request parsing, Joi validation, response/error normalization.
- `core/utils`: environment access, logging, metrics, tracing, JWT decoding.

Keep business rules out of `core`. If a rule mentions a domain concept, it belongs in a module.

### `modules/<module>/config`

Each module owns an Inversify container and symbol map.

- `types.ts` combines `commonTypes` with module-specific symbols.
- `container.ts` binds shared utilities, controllers, repositories, and application handlers.

The module container is the composition root for that module's Lambda handlers.

### `modules/<module>/domain`

The domain layer owns business contracts and data shape boundaries.

- `entities`: classes with constructor validation and `toDto()` conversion.
- `dtos`: JSON-safe response shapes.
- `repositories`: persistence contracts expressed in domain terms.

Domain code should not import Drizzle, AWS Lambda types, Middy, or HTTP-specific objects.

### `modules/<module>/application`

The application layer coordinates use cases when a controller should not directly call one repository method.

- `commands`: write intent inputs.
- `queries`: read intent inputs.
- `handlers`: orchestration around repositories and domain entities.

Use this layer for creates, updates, deletes, authorization-aware flows, multi-repository operations, and workflows with generated IDs.

### `modules/<module>/infrastructure`

Infrastructure implements domain contracts using concrete technology.

- Current adapter pattern: `Drizzle<EntityPlural>Repository`.
- Repositories import `db` and table definitions from `core/infrastructure/database`.
- Repositories map database rows into domain entities and log failures through `ILogger`.

Do not return database rows directly from infrastructure. Convert rows into domain entities.

### `modules/<module>/interface`

The interface layer is the Lambda/API boundary.

- `handlers`: Middy Lambda entrypoints discovered by `esbuild.ts`.
- `controllers`: HTTP-facing orchestration. Controllers return `APIGatewayProxyResultV2`.
- `input*Schema.ts`: Joi validation schemas consumed by `requestValidator`.

Handlers should stay thin: add request context to the logger, resolve a controller from the container, execute it, and attach standard middleware.

## Request Lifecycle

1. API Gateway invokes a bundled Lambda handler.
2. The handler uses the module container to resolve logger, metrics, tracer, and the target controller.
3. `requestValidator` validates `body`, `pathParameters`, and/or `queryStringParameters` with Joi.
4. `requestHandler` parses JSON request bodies and adds request metadata to metrics.
5. Powertools middleware captures metrics and tracing.
6. The controller maps HTTP input to a command/query or calls a repository-backed read.
7. Application handlers create domain entities or execute use cases.
8. Infrastructure repositories persist or load data through Drizzle.
9. Controllers serialize DTOs into Lambda responses.
10. `responseHandler` normalizes object responses and maps known exceptions to HTTP status codes.

## Handler Convention

Every Lambda entrypoint must live under:

```text
app/src/modules/<module>/interface/handlers/*Handler.ts
```

`esbuild.ts` uses this glob:

```typescript
app/**/interface/handlers/*Handler.ts
```

The output bundle name is the handler filename without `.ts`. Keep handler filenames unique across the whole repository, because the build maps each discovered file by basename.

Example naming:

```text
getAbilitiesHandler.ts
getCharacterByIdHandler.ts
postCharacterHandler.ts
syncUserOnSignupHandler.ts
```

## Module Creation Checklist

Use this sequence when adding a downstream module:

1. Create `app/src/modules/<module>`.
2. Add `config/types.ts` with `commonTypes` plus module symbols.
3. Add `config/container.ts` and bind logger, metrics, tracer, repository, controllers, and application handlers.
4. Add `domain/dtos/<Entity>Dto.ts`.
5. Add `domain/entities/<Entity>.ts` with constructor validation and `toDto()`.
6. Add `domain/repositories/<EntityPlural>Repository.ts`.
7. Add database tables and relations in `core/infrastructure/database/schema.ts`.
8. Add `infrastructure/repositories/Drizzle<EntityPlural>Repository.ts`.
9. Add `interface/controllers/<Action><EntityPlural>Controller.ts`.
10. Add `interface/handlers/input<Action><Entity>Schema.ts`.
11. Add `interface/handlers/<action><EntityPlural>Handler.ts`.
12. Run `yarn build` to confirm the handler is discovered and bundled.
13. Add Terraform/API Gateway wiring for the new handler if deploying it.

For write workflows, add:

```text
application/
  commands/<Action><Entity>Command.ts
  handlers/<Action><Entity>CommandHandler.ts
```

For targeted read workflows, add:

```text
application/
  queries/<Entity>ByIdQuery.ts
  handlers/<Entity>ByIdQueryHandler.ts
```

## Cross-Cutting Conventions

- Prefer `@src/*` imports for cross-module or core imports.
- Use relative imports inside a module when moving between local layers.
- Keep Lambda handlers thin and middleware-driven.
- Keep controllers responsible for HTTP concerns and request-to-use-case mapping.
- Keep repositories behind domain interfaces.
- Use DTOs for outbound JSON and entities internally.
- Throw typed exceptions from `core/domain/exceptions` when the response status matters.
- Add request IDs to logger context in every handler.
- Bind `Logger` as singleton in module containers.
- Use `uuid` generation in application handlers, not in controllers or repositories.
- Keep `Environment.ts` as the single source for env var defaults.

## Downstream Reuse Notes

When cloning this architecture into a new project:

- Keep `app/src/core` intact first, then rename domain modules as needed.
- Replace Drizzle schema tables and seed data with the downstream domain model.
- Preserve the `modules/<module>/<layer>` folder structure to keep the build and import conventions predictable.
- Keep handler filenames globally unique.
- Update `PROJECT_NAME`, service names, and environment defaults in `core/utils/Environment.ts`.
- Keep `tsconfig.json` path aliases aligned with `esbuild.ts` aliases.
- Ensure Terraform or deployment configuration points to `.dist/<handlerName>.js` outputs from the build.

## Quality Gates

Before handing off downstream changes:

```bash
yarn lint
yarn build
```

For database changes:

```bash
yarn generate:local
yarn migrate:local
```

For infrastructure changes:

```bash
yarn tf:fmt
yarn tf:validate
```

## Current Project Modules

The current `app/src/modules` tree includes:

- `abilities`
- `backgrounds`
- `characters`
- `classes`
- `example`
- `items`
- `quests`
- `races`
- `sessions`
- `skills`
- `spells`
- `subClasses`
- `subraces`
- `users`

Use `abilities` as the simplest read-only module template. Use `characters`, `quests`, or `sessions` as templates for command-based write flows.
