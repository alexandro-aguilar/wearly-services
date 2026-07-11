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
import { GetBestSellersReportHandler } from '@src/app/modules/reporting/application/queries/GetBestSellersReportHandler';
import container from '@src/app/modules/reporting/config/container';
import types from '@src/app/modules/reporting/config/types';
import { BestSellerReport } from '@src/app/modules/reporting/domain/Reports';

const getBestSellersReportEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({ limit: Joi.number().integer().min(1).max(100).optional() }).optional(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<BestSellerReport>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = await Authorization.authenticate(event.headers);
    const limit = event.queryStringParameters?.limit;
    return container
      .get<GetBestSellersReportHandler>(types.GetBestSellersReportHandler)
      .execute(principal, { limit: limit === undefined ? undefined : Number(limit) });
  }
)
  .use(requestValidator(getBestSellersReportEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
