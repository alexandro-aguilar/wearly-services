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
import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';
import { CompleteQuoteSaleHandler } from '@src/app/modules/sales/application/commands/CompleteQuoteSaleHandler';
import { CompletedSaleDto } from '@src/app/modules/sales/application/dtos/CheckoutDto';
import container from '@src/app/modules/sales/config/container';
import types from '@src/app/modules/sales/config/types';
const schema: ValidatorSchemas = {
  body: Joi.object({
    quoteId: Joi.string().required(),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'TRANSFER').required(),
    tenderedAmount: Joi.string()
      .pattern(/^\d+\.\d{2}$/)
      .when('paymentMethod', { is: 'CASH', then: Joi.optional(), otherwise: Joi.forbidden() }),
    terminalTransactionReference: Joi.string()
      .trim()
      .when('paymentMethod', { is: 'CARD', then: Joi.required(), otherwise: Joi.forbidden() }),
    transferReference: Joi.string()
      .trim()
      .when('paymentMethod', { is: 'TRANSFER', then: Joi.required(), otherwise: Joi.forbidden() }),
  }).required(),
};
const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);
export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<CompletedSaleDto>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const key = event.headers['idempotency-key'] ?? event.headers['Idempotency-Key'];
    if (!key) throw new ValidationError('Idempotency-Key is required.');
    if (Joi.string().uuid().validate(key).error) throw new ValidationError('Idempotency-Key must be a UUID.');
    const principal = await Authorization.authenticate(event.headers);
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    return container
      .get<CompleteQuoteSaleHandler>(types.CompleteQuoteSaleHandler)
      .execute(principal, { ...body, idempotencyKey: key });
  }
)
  .use(requestValidator(schema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
