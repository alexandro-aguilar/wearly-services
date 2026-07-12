import { CheckoutQuoteDto } from '@src/app/modules/sales/application/dtos/CheckoutDto';
import {
  CheckoutQuoteClock,
  CheckoutQuoteIdGenerator,
  CheckoutQuoteRepository,
  CheckoutPricingService,
} from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
import { CheckoutQuote } from '@src/app/modules/sales/domain/CheckoutQuote';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
export interface CreateCheckoutQuoteCommand {
  readonly items: readonly { variantId: string; quantity: number }[];
  readonly manualDiscount?: { amount: string; reason: string };
}
export class CreateCheckoutQuoteHandler {
  constructor(
    private readonly quotes: CheckoutQuoteRepository,
    private readonly pricing: CheckoutPricingService,
    private readonly clock: CheckoutQuoteClock,
    private readonly ids: CheckoutQuoteIdGenerator
  ) {}
  async execute(principal: AuthenticatedPrincipal, command: CreateCheckoutQuoteCommand): Promise<CheckoutQuoteDto> {
    const now = this.clock.now();
    const priced = await this.pricing.price(principal, command, now);
    const quote = CheckoutQuote.create({
      id: this.ids.nextId(),
      storeId: principal.storeId,
      subjectId: principal.subjectId,
      expiresAt: new Date(now.getTime() + 300000),
      ...priced,
    });
    const snapshot = quote.toSnapshot();
    await this.quotes.save(snapshot);
    return {
      quoteId: snapshot.id,
      expiresAt: snapshot.expiresAt.toISOString(),
      currency: snapshot.currency,
      items: snapshot.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toFixed(2),
        discount: item.discount.toFixed(2),
        total: item.total.toFixed(2),
      })),
      appliedPromotions: snapshot.appliedPromotions.map((item) => ({ ...item, discount: item.discount.toFixed(2) })),
      subtotal: snapshot.subtotal.toFixed(2),
      discount: snapshot.discount.toFixed(2),
      tax: snapshot.tax.toFixed(2),
      total: snapshot.total.toFixed(2),
    };
  }
}
