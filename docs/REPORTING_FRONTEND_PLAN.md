# Reporting Frontend Contract Plan

## Purpose

Close the gaps between the current reporting API and the data required by the
frontend dashboard. This plan is limited to reporting reads; it does not add
transactional writes or change checkout behavior.

## Current Baseline

The current API provides three store-scoped reports:

- `GET /api/v1/reports/daily-sales`
- `GET /api/v1/reports/best-sellers`
- `GET /api/v1/reports/low-stock`

Each reads the authenticated principal's `storeId`. Responses are wrapped in
`{ "body": ... }`. The current OpenAPI definition is stale for reporting and
must not be treated as the request-contract source of truth until updated.

## Gaps To Deliver

1. Stable response DTOs and OpenAPI examples for every reporting endpoint.
2. Response metadata for `storeId`, `currency`, IANA `timeZone`, and the
   effective requested period.
3. Sales totals that support a multi-day time series, with explicit handling
   of dates that have no completed sales.
4. Rich best-seller and low-stock rows suitable for direct dashboard display.
5. A documented, consistent zero, absent, and empty-list contract.
6. Either a single dashboard endpoint or an explicitly versioned mapping from
   each dashboard widget to a report endpoint.
7. Deferred metrics: worst sellers, inventory valuation, promotions used, and
   promotion revenue.

## Proposed API Shape

Use a reporting metadata object on every successful response:

```ts
type ReportMeta = {
  storeId: string;
  currency: string; // ISO 4217
  timeZone: string; // IANA, for example America/Merida
  period?: {
    from: string; // inclusive local date, YYYY-MM-DD
    to: string; // inclusive local date, YYYY-MM-DD
  };
};
```

Replace the numeric offset as the primary public time-zone input with
`timeZone`. Keep `timezoneOffsetMinutes` only as a temporary compatibility
option if a migration period is required. The backend must calculate local-day
boundaries from the IANA zone so daylight-saving transitions are correct.

### Sales overview and series

Add `GET /api/v1/reports/sales-overview?from=YYYY-MM-DD&to=YYYY-MM-DD&timeZone=Area/City`.

It should return:

```ts
type SalesOverviewResponse = {
  meta: ReportMeta;
  totals: {
    saleCount: number;
    itemQuantity: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  series: Array<{
    date: string;
    saleCount: number;
    itemQuantity: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  }>;
};
```

`from` and `to` are inclusive local calendar dates. `series` must contain one
row per local date in that inclusive range, ordered ascending, including
zero-filled rows when no completed sales occurred. Totals are the sum of the
series rows. Include only `COMPLETED` sales; cancellation and refund treatment
must be added explicitly when those workflows are implemented.

Retain `daily-sales` during migration as a compatibility view of a one-day
sales-overview request, then deprecate it only after frontend migration.

### Best sellers

Extend the endpoint with the same `from`, `to`, and `timeZone` parameters and
return metadata plus these row fields:

```ts
type BestSellerRow = {
  rank: number;
  productVariantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode?: string;
  quantitySold: number;
  grossSales: number;
  discount: number;
  netSales: number;
};
```

Document that gross sales are pre-item-discount sales, discount is the
discount allocated to the item, and net sales are post-item-discount sales.
Keep deterministic ordering: quantity sold descending, net sales descending,
then `productVariantId` ascending.

### Low stock

Return metadata and add product-display fields:

```ts
type LowStockRow = {
  productVariantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode?: string;
  stock: number;
  minimumStock: number;
  shortageQuantity: number;
};
```

`shortageQuantity` is `max(minimumStock - stock, 0)`. Include active variants
where `stock <= minimumStock`, including stock of zero, and order by stock
ascending then variant ID.

## Empty And Optional-Value Contract

- Numeric aggregates always appear and use `0` when no qualifying data exists.
- Collection fields always appear and use `[]` when no rows qualify.
- `barcode` is omitted when the catalog variant has no barcode; it is never an
  empty-string placeholder.
- `currency`, `timeZone`, `storeId`, and a report's effective `period` are
  always present in `meta`.
- Requests with invalid dates, an invalid IANA time zone, or `from > to` return
  the standard `400 VALIDATION_ERROR` envelope.

## Dashboard Composition Decision

Decide and document one of the following before implementation:

1. **Composed dashboard (recommended):** the frontend calls sales overview,
   best sellers, and low stock independently. This keeps report caching and
   refresh behavior isolated.
2. **Dashboard aggregate:** add `GET /api/v1/reports/dashboard` that returns
   the sales overview, a bounded best-seller list, and a bounded low-stock
   list in one consistent snapshot.

If option 2 is selected, its response should reuse the exact report DTOs,
include a common `meta`, and state whether all widgets share one database
snapshot/transaction.

## Deferred Metrics

Implement these as separate query handlers and endpoint sections after the
core contract is stable:

- **Worst sellers:** define whether this means lowest positive quantity sold,
  unsold active variants, or both; require a requested period and an explicit
  catalog eligibility rule.
- **Inventory valuation:** requires an approved valuation method and a stored
  cost basis (for example weighted average cost). Retail price must not be
  presented as inventory cost valuation.
- **Promotions used:** count applied promotion instances from completed sales
  for a requested period.
- **Promotion revenue:** define whether it means attributed net sales,
  discount granted, or revenue from sales containing a promotion. Persist
  promotion-application attribution at checkout before exposing this metric.

## Implementation Sequence

1. Confirm the open decisions below with product and frontend stakeholders.
2. Add failing application tests for period validation, IANA-zone boundaries,
   zero-filled series, store isolation, and money rounding.
3. Extend reporting ports/read models with catalog display and store settings
   data; keep reporting read-only.
4. Implement the new handlers and DTOs, then add integration tests for HTTP
   validation, response envelopes, authorization, and store isolation.
5. Update all reporting Lambda schemas/routes and regenerate the OpenAPI
   contracts with concrete schemas and examples.
6. Migrate the frontend, retain compatibility endpoints as needed, and publish
   a deprecation date for replaced query parameters or payloads.
7. Add deferred-metric read models only after the required source data and
   business definitions are approved.

## Open Decisions

- Which store setting is authoritative for ISO currency and IANA time zone?
- Should dashboard widgets be independently fetched or returned by one
  dashboard endpoint?
- What maximum date range and pagination/limits are acceptable for reports?
- How should refunds affect daily totals and best-seller rankings?
- Which inventory valuation method is approved?
- What is the business definition of promotion revenue and worst seller?
