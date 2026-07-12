import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    active: boolean('active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('stores_code_unique').on(table.code)]
);

export const userStoreRoles = pgTable(
  'user_store_roles',
  {
    id: uuid('id').primaryKey(),
    cognitoSubject: text('cognito_subject').notNull(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    active: boolean('active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('user_store_roles_subject_store_unique').on(table.cognitoSubject, table.storeId)]
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: text('category_id').notNull(),
    brandId: text('brand_id'),
    active: boolean('active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('products_store_name_unique').on(table.storeId, table.name)]
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    sku: text('sku').notNull(),
    barcode: text('barcode'),
    size: text('size'),
    color: text('color'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    cost: numeric('cost', { precision: 12, scale: 2 }).notNull(),
    stock: integer('stock').default(0).notNull(),
    minimumStock: integer('minimum_stock').default(0).notNull(),
    active: boolean('active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('product_variants_store_sku_unique').on(table.storeId, table.sku),
    uniqueIndex('product_variants_store_barcode_unique').on(table.storeId, table.barcode),
  ]
);

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  active: boolean('active').default(true).notNull(),
  ...timestamps,
});

export const promotions = pgTable('promotions', {
  id: uuid('id').primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  priority: integer('priority').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  ...timestamps,
});

export const promotionConditions = pgTable('promotion_conditions', {
  id: uuid('id').primaryKey(),
  promotionId: uuid('promotion_id')
    .notNull()
    .references(() => promotions.id, { onDelete: 'cascade' }),
  field: text('field').notNull(),
  operator: text('operator').notNull(),
  value: jsonb('value').notNull(),
  position: integer('position').notNull(),
});

export const promotionActions = pgTable('promotion_actions', {
  id: uuid('id').primaryKey(),
  promotionId: uuid('promotion_id')
    .notNull()
    .references(() => promotions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  value: numeric('value', { precision: 12, scale: 2 }).notNull(),
});

export const sales = pgTable('sales', {
  id: uuid('id').primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'restrict' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).notNull(),
  tax: numeric('tax', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const checkoutQuotes = pgTable('checkout_quotes', {
  id: uuid('id').primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'restrict' }),
  subjectId: text('subject_id').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  status: text('status').default('OPEN').notNull(),
  ...timestamps,
});

export const saleIdempotency = pgTable(
  'sale_idempotency',
  {
    id: uuid('id').primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    idempotencyKey: text('idempotency_key').notNull(),
    requestFingerprint: text('request_fingerprint').notNull(),
    status: text('status').notNull(),
    saleId: uuid('sale_id').references(() => sales.id, { onDelete: 'set null' }),
    failureCode: text('failure_code'),
    ...timestamps,
  },
  (table) => [uniqueIndex('sale_idempotency_store_key_unique').on(table.storeId, table.idempotencyKey)]
);

export const saleItems = pgTable(
  'sale_items',
  {
    id: uuid('id').primaryKey(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productVariantId: uuid('product_variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    discount: numeric('discount', { precision: 12, scale: 2 }).notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [uniqueIndex('sale_items_sale_variant_unique').on(table.saleId, table.productVariantId)]
);

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'restrict' }),
  productVariantId: uuid('product_variant_id')
    .notNull()
    .references(() => productVariants.id, { onDelete: 'restrict' }),
  saleId: uuid('sale_id').references(() => sales.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
