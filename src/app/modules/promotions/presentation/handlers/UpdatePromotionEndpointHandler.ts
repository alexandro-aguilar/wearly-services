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
import { UpdatePromotionHandler } from '@src/app/modules/promotions/application/commands/UpdatePromotionHandler';
import container from '@src/app/modules/promotions/config/container';
import types from '@src/app/modules/promotions/config/types';
import { UpdatePromotionInput } from '@src/app/modules/promotions/domain/Promotion';

const updatePromotionEndpointHandlerSchema: ValidatorSchemas = {
  pathParameters: Joi.object({ id: Joi.string().required() }).required(),
  body: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().allow('').optional(),
    type: Joi.string().valid('FIXED_COMBO', 'MIXED_COMBO', 'PERCENTAGE_DISCOUNT', 'BUY_X_GET_Y').optional(),
    conditions: Joi.array().items(conditionSchema()).min(1).optional(),
    actions: Joi.array().items(actionSchema()).length(1).optional(),
    startsAt: Joi.date().iso().allow(null).optional(),
    endsAt: Joi.date().iso().allow(null).optional(),
    priority: Joi.number().integer().optional(),
    active: Joi.boolean().optional(),
  })
    .min(1)
    .required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<void>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const body = (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) as UpdatePromotionInput;
    const command: UpdatePromotionInput = {
      ...body,
      startsAt: body.startsAt === null ? null : body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt === null ? null : body.endsAt ? new Date(body.endsAt) : undefined,
    };
    const principal = new Authorization(event.headers['Authorization'] || '');
    await container
      .get<UpdatePromotionHandler>(types.UpdatePromotionHandler)
      .execute(principal, event.pathParameters?.id || '', command);
  }
)
  .use(requestValidator(updatePromotionEndpointHandlerSchema))
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
