import { ReportingSalesReader } from '@src/app/modules/reporting/application/ports/ReportingRepositories';
import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { authorizeReportingRead } from '@src/app/modules/reporting/application/shared/ReportingGuards';
import {
  daysInPeriod,
  localDayUtcRange,
  validateReportingPeriod,
} from '@src/app/modules/reporting/application/shared/ReportingPeriod';
import { SalesOverviewReport, SalesTotals } from '@src/app/modules/reporting/domain/Reports';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export interface GetSalesOverviewReportQuery {
  readonly from: string;
  readonly to: string;
  readonly timeZone: string;
}

export class GetSalesOverviewReportHandler {
  constructor(
    private readonly sales: ReportingSalesReader,
    private readonly authorization: ReportingAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, query: GetSalesOverviewReportQuery): Promise<SalesOverviewReport> {
    authorizeReportingRead(this.authorization, principal);
    const period = validateReportingPeriod(query);
    const completed = (await this.sales.list(principal.storeId)).filter((sale) => sale.status === 'COMPLETED');
    const series = daysInPeriod(period.from, period.to).map((date) => {
      const { start, end } = localDayUtcRange(date, period.timeZone);
      return totalsFor(
        completed.filter((sale) => sale.createdAt >= start && sale.createdAt < end),
        date
      ) as SalesTotals & { readonly date: string };
    });
    return {
      meta: {
        storeId: principal.storeId,
        currency: 'USD',
        timeZone: period.timeZone,
        period: { from: period.from, to: period.to },
      },
      totals: sumTotals(series),
      series,
    };
  }
}

export function totalsFor(
  sales: readonly {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    items: readonly { quantity: number }[];
  }[],
  date: string
): SalesTotals & { readonly date: string };
export function totalsFor(
  sales: readonly {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    items: readonly { quantity: number }[];
  }[]
): SalesTotals;
export function totalsFor(
  sales: readonly {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    items: readonly { quantity: number }[];
  }[],
  date?: string
): SalesTotals & { readonly date?: string } {
  const totals = {
    saleCount: sales.length,
    itemQuantity: sales.flatMap((sale) => sale.items).reduce((sum, item) => sum + item.quantity, 0),
    subtotal: money(sales.reduce((sum, sale) => sum + sale.subtotal, 0)),
    discount: money(sales.reduce((sum, sale) => sum + sale.discount, 0)),
    tax: money(sales.reduce((sum, sale) => sum + sale.tax, 0)),
    total: money(sales.reduce((sum, sale) => sum + sale.total, 0)),
  };
  return date === undefined ? totals : { date, ...totals };
}

function sumTotals(series: readonly (SalesTotals & { readonly date: string })[]): SalesTotals {
  return {
    saleCount: series.reduce((sum, row) => sum + row.saleCount, 0),
    itemQuantity: series.reduce((sum, row) => sum + row.itemQuantity, 0),
    subtotal: money(series.reduce((sum, row) => sum + row.subtotal, 0)),
    discount: money(series.reduce((sum, row) => sum + row.discount, 0)),
    tax: money(series.reduce((sum, row) => sum + row.tax, 0)),
    total: money(series.reduce((sum, row) => sum + row.total, 0)),
  };
}

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
