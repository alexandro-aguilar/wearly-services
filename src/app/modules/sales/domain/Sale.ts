import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
export type SaleStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export interface SaleItemSnapshot {
  readonly saleId: string;
  readonly productVariantId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
  readonly total: number;
}

export interface SaleSnapshot {
  readonly id: string;
  readonly storeId: string;
  readonly customerId?: string;
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly total: number;
  readonly paymentMethod: PaymentMethod;
  readonly status: SaleStatus;
  readonly createdAt: Date;
  readonly items: readonly SaleItemSnapshot[];
}

export interface PricedSaleItem {
  readonly productVariantId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount?: number;
}

export interface CompleteSaleInput {
  readonly id: string;
  readonly storeId: string;
  readonly customerId?: string;
  readonly paymentMethod: PaymentMethod;
  readonly items: readonly PricedSaleItem[];
  readonly tax?: number;
  readonly createdAt: Date;
}

export class Sale {
  private constructor(private readonly snapshot: SaleSnapshot) {}

  static complete(input: CompleteSaleInput): Sale {
    assertRequired(input.id, 'Sale id');
    assertRequired(input.storeId, 'storeId');
    if (!['CASH', 'CARD', 'TRANSFER'].includes(input.paymentMethod)) {
      throw new ValidationError('Payment method is invalid.');
    }
    if (input.items.length === 0) {
      throw new ValidationError('A sale requires at least one item.');
    }

    const items = input.items.map((item): SaleItemSnapshot => {
      assertRequired(item.productVariantId, 'productVariantId');
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new ValidationError('Sale item quantity must be a positive integer.');
      }
      assertMoney(item.unitPrice, 'unitPrice');
      const discount = item.discount ?? 0;
      assertMoney(discount, 'discount');
      const gross = item.quantity * item.unitPrice;
      if (discount > gross) {
        throw new ValidationError('Sale item discount cannot exceed its gross total.');
      }

      return {
        saleId: input.id,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount,
        total: gross - discount,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = items.reduce((sum, item) => sum + item.discount, 0);
    const tax = input.tax ?? 0;
    assertMoney(tax, 'tax');

    return new Sale({
      id: input.id,
      storeId: input.storeId,
      customerId: normalizeOptional(input.customerId),
      subtotal,
      discount,
      tax,
      total: subtotal - discount + tax,
      paymentMethod: input.paymentMethod,
      status: 'COMPLETED',
      createdAt: input.createdAt,
      items,
    });
  }

  toSnapshot(): SaleSnapshot {
    return cloneSale(this.snapshot);
  }
}

export function cloneSale(sale: SaleSnapshot): SaleSnapshot {
  return {
    ...sale,
    createdAt: new Date(sale.createdAt),
    items: sale.items.map((item) => ({ ...item })),
  };
}

function assertRequired(value: string, field: string): void {
  if (!value.trim()) {
    throw new ValidationError(`${field} is required.`);
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${field} cannot be negative.`);
  }
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}
