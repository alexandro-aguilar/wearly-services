import { responseHandler } from '@src/app/core/middleware/responseHandler';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';
import { requestHandler } from '@src/app/core/middleware/requestHandler';
import { requestValidator, ValidatorSchemas } from '@src/app/core/middleware/requestValidator';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import container from '../../config/container';
import TracerService from '@src/app/core/utils/TracerService';
import types from '../../config/types';
import MetricsService from '@src/app/core/utils/MetricsService';
import ILogger from '@src/app/core/utils/ILogger';
import { GetProductByIdHandler } from '../../application/queries/GetProductByIdHandler';
import Joi from '@hapi/joi';
import Authorization from '@src/app/core/interface/Authorization';
import { ProductSnapshot } from '@src/app/modules/catalog/domain/Product';

const getProductByIdEndpointHandlerSchema: ValidatorSchemas = {
  pathParameters: Joi.object({
    id: Joi.string().required(),
  }).required(),
};

const tracer = container.get<TracerService>(types.TracerService).tracer;
const metrics = container.get<MetricsService>(types.MetricsService).metrics;
const logger: ILogger = container.get(types.Logger);

export const handler = middy(
  async (
    event: APIGatewayProxyEventV2,
    context: Context
  ): Promise<APIGatewayProxyResultV2<{ product: ProductSnapshot }>> => {
    logger.addContext({ requestId: context.awsRequestId });
    const authenticatedPrincipal = new Authorization(event.headers['Authorization'] || '');
    const getProductByIdHandler = container.get<GetProductByIdHandler>(types.GetProductByIdHandler);
    const response = await getProductByIdHandler.execute(authenticatedPrincipal, event.pathParameters?.id || '');

    return {
      product: response,
    };
  }
)
  .use(requestValidator(getProductByIdEndpointHandlerSchema))
  .use(requestHandler(metrics))
  .use(
    logMetrics(metrics, {
      captureColdStartMetric: true,
      throwOnEmptyMetrics: false,
    })
  )
  .use(captureLambdaHandler(tracer))
  .use(responseHandler());
