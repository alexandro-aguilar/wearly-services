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
import {
  CreatePromotionCommand,
  CreatePromotionHandler,
} from '@src/app/modules/promotions/application/commands/CreatePromotionHandler';
import container from '@src/app/modules/promotions/config/container';
import types from '@src/app/modules/promotions/config/types';

const createPromotionEndpointHandlerSchema: ValidatorSchemas = {
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    type: Joi.string().valid('FIXED_COMBO', 'MIXED_COMBO', 'PERCENTAGE_DISCOUNT', 'BUY_X_GET_Y').required(),
    conditions: Joi.array().items(conditionSchema()).min(1).required(),
    actions: Joi.array().items(actionSchema()).length(1).required(),
    startsAt: Joi.date().iso().optional(),
    endsAt: Joi.date().iso().optional(),
    priority: Joi.number().integer().required(),
    active: Joi.boolean().optional(),
  }).required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<{ id: string }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const body = (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) as CreatePromotionCommand;
    const command = {
      ...body,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    };
    const principal = new Authorization(event.headers['Authorization'] || '');
    return container.get<CreatePromotionHandler>(types.CreatePromotionHandler).execute(principal, command);
  }
)
  .use(requestValidator(createPromotionEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());

function conditionSchema(): Joi.ObjectSchema {
  return Joi.object({
    field: Joi.string().valid('category', 'productId', 'variantId', 'quantity', 'brand').required(),
    operator: Joi.string().valid('EQUALS', 'IN', 'GREATER_THAN_OR_EQUAL').required(),
    value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.array().items(Joi.string())).required(),
  });
}

function actionSchema(): Joi.ObjectSchema {
  return Joi.object({
    type: Joi.string()
      .valid('SET_FIXED_PRICE', 'PERCENTAGE_DISCOUNT', 'FIXED_DISCOUNT', 'CHEAPEST_ITEM_DISCOUNT')
      .required(),
    value: Joi.number().min(0).required(),
  });
}
