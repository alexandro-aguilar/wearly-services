import {
  CheckoutTransactionManager,
  SaleRepository,
  SalesCatalogGateway,
  SalesCustomerGateway,
  SalesInventoryGateway,
  SalesPromotionGateway,
} from '@src/app/modules/sales/application/ports/SalesRepositories';
import {
  SalesAuthorizationPolicy,
  SalesClock,
  SalesIdGenerator,
} from '@src/app/modules/sales/application/ports/SalesServices';
import { authorizeSalesComplete } from '@src/app/modules/sales/application/shared/SalesGuards';
import { PaymentMethod, Sale } from '@src/app/modules/sales/domain/Sale';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError, ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export interface CompleteSaleItemCommand {
  readonly productVariantId: string;
  readonly quantity: number;
}

export interface CompleteSaleCommand {
  readonly customerId?: string;
  readonly items: readonly CompleteSaleItemCommand[];
  readonly paymentMethod: PaymentMethod;
  readonly subtotal?: number;
  readonly discount?: number;
  readonly tax?: number;
  readonly total?: number;
}

export interface CompleteSaleResult {
  readonly id: string;
  readonly status: 'COMPLETED';
}

const noPromotions: SalesPromotionGateway = {
  evaluate: async (_storeId, _at, items) =>
    items.map((item) => ({ productVariantId: item.productVariantId, discount: 0 })),
};

const noCustomerValidation: SalesCustomerGateway = {
  isActiveCustomer: async () => true,
};

export class CompleteSaleHandler {
  constructor(
    private readonly catalog: SalesCatalogGateway,
    private readonly inventory: SalesInventoryGateway,
    private readonly sales: SaleRepository,
    private readonly transaction: CheckoutTransactionManager,
    private readonly authorization: SalesAuthorizationPolicy,
    private readonly clock: SalesClock,
    private readonly ids: SalesIdGenerator,
    private readonly promotions: SalesPromotionGateway = noPromotions,
    private readonly customers: SalesCustomerGateway = noCustomerValidation
  ) {}

  async execute(principal: AuthenticatedPrincipal, command: CompleteSaleCommand): Promise<CompleteSaleResult> {
    authorizeSalesComplete(this.authorization, principal);
    const requestedItems = aggregateItems(command.items);

    return this.transaction.execute(async () => {
      if (command.customerId && !(await this.customers.isActiveCustomer(principal.storeId, command.customerId))) {
        throw new NotFoundError('Customer was not found.');
      }
      const pricedItems = await Promise.all(
        requestedItems.map(async (item) => {
          const variant = await this.catalog.findActiveVariant(principal.storeId, item.productVariantId);
          if (!variant) {
            throw new NotFoundError('Product variant was not found.');
          }
          const stock = await this.inventory.getStock(principal.storeId, item.productVariantId);
          if (stock === undefined) {
            throw new NotFoundError('Product variant was not found.');
          }
          if (stock < item.quantity) {
            throw new ValidationError(`Insufficient stock for product variant ${item.productVariantId}.`);
          }
          return { ...variant, quantity: item.quantity };
        })
      );
      const now = this.clock.now();
      const evaluatedDiscounts = await this.promotions.evaluate(principal.storeId, now, pricedItems);
      const discounts = new Map(evaluatedDiscounts.map((item) => [item.productVariantId, item.discount]));
      const sale = Sale.complete({
        id: this.ids.nextId('sale'),
        storeId: principal.storeId,
        customerId: command.customerId,
        paymentMethod: command.paymentMethod,
        items: pricedItems.map((item) => ({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: discounts.get(item.productVariantId) ?? 0,
        })),
        tax: 0,
        createdAt: now,
      });

      for (const item of pricedItems) {
        await this.inventory.reduceStock(principal.storeId, item.productVariantId, item.quantity, now);
      }
      const snapshot = sale.toSnapshot();
      await this.sales.save(snapshot);
      return { id: snapshot.id, status: 'COMPLETED' };
    });
  }
}

function aggregateItems(items: readonly CompleteSaleItemCommand[]): CompleteSaleItemCommand[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('A sale requires at least one item.');
  }
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (!item.productVariantId?.trim()) {
      throw new ValidationError('productVariantId is required.');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new ValidationError('Sale item quantity must be a positive integer.');
    }
    quantities.set(item.productVariantId, (quantities.get(item.productVariantId) ?? 0) + item.quantity);
  }
  return [...quantities].map(([productVariantId, quantity]) => ({ productVariantId, quantity }));
}
