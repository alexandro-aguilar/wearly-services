export interface ReportingSaleItemProjection {
  readonly productVariantId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
  readonly total: number;
}

export interface ReportingSaleProjection {
  readonly id: string;
  readonly storeId: string;
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly total: number;
  readonly status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  readonly createdAt: Date;
  readonly items: readonly ReportingSaleItemProjection[];
}

export interface ReportingInventoryProjection {
  readonly storeId: string;
  readonly productVariantId: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly stock: number;
  readonly minimumStock: number;
  readonly active: boolean;
}

export interface ReportingSalesReader {
  list(storeId: string): Promise<ReportingSaleProjection[]>;
}

export interface ReportingInventoryReader {
  listLowStock(storeId: string): Promise<ReportingInventoryProjection[]>;
}
