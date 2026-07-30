import {
  ProductRepository,
  ProductVariantRepository,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import {
  ReportingCatalogProjection,
  ReportingCatalogReader,
} from '@src/app/modules/reporting/application/ports/ReportingRepositories';

export class CatalogReportingReader implements ReportingCatalogReader {
  constructor(
    private readonly products: ProductRepository,
    private readonly variants: ProductVariantRepository
  ) {}

  async list(storeId: string): Promise<ReportingCatalogProjection[]> {
    const [products, variants] = await Promise.all([this.products.list(storeId, {}), this.variants.list(storeId, {})]);
    const productsById = new Map(products.map((product) => [product.id, product]));
    return variants.flatMap((variant) => {
      const product = productsById.get(variant.productId);
      if (!product) return [];
      return [
        {
          productVariantId: variant.id,
          productId: variant.productId,
          productName: product.name,
          variantName: [variant.color, variant.size].filter(Boolean).join(' / ') || 'Default',
          sku: variant.sku,
          ...(variant.barcode === undefined ? {} : { barcode: variant.barcode }),
        },
      ];
    });
  }
}
