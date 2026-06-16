Wearly Backend Handoff

Repository: wearly-api

Overview

Wearly API is the backend for a modern clothing retail POS.

Responsibilities:

* Product catalog
* Inventory management
* Sales / checkout
* Promotion engine
* Customers
* Authentication & authorization
* Reporting

The API will serve:

* React web app
* Future SwiftUI iPad app
* Future mobile apps

Tech Stack

* Node.js 24
* TypeScript
* Fastify
* PostgreSQL
* Prisma
* Vitest
* AWS CDK with TypeScript

Architecture

Use Clean Architecture:

presentation
↓
application
↓
domain
↓
infrastructure

Use Domain Driven Design with these bounded contexts:

Catalog
Inventory
Sales
Promotions
Customers
Reporting
Auth

Project Structure

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

Core Requirements

The backend must support:

* Product and variant management
* Inventory tracking per product variant
* Sales checkout
* Automatic promotion application
* Customer records
* Daily sales reports
* Multi-store support using storeId
* Role-based access control

Core Entities

Product

Product {
  id: string
  storeId: string
  name: string
  description?: string
  categoryId: string
  brandId?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

ProductVariant

ProductVariant {
  id: string
  productId: string
  sku: string
  barcode?: string
  size?: string
  color?: string
  price: number
  cost: number
  stock: number
  minimumStock: number
  active: boolean
}

Sale

Sale {
  id: string
  storeId: string
  customerId?: string
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER'
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  createdAt: Date
}

SaleItem

SaleItem {
  saleId: string
  productVariantId: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

InventoryMovement

InventoryMovement {
  id: string
  storeId: string
  productVariantId: string
  type: 'SALE' | 'PURCHASE' | 'MANUAL_ADJUSTMENT' | 'RETURN' | 'TRANSFER'
  quantity: number
  previousStock: number
  newStock: number
  createdAt: Date
}

Promotion Engine

The promotion engine is a first-class module.

Promotions must be configurable without code changes.

Supported promotion types:

FIXED_COMBO
MIXED_COMBO
PERCENTAGE_DISCOUNT
BUY_X_GET_Y

Examples:

* 2 shirts for $499
* Shirt + pants for $799
* 20% off jackets
* Buy 3, get 1 at 50%

Promotion

Promotion {
  id: string
  storeId: string
  name: string
  description?: string
  type: PromotionType
  conditions: PromotionCondition[]
  actions: PromotionAction[]
  startsAt?: Date
  endsAt?: Date
  priority: number
  active: boolean
}

PromotionCondition

PromotionCondition {
  field: 'category' | 'productId' | 'variantId' | 'quantity' | 'brand'
  operator: 'EQUALS' | 'IN' | 'GREATER_THAN_OR_EQUAL'
  value: string | number | string[]
}

PromotionAction

PromotionAction {
  type: 'SET_FIXED_PRICE' | 'PERCENTAGE_DISCOUNT' | 'FIXED_DISCOUNT' | 'CHEAPEST_ITEM_DISCOUNT'
  value: number
}

API Style

REST API.

Base path:

/api/v1

Initial Endpoints

Catalog

GET    /products
GET    /products/:id
POST   /products
PATCH  /products/:id
DELETE /products/:id

Variants

GET   /variants
POST  /variants
PATCH /variants/:id

Inventory

GET  /inventory
POST /inventory/adjustments
GET  /inventory/movements

Sales

POST /sales
GET  /sales
GET  /sales/:id

Promotions

GET   /promotions
POST  /promotions
PATCH /promotions/:id

Customers

GET   /customers
POST  /customers
PATCH /customers/:id

Reports

GET /reports/daily-sales
GET /reports/best-sellers
GET /reports/low-stock

Authentication

Use AWS Cognito.

Authorization uses JWT Bearer tokens.

Roles:

ADMIN
MANAGER
CASHIER

AWS Infrastructure

Use:

* API Gateway
* Lambda
* Fastify Lambda Adapter
* Aurora PostgreSQL Serverless v2
* Cognito
* S3 for product images, receipts, and reports
* CloudWatch Logs

Infrastructure as Code:

AWS CDK with TypeScript

Testing

Use Vitest.

Required test types:

* Unit tests
* Integration tests
* Repository tests
* Promotion engine tests

Promotion engine tests are high priority.

Observability

Use:

* Structured logging
* AWS Lambda Powertools
* Metrics
* Tracing
* Request correlation IDs

Non-Functional Requirements

* Multi-store ready from day one
* Stateless services
* Fast cold starts
* OpenAPI documentation
* Mobile-friendly API responses
* Strong input validation
* Clear error responses
* No business logic inside route handlers

MVP Priority

1. Catalog
2. Inventory
3. Sales checkout
4. Promotion engine
5. Customers
6. Reports
7. Auth

Definition of Done

The backend MVP is complete when:

* Products and variants can be created.
* Inventory can be adjusted.
* Sales can be completed.
* Stock is reduced after a sale.
* Promotions are applied automatically during checkout.
* Daily sales report works.
* Low stock report works.
* API has tests.
* API has OpenAPI documentation.