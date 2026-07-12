import { CheckoutQuoteRepository } from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
import { CheckoutQuoteSnapshot } from '@src/app/modules/sales/domain/CheckoutQuote';
export class InMemoryCheckoutQuoteRepository implements CheckoutQuoteRepository {
  private readonly quotes = new Map<string, CheckoutQuoteSnapshot>();
  async save(quote: CheckoutQuoteSnapshot): Promise<void> {
    this.quotes.set(`${quote.storeId}:${quote.id}`, clone(quote));
  }
  async findById(storeId: string, quoteId: string): Promise<CheckoutQuoteSnapshot | undefined> {
    const quote = this.quotes.get(`${storeId}:${quoteId}`);
    return quote ? clone(quote) : undefined;
  }
}
function clone(quote: CheckoutQuoteSnapshot): CheckoutQuoteSnapshot {
  return {
    ...quote,
    expiresAt: new Date(quote.expiresAt),
    items: quote.items.map((item) => ({ ...item })),
    appliedPromotions: quote.appliedPromotions.map((item) => ({ ...item })),
    manualDiscount: quote.manualDiscount ? { ...quote.manualDiscount } : undefined,
  };
}
