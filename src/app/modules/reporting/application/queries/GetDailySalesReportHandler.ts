import { ReportingSalesReader } from '@src/app/modules/reporting/application/ports/ReportingRepositories';
import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { authorizeReportingRead } from '@src/app/modules/reporting/application/shared/ReportingGuards';
import { DailySalesReport } from '@src/app/modules/reporting/domain/Reports';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export interface GetDailySalesReportQuery {
  readonly date: string;
  readonly timezoneOffsetMinutes: number;
}

export class GetDailySalesReportHandler {
  constructor(
    private readonly sales: ReportingSalesReader,
    private readonly authorization: ReportingAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, query: GetDailySalesReportQuery): Promise<DailySalesReport> {
    authorizeReportingRead(this.authorization, principal);
    const { start, end } = localDayUtcRange(query.date, query.timezoneOffsetMinutes);
    const sales = (await this.sales.list(principal.storeId)).filter(
      (sale) => sale.status === 'COMPLETED' && sale.createdAt >= start && sale.createdAt < end
    );
    return {
      date: query.date,
      timezoneOffsetMinutes: query.timezoneOffsetMinutes,
      saleCount: sales.length,
      itemQuantity: sales.flatMap((sale) => sale.items).reduce((sum, item) => sum + item.quantity, 0),
      subtotal: money(sales.reduce((sum, sale) => sum + sale.subtotal, 0)),
      discount: money(sales.reduce((sum, sale) => sum + sale.discount, 0)),
      tax: money(sales.reduce((sum, sale) => sum + sale.tax, 0)),
      total: money(sales.reduce((sum, sale) => sum + sale.total, 0)),
    };
  }
}

function localDayUtcRange(date: string, timezoneOffsetMinutes: number): { readonly start: Date; readonly end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ValidationError('Report date must use YYYY-MM-DD.');
  if (!Number.isInteger(timezoneOffsetMinutes) || timezoneOffsetMinutes < -720 || timezoneOffsetMinutes > 840) {
    throw new ValidationError('Timezone offset is invalid.');
  }
  const utcMidnight = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(utcMidnight.getTime()) || utcMidnight.toISOString().slice(0, 10) !== date) {
    throw new ValidationError('Report date is invalid.');
  }
  const start = new Date(utcMidnight.getTime() - timezoneOffsetMinutes * 60_000);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
