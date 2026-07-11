import { SaleSnapshot } from '@src/app/modules/sales/domain/Sale';

export interface SalesCatalogVariant {
  readonly productVariantId: string;
  readonly productId: string;
  readonly category: string;
  readonly brand?: string;
  readonly unitPrice: number;
}

export interface SalesCatalogGateway {
  findActiveVariant(storeId: string, productVariantId: string): Promise<SalesCatalogVariant | undefined>;
}

export interface SalesInventoryGateway {
  getStock(storeId: string, productVariantId: string): Promise<number | undefined>;
  reduceStock(storeId: string, productVariantId: string, quantity: number, createdAt: Date): Promise<void>;
}

export interface SaleRepository {
  save(sale: SaleSnapshot): Promise<void>;
  findById(storeId: string, saleId: string): Promise<SaleSnapshot | undefined>;
  list(storeId: string): Promise<SaleSnapshot[]>;
}

export interface CheckoutTransactionManager {
  execute<T>(work: () => Promise<T>): Promise<T>;
}

export interface SalesPromotionGateway {
  evaluate(
    storeId: string,
    at: Date,
    items: readonly (SalesCatalogVariant & { readonly quantity: number })[]
  ): Promise<readonly { productVariantId: string; discount: number }[]>;
}
