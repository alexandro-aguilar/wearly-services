import { ProductVariantRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { SalesCatalogGateway, SalesCatalogVariant } from '@src/app/modules/sales/application/ports/SalesRepositories';

export class CatalogSalesGateway implements SalesCatalogGateway {
  constructor(private readonly variants: ProductVariantRepository) {}

  async findActiveVariant(storeId: string, productVariantId: string): Promise<SalesCatalogVariant | undefined> {
    const variant = await this.variants.findById(storeId, productVariantId);
    if (!variant?.active) {
      return undefined;
    }
    return { productVariantId: variant.id, unitPrice: variant.price };
  }
}
