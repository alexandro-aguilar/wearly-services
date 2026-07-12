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
import { DiscoverVariantsHandler } from '../../application/queries/DiscoverVariantsHandler';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';
import { VariantDiscoveryResultDto } from '@src/app/modules/catalog/application/dtos/ProductDiscoveryDto';

const listProductVariantsEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({
    productId: Joi.string().optional(),
    q: Joi.string().trim().optional(),
    barcode: Joi.string().optional(),
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
  ): Promise<APIGatewayProxyResultV2<VariantDiscoveryResultDto>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const authenticatedPrincipal = await Authorization.authenticate(event.headers);
    const discoverVariantsHandler = container.get<DiscoverVariantsHandler>(types.DiscoverVariantsHandler);
    return discoverVariantsHandler.execute(authenticatedPrincipal, {
      productId: event.queryStringParameters?.productId,
      q: event.queryStringParameters?.q,
      barcode: event.queryStringParameters?.barcode,
      page: event.queryStringParameters?.page as number | undefined,
      pageSize: event.queryStringParameters?.pageSize as number | undefined,
    });
  }
)
  .use(requestValidator(listProductVariantsEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(
    logMetrics(metrics, {
      captureColdStartMetric: true,
      throwOnEmptyMetrics: false,
    })
  )
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
