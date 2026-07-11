import {
  ReportingSaleProjection,
  ReportingSalesReader,
} from '@src/app/modules/reporting/application/ports/ReportingRepositories';
import { SaleRepository } from '@src/app/modules/sales/application/ports/SalesRepositories';

export class SalesReportingReader implements ReportingSalesReader {
  constructor(private readonly sales: SaleRepository) {}

  async list(storeId: string): Promise<ReportingSaleProjection[]> {
    return (await this.sales.list(storeId)).map((sale) => ({
      id: sale.id,
      storeId: sale.storeId,
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: sale.total,
      status: sale.status,
      createdAt: sale.createdAt,
      items: sale.items.map((item) => ({
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total,
      })),
    }));
  }
}
