# Reporting Feature Spec

## Purpose

Reporting owns read-only operational summaries for sales and inventory performance. It answers business questions without mutating transactional state.

## Initial Reports

- Daily sales.
- Best sellers.
- Low stock.

## Domain Language

Reporting primarily returns projections:

- `DailySalesReport`
- `BestSellerReport`
- `LowStockReport`

Reports are scoped by `storeId` and should use store-local date boundaries.

## Invariants

- Reporting queries must not mutate state.
- Reports are generated from completed sales and inventory projections.
- Cancelled and refunded sales must be handled explicitly when those flows exist.
- Cross-store reporting is out of MVP scope unless explicitly authorized.

## Queries

- `GetDailySalesReportQuery`
- `GetBestSellersReportQuery`
- `GetLowStockReportQuery`

Queries may use optimized read repositories or projections when that is simpler and faster.

## API

```text
GET /api/v1/reports/daily-sales
GET /api/v1/reports/best-sellers
GET /api/v1/reports/low-stock
```

Expected behavior:

- Daily sales reports use store-local reporting boundaries.
- Best sellers aggregate completed sales.
- Low stock reports compare stock to `minimumStock`.

## Persistence

Reporting may read from sales, sale item, product variant, and inventory projections. It should not own transactional writes in the MVP.

If reporting read models are added later, they should be updated through application workflows or domain events such as `SaleCompleted` and `InventoryAdjusted`.

## Authorization

Suggested capabilities:

- `ADMIN`: view reports.
- `MANAGER`: view reports.
- `CASHIER`: no broad reporting access unless a limited operational report is approved.

## Tests

High-priority scenarios:

- Daily sales report includes completed sales.
- Daily sales report excludes or separates cancelled/refunded sales once those statuses exist.
- Best sellers aggregate quantities by variant or product as specified by the use case.
- Low stock report returns variants where stock is at or below `minimumStock`.
- Reports are store-scoped and read-only.
