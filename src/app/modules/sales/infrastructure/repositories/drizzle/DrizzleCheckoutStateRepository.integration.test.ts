import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  checkoutQuotes,
  inventoryMovements,
  productVariants,
  products,
  saleIdempotency,
  saleItems,
  sales,
  stores,
} from '@src/app/core/infrastructure/database/schema';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';
import { CompleteQuoteSaleHandler } from '@src/app/modules/sales/application/commands/CompleteQuoteSaleHandler';
import { RoleBasedSalesAuthorizationPolicy } from '@src/app/modules/sales/application/SalesAuthorizationPolicy';
import { CheckoutQuoteSnapshot } from '@src/app/modules/sales/domain/CheckoutQuote';
import { CheckoutTransactionContext } from '@src/app/modules/sales/infrastructure/database/CheckoutTransactionContext';
import {
  DrizzleCheckoutQuoteRepository,
  DrizzleSaleIdempotencyRepository,
} from '@src/app/modules/sales/infrastructure/repositories/drizzle/DrizzleCheckoutStateRepository';
import { DrizzleSaleRepository } from '@src/app/modules/sales/infrastructure/repositories/drizzle/DrizzleSaleRepository';
import { DrizzleCheckoutSaleRevalidator } from '@src/app/modules/sales/infrastructure/services/DrizzleCheckoutSaleRevalidator';
import { DrizzleCheckoutTransactionManager } from '@src/app/modules/sales/infrastructure/services/DrizzleCheckoutTransactionManager';
import { DrizzleCatalogCheckoutGateway } from '@src/app/modules/sales/infrastructure/services/DrizzleCatalogCheckoutGateway';
import { CheckoutPricingService } from '@src/app/modules/sales/infrastructure/services/CheckoutPricingService';
import { InventorySalesGateway } from '@src/app/modules/sales/infrastructure/services/InventorySalesGateway';
import {
  DrizzleInventoryMovementRepository,
  DrizzleInventoryVariantStockGateway,
} from '@src/app/modules/inventory/infrastructure/repositories/drizzle/DrizzleInventoryRepositories';
import { ConflictError, InsufficientStockError, StalePricingError } from '@src/shared/domain/exceptions/PlatformError';

const integrationEnabled = process.env.RUN_POSTGRES_INTEGRATION === '1';
const describeIntegration = integrationEnabled ? describe : describe.skip;
const createdStoreIds: string[] = [];

describeIntegration('Drizzle checkout state repositories', () => {
  afterEach(async () => {
    for (const storeId of createdStoreIds.splice(0)) {
      await db.delete(saleIdempotency).where(eq(saleIdempotency.storeId, storeId));
      await db.delete(inventoryMovements).where(eq(inventoryMovements.storeId, storeId));
      const storeSales = await db.select({ id: sales.id }).from(sales).where(eq(sales.storeId, storeId));
      for (const sale of storeSales) await db.delete(saleItems).where(eq(saleItems.saleId, sale.id));
      await db.delete(sales).where(eq(sales.storeId, storeId));
      await db.delete(checkoutQuotes).where(eq(checkoutQuotes.storeId, storeId));
      await db.delete(productVariants).where(eq(productVariants.storeId, storeId));
      await db.delete(products).where(eq(products.storeId, storeId));
      await db.delete(stores).where(eq(stores.id, storeId));
    }
  });

  it('persists quote snapshots and rolls back writes made through the checkout transaction context', async () => {
    const storeId = await createStore();
    const quote = quoteFor(storeId);
    const quotes = new DrizzleCheckoutQuoteRepository();

    await quotes.save(quote);
    await expect(quotes.findById(storeId, quote.id)).resolves.toEqual(quote);

    const rolledBackQuote = quoteFor(storeId);
    await expect(
      CheckoutTransactionContext.execute(async () => {
        await new DrizzleCheckoutQuoteRepository().save(rolledBackQuote);
        throw new Error('force rollback');
      })
    ).rejects.toThrow('force rollback');
    await expect(quotes.findById(storeId, rolledBackQuote.id)).resolves.toBeUndefined();
  });

  it('atomically allows only one concurrent claim for an idempotency key and reclaims a failed key', async () => {
    const storeId = await createStore();
    const repository = new DrizzleSaleIdempotencyRepository();
    const record = {
      storeId,
      key: randomUUID(),
      fingerprint: JSON.stringify({ quoteId: randomUUID(), paymentMethod: 'CASH' }),
      status: 'PENDING' as const,
    };

    const claims = await Promise.all([repository.claim(record), repository.claim(record)]);
    expect(claims.filter((claim) => claim.claimed)).toHaveLength(1);
    expect(claims.filter((claim) => !claim.claimed)).toHaveLength(1);

    await repository.save({ ...record, status: 'FAILED' });
    await expect(repository.claim(record)).resolves.toMatchObject({ claimed: true, record });
  });

  it('completes only one of two concurrent quote-backed retries and replays the completed sale', async () => {
    const harness = await createCheckoutHarness();
    const command = { quoteId: harness.quote.id, paymentMethod: 'CASH' as const, idempotencyKey: randomUUID() };

    const results = await Promise.allSettled([
      harness.handler.execute(harness.principal, command),
      harness.handler.execute(harness.principal, command),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected').map((result) => (result as PromiseRejectedResult).reason)
    ).toEqual([expect.any(ConflictError)]);
    const replay = await harness.handler.execute(harness.principal, command);
    expect(replay.id).toBe(
      (results.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<{ id: string }>).value.id
    );
    await expect(stockFor(harness.storeId, harness.variantId)).resolves.toBe(3);
    await expect(countFor(sales, harness.storeId)).resolves.toBe(1);
    await expect(countFor(inventoryMovements, harness.storeId)).resolves.toBe(1);
  });

  it('rejects expired, repriced, and insufficient-stock quotes without creating partial sale writes', async () => {
    const expired = await createCheckoutHarness({ expiresAt: new Date('2026-07-22T11:59:00.000Z') });
    await expect(
      expired.handler.execute(expired.principal, {
        quoteId: expired.quote.id,
        paymentMethod: 'CASH',
        idempotencyKey: randomUUID(),
      })
    ).rejects.toBeInstanceOf(StalePricingError);

    const repriced = await createCheckoutHarness();
    await db.update(productVariants).set({ price: '11.00' }).where(eq(productVariants.id, repriced.variantId));
    await expect(
      repriced.handler.execute(repriced.principal, {
        quoteId: repriced.quote.id,
        paymentMethod: 'CASH',
        idempotencyKey: randomUUID(),
      })
    ).rejects.toBeInstanceOf(StalePricingError);

    const outOfStock = await createCheckoutHarness();
    await db.update(productVariants).set({ stock: 1 }).where(eq(productVariants.id, outOfStock.variantId));
    await expect(
      outOfStock.handler.execute(outOfStock.principal, {
        quoteId: outOfStock.quote.id,
        paymentMethod: 'CASH',
        idempotencyKey: randomUUID(),
      })
    ).rejects.toBeInstanceOf(InsufficientStockError);

    for (const harness of [expired, repriced, outOfStock]) {
      await expect(countFor(sales, harness.storeId)).resolves.toBe(0);
      await expect(countFor(inventoryMovements, harness.storeId)).resolves.toBe(0);
    }
  });

  it('rolls back stock and inventory movement when sale persistence fails', async () => {
    const duplicateSaleId = randomUUID();
    const harness = await createCheckoutHarness({ saleId: duplicateSaleId });
    await db.insert(sales).values({
      id: duplicateSaleId,
      storeId: harness.storeId,
      subtotal: '0.00',
      discount: '0.00',
      tax: '0.00',
      total: '0.00',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      createdAt: new Date('2026-07-22T12:00:00.000Z'),
    });

    await expect(
      harness.handler.execute(harness.principal, {
        quoteId: harness.quote.id,
        paymentMethod: 'CASH',
        idempotencyKey: randomUUID(),
      })
    ).rejects.toThrow();
    await expect(stockFor(harness.storeId, harness.variantId)).resolves.toBe(5);
    await expect(countFor(inventoryMovements, harness.storeId)).resolves.toBe(0);
  });
});

async function createStore(): Promise<string> {
  const id = randomUUID();
  createdStoreIds.push(id);
  await db.insert(stores).values({ id, name: `Integration ${id}`, code: `I${id.replaceAll('-', '').slice(0, 10)}` });
  return id;
}

function quoteFor(storeId: string): CheckoutQuoteSnapshot {
  return {
    id: randomUUID(),
    storeId,
    subjectId: 'integration-user',
    expiresAt: new Date('2026-07-22T12:05:00.000Z'),
    currency: 'MXN',
    items: [],
    appliedPromotions: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  };
}

async function createCheckoutHarness(options: { expiresAt?: Date; saleId?: string } = {}) {
  const storeId = await createStore();
  const productId = randomUUID();
  const variantId = randomUUID();
  await db.insert(products).values({
    id: productId,
    storeId,
    name: `Product ${productId}`,
    categoryId: 'shirts',
  });
  await db.insert(productVariants).values({
    id: variantId,
    storeId,
    productId,
    sku: `SKU-${variantId.slice(0, 8)}`,
    price: '10.00',
    cost: '5.00',
    stock: 5,
    minimumStock: 1,
  });
  const quote: CheckoutQuoteSnapshot = {
    ...quoteFor(storeId),
    expiresAt: options.expiresAt ?? new Date('2026-07-22T12:05:00.000Z'),
    items: [
      {
        variantId,
        productName: `Product ${productId}`,
        sku: `SKU-${variantId.slice(0, 8)}`,
        quantity: 2,
        unitPrice: 10,
        discount: 0,
        total: 20,
      },
    ],
    subtotal: 20,
    total: 20,
  };
  const quotes = new DrizzleCheckoutQuoteRepository();
  await quotes.save(quote);
  const stock = new DrizzleInventoryVariantStockGateway();
  const inventory = new InventorySalesGateway(stock, new DrizzleInventoryMovementRepository(), {
    nextId: () => randomUUID(),
  });
  const handler = new CompleteQuoteSaleHandler(
    quotes,
    new DrizzleSaleIdempotencyRepository(),
    new CheckoutPricingService(
      new DrizzleCatalogCheckoutGateway(),
      { getStock: async (storeId, variantId) => (await stock.findById(storeId, variantId))?.stock },
      { evaluate: async () => ({ items: [], appliedPromotions: [] }) }
    ),
    inventory,
    new DrizzleSaleRepository(),
    new DrizzleCheckoutTransactionManager(),
    new RoleBasedSalesAuthorizationPolicy(),
    { now: () => new Date('2026-07-22T12:00:00.000Z') },
    { nextId: () => options.saleId ?? randomUUID() },
    new DrizzleCheckoutSaleRevalidator()
  );
  return {
    storeId,
    variantId,
    quote,
    handler,
    principal: { subjectId: 'integration-user', storeId, roles: ['CASHIER'] as const },
  };
}

async function stockFor(storeId: string, variantId: string): Promise<number | undefined> {
  const [row] = await db
    .select({ stock: productVariants.stock })
    .from(productVariants)
    .where(eq(productVariants.id, variantId));
  return row?.stock;
}

async function countFor(table: typeof sales | typeof inventoryMovements, storeId: string): Promise<number> {
  return (await db.select().from(table).where(eq(table.storeId, storeId))).length;
}
