import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import Authorization from '@src/app/core/interface/Authorization';
import { requestHandler } from '@src/app/core/middleware/requestHandler';
import { requestValidator, ValidatorSchemas } from '@src/app/core/middleware/requestValidator';
import { responseHandler } from '@src/app/core/middleware/responseHandler';
import ILogger from '@src/app/core/utils/ILogger';
import MetricsService from '@src/app/core/utils/MetricsService';
import TracerService from '@src/app/core/utils/TracerService';
import { ListSalesHandler } from '@src/app/modules/sales/application/queries/ListSalesHandler';
import container from '@src/app/modules/sales/config/container';
import types from '@src/app/modules/sales/config/types';
import { SaleSnapshot } from '@src/app/modules/sales/domain/Sale';

const listSalesEndpointHandlerSchema: ValidatorSchemas = {};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger = container.get<ILogger>(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ sales: SaleSnapshot[] }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const principal = new Authorization(event.headers['Authorization'] || '');
    const sales = await container.get<ListSalesHandler>(types.ListSalesHandler).execute(principal);
    return { sales };
  }
)
  .use(requestValidator(listSalesEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(logMetrics(metrics, { captureColdStartMetric: true, throwOnEmptyMetrics: false }))
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
