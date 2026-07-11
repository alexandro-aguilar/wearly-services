import { InventoryVariantStockGateway } from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import {
  ReportingInventoryProjection,
  ReportingInventoryReader,
} from '@src/app/modules/reporting/application/ports/ReportingRepositories';

export class InventoryReportingReader implements ReportingInventoryReader {
  constructor(private readonly inventory: InventoryVariantStockGateway) {}

  async listLowStock(storeId: string): Promise<ReportingInventoryProjection[]> {
    return this.inventory.listLowStock(storeId);
  }
}
