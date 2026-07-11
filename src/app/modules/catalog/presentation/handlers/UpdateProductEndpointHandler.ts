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
import { UpdateProductHandler } from '../../application/commands/UpdateProductHandler';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';

const updateProductEndpointHandlerSchema: ValidatorSchemas = {
  pathParameters: Joi.object({
    id: Joi.string().required(),
  }).required(),
  body: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    categoryId: Joi.string().optional(),
    brandId: Joi.string().optional(),
  }).required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<{ id: string }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const updateProductCommand = JSON.parse(event.body || '{}');
    const authenticatedPrincipal = await Authorization.authenticate(event.headers);
    const updateProductHandler = container.get<UpdateProductHandler>(types.UpdateProductHandler);
    const response = await updateProductHandler.execute(
      authenticatedPrincipal,
      event.pathParameters?.id || '',
      updateProductCommand
    );

    return response;
  }
)
  .use(requestValidator(updateProductEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(
    logMetrics(metrics, {
      captureColdStartMetric: true,
      throwOnEmptyMetrics: false,
    })
  )
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
