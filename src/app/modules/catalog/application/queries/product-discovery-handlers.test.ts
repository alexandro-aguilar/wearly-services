import { describe, expect, it } from 'vitest';
import { RoleBasedCatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/CatalogAuthorizationPolicy';
import { DiscoverProductsHandler } from '@src/app/modules/catalog/application/queries/DiscoverProductsHandler';
import { DiscoverVariantsHandler } from '@src/app/modules/catalog/application/queries/DiscoverVariantsHandler';
import { InMemoryCatalogDiscoveryRepository } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogDiscoveryRepository';
import { InMemoryCatalogStore } from '@src/app/modules/catalog/infrastructure/repositories/in-memory/InMemoryCatalogStore';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

describe('product discovery handlers', () => {
  it('returns a deterministic, store-scoped product search page', async () => {
    const store = new InMemoryCatalogStore();
    store.products.set('store-a:product-2', product('product-2', 'store-a', 'Linen trousers', 'pants'));
    store.products.set('store-a:product-1', product('product-1', 'store-a', 'Linen shirt', 'tops'));
    store.products.set('store-b:product-3', product('product-3', 'store-b', 'Linen shirt', 'tops'));
    const handler = new DiscoverProductsHandler(
      new InMemoryCatalogDiscoveryRepository(store),
      new RoleBasedCatalogAuthorizationPolicy()
    );

    await expect(
      handler.execute(cashier('store-a'), { q: 'linen', categoryId: 'tops', page: 1, pageSize: 1 })
    ).resolves.toEqual({
      items: [{ id: 'product-1', name: 'Linen shirt', categoryId: 'tops', active: true }],
      page: 1,
      pageSize: 1,
      total: 1,
    });
  });

  it('joins product merchandising data and derives authoritative variant stock status', async () => {
    const store = new InMemoryCatalogStore();
    store.products.set('store-a:product-active', product('product-active', 'store-a', 'Linen shirt', 'tops'));
    store.products.set(
      'store-a:product-inactive',
      product('product-inactive', 'store-a', 'Summer shirt', 'tops', false)
    );
    store.variants.set(
      'store-a:variant-low',
      variant('variant-low', 'store-a', 'product-active', 'LINEN-M', '100', 2, 2)
    );
    store.variants.set(
      'store-a:variant-out',
      variant('variant-out', 'store-a', 'product-active', 'LINEN-L', '101', 0, 2)
    );
    store.variants.set(
      'store-a:variant-unavailable',
      variant('variant-unavailable', 'store-a', 'product-inactive', 'SUMMER-M', '102', 9, 2)
    );
    store.variants.set(
      'store-b:variant-other-store',
      variant('variant-other-store', 'store-b', 'product-active', 'LINEN-S', '103', 9, 2)
    );
    const handler = new DiscoverVariantsHandler(
      new InMemoryCatalogDiscoveryRepository(store),
      new RoleBasedCatalogAuthorizationPolicy()
    );

    await expect(handler.execute(cashier('store-a'), { q: 'linen', page: 1, pageSize: 10 })).resolves.toEqual({
      items: [
        {
          id: 'variant-low',
          productId: 'product-active',
          productName: 'Linen shirt',
          sku: 'LINEN-M',
          barcode: '100',
          price: '499.00',
          stock: 2,
          stockStatus: 'LOW_STOCK',
          active: true,
        },
        {
          id: 'variant-out',
          productId: 'product-active',
          productName: 'Linen shirt',
          sku: 'LINEN-L',
          barcode: '101',
          price: '499.00',
          stock: 0,
          stockStatus: 'OUT_OF_STOCK',
          active: true,
        },
      ],
      page: 1,
      pageSize: 10,
      total: 2,
    });

    await expect(handler.execute(cashier('store-a'), { barcode: '102' })).resolves.toMatchObject({
      items: [expect.objectContaining({ id: 'variant-unavailable', stockStatus: 'UNAVAILABLE' })],
    });
  });
});

function product(id: string, storeId: string, name: string, categoryId: string, active: boolean = true) {
  return {
    id,
    storeId,
    name,
    categoryId,
    active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function variant(
  id: string,
  storeId: string,
  productId: string,
  sku: string,
  barcode: string,
  stock: number,
  minimumStock: number,
  active: boolean = true
) {
  return {
    id,
    storeId,
    productId,
    sku,
    barcode,
    price: 499,
    cost: 200,
    stock,
    minimumStock,
    active,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function cashier(storeId: string): AuthenticatedPrincipal {
  return { subjectId: 'cashier-1', storeId, roles: ['CASHIER'] };
}
