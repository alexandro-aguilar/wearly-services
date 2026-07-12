export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNAVAILABLE';

export interface ProductDiscoveryItemDto {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly active: boolean;
}

export interface SellableVariantDto {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly price: string;
  readonly stock: number;
  readonly stockStatus: StockStatus;
  readonly active: boolean;
}

export interface PaginatedResultDto<TItem> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export type ProductDiscoveryResultDto = PaginatedResultDto<ProductDiscoveryItemDto>;
export type VariantDiscoveryResultDto = PaginatedResultDto<SellableVariantDto>;
