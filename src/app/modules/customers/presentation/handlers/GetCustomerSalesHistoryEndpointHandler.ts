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
import { CustomerSaleHistoryItem } from '@src/app/modules/customers/application/ports/CustomerServices';
import { GetCustomerSalesHistoryHandler } from '@src/app/modules/customers/application/queries/GetCustomerSalesHistoryHandler';
import container from '@src/app/modules/customers/config/container';
import types from '@src/app/modules/customers/config/types';

const getCustomerSalesHistoryEndpointHandlerSchema: ValidatorSchemas = {
  pathParameters: Joi.object({ id: Joi.string().required() }).required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ sales: CustomerSaleHistoryItem[] }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = await Authorization.authenticate(event.headers);
    const sales = await container
      .get<GetCustomerSalesHistoryHandler>(types.GetCustomerSalesHistoryHandler)
      .execute(principal, event.pathParameters?.id || '');
    return { sales };
  }
)
  .use(requestValidator(getCustomerSalesHistoryEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
