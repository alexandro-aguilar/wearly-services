# Customers Feature Spec

## Purpose

Customers owns customer records for checkout attribution, customer lookup, customer history, and future loyalty features.

## Domain Language

Initial customer shape is intentionally small until a full customer profile policy is approved:

```ts
type Customer = {
  id: string;
  storeId: string;
  name: string;
  phone?: string;
  email?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

Important value objects include `CustomerId`, `StoreId`, `EmailAddress`, and `PhoneNumber`.

## Invariants

- Customer belongs to exactly one store.
- Customer name is required.
- Contact fields must be validated at the boundary.
- Customer history must be scoped by `storeId`.
- Customer updates must preserve sale history.

## Commands

- `CreateCustomerCommand`
- `UpdateCustomerCommand`
- `DeactivateCustomerCommand`

## Queries

- `GetCustomerByIdQuery`
- `ListCustomersQuery`
- `SearchCustomersQuery`
- `GetCustomerSalesHistoryQuery`

Customer history reads sales projections and must not mutate sales state.

## API

```text
GET   /api/v1/customers
POST  /api/v1/customers
PATCH /api/v1/customers/:id
```

Expected behavior:

- Customer reads and writes are scoped by store.
- Customer creation validates contact fields.
- Customer updates preserve sale history.
- Customer lookup supports checkout workflows.

## Persistence

Customers owns customer persistence. Future uniqueness rules for email or phone should be scoped by store if business policy requires uniqueness.

Sales may reference `customerId`, but customers should not directly mutate sales records.

## Authorization

Suggested capabilities:

- `ADMIN`: manage customers.
- `MANAGER`: manage customers.
- `CASHIER`: create or update customer records during checkout if business policy allows.

## Tests

High-priority scenarios:

- Customer records can be maintained per store.
- Invalid contact fields are rejected at the boundary.
- Store A cannot read or mutate Store B customers.
- Customer updates do not alter existing sale history.
