export interface ReportMeta {
  readonly storeId: string;
  readonly currency: string;
  readonly timeZone: string;
  readonly period?: { readonly from: string; readonly to: string };
}

export interface SalesTotals {
  readonly saleCount: number;
  readonly itemQuantity: number;
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly total: number;
}

export interface SalesOverviewReport {
  readonly meta: ReportMeta;
  readonly totals: SalesTotals;
  readonly series: readonly (SalesTotals & { readonly date: string })[];
}

export type DailySalesReport = SalesOverviewReport;

export interface BestSellerReportItem {
  readonly rank: number;
  readonly productVariantId: string;
  readonly productId: string;
  readonly productName: string;
  readonly variantName: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly quantitySold: number;
  readonly grossSales: number;
  readonly discount: number;
  readonly netSales: number;
}

export interface BestSellerReport {
  readonly meta: ReportMeta;
  readonly items: readonly BestSellerReportItem[];
}

export interface LowStockReportItem {
  readonly productVariantId: string;
  readonly productId: string;
  readonly productName: string;
  readonly variantName: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly stock: number;
  readonly minimumStock: number;
  readonly shortageQuantity: number;
}

export interface LowStockReport {
  readonly meta: ReportMeta;
  readonly items: readonly LowStockReportItem[];
}
