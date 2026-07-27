export type CheckoutPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
export type IdempotencyStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface AppliedPromotionDto {
  readonly id: string;
  readonly name: string;
  readonly discount: string;
}

export interface CheckoutQuoteItemDto {
  readonly variantId: string;
  readonly productName: string;
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice: string;
  readonly discount: string;
  readonly total: string;
}

export interface CheckoutQuoteDto {
  readonly quoteId: string;
  readonly customerId?: string;
  readonly expiresAt: string;
  readonly currency: string;
  readonly items: readonly CheckoutQuoteItemDto[];
  readonly appliedPromotions: readonly AppliedPromotionDto[];
  readonly subtotal: string;
  readonly discount: string;
  readonly tax: string;
  readonly total: string;
}

export type CompletedSaleItemDto = CheckoutQuoteItemDto;

export interface CompletedSaleDto {
  readonly id: string;
  readonly createdAt: string;
  readonly storeId: string;
  readonly items: readonly CompletedSaleItemDto[];
  readonly appliedPromotions: readonly AppliedPromotionDto[];
  readonly paymentMethod: CheckoutPaymentMethod;
  readonly paymentReference?: string;
  readonly subtotal: string;
  readonly discount: string;
  readonly tax: string;
  readonly total: string;
  readonly changeAmount?: string;
}

export interface SaleCompletionDto {
  readonly sale: CompletedSaleDto;
}

export interface IdempotencyStatusDto {
  readonly key: string;
  readonly status: IdempotencyStatus;
  readonly sale?: CompletedSaleDto;
}
