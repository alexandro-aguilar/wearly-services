import {
  ProductRepository,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { SalesCatalogGateway, SalesCatalogVariant } from '@src/app/modules/sales/application/ports/SalesRepositories';

export class CatalogSalesGateway implements SalesCatalogGateway {
  constructor(
    private readonly variants: ProductVariantRepository,
    private readonly products: ProductRepository
  ) {}

  async findActiveVariant(storeId: string, productVariantId: string): Promise<SalesCatalogVariant | undefined> {
    const variant = await this.variants.findById(storeId, productVariantId);
    if (!variant?.active) {
      return undefined;
    }
    const product = await this.products.findById(storeId, variant.productId);
    if (!product?.active) {
      return undefined;
    }
    return {
      productVariantId: variant.id,
      productId: product.id,
      category: product.categoryId,
      brand: product.brandId,
      unitPrice: variant.price,
    };
  }
}
