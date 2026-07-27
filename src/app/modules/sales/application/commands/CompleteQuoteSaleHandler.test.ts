import { describe, expect, it } from 'vitest';
import { CompleteQuoteSaleHandler } from '@src/app/modules/sales/application/commands/CompleteQuoteSaleHandler';
import { RoleBasedSalesAuthorizationPolicy } from '@src/app/modules/sales/application/SalesAuthorizationPolicy';
import { CheckoutQuoteSnapshot } from '@src/app/modules/sales/domain/CheckoutQuote';
import { SaleSnapshot } from '@src/app/modules/sales/domain/Sale';
import { ConflictError } from '@src/shared/domain/exceptions/PlatformError';

describe('CompleteQuoteSaleHandler', () => {
  const principal = { subjectId: 'user-1', storeId: 'store-a', roles: ['CASHIER'] };

  it('replays a completed sale without reducing stock twice and preserves a payment reference', async () => {
    const harness = createHarness();
    const command = {
      quoteId: 'quote-1',
      paymentMethod: 'CARD' as const,
      terminalTransactionReference: 'terminal-123',
      idempotencyKey: 'key-1',
    };

    await expect(harness.handler.execute(principal, command)).resolves.toMatchObject({
      id: 'sale-1',
      paymentReference: 'terminal-123',
    });
    await expect(harness.handler.execute(principal, command)).resolves.toMatchObject({ id: 'sale-1' });
    expect(harness.stock).toBe(3);
    expect(harness.sales).toHaveLength(1);
    expect(harness.sales[0].paymentReference).toBe('terminal-123');
  });

  it('does not process a request while the same idempotency key is pending', async () => {
    const harness = createHarness();
    await harness.idempotency.save({
      storeId: 'store-a',
      key: 'key-1',
      fingerprint: JSON.stringify({ quoteId: 'quote-1', paymentMethod: 'CASH', tenderedAmount: undefined }),
      status: 'PENDING',
    });

    await expect(
      harness.handler.execute(principal, { quoteId: 'quote-1', paymentMethod: 'CASH', idempotencyKey: 'key-1' })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(harness.sales).toHaveLength(0);
  });

  it('atomically reclaims a failed idempotency key before retrying it', async () => {
    const harness = createHarness();
    await harness.idempotency.save({
      storeId: 'store-a',
      key: 'key-1',
      fingerprint: JSON.stringify({ quoteId: 'quote-1', paymentMethod: 'CASH', tenderedAmount: undefined }),
      status: 'FAILED',
    });

    await expect(
      harness.handler.execute(principal, { quoteId: 'quote-1', paymentMethod: 'CASH', idempotencyKey: 'key-1' })
    ).resolves.toMatchObject({ id: 'sale-1' });
    expect(harness.sales).toHaveLength(1);
  });

  it('returns completed-sale merchandising and promotion attribution from the quote for idempotency lookup', async () => {
    const harness = createHarness();
    await harness.handler.execute(principal, {
      quoteId: 'quote-1',
      paymentMethod: 'CASH',
      idempotencyKey: 'key-1',
    });

    await expect(harness.handler.status(principal, 'key-1')).resolves.toMatchObject({
      key: 'key-1',
      status: 'COMPLETED',
      sale: {
        items: [{ productName: 'Linen shirt', sku: 'LINEN-M' }],
        appliedPromotions: [{ id: 'promotion-1', name: 'Shirt promotion', discount: '2.00' }],
      },
    });
  });

  it('returns completed-sale merchandising and promotion attribution when loading a sale by ID', async () => {
    const harness = createHarness();
    await harness.handler.execute(principal, {
      quoteId: 'quote-1',
      paymentMethod: 'CASH',
      idempotencyKey: 'key-1',
    });

    await expect(harness.handler.getSale(principal, 'sale-1')).resolves.toMatchObject({
      items: [{ productName: 'Linen shirt', sku: 'LINEN-M' }],
      appliedPromotions: [{ id: 'promotion-1', name: 'Shirt promotion', discount: '2.00' }],
    });
  });
});

function createHarness() {
  let stock = 5;
  const sales: SaleSnapshot[] = [];
  const quote: CheckoutQuoteSnapshot = {
    id: 'quote-1',
    storeId: 'store-a',
    subjectId: 'user-1',
    expiresAt: new Date('2026-07-22T12:05:00.000Z'),
    currency: 'MXN',
    items: [
      {
        variantId: 'variant-1',
        productName: 'Linen shirt',
        sku: 'LINEN-M',
        quantity: 2,
        unitPrice: 10,
        discount: 2,
        total: 18,
      },
    ],
    appliedPromotions: [{ id: 'promotion-1', name: 'Shirt promotion', discount: 2 }],
    subtotal: 20,
    discount: 2,
    tax: 0,
    total: 18,
  };
  const records = new Map<
    string,
    { storeId: string; key: string; fingerprint: string; status: 'PENDING' | 'COMPLETED' | 'FAILED'; saleId?: string }
  >();
  const idempotency = {
    find: async (storeId: string, key: string) => records.get(`${storeId}:${key}`),
    findBySaleId: async (storeId: string, saleId: string) =>
      [...records.values()].find((record) => record.storeId === storeId && record.saleId === saleId),
    claim: async (record: {
      storeId: string;
      key: string;
      fingerprint: string;
      status: 'PENDING' | 'COMPLETED' | 'FAILED';
      saleId?: string;
    }) => {
      const existing = records.get(`${record.storeId}:${record.key}`);
      if (existing) return { claimed: false, record: existing };
      records.set(`${record.storeId}:${record.key}`, { ...record });
      return { claimed: true, record };
    },
    save: async (record: {
      storeId: string;
      key: string;
      fingerprint: string;
      status: 'PENDING' | 'COMPLETED' | 'FAILED';
      saleId?: string;
    }) => {
      records.set(`${record.storeId}:${record.key}`, { ...record });
    },
  };
  const handler = new CompleteQuoteSaleHandler(
    { save: async () => undefined, findById: async () => quote },
    idempotency,
    {
      price: async () => ({ ...quote, id: undefined, storeId: undefined, subjectId: undefined, expiresAt: undefined }),
    },
    {
      getStock: async () => stock,
      reduceStock: async (_storeId: string, _variantId: string, quantity: number) => void (stock -= quantity),
    },
    {
      save: async (sale: SaleSnapshot) => void sales.push(sale),
      findById: async (_storeId: string, id: string) => sales.find((sale) => sale.id === id),
      list: async () => sales,
    },
    { execute: async <T>(work: () => Promise<T>) => work() },
    new RoleBasedSalesAuthorizationPolicy(),
    { now: () => new Date('2026-07-22T12:00:00.000Z') },
    { nextId: () => 'sale-1' }
  );
  return {
    handler,
    idempotency,
    sales,
    get stock() {
      return stock;
    },
  };
}
