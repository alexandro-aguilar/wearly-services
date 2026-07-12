import {
  ProductRepository,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { CheckoutCatalogGateway } from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
export class CatalogCheckoutGateway implements CheckoutCatalogGateway {
  constructor(
    private readonly variants: ProductVariantRepository,
    private readonly products: ProductRepository
  ) {}
  async findActiveVariant(storeId: string, variantId: string) {
    const variant = await this.variants.findById(storeId, variantId);
    const product = variant ? await this.products.findById(storeId, variant.productId) : undefined;
    if (!variant?.active || !product?.active) return undefined;
    return {
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      sku: variant.sku,
      category: product.categoryId,
      brand: product.brandId,
      unitPrice: variant.price,
    };
  }
}
