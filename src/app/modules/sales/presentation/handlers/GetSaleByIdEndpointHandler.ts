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
import container from '@src/app/modules/sales/config/container';
import types from '@src/app/modules/sales/config/types';
import { CompleteQuoteSaleHandler } from '@src/app/modules/sales/application/commands/CompleteQuoteSaleHandler';
import { CompletedSaleDto } from '@src/app/modules/sales/application/dtos/CheckoutDto';

const getSaleByIdEndpointHandlerSchema: ValidatorSchemas = {
  pathParameters: Joi.object({ id: Joi.string().required() }).required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2<CompletedSaleDto>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = await Authorization.authenticate(event.headers);
    return container
      .get<CompleteQuoteSaleHandler>(types.CompleteQuoteSaleHandler)
      .getSale(principal, event.pathParameters?.id || '');
  }
)
  .use(requestValidator(getSaleByIdEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
