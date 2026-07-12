/* eslint-disable @typescript-eslint/no-use-before-define */
import { describe, expect, it } from 'vitest';
import { CreateCheckoutQuoteHandler } from '@src/app/modules/sales/application/commands/CreateCheckoutQuoteHandler';
import { InMemoryCheckoutQuoteRepository } from '@src/app/modules/sales/infrastructure/repositories/in-memory/InMemoryCheckoutQuoteRepository';
import { CheckoutPricingService } from '@src/app/modules/sales/infrastructure/services/CheckoutPricingService';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import {
  ForbiddenError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from '@src/shared/domain/exceptions/PlatformError';

describe('CreateCheckoutQuoteHandler', () => {
  it('creates a five-minute, server-priced quote with promotion attribution', async () => {
    const quotes = new InMemoryCheckoutQuoteRepository();
    const handler = new CreateCheckoutQuoteHandler(
      quotes,
      new CheckoutPricingService(catalog, inventory, promotions),
      clock,
      ids
    );

    await expect(handler.execute(cashier(), { items: [{ variantId: 'variant-1', quantity: 2 }] })).resolves.toEqual({
      quoteId: 'quote-1',
      expiresAt: '2026-07-12T12:05:00.000Z',
      currency: 'MXN',
      items: [
        {
          variantId: 'variant-1',
          productName: 'Linen shirt',
          sku: 'LINEN-M',
          quantity: 2,
          unitPrice: '499.00',
          discount: '50.00',
          total: '948.00',
        },
      ],
      appliedPromotions: [{ id: 'promotion-1', name: 'Two shirts', discount: '50.00' }],
      subtotal: '998.00',
      discount: '50.00',
      tax: '0.00',
      total: '948.00',
    });
    await expect(quotes.findById('store-a', 'quote-1')).resolves.toMatchObject({ subjectId: 'cashier-1' });
  });

  it('rejects invalid quantities, unavailable stock, and unauthorized manual discounts', async () => {
    const handler = new CreateCheckoutQuoteHandler(
      new InMemoryCheckoutQuoteRepository(),
      new CheckoutPricingService(catalog, inventory, promotions),
      clock,
      ids
    );
    await expect(
      handler.execute(cashier(), { items: [{ variantId: 'variant-1', quantity: 0 }] })
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(handler.execute(cashier(), { items: [{ variantId: 'missing', quantity: 1 }] })).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(
      handler.execute(cashier(), { items: [{ variantId: 'variant-1', quantity: 6 }] })
    ).rejects.toBeInstanceOf(InsufficientStockError);
    await expect(
      handler.execute(cashier(), {
        items: [{ variantId: 'variant-1', quantity: 1 }],
        manualDiscount: { amount: '10.00', reason: 'Nope' },
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

const catalog = {
  findActiveVariant: async (storeId: string, id: string) =>
    storeId === 'store-a' && id === 'variant-1'
      ? {
          variantId: id,
          productId: 'product-1',
          productName: 'Linen shirt',
          sku: 'LINEN-M',
          category: 'tops',
          unitPrice: 499,
        }
      : undefined,
};
const inventory = {
  getStock: async (storeId: string, id: string) => (storeId === 'store-a' && id === 'variant-1' ? 5 : undefined),
};
const promotions = {
  evaluate: async () => ({
    items: [{ variantId: 'variant-1', discount: 50 }],
    appliedPromotions: [{ id: 'promotion-1', name: 'Two shirts', discount: 50 }],
  }),
};
const clock = { now: () => new Date('2026-07-12T12:00:00.000Z') };
const ids = { nextId: () => 'quote-1' };
function cashier(): AuthenticatedPrincipal {
  return { subjectId: 'cashier-1', storeId: 'store-a', roles: ['CASHIER'] };
}
