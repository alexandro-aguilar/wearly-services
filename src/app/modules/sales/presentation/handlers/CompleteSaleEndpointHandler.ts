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
import { CompleteSaleHandler } from '@src/app/modules/sales/application/commands/CompleteSaleHandler';
import container from '@src/app/modules/sales/config/container';
import types from '@src/app/modules/sales/config/types';

const completeSaleEndpointHandlerSchema: ValidatorSchemas = {
  body: Joi.object({
    customerId: Joi.string().optional(),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'TRANSFER').required(),
    items: Joi.array()
      .items(
        Joi.object({
          productVariantId: Joi.string().required(),
          quantity: Joi.number().integer().min(1).required(),
        }).required()
      )
      .min(1)
      .required(),
  })
    .unknown(false)
    .required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ id: string; status: 'COMPLETED' }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const command = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const principal = await Authorization.authenticate(event.headers);
    return container.get<CompleteSaleHandler>(types.CompleteSaleHandler).execute(principal, command);
  }
)
  .use(requestValidator(completeSaleEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
