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
import { CreateCustomerHandler } from '@src/app/modules/customers/application/commands/CreateCustomerHandler';
import container from '@src/app/modules/customers/config/container';
import types from '@src/app/modules/customers/config/types';

const createCustomerEndpointHandlerSchema: ValidatorSchemas = {
  body: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().optional(),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{6,14}$/)
      .optional(),
  })
    .unknown(false)
    .required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<{ id: string }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const command = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const principal = await Authorization.authenticate(event.headers);
    return container.get<CreateCustomerHandler>(types.CreateCustomerHandler).execute(principal, command);
  }
)
  .use(requestValidator(createCustomerEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
