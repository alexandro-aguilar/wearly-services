# 0006 - Enforce Store Isolation With Store ID

## Status

Accepted

## Context

Wearly must be multi-store ready from day one. Catalog records, variants, inventory movements, sales, promotions, customers, and reports are tenant-scoped.

Any missing store boundary could expose or mutate another store's data.

## Decision

Use `storeId` as the tenant isolation key across tenant-scoped aggregates, commands, queries, repositories, and API requests.

The authenticated store context is authoritative. Client-provided store values must not be trusted unless explicitly validated against the authenticated principal.

## Consequences

- Every tenant-scoped command and query includes `storeId`.
- Repositories filter reads and writes by `storeId`.
- Aggregates carry or validate `storeId`.
- Duplicate checks such as SKU or barcode uniqueness are store-scoped.
- Resource-not-in-store should normally be treated as not found.
- Cross-store reporting is out of MVP scope unless explicitly authorized.
