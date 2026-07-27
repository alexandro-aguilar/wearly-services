import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export interface CheckoutQuoteSnapshot {
  readonly id: string;
  readonly storeId: string;
  readonly subjectId: string;
  readonly customerId?: string;
  readonly expiresAt: Date;
  readonly currency: string;
  readonly items: readonly CheckoutQuoteItem[];
  readonly appliedPromotions: readonly CheckoutQuotePromotion[];
  readonly manualDiscount?: { readonly amount: number; readonly reason: string };
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly total: number;
}
export interface CheckoutQuoteItem {
  readonly variantId: string;
  readonly productName: string;
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
  readonly total: number;
}
export interface CheckoutQuotePromotion {
  readonly id: string;
  readonly name: string;
  readonly discount: number;
}
export class CheckoutQuote {
  private constructor(private readonly snapshot: CheckoutQuoteSnapshot) {}
  static create(snapshot: CheckoutQuoteSnapshot): CheckoutQuote {
    if (
      !snapshot.id ||
      !snapshot.storeId ||
      !snapshot.subjectId ||
      snapshot.items.length === 0 ||
      snapshot.expiresAt <= new Date(0)
    )
      throw new ValidationError('Checkout quote is invalid.');
    return new CheckoutQuote(snapshot);
  }
  toSnapshot(): CheckoutQuoteSnapshot {
    return {
      ...this.snapshot,
      expiresAt: new Date(this.snapshot.expiresAt),
      items: this.snapshot.items.map((item) => ({ ...item })),
      appliedPromotions: this.snapshot.appliedPromotions.map((item) => ({ ...item })),
      manualDiscount: this.snapshot.manualDiscount ? { ...this.snapshot.manualDiscount } : undefined,
    };
  }
}
