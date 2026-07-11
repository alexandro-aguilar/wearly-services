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
import { GetDailySalesReportHandler } from '@src/app/modules/reporting/application/queries/GetDailySalesReportHandler';
import container from '@src/app/modules/reporting/config/container';
import types from '@src/app/modules/reporting/config/types';
import { DailySalesReport } from '@src/app/modules/reporting/domain/Reports';

const getDailySalesReportEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({
    date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    timezoneOffsetMinutes: Joi.number().integer().min(-720).max(840).optional(),
  }).required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<DailySalesReport>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = await Authorization.authenticate(event.headers);
    return container.get<GetDailySalesReportHandler>(types.GetDailySalesReportHandler).execute(principal, {
      date: event.queryStringParameters?.date || '',
      timezoneOffsetMinutes: Number(event.queryStringParameters?.timezoneOffsetMinutes ?? 0),
    });
  }
)
  .use(requestValidator(getDailySalesReportEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
