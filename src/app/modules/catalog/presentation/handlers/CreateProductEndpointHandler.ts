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
import { CreateProductHandler } from '../../application/commands/CreateProductHandler';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';

const createProductEndpointHandlerSchema: ValidatorSchemas = {
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    price: Joi.number().required(),
    currency: Joi.string().length(3).required(),
    stock: Joi.number().integer().min(0).required(),
  }).required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<{ id: string }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const createProductCommand = JSON.parse(event.body || '{}');
    const authenticatedPrincipal = await Authorization.authenticate(event.headers);
    const createProductHandler = container.get<CreateProductHandler>(types.CreateProductHandler);
    const response = await createProductHandler.execute(authenticatedPrincipal, createProductCommand);

    return response;
  }
)
  .use(requestValidator(createProductEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(
    logMetrics(metrics, {
      captureColdStartMetric: true,
      throwOnEmptyMetrics: false,
    })
  )
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
