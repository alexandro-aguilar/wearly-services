import { EvaluatePromotionsHandler } from '@src/app/modules/promotions/application/queries/EvaluatePromotionsHandler';
import { CheckoutPromotionGateway } from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
export class PromotionQuoteAdapter implements CheckoutPromotionGateway {
  constructor(private readonly evaluator: EvaluatePromotionsHandler) {}
  async evaluate(
    storeId: string,
    at: Date,
    items: readonly {
      variantId: string;
      productId: string;
      productName: string;
      sku: string;
      category: string;
      brand?: string;
      quantity: number;
      unitPrice: number;
    }[]
  ) {
    const result = await this.evaluator.execute({
      storeId,
      at,
      items: items.map((item) => ({
        productVariantId: item.variantId,
        productId: item.productId,
        category: item.category,
        brand: item.brand,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
    return {
      items: result.items.map((item) => ({ variantId: item.productVariantId, discount: item.discount })),
      appliedPromotions: result.appliedPromotions.map((item) => ({
        id: item.promotionId,
        name: item.name,
        discount: item.discount,
      })),
    };
  }
}
