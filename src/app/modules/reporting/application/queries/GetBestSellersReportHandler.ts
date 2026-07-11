import { ReportingSalesReader } from '@src/app/modules/reporting/application/ports/ReportingRepositories';
import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { authorizeReportingRead } from '@src/app/modules/reporting/application/shared/ReportingGuards';
import { BestSellerReport, BestSellerReportItem } from '@src/app/modules/reporting/domain/Reports';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export interface GetBestSellersReportQuery {
  readonly limit?: number;
}

export class GetBestSellersReportHandler {
  constructor(
    private readonly sales: ReportingSalesReader,
    private readonly authorization: ReportingAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, query: GetBestSellersReportQuery = {}): Promise<BestSellerReport> {
    authorizeReportingRead(this.authorization, principal);
    const limit = query.limit ?? 10;
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new ValidationError('Best seller limit must be between 1 and 100.');
    }
    const aggregate = new Map<string, BestSellerReportItem>();
    const completed = (await this.sales.list(principal.storeId)).filter((sale) => sale.status === 'COMPLETED');
    for (const item of completed.flatMap((sale) => sale.items)) {
      const current = aggregate.get(item.productVariantId);
      aggregate.set(item.productVariantId, {
        productVariantId: item.productVariantId,
        quantitySold: (current?.quantitySold ?? 0) + item.quantity,
        grossSales: money((current?.grossSales ?? 0) + item.quantity * item.unitPrice),
        netSales: money((current?.netSales ?? 0) + item.total),
      });
    }
    return {
      items: [...aggregate.values()]
        .sort(
          (left, right) =>
            right.quantitySold - left.quantitySold ||
            right.netSales - left.netSales ||
            left.productVariantId.localeCompare(right.productVariantId)
        )
        .slice(0, limit),
    };
  }
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
