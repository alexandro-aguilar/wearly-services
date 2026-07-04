# AGENTS.md

Guidance for AI coding agents working on Wearly Services.

## Project Identity

Wearly Services is the backend for a modern clothing retail POS. The product scope comes from `Handoff.md`, which is the source of truth for business direction until a fuller product specification exists.

The backend must support:

- Product catalog and product variants
- Inventory tracking per variant
- Sales checkout
- Automatic promotion application
- Customers
- Authentication and role-based authorization
- Daily reporting
- Multi-store isolation through `storeId`

This repository currently contains inherited TypeScript serverless infrastructure, including AWS Lambda/Middy helpers, Drizzle/PostgreSQL setup, Terraform scripts, and some legacy project naming. When adding new Wearly code, prefer the Wearly domain model and target architecture described below over legacy naming.

## Technology Direction

Target stack from the handoff:

- Node.js 24
- TypeScript
- Fastify
- PostgreSQL
- Prisma
- Vitest
- AWS CDK in TypeScript

Current repository stack to be aware of:

- TypeScript with strict compiler settings
- NodeNext modules
- Drizzle/PostgreSQL infrastructure under `src/app/core/infrastructure/database`
- AWS Lambda/Middy middleware under `src/app/core/middleware`
- Terraform scripts in `package.json` and `terraform/`
- Jest dependencies are present, but the desired test runner for new Wearly code is Vitest

When implementing new features, follow the handoff direction unless the task is explicitly about maintaining the existing Lambda/Terraform/Drizzle code.

## Architecture

Use Clean Architecture with dependency flow inward:

```text
presentation -> application -> domain
infrastructure -> application/domain contracts
```

Domain code must not depend on Fastify, Prisma, Drizzle, AWS, HTTP, environment variables, or framework decorators. Application code orchestrates use cases and depends on domain interfaces. Infrastructure implements ports such as repositories, transaction managers, password hashers, token services, payment adapters, and database clients. Presentation adapts HTTP requests and responses to application commands and queries.

Target bounded contexts:

- `catalog`
- `inventory`
- `sales`
- `promotions`
- `customers`
- `reporting`
- `auth`
- `shared`

Preferred target structure:

```text
src/
  catalog/
    domain/
    application/
    infrastructure/
    presentation/
  inventory/
    domain/
    application/
    infrastructure/
    presentation/
  sales/
    domain/
    application/
    infrastructure/
    presentation/
  promotions/
    domain/
    application/
    infrastructure/
    presentation/
  customers/
    domain/
    application/
    infrastructure/
    presentation/
  reporting/
    domain/
    application/
    infrastructure/
    presentation/
  auth/
    domain/
    application/
    infrastructure/
    presentation/
  shared/
  main.ts
```

The current code lives under `src/app`. If migrating incrementally, keep new Wearly modules aligned with the target context names and avoid spreading new business logic through `core`.

## Domain Driven Design

Model business language explicitly. Use names from the POS domain: `Product`, `ProductVariant`, `Sale`, `SaleItem`, `InventoryMovement`, `Promotion`, `PromotionCondition`, `PromotionAction`, `Customer`, `Store`, `Role`.

Rules:

- Put invariants in domain entities, value objects, and domain services.
- Keep primitive obsession low for important concepts. Use value objects for money, quantities, SKU/barcode, date ranges, promotion conditions, and identifiers when they carry rules.
- Keep bounded contexts cohesive. Do not let `sales` mutate catalog or inventory data directly; call application ports or domain services owned by the relevant context.
- Use domain events for cross-context effects when useful, such as `SaleCompleted`, `InventoryAdjusted`, or `PromotionApplied`.
- Keep persistence models separate from domain models. Database rows are not entities.
- Every tenant-scoped aggregate must carry or validate `storeId`.

Promotion engine guidance:

- Treat promotions as a first-class bounded context.
- Promotions must be configurable without code changes.
- Supported types from the handoff are `FIXED_COMBO`, `MIXED_COMBO`, `PERCENTAGE_DISCOUNT`, and `BUY_X_GET_Y`.
- Keep promotion evaluation deterministic and test-heavy. Priority, active dates, eligibility, and discount calculation must be explicit.

## CQRS

Use CQRS at the application layer.

Commands mutate state and express intent:

- `CreateProductCommand`
- `UpdateVariantStockCommand`
- `CompleteSaleCommand`
- `CreatePromotionCommand`
- `CancelSaleCommand`

Queries read state and return projections:

- `GetProductByIdQuery`
- `ListProductsQuery`
- `GetCheckoutSummaryQuery`
- `GetDailySalesReportQuery`
- `ListActivePromotionsQuery`

Rules:

- Command handlers return minimal results, usually IDs, status, or an application DTO.
- Query handlers do not mutate state.
- Do not put HTTP request objects, database clients, or framework response objects in command/query handlers.
- Commands should load aggregates through repository ports and call domain behavior.
- Queries may use optimized read repositories or projections when that is simpler and faster.
- Cross-context workflows should be coordinated by application services or domain events, not by presentation handlers.

## TDD Expectations

Default to test-first development for business behavior.

Use this loop:

1. Write a failing test that states the business rule.
2. Implement the smallest domain/application code needed to pass.
3. Refactor while keeping tests green.
4. Add edge cases for invalid input, permissions, store isolation, and money/quantity calculations.

Testing priorities:

- Domain tests for entities, value objects, policies, and promotion calculations.
- Application tests for command/query handlers using fake repositories and deterministic clocks.
- Integration tests for persistence adapters and HTTP routes when infrastructure is involved.
- Regression tests for every bug fix.

Avoid relying only on end-to-end tests for business rules. The promotion engine, checkout totals, inventory movements, and RBAC rules need focused unit tests.

The handoff requests Vitest for new Wearly code. If existing scripts still use Jest, either follow the current task's migration plan or add Vitest alongside the new module before building new tests around it.

## Coding Style

Follow the repository's TypeScript style:

- Strict TypeScript.
- Two-space indentation.
- Semicolons.
- Single quotes.
- Trailing commas where Prettier adds them.
- Prefer path aliases over deep relative imports when configured.
- Keep functions small and intention-revealing.
- Use explicit application DTOs instead of leaking persistence records.
- Avoid `console.log` in application code; use the project logger where available.
- Keep comments rare and useful. Prefer clear names over explanatory comments.

Current formatting and linting are defined by `.prettierrc`, `eslint.config.mjs`, and `tsconfig.json`.

## API Style

Expose REST endpoints under:

```text
/api/v1
```

Presentation handlers should:

- Validate and parse input at the boundary.
- Map authenticated user/store context into commands and queries.
- Return stable response DTOs.
- Convert domain/application errors into appropriate HTTP errors.
- Avoid business logic in route handlers.

## Persistence

PostgreSQL is the database. The handoff targets Prisma, while the current repository has Drizzle scaffolding. Do not mix persistence approaches inside the same feature without an explicit migration decision.

Persistence rules:

- Keep schema and ORM code in infrastructure.
- Repositories implement application/domain ports.
- Use transactions for checkout, sale item creation, inventory movement creation, and stock updates.
- Always include `storeId` in tenant-scoped reads and writes.
- Use database constraints for uniqueness and referential integrity, but keep business explanations in domain/application errors.

## Security And Authorization

Role-based access control is required.

Rules:

- Authenticate at the presentation boundary.
- Authorize in application services or policies before mutating state.
- Scope every store-owned operation by `storeId`.
- Never trust client-provided totals, discounts, roles, or stock values.
- Recalculate checkout totals and promotion discounts server-side.
- Keep secrets in environment/configuration, never in source files.

## Commands

Useful current commands from `package.json`:

```bash
yarn install
yarn build
yarn lint
yarn format
yarn localstack
yarn deploy:local
yarn tf:fmt
yarn tf:validate
```

Some current scripts still reference older paths such as `app/` while source files are under `src/app/`. Verify and update scripts as part of migration work before relying on them in CI.

## Working Rules For Agents

- Read `Handoff.md` before making domain or architecture decisions.
- Preserve existing user changes.
- Keep edits scoped to the requested feature.
- Prefer adding tests before production code for domain behavior.
- Do not introduce new framework dependencies without a clear reason.
- Do not put Wearly business logic in legacy-named modules.
- When unsure whether to follow current code or the handoff, favor the handoff for new Wearly features and mention any migration impact.
- Before finishing, run the most relevant tests, lint, or type checks that are available and report anything that could not be run.

## Development workflow

Before implementing any code change:

1. Read the current specification from `docs/specs/`.
2. Use Graphify to analyze the repository.
3. Identify:
   - impacted modules
   - dependencies
   - existing patterns
   - related tests

Do not modify code before understanding the dependency graph.

Implementation flow:
- Use Graphify for impact analysis
- Create a change plan
- Follow TDD with the red, green, blue cycle:
  - Red: write or update a failing test that describes the intended behavior or bug fix.
  - Green: make the test pass with the smallest production code change.
  - Blue: refactor for clarity, design, and maintainability while keeping tests green.
- Modify the smallest possible surface area
- Add edge-case tests for invalid input, permissions, store isolation, and money/quantity calculations where relevant
- Verify the change

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
