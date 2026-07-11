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
import { ListProductVariantsHandler } from '../../application/queries/ListProductVariantsHandler';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';

const listProductVariantsEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({
    productId: Joi.string().optional(),
    sku: Joi.string().optional(),
    barcode: Joi.string().optional(),
    active: Joi.boolean().optional(),
    lowStock: Joi.boolean().optional(),
  }).optional(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ variants: ProductVariantSnapshot[] }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const authenticatedPrincipal = await Authorization.authenticate(event.headers);
    const listProductVariantsHandler = container.get<ListProductVariantsHandler>(types.ListProductVariantsHandler);
    const response = await listProductVariantsHandler.execute(authenticatedPrincipal, {
      productId: event.queryStringParameters?.productId,
      sku: event.queryStringParameters?.sku,
      barcode: event.queryStringParameters?.barcode,
      active: event.queryStringParameters?.active as boolean | undefined,
      lowStock: event.queryStringParameters?.lowStock as boolean | undefined,
    });

    return {
      variants: response,
    };
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
