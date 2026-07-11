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
import { ListActivePromotionsHandler } from '@src/app/modules/promotions/application/queries/ListActivePromotionsHandler';
import { ListPromotionsHandler } from '@src/app/modules/promotions/application/queries/ListPromotionsHandler';
import container from '@src/app/modules/promotions/config/container';
import types from '@src/app/modules/promotions/config/types';
import { PromotionSnapshot } from '@src/app/modules/promotions/domain/Promotion';

const listPromotionsEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({ active: Joi.boolean().optional() }).optional(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ promotions: PromotionSnapshot[] }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = new Authorization(event.headers['Authorization'] || '');
    const activeOnly = event.queryStringParameters?.active === 'true';
    const promotions = activeOnly
      ? await container.get<ListActivePromotionsHandler>(types.ListActivePromotionsHandler).execute(principal)
      : await container.get<ListPromotionsHandler>(types.ListPromotionsHandler).execute(principal);
    return { promotions };
  }
)
  .use(requestValidator(listPromotionsEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
