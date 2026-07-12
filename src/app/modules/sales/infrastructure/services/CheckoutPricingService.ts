import {
  CheckoutPricingService as CheckoutPricingServicePort,
  CheckoutCatalogGateway,
  CheckoutInventoryGateway,
  CheckoutPromotionGateway,
} from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import {
  ForbiddenError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from '@src/shared/domain/exceptions/PlatformError';

export class CheckoutPricingService implements CheckoutPricingServicePort {
  constructor(
    private readonly catalog: CheckoutCatalogGateway,
    private readonly inventory: CheckoutInventoryGateway,
    private readonly promotions: CheckoutPromotionGateway
  ) {}
  async price(
    principal: AuthenticatedPrincipal,
    command: {
      items: readonly { variantId: string; quantity: number }[];
      manualDiscount?: { amount: string; reason: string };
    },
    at: Date
  ) {
    if (!Array.isArray(command.items) || command.items.length === 0)
      throw new ValidationError('A checkout quote requires at least one item.');
    const quantities = new Map<string, number>();
    for (const item of command.items) {
      if (!item.variantId?.trim() || !Number.isInteger(item.quantity) || item.quantity <= 0)
        throw new ValidationError('Quote item quantity must be a positive integer.');
      quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
    }
    if (command.manualDiscount && !principal.roles.some((role) => role === 'ADMIN' || role === 'MANAGER'))
      throw new ForbiddenError('You are not allowed to apply a manual discount.');
    const priced = await Promise.all(
      [...quantities].map(async ([variantId, quantity]) => {
        const variant = await this.catalog.findActiveVariant(principal.storeId, variantId);
        if (!variant) throw new NotFoundError('Product variant was not found.');
        const stock = await this.inventory.getStock(principal.storeId, variantId);
        if (stock === undefined) throw new NotFoundError('Product variant was not found.');
        if (stock < quantity) throw new InsufficientStockError();
        return { ...variant, quantity };
      })
    );
    const promotion = await this.promotions.evaluate(principal.storeId, at, priced);
    const discounts = new Map(promotion.items.map((item) => [item.variantId, item.discount]));
    const items = priced.map((item) => {
      const discount = discounts.get(item.variantId) ?? 0;
      return {
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount,
        total: money(item.quantity * item.unitPrice - discount),
      };
    });
    const manual = command.manualDiscount ? parseManual(command.manualDiscount) : undefined;
    if (manual) {
      let remaining = manual.amount;
      for (const item of [...items].sort((a, b) => b.total - a.total || a.variantId.localeCompare(b.variantId))) {
        const amount = Math.min(item.total, remaining);
        item.discount = money(item.discount + amount);
        item.total = money(item.total - amount);
        remaining = money(remaining - amount);
        if (!remaining) break;
      }
      if (remaining) throw new ValidationError('Manual discount cannot exceed the quote total.');
    }
    const subtotal = money(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
    const discount = money(items.reduce((sum, item) => sum + item.discount, 0));
    return {
      currency: 'MXN',
      items,
      appliedPromotions: promotion.appliedPromotions,
      manualDiscount: manual,
      subtotal,
      discount,
      tax: 0,
      total: money(subtotal - discount),
    };
  }
}
function parseManual(input: { amount: string; reason: string }) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || !/^\d+\.\d{2}$/.test(input.amount) || !input.reason?.trim())
    throw new ValidationError('Manual discount amount and reason are required.');
  return { amount, reason: input.reason.trim() };
}
function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
