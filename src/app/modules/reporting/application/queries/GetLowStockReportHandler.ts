import {
  ReportingCatalogReader,
  ReportingInventoryReader,
} from '@src/app/modules/reporting/application/ports/ReportingRepositories';
import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { authorizeReportingRead } from '@src/app/modules/reporting/application/shared/ReportingGuards';
import { LowStockReport } from '@src/app/modules/reporting/domain/Reports';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class GetLowStockReportHandler {
  constructor(
    private readonly inventory: ReportingInventoryReader,
    private readonly authorization: ReportingAuthorizationPolicy,
    private readonly catalog: ReportingCatalogReader
  ) {}

  async execute(principal: AuthenticatedPrincipal): Promise<LowStockReport> {
    authorizeReportingRead(this.authorization, principal);
    const [items, catalogRows] = await Promise.all([
      this.inventory.listLowStock(principal.storeId),
      this.catalog.list(principal.storeId),
    ]);
    const catalog = new Map(catalogRows.map((item) => [item.productVariantId, item]));
    return {
      meta: { storeId: principal.storeId, currency: 'USD', timeZone: 'UTC' },
      items: items
        .filter((item) => item.active && item.stock <= item.minimumStock)
        .sort((left, right) => left.stock - right.stock || left.productVariantId.localeCompare(right.productVariantId))
        .map((item) => {
          const display = catalog.get(item.productVariantId);
          return {
            productVariantId: item.productVariantId,
            productId: display?.productId ?? 'unknown',
            productName: display?.productName ?? 'Unknown product',
            variantName: display?.variantName ?? 'Default',
            sku: display?.sku ?? item.sku,
            ...(display?.barcode === undefined && item.barcode === undefined
              ? {}
              : { barcode: display?.barcode ?? item.barcode }),
            stock: item.stock,
            minimumStock: item.minimumStock,
            shortageQuantity: Math.max(item.minimumStock - item.stock, 0),
          };
        }),
    };
  }
}
