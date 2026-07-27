import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  customers,
  inventoryMovements,
  productVariants,
  products,
  promotionActions,
  promotionConditions,
  promotions,
  saleItems,
  sales,
  stores,
  userStoreRoles,
} from '@src/app/core/infrastructure/database/schema';

describe('Wearly Drizzle schema', () => {
  it('owns the required tenant-scoped aggregates', () => {
    expect(
      [
        stores,
        products,
        productVariants,
        inventoryMovements,
        customers,
        sales,
        saleItems,
        promotions,
        promotionConditions,
        promotionActions,
        userStoreRoles,
      ].map(getTableName)
    ).toEqual([
      'stores',
      'products',
      'product_variants',
      'inventory_movements',
      'customers',
      'sales',
      'sale_items',
      'promotions',
      'promotion_conditions',
      'promotion_actions',
      'user_store_roles',
    ]);
  });

  it('stores stock and tenant boundaries on product variants', () => {
    expect(productVariants.storeId.notNull).toBe(true);
    expect(productVariants.productId.notNull).toBe(true);
    expect(productVariants.stock.notNull).toBe(true);
    expect(productVariants.minimumStock.notNull).toBe(true);
    expect(sales.paymentReference.notNull).toBe(false);
  });
});
