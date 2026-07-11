import { ReportingInventoryReader } from '@src/app/modules/reporting/application/ports/ReportingRepositories';
import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { authorizeReportingRead } from '@src/app/modules/reporting/application/shared/ReportingGuards';
import { LowStockReport } from '@src/app/modules/reporting/domain/Reports';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class GetLowStockReportHandler {
  constructor(
    private readonly inventory: ReportingInventoryReader,
    private readonly authorization: ReportingAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal): Promise<LowStockReport> {
    authorizeReportingRead(this.authorization, principal);
    const items = await this.inventory.listLowStock(principal.storeId);
    return {
      items: items
        .filter((item) => item.active && item.stock <= item.minimumStock)
        .sort((left, right) => left.stock - right.stock || left.productVariantId.localeCompare(right.productVariantId))
        .map((item) => ({
          productVariantId: item.productVariantId,
          sku: item.sku,
          barcode: item.barcode,
          stock: item.stock,
          minimumStock: item.minimumStock,
        })),
    };
  }
}
