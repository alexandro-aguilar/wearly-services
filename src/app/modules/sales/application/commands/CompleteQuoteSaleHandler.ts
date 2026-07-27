import {
  CheckoutPricingService,
  CheckoutQuoteRepository,
  CheckoutSaleRevalidator,
  SaleIdempotencyRepository,
} from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
import {
  CheckoutTransactionManager,
  SaleRepository,
  SalesInventoryGateway,
} from '@src/app/modules/sales/application/ports/SalesRepositories';
import {
  SalesAuthorizationPolicy,
  SalesClock,
  SalesIdGenerator,
} from '@src/app/modules/sales/application/ports/SalesServices';
import { authorizeSalesComplete, authorizeSalesRead } from '@src/app/modules/sales/application/shared/SalesGuards';
import { Sale } from '@src/app/modules/sales/domain/Sale';
import { CompletedSaleDto, IdempotencyStatusDto } from '@src/app/modules/sales/application/dtos/CheckoutDto';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import {
  ConflictError,
  IdempotencyConflictError,
  NotFoundError,
  StalePricingError,
  ValidationError,
} from '@src/shared/domain/exceptions/PlatformError';
export interface CompleteQuoteSaleCommand {
  readonly quoteId: string;
  readonly paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  readonly tenderedAmount?: string;
  readonly terminalTransactionReference?: string;
  readonly transferReference?: string;
  readonly idempotencyKey: string;
}
export class CompleteQuoteSaleHandler {
  constructor(
    private readonly quotes: CheckoutQuoteRepository,
    private readonly idempotency: SaleIdempotencyRepository,
    private readonly pricing: CheckoutPricingService,
    private readonly inventory: SalesInventoryGateway,
    private readonly sales: SaleRepository,
    private readonly transaction: CheckoutTransactionManager,
    private readonly auth: SalesAuthorizationPolicy,
    private readonly clock: SalesClock,
    private readonly ids: SalesIdGenerator,
    private readonly revalidator?: CheckoutSaleRevalidator
  ) {}
  async execute(principal: AuthenticatedPrincipal, command: CompleteQuoteSaleCommand): Promise<CompletedSaleDto> {
    authorizeSalesComplete(this.auth, principal);
    const paymentReference = paymentReferenceFor(command);
    const fingerprint = JSON.stringify({
      quoteId: command.quoteId,
      paymentMethod: command.paymentMethod,
      tenderedAmount: command.tenderedAmount,
      paymentReference,
    });
    const claim = await this.idempotency.claim({
      storeId: principal.storeId,
      key: command.idempotencyKey,
      fingerprint,
      status: 'PENDING',
    });
    if (!claim.claimed) {
      const prior = claim.record;
      if (prior.fingerprint !== fingerprint) throw new IdempotencyConflictError();
      if (prior.status === 'COMPLETED' && prior.saleId) {
        const sale = await this.sales.findById(principal.storeId, prior.saleId);
        const quote = await this.quotes.findById(principal.storeId, command.quoteId);
        if (sale) return toCompletedSaleDto(sale, quote, command.tenderedAmount);
      }
      if (prior.status === 'PENDING') throw new ConflictError('This idempotency key is currently being processed.');
    }
    try {
      return await this.transaction.execute(async () => {
        const quote = await this.quotes.findById(principal.storeId, command.quoteId);
        if (!quote || quote.subjectId !== principal.subjectId) throw new NotFoundError('Checkout quote was not found.');
        const now = this.clock.now();
        if (quote.expiresAt <= now) throw new StalePricingError();
        await this.revalidator?.lockAndValidate(principal.storeId, quote.items);
        const current = await this.pricing.price(
          principal,
          {
            items: quote.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
            manualDiscount: quote.manualDiscount
              ? { amount: quote.manualDiscount.amount.toFixed(2), reason: quote.manualDiscount.reason }
              : undefined,
          },
          now
        );
        if (current.total !== quote.total || current.discount !== quote.discount) throw new StalePricingError();
        const sale = Sale.complete({
          id: this.ids.nextId('sale'),
          storeId: principal.storeId,
          paymentMethod: command.paymentMethod,
          paymentReference,
          createdAt: now,
          tax: quote.tax,
          items: quote.items.map((item) => ({
            productVariantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
          })),
        });
        for (const item of quote.items)
          await this.inventory.reduceStock(principal.storeId, item.variantId, item.quantity, now);
        const snapshot = sale.toSnapshot();
        await this.sales.save(snapshot);
        await this.idempotency.save({
          storeId: principal.storeId,
          key: command.idempotencyKey,
          fingerprint,
          status: 'COMPLETED',
          saleId: snapshot.id,
        });
        return toCompletedSaleDto(snapshot, quote, command.tenderedAmount);
      });
    } catch (error) {
      await this.idempotency.save({
        storeId: principal.storeId,
        key: command.idempotencyKey,
        fingerprint,
        status: 'FAILED',
      });
      throw error;
    }
  }
  async status(principal: AuthenticatedPrincipal, key: string): Promise<IdempotencyStatusDto> {
    authorizeSalesRead(this.auth, principal);
    const record = await this.idempotency.find(principal.storeId, key);
    if (!record) throw new NotFoundError('Idempotency key was not found.');
    const sale = record.saleId ? await this.sales.findById(principal.storeId, record.saleId) : undefined;
    const quoteId = quoteIdFromFingerprint(record.fingerprint);
    const quote = quoteId ? await this.quotes.findById(principal.storeId, quoteId) : undefined;
    return { key, status: record.status, sale: sale ? toCompletedSaleDto(sale, quote) : undefined };
  }
  async getSale(principal: AuthenticatedPrincipal, saleId: string): Promise<CompletedSaleDto> {
    authorizeSalesRead(this.auth, principal);
    const sale = await this.sales.findById(principal.storeId, saleId);
    if (!sale) throw new NotFoundError('Sale was not found.');
    const record = await this.idempotency.findBySaleId?.(principal.storeId, saleId);
    const quoteId = record ? quoteIdFromFingerprint(record.fingerprint) : undefined;
    const quote = quoteId ? await this.quotes.findById(principal.storeId, quoteId) : undefined;
    return toCompletedSaleDto(sale, quote);
  }
}
export function toCompletedSaleDto(
  sale: ReturnType<Sale['toSnapshot']>,
  quote?: any,
  tendered?: string
): CompletedSaleDto {
  const total = sale.total;
  const tenderedAmount = tendered === undefined ? undefined : Number(tendered);
  if (tenderedAmount !== undefined && (!Number.isFinite(tenderedAmount) || tenderedAmount < total))
    throw new ValidationError('Tendered amount must cover the sale total.');
  return {
    id: sale.id,
    createdAt: sale.createdAt.toISOString(),
    storeId: sale.storeId,
    items: sale.items.map((item) => ({
      variantId: item.productVariantId,
      productName: quote?.items.find((q: any) => q.variantId === item.productVariantId)?.productName ?? '',
      sku: quote?.items.find((q: any) => q.variantId === item.productVariantId)?.sku ?? '',
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      discount: item.discount.toFixed(2),
      total: item.total.toFixed(2),
    })),
    appliedPromotions: quote?.appliedPromotions?.map((p: any) => ({ ...p, discount: p.discount.toFixed(2) })) ?? [],
    paymentMethod: sale.paymentMethod,
    paymentReference: sale.paymentReference,
    subtotal: sale.subtotal.toFixed(2),
    discount: sale.discount.toFixed(2),
    tax: sale.tax.toFixed(2),
    total: sale.total.toFixed(2),
    changeAmount: tenderedAmount === undefined ? undefined : (tenderedAmount - total).toFixed(2),
  };
}

function paymentReferenceFor(command: CompleteQuoteSaleCommand): string | undefined {
  if (command.paymentMethod === 'CASH') return undefined;
  const value = command.paymentMethod === 'CARD' ? command.terminalTransactionReference : command.transferReference;
  if (!value?.trim()) throw new ValidationError(`${command.paymentMethod} payment requires a payment reference.`);
  return value.trim();
}

function quoteIdFromFingerprint(fingerprint: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(fingerprint);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const quoteId = (parsed as { quoteId?: unknown }).quoteId;
    return typeof quoteId === 'string' && quoteId ? quoteId : undefined;
  } catch {
    return undefined;
  }
}
