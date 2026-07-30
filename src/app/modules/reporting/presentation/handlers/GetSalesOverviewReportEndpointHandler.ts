import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import Joi from '@hapi/joi';
import middy from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import Authorization from '@src/app/core/interface/Authorization';
import { requestHandler } from '@src/app/core/middleware/requestHandler';
import { requestValidator, ValidatorSchemas } from '@src/app/core/middleware/requestValidator';
import { responseHandler } from '@src/app/core/middleware/responseHandler';
import ILogger from '@src/app/core/utils/ILogger';
import MetricsService from '@src/app/core/utils/MetricsService';
import TracerService from '@src/app/core/utils/TracerService';
import { GetSalesOverviewReportHandler } from '@src/app/modules/reporting/application/queries/GetSalesOverviewReportHandler';
import container from '@src/app/modules/reporting/config/container';
import types from '@src/app/modules/reporting/config/types';
import { SalesOverviewReport } from '@src/app/modules/reporting/domain/Reports';

const getSalesOverviewReportEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({
    from: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    to: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    timeZone: Joi.string().required(),
  }).required(),
};
const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);
export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<SalesOverviewReport>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = await Authorization.authenticate(event.headers);
    const query = event.queryStringParameters!;
    return container
      .get<GetSalesOverviewReportHandler>(types.GetSalesOverviewReportHandler)
      .execute(principal, { from: query.from!, to: query.to!, timeZone: query.timeZone! });
  }
)
  .use(requestValidator(getSalesOverviewReportEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
