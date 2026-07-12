import { and, eq } from 'drizzle-orm';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';
import { productVariants, products } from '@src/app/core/infrastructure/database/schema';
import { CheckoutCatalogGateway } from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
import { CheckoutTransactionContext } from '@src/app/modules/sales/infrastructure/database/CheckoutTransactionContext';

export class DrizzleCatalogCheckoutGateway implements CheckoutCatalogGateway {
  constructor(private readonly override?: typeof db) {}
  private get database(): typeof db {
    return this.override ?? CheckoutTransactionContext.current();
  }

  async findActiveVariant(storeId: string, variantId: string) {
    const [row] = await this.database
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productName: products.name,
        sku: productVariants.sku,
        category: products.categoryId,
        brand: products.brandId,
        unitPrice: productVariants.price,
        variantActive: productVariants.active,
        productActive: products.active,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(eq(productVariants.storeId, storeId), eq(products.storeId, storeId), eq(productVariants.id, variantId))
      )
      .limit(1);
    if (!row?.variantActive || !row.productActive) return undefined;
    return {
      variantId: row.variantId,
      productId: row.productId,
      productName: row.productName,
      sku: row.sku,
      category: row.category,
      brand: row.brand ?? undefined,
      unitPrice: Number(row.unitPrice),
    };
  }
}
