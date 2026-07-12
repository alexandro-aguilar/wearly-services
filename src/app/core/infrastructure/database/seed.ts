import 'dotenv/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

const ids = {
  store: '10000000-0000-4000-8000-000000000001',
  secondaryStore: '10000000-0000-4000-8000-000000000002',
  userRole: '20000000-0000-4000-8000-000000000001',
  product: '30000000-0000-4000-8000-000000000001',
  variant: '40000000-0000-4000-8000-000000000001',
  customer: '50000000-0000-4000-8000-000000000001',
  promotion: '60000000-0000-4000-8000-000000000001',
  promotionCondition: '70000000-0000-4000-8000-000000000001',
  promotionAction: '80000000-0000-4000-8000-000000000001',
  sale: '90000000-0000-4000-8000-000000000001',
  saleItem: 'a0000000-0000-4000-8000-000000000001',
  inventoryMovement: 'b0000000-0000-4000-8000-000000000001',
} as const;

async function clean(db: NodePgDatabase<typeof schema>): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(schema.inventoryMovements);
    await tx.delete(schema.saleItems);
    await tx.delete(schema.sales);
    await tx.delete(schema.promotionActions);
    await tx.delete(schema.promotionConditions);
    await tx.delete(schema.promotions);
    await tx.delete(schema.customers);
    await tx.delete(schema.productVariants);
    await tx.delete(schema.products);
    await tx.delete(schema.userStoreRoles);
    await tx.delete(schema.stores);
  });
}

async function seed(db: NodePgDatabase<typeof schema>): Promise<void> {
  await clean(db);

  await db.transaction(async (tx) => {
    await tx.insert(schema.stores).values([
      { id: ids.store, name: 'Wearly Mérida Centro', code: 'MERIDA-CENTRO' },
      { id: ids.secondaryStore, name: 'Wearly Norte', code: 'MERIDA-NORTE' },
    ]);
    await tx.insert(schema.userStoreRoles).values({
      id: ids.userRole,
      cognitoSubject: 'local-admin',
      storeId: ids.store,
      role: 'ADMIN',
    });
    await tx.insert(schema.products).values({
      id: ids.product,
      storeId: ids.store,
      name: 'Linen Shirt',
      description: 'Breathable linen shirt for everyday wear.',
      categoryId: 'tops',
      brandId: 'wearly',
    });
    await tx.insert(schema.productVariants).values({
      id: ids.variant,
      storeId: ids.store,
      productId: ids.product,
      sku: 'LINEN-SHIRT-NAVY-M',
      barcode: '750000000001',
      size: 'M',
      color: 'Navy',
      price: '899.00',
      cost: '420.00',
      stock: 11,
      minimumStock: 3,
    });
    await tx.insert(schema.customers).values({
      id: ids.customer,
      storeId: ids.store,
      name: 'Ana Torres',
      phone: '+529991234567',
      email: 'ana.torres@example.test',
    });
    await tx.insert(schema.promotions).values({
      id: ids.promotion,
      storeId: ids.store,
      name: 'Linen launch discount',
      type: 'PERCENTAGE_DISCOUNT',
      priority: 10,
    });
    await tx.insert(schema.promotionConditions).values({
      id: ids.promotionCondition,
      promotionId: ids.promotion,
      field: 'category',
      operator: 'EQUALS',
      value: 'tops',
      position: 0,
    });
    await tx.insert(schema.promotionActions).values({
      id: ids.promotionAction,
      promotionId: ids.promotion,
      type: 'PERCENTAGE_DISCOUNT',
      value: '10.00',
    });
    await tx.insert(schema.sales).values({
      id: ids.sale,
      storeId: ids.store,
      customerId: ids.customer,
      subtotal: '899.00',
      discount: '89.90',
      tax: '0.00',
      total: '809.10',
      paymentMethod: 'CARD',
      status: 'COMPLETED',
    });
    await tx.insert(schema.saleItems).values({
      id: ids.saleItem,
      saleId: ids.sale,
      productVariantId: ids.variant,
      quantity: 1,
      unitPrice: '899.00',
      discount: '89.90',
      total: '809.10',
    });
    await tx.insert(schema.inventoryMovements).values({
      id: ids.inventoryMovement,
      storeId: ids.store,
      productVariantId: ids.variant,
      saleId: ids.sale,
      type: 'SALE',
      quantity: -1,
      previousStock: 12,
      newStock: 11,
    });
  });
}

function createClient(): Client {
  return new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
}

async function main(): Promise<void> {
  const task = process.argv[2];
  if (task !== 'seed' && task !== 'clean') {
    throw new Error('Unknown task. Use "seed" or "clean".');
  }

  const client = createClient();
  await client.connect();
  try {
    const db = drizzle(client, { schema });
    if (task === 'seed') await seed(db);
    else await clean(db);
    process.stdout.write(`Wearly database ${task} completed.\n`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('Database seed task failed.', error);
  process.exitCode = 1;
});
