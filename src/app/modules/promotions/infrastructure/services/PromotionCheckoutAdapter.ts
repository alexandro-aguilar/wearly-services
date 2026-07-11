import { EvaluatePromotionsHandler } from '@src/app/modules/promotions/application/queries/EvaluatePromotionsHandler';
import { SalesCatalogVariant, SalesPromotionGateway } from '@src/app/modules/sales/application/ports/SalesRepositories';

export class PromotionCheckoutAdapter implements SalesPromotionGateway {
  constructor(private readonly evaluator: EvaluatePromotionsHandler) {}

  async evaluate(
    storeId: string,
    at: Date,
    items: readonly (SalesCatalogVariant & { readonly quantity: number })[]
  ): Promise<readonly { productVariantId: string; discount: number }[]> {
    const result = await this.evaluator.execute({
      storeId,
      at,
      items: items.map((item) => ({
        productVariantId: item.productVariantId,
        productId: item.productId,
        category: item.category,
        brand: item.brand,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
    return result.items;
  }
}
