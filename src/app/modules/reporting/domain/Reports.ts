export interface DailySalesReport {
  readonly date: string;
  readonly timezoneOffsetMinutes: number;
  readonly saleCount: number;
  readonly itemQuantity: number;
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly total: number;
}

export interface BestSellerReportItem {
  readonly productVariantId: string;
  readonly quantitySold: number;
  readonly grossSales: number;
  readonly netSales: number;
}

export interface BestSellerReport {
  readonly items: readonly BestSellerReportItem[];
}

export interface LowStockReportItem {
  readonly productVariantId: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly stock: number;
  readonly minimumStock: number;
}

export interface LowStockReport {
  readonly items: readonly LowStockReportItem[];
}
