import { CheckoutQuoteSnapshot } from '@src/app/modules/sales/domain/CheckoutQuote';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
export interface CheckoutQuoteRepository {
  save(quote: CheckoutQuoteSnapshot): Promise<void>;
  findById(storeId: string, quoteId: string): Promise<CheckoutQuoteSnapshot | undefined>;
}
export interface CheckoutQuoteClock {
  now(): Date;
}
export interface CheckoutQuoteIdGenerator {
  nextId(): string;
}
export interface CheckoutCatalogGateway {
  findActiveVariant(
    storeId: string,
    variantId: string
  ): Promise<
    | {
        variantId: string;
        productId: string;
        productName: string;
        sku: string;
        category: string;
        brand?: string;
        unitPrice: number;
      }
    | undefined
  >;
}
export interface CheckoutInventoryGateway {
  getStock(storeId: string, variantId: string): Promise<number | undefined>;
}
export interface CheckoutPromotionGateway {
  evaluate(
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
  ): Promise<{
    items: readonly { variantId: string; discount: number }[];
    appliedPromotions: readonly { id: string; name: string; discount: number }[];
  }>;
}
export interface CheckoutPricingService {
  price(
    principal: AuthenticatedPrincipal,
    command: {
      items: readonly { variantId: string; quantity: number }[];
      manualDiscount?: { amount: string; reason: string };
    },
    at: Date
  ): Promise<Omit<CheckoutQuoteSnapshot, 'id' | 'storeId' | 'subjectId' | 'expiresAt'>>;
}
export interface SaleIdempotencyRecord {
  readonly storeId: string;
  readonly key: string;
  readonly fingerprint: string;
  readonly status: 'PENDING' | 'COMPLETED' | 'FAILED';
  readonly saleId?: string;
}
export interface SaleIdempotencyRepository {
  find(storeId: string, key: string): Promise<SaleIdempotencyRecord | undefined>;
  save(record: SaleIdempotencyRecord): Promise<void>;
}
