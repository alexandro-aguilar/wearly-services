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
import { DeactivateCustomerHandler } from '@src/app/modules/customers/application/commands/DeactivateCustomerHandler';
import {
  UpdateCustomerCommand,
  UpdateCustomerHandler,
} from '@src/app/modules/customers/application/commands/UpdateCustomerHandler';
import container from '@src/app/modules/customers/config/container';
import types from '@src/app/modules/customers/config/types';

const updateCustomerEndpointHandlerSchema: ValidatorSchemas = {
  pathParameters: Joi.object({ id: Joi.string().required() }).required(),
  body: Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().allow(null).optional(),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{6,14}$/)
      .allow(null)
      .optional(),
    active: Joi.boolean().valid(false).optional(),
  })
    .min(1)
    .unknown(false)
    .required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<void>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const body = (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) as UpdateCustomerCommand & {
      active?: false;
    };
    const principal = new Authorization(event.headers['Authorization'] || '');
    const id = event.pathParameters?.id || '';
    const { active, ...command } = body;
    if (Object.keys(command).length > 0) {
      await container.get<UpdateCustomerHandler>(types.UpdateCustomerHandler).execute(principal, id, command);
    }
    if (active === false) {
      await container.get<DeactivateCustomerHandler>(types.DeactivateCustomerHandler).execute(principal, id);
    }
  }
)
  .use(requestValidator(updateCustomerEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
