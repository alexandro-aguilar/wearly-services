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
import { UpdateProductVariantHandler } from '../../application/commands/UpdateProductVariantHandler';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';

const updateProductVariantEndpointHandlerSchema: ValidatorSchemas = {
  pathParameters: Joi.object({
    id: Joi.string().required(),
  }).required(),
  body: Joi.object({
    sku: Joi.string().optional(),
    barcode: Joi.string().optional(),
    size: Joi.string().optional(),
    color: Joi.string().optional(),
    price: Joi.number().optional(),
    cost: Joi.number().optional(),
    minimumStock: Joi.number().integer().min(0).optional(),
    stock: Joi.any().forbidden(),
  }).required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<{ id: string }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const updateProductVariantCommand = JSON.parse(event.body || '{}');
    const authenticatedPrincipal = new Authorization(event.headers['Authorization'] || '');
    const updateProductVariantHandler = container.get<UpdateProductVariantHandler>(types.UpdateProductVariantHandler);
    const response = await updateProductVariantHandler.execute(
      authenticatedPrincipal,
      event.pathParameters?.id || '',
      updateProductVariantCommand
    );

    return response;
  }
)
  .use(requestValidator(updateProductVariantEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(
    logMetrics(metrics, {
      captureColdStartMetric: true,
      throwOnEmptyMetrics: false,
    })
  )
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
