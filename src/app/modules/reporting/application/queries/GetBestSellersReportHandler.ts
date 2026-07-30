import {
  ReportingCatalogReader,
  ReportingSalesReader,
} from '@src/app/modules/reporting/application/ports/ReportingRepositories';
import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { authorizeReportingRead } from '@src/app/modules/reporting/application/shared/ReportingGuards';
import { BestSellerReport, BestSellerReportItem } from '@src/app/modules/reporting/domain/Reports';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';
import {
  validateReportingPeriod,
  localDayUtcRange,
} from '@src/app/modules/reporting/application/shared/ReportingPeriod';

export interface GetBestSellersReportQuery {
  readonly limit?: number;
  readonly from: string;
  readonly to: string;
  readonly timeZone: string;
}

export class GetBestSellersReportHandler {
  constructor(
    private readonly sales: ReportingSalesReader,
    private readonly authorization: ReportingAuthorizationPolicy,
    private readonly catalog: ReportingCatalogReader
  ) {}

  async execute(principal: AuthenticatedPrincipal, query: GetBestSellersReportQuery): Promise<BestSellerReport> {
    authorizeReportingRead(this.authorization, principal);
    const limit = query.limit ?? 10;
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new ValidationError('Best seller limit must be between 1 and 100.');
    }
    const period = validateReportingPeriod(query);
    const { start } = localDayUtcRange(period.from, period.timeZone);
    const { end } = localDayUtcRange(period.to, period.timeZone);
    const catalog = new Map((await this.catalog.list(principal.storeId)).map((item) => [item.productVariantId, item]));
    const aggregate = new Map<
      string,
      Omit<BestSellerReportItem, 'rank' | 'productId' | 'productName' | 'variantName' | 'sku' | 'barcode'>
    >();
    const completed = (await this.sales.list(principal.storeId)).filter(
      (sale) => sale.status === 'COMPLETED' && sale.createdAt >= start && sale.createdAt < end
    );
    for (const item of completed.flatMap((sale) => sale.items)) {
      const current = aggregate.get(item.productVariantId);
      aggregate.set(item.productVariantId, {
        productVariantId: item.productVariantId,
        quantitySold: (current?.quantitySold ?? 0) + item.quantity,
        grossSales: money((current?.grossSales ?? 0) + item.quantity * item.unitPrice),
        discount: money((current?.discount ?? 0) + item.discount),
        netSales: money((current?.netSales ?? 0) + item.total),
      });
    }
    return {
      meta: {
        storeId: principal.storeId,
        currency: 'USD',
        timeZone: period.timeZone,
        period: { from: period.from, to: period.to },
      },
      items: [...aggregate.values()]
        .sort(
          (left, right) =>
            right.quantitySold - left.quantitySold ||
            right.netSales - left.netSales ||
            left.productVariantId.localeCompare(right.productVariantId)
        )
        .slice(0, limit)
        .map((item, index) => {
          const display = catalog.get(item.productVariantId);
          return {
            rank: index + 1,
            ...item,
            productId: display?.productId ?? 'unknown',
            productName: display?.productName ?? 'Unknown product',
            variantName: display?.variantName ?? 'Default',
            sku: display?.sku ?? item.productVariantId,
            ...(display?.barcode === undefined ? {} : { barcode: display.barcode }),
          };
        }),
    };
  }
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
