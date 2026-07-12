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
import { CreateCheckoutQuoteHandler } from '@src/app/modules/sales/application/commands/CreateCheckoutQuoteHandler';
import { CheckoutQuoteDto } from '@src/app/modules/sales/application/dtos/CheckoutDto';
import container from '@src/app/modules/sales/config/container';
import types from '@src/app/modules/sales/config/types';
const schema: ValidatorSchemas = {
  body: Joi.object({
    items: Joi.array()
      .items(Joi.object({ variantId: Joi.string().required(), quantity: Joi.number().integer().min(1).required() }))
      .min(1)
      .required(),
    manualDiscount: Joi.object({
      amount: Joi.string()
        .pattern(/^\d+\.\d{2}$/)
        .required(),
      reason: Joi.string().trim().min(1).required(),
    }).optional(),
  })
    .unknown(false)
    .required(),
};
const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);
export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<CheckoutQuoteDto>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = await Authorization.authenticate(event.headers);
    const command = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    return container.get<CreateCheckoutQuoteHandler>(types.CreateCheckoutQuoteHandler).execute(principal, command);
  }
)
  .use(requestValidator(schema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
