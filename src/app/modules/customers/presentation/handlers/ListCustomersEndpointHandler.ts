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
import { ListCustomersHandler } from '@src/app/modules/customers/application/queries/ListCustomersHandler';
import { SearchCustomersHandler } from '@src/app/modules/customers/application/queries/SearchCustomersHandler';
import container from '@src/app/modules/customers/config/container';
import types from '@src/app/modules/customers/config/types';
import { CustomerSnapshot } from '@src/app/modules/customers/domain/Customer';

const listCustomersEndpointHandlerSchema: ValidatorSchemas = {
  queryStringParameters: Joi.object({
    search: Joi.string().optional(),
    active: Joi.boolean().optional(),
  }).optional(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ customers: CustomerSnapshot[] }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = new Authorization(event.headers['Authorization'] || '');
    const search = event.queryStringParameters?.search;
    const customers = search
      ? await container.get<SearchCustomersHandler>(types.SearchCustomersHandler).execute(principal, search)
      : await container.get<ListCustomersHandler>(types.ListCustomersHandler).execute(principal, {
          active:
            event.queryStringParameters?.active === undefined ? true : event.queryStringParameters.active === 'true',
        });
    return { customers };
  }
)
  .use(requestValidator(listCustomersEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
