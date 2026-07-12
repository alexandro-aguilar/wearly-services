import { sql } from 'drizzle-orm';
import { InsufficientStockError, StalePricingError } from '@src/shared/domain/exceptions/PlatformError';
import { CheckoutSaleRevalidator } from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
import { CheckoutTransactionContext } from '@src/app/modules/sales/infrastructure/database/CheckoutTransactionContext';

export class DrizzleCheckoutSaleRevalidator implements CheckoutSaleRevalidator {
  async lockAndValidate(
    storeId: string,
    items: readonly { variantId: string; quantity: number; unitPrice: number }[]
  ): Promise<void> {
    const database = CheckoutTransactionContext.current();
    for (const item of [...items].sort((left, right) => left.variantId.localeCompare(right.variantId))) {
      const result = await database.execute(
        sql`select variants.stock, variants.price, variants.active as variant_active, products.active as product_active from product_variants variants join products on products.id = variants.product_id and products.store_id = variants.store_id where variants.store_id = ${storeId} and variants.id = ${item.variantId} for update`
      );
      const row = result.rows[0] as
        | { stock: number; price: string; variant_active: boolean; product_active: boolean }
        | undefined;
      if (!row || !row.variant_active || !row.product_active || Number(row.price) !== item.unitPrice)
        throw new StalePricingError();
      if (Number(row.stock) < item.quantity) throw new InsufficientStockError();
    }
  }
}
