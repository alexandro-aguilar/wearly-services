import {
  CustomerSaleHistoryItem,
  CustomerSalesHistoryReader,
} from '@src/app/modules/customers/application/ports/CustomerServices';
import { SaleRepository } from '@src/app/modules/sales/application/ports/SalesRepositories';

export class SalesCustomerHistoryReader implements CustomerSalesHistoryReader {
  constructor(private readonly sales: SaleRepository) {}

  async listByCustomer(storeId: string, customerId: string): Promise<CustomerSaleHistoryItem[]> {
    return (await this.sales.list(storeId))
      .filter((sale) => sale.customerId === customerId)
      .map((sale) => ({
        id: sale.id,
        storeId: sale.storeId,
        customerId: sale.customerId,
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        total: sale.total,
        status: sale.status,
        createdAt: sale.createdAt,
      }));
  }
}
