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
import { DiscoverProductsHandler } from '../../application/queries/DiscoverProductsHandler';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';
import { ProductDiscoveryResultDto } from '@src/app/modules/catalog/application/dtos/ProductDiscoveryDto';

const listProductsEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({
    q: Joi.string().trim().optional(),
    categoryId: Joi.string().trim().optional(),
    page: Joi.number().integer().min(1).optional(),
    pageSize: Joi.number().integer().min(1).max(100).optional(),
  }).optional(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<ProductDiscoveryResultDto>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const authenticatedPrincipal = await Authorization.authenticate(event.headers);
    const discoverProductsHandler = container.get<DiscoverProductsHandler>(types.DiscoverProductsHandler);
    return discoverProductsHandler.execute(authenticatedPrincipal, {
      q: event.queryStringParameters?.q,
      categoryId: event.queryStringParameters?.categoryId,
      page: event.queryStringParameters?.page as number | undefined,
      pageSize: event.queryStringParameters?.pageSize as number | undefined,
    });
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
