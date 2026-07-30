# Reporting Frontend Implementation Handoff

## Status

The reporting frontend contract has been implemented. The dashboard should use
the composed-report approach: fetch each widget independently.

## Endpoints

- `GET /api/v1/reports/sales-overview?from=YYYY-MM-DD&to=YYYY-MM-DD&timeZone=Area/City`
- `GET /api/v1/reports/best-sellers?from=YYYY-MM-DD&to=YYYY-MM-DD&timeZone=Area/City&limit=10`
- `GET /api/v1/reports/low-stock`

The existing `GET /api/v1/reports/daily-sales?date=YYYY-MM-DD&timeZone=Area/City`
remains available as a one-day compatibility view. New frontend work should use
`sales-overview` instead.

All successful responses remain wrapped by the API envelope:

```json
{
  "body": {}
}
```

## Sales Overview

`body` contains `meta`, `totals`, and `series`. `from` and `to` are inclusive
local calendar dates. The series is ascending and contains a row for every day
in the requested range, including zero-value rows where no completed sales
occurred.

```json
{
  "body": {
    "meta": {
      "storeId": "store-123",
      "currency": "USD",
      "timeZone": "America/Merida",
      "period": { "from": "2026-07-01", "to": "2026-07-07" }
    },
    "totals": {
      "saleCount": 12,
      "itemQuantity": 18,
      "subtotal": 1200,
      "discount": 75,
      "tax": 180,
      "total": 1305
    },
    "series": [
      {
        "date": "2026-07-01",
        "saleCount": 0,
        "itemQuantity": 0,
        "subtotal": 0,
        "discount": 0,
        "tax": 0,
        "total": 0
      }
    ]
  }
}
```

## Best Sellers

The response has `meta` and `items`. Each item includes `rank`, product and
variant display names, SKU, optional barcode, quantity sold, gross sales,
item discount, and net sales. Rows are ordered by quantity sold descending,
net sales descending, then variant ID ascending.

`grossSales` is before item discounts; `discount` is the allocated item
discount; `netSales` is after that discount.

## Low Stock

The response has `meta` and `items`. Each item includes product and variant
display data, stock, minimum stock, and `shortageQuantity`.

Only active variants where `stock <= minimumStock` are returned. Zero stock is
included. Rows are ordered by stock ascending, then variant ID ascending.

## Empty and optional values

- Numeric aggregates are always present and use `0` when no data qualifies.
- Collections are always present and use `[]` when no rows qualify.
- `barcode` is omitted when it is not available; it is never an empty string.
- Only `COMPLETED` sales contribute to sales totals and best-seller results.
- Invalid dates, invalid IANA time zones, and inverted periods return the
  standard `400 VALIDATION_ERROR` envelope.

## Current configuration note

Currency currently reports as `USD`. Sales reports use the requested IANA
time zone; low-stock currently reports `UTC` because it has no date-based
calculation. Store-level currency and time-zone settings are not yet modeled,
so frontend clients should treat these metadata values as authoritative for the
current response and should not hard-code their own defaults.
