import { ReportingAuthorizationPolicy } from '@src/app/modules/reporting/application/ports/ReportingServices';
import { DailySalesReport } from '@src/app/modules/reporting/domain/Reports';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { GetSalesOverviewReportHandler } from '@src/app/modules/reporting/application/queries/GetSalesOverviewReportHandler';
import { ReportingSalesReader } from '@src/app/modules/reporting/application/ports/ReportingRepositories';

export interface GetDailySalesReportQuery {
  readonly date: string;
  readonly timeZone: string;
}

export class GetDailySalesReportHandler {
  private readonly overview: GetSalesOverviewReportHandler;
  constructor(sales: ReportingSalesReader, authorization: ReportingAuthorizationPolicy) {
    this.overview = new GetSalesOverviewReportHandler(sales, authorization);
  }

  async execute(principal: AuthenticatedPrincipal, query: GetDailySalesReportQuery): Promise<DailySalesReport> {
    return this.overview.execute(principal, { from: query.date, to: query.date, timeZone: query.timeZone });
  }
}
