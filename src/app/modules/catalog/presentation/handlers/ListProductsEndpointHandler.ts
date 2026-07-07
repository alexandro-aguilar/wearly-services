import { responseHandler } from '@src/app/core/middleware/responseHandler';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';
import { requestHandler } from '@src/app/core/middleware/requestHandler';
import { requestValidator, ValidatorSchemas } from '@src/app/core/middleware/requestValidator';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import container from '../../config/container';
import TracerService from '@src/app/core/utils/TracerService';
import types from '../../config/types';
import MetricsService from '@src/app/core/utils/MetricsService';
import ILogger from '@src/app/core/utils/ILogger';
import { ListProductsHandler } from '../../application/queries/ListProductsHandler';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';
import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';

const listProductsEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({
    active: Joi.boolean().optional(),
  }).optional(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ products: ProductSnapshot[] }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const authenticatedPrincipal = new Authorization(event.headers['Authorization'] || '');
    const listProductsHandler = container.get<ListProductsHandler>(types.ListProductsHandler);
    const response = await listProductsHandler.execute(authenticatedPrincipal, {
      active: event.queryStringParameters?.active as boolean | undefined,
    });

    return {
      products: response,
    };
  }
)
  .use(requestValidator(listProductsEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(
    logMetrics(metrics, {
      captureColdStartMetric: true,
      throwOnEmptyMetrics: false,
    })
  )
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
